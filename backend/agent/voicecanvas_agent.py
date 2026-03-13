from google.adk.agents import LlmAgent

from backend.agent.instructions import STORY_INSTRUCTION, MOOD_INSTRUCTION, MOMENT_INSTRUCTION
from backend.agent.tools import generate_scene_image, finish_session
from backend.config import settings

_INSTRUCTION_MAP = {
    "story": STORY_INSTRUCTION,
    "mood": MOOD_INSTRUCTION,
    "moment": MOMENT_INSTRUCTION,
}


def create_agent(mode: str, art_style: str) -> LlmAgent:
    instruction_template = _INSTRUCTION_MAP.get(mode, MOMENT_INSTRUCTION)
    instruction = instruction_template.format(art_style=art_style)

    return LlmAgent(
        name="VoiceCanvasAgent",
        model=settings.GEMINI_LIVE_MODEL,
        instruction=instruction,
        tools=[generate_scene_image, finish_session],
    )


if __name__ == "__main__":
    # Smoke test 1: agent instantiates without error
    agent = create_agent(mode="moment", art_style="watercolor")
    print(f"Agent instantiated: {agent.name} | model: {agent.model}")

    # Smoke test 2: confirm API key reaches Gemini
    # Uses gemini-2.5-flash — the live audio model does not accept standard text calls
    from google import genai

    client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Respond with the single word: ready",
    )
    print(f"API key check — model response: {response.text.strip()}")
