def generate_scene_image(description: str) -> dict:
    """Generate an image representing the current scene or mood.

    Returns immediately so the agent continues speaking without waiting.
    The WebSocket handler owns actual image generation and GCS upload.
    """
    return {"status": "generating"}


def finish_session() -> dict:
    """Signal that the session is complete and offer the canvas."""
    return {"status": "complete"}
