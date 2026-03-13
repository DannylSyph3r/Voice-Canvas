def generate_scene_image(description: str) -> dict:
    """Generate an image representing the current scene or mood."""
    print(f"[STUB] generate_scene_image called — description: {description}")
    return {"status": "ok"}


def finish_session() -> dict:
    """Signal that the session is complete and offer the canvas."""
    print("[STUB] finish_session called")
    return {"status": "ok"}
