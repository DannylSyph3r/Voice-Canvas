import json
from datetime import datetime, timezone

from google.cloud import storage
from google.cloud.exceptions import NotFound

from backend.config import settings

_storage_client = None


def _get_client() -> storage.Client:
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client()
    return _storage_client


def _session_path(user_id: str, session_id: str) -> str:
    return f"sessions/{user_id}/{session_id}/session.json"


def _write_session(user_id: str, session_id: str, session: dict) -> None:
    client = _get_client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(_session_path(user_id, session_id))
    blob.upload_from_string(
        json.dumps(session, indent=2),
        content_type="application/json"
    )


def create_session(user_id: str, session_id: str, mode: str, style: str) -> dict:
    session = {
        "user_id": user_id,
        "session_id": session_id,
        "mode": mode,
        "style": style,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "images": [],
        "transcript": None,
    }
    _write_session(user_id, session_id, session)
    return session


def append_image(user_id: str, session_id: str, image_url: str, description: str, index: int) -> dict:
    session = get_session(user_id, session_id)
    session["images"].append({
        "url": image_url,
        "description": description,
        "index": index,
    })
    _write_session(user_id, session_id, session)
    return session


def finalise_session(user_id: str, session_id: str, transcript: str) -> dict:
    session = get_session(user_id, session_id)
    session["transcript"] = transcript
    session["status"] = "complete"
    _write_session(user_id, session_id, session)
    return session


def list_sessions(user_id: str) -> list:
    client = _get_client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blobs = bucket.list_blobs(prefix=f"sessions/{user_id}/")

    sessions = []
    for blob in blobs:
        if blob.name.endswith("session.json"):
            try:
                data = json.loads(blob.download_as_text())
                sessions.append(data)
            except Exception as e:
                print(f"Warning: failed to parse {blob.name}: {e}")

    sessions.sort(key=lambda s: s.get("created_at", ""), reverse=True)
    return sessions


def get_session(user_id: str, session_id: str) -> dict | None:
    try:
        client = _get_client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(_session_path(user_id, session_id))
        return json.loads(blob.download_as_text())
    except NotFound:
        return None
