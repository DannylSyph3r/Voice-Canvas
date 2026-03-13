import uuid

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services import session_service

app = FastAPI(title="VoiceCanvas API")


class StartSessionRequest(BaseModel):
    user_id: str
    mode: str
    style: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/session/start")
def start_session(body: StartSessionRequest):
    session_id = str(uuid.uuid4())
    session_service.create_session(
        user_id=body.user_id,
        session_id=session_id,
        mode=body.mode,
        style=body.style,
    )
    return {"session_id": session_id}


@app.get("/sessions/{user_id}")
def get_sessions(user_id: str):
    sessions = session_service.list_sessions(user_id)
    return {"sessions": sessions}


@app.get("/session/{user_id}/{session_id}")
def get_session(user_id: str, session_id: str):
    session = session_service.get_session(user_id, session_id)
    if session is None:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return session
