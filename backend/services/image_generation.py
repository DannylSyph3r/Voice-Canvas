import asyncio

from google import genai
from google.api_core.exceptions import ResourceExhausted
from google.cloud import storage
from google.genai import types
from google.genai.errors import ClientError

from backend.config import settings
from backend.services import session_service

# --- Replace these modifier strings with your final prompt appendages ---
# This is the only place you need to edit when finalising art style prompts.
# Each value is appended to the scene description before sending to the image model.
ART_STYLE_MAP = {
    "watercolor": "painted in watercolor style",
    "oil": "painted in oil painting style",
    "manga": "drawn in manga comic style",
    "pixel": "rendered in pixel art style",
    "superhero": "drawn in superhero comic book style",
    "minecraft": "rendered in Minecraft block style",
    "photorealistic": "photorealistic photograph",
}

_IMAGE_SOFT_CAP = 8
_GENERATION_TIMEOUT = 30.0
_RETRY_DELAY = 3.0

_genai_client: genai.Client | None = None
_storage_client: storage.Client | None = None


def _get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _genai_client


def _get_storage_client() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client()
    return _storage_client


def _generate_and_upload(
    prompt: str,
    user_id: str,
    session_id: str,
    index: int,
    scene_description: str,
) -> str | None:
    """Synchronous core: call Gemini image model, upload result to GCS, persist to session.

    Designed to run in a thread via asyncio.to_thread — never call from the event loop directly.
    """
    client = _get_genai_client()

    response = client.models.generate_content(
        model=settings.GEMINI_IMAGE_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    image_bytes: bytes | None = None
    mime_type = "image/png"
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            image_bytes = part.inline_data.data
            mime_type = part.inline_data.mime_type
            break

    if image_bytes is None:
        print(f"[ImageGen] No image data in response for index {index}")
        return None

    blob_path = f"sessions/{user_id}/{session_id}/image_{index:03d}.png"
    storage_client = _get_storage_client()
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type=mime_type)

    # NOTE: Requires per-object ACLs to be enabled on the bucket.
    # If your bucket was created with uniform bucket-level access (GCP default for new buckets),
    # this call will fail. Fix: GCS console → your bucket → Permissions tab →
    # disable "Enforce public access prevention" and "Uniform bucket-level access".
    blob.make_public()
    image_url = blob.public_url

    # Note: concurrent image generation tasks for the same session could race on
    # session.json reads/writes. Acceptable for a demo where generation is
    # naturally sequential due to API rate limits.
    session_service.append_image(
        user_id, session_id, image_url, scene_description, index
    )

    return image_url


async def generate_image(
    scene_description: str,
    art_style: str,
    user_id: str,
    session_id: str,
    index: int,
) -> str | None:
    """Generate a scene image, upload to GCS, and return its public URL.

    Returns None if the soft cap is reached, generation fails twice, or the
    model returns no image data.
    """
    if index >= _IMAGE_SOFT_CAP:
        return None

    style_modifier = ART_STYLE_MAP.get(art_style, "")
    prompt = (
        f"{scene_description}. {style_modifier}. "
        "Single illustration, no text or speech bubbles, no borders."
    )

    for attempt in range(2):
        try:
            url = await asyncio.wait_for(
                asyncio.to_thread(
                    _generate_and_upload,
                    prompt,
                    user_id,
                    session_id,
                    index,
                    scene_description,
                ),
                timeout=_GENERATION_TIMEOUT,
            )
            return url
        except (ResourceExhausted, ClientError, asyncio.TimeoutError) as e:
            # ClientError covers 429s thrown by the google-genai SDK
            print(
                f"[ImageGen] Attempt {attempt + 1} failed ({type(e).__name__}) — index {index}"
            )
            if attempt == 0:
                await asyncio.sleep(_RETRY_DELAY)
                continue
            return None
        except Exception as e:
            print(f"[ImageGen] Unrecoverable error — index {index}: {e}")
            return None

    return None
