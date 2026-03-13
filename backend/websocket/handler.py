import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from backend.agent.voicecanvas_agent import create_agent
from backend.services.session_service import get_session


class WebSocketHandler:
    def __init__(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: str,
        mode: str,
        style: str,
    ):
        self.websocket = websocket
        self.session_id = session_id
        self.user_id = user_id
        self.mode = mode
        self.style = style

    async def run(self):
        # Verify session exists in GCS — run_in_executor keeps event loop unblocked
        loop = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None, get_session, self.user_id, self.session_id
        )
        if session is None:
            await self.websocket.close(code=4004, reason="Session not found")
            return

        # ADK setup — InMemorySessionService holds conversational state
        # for the duration of this live connection only
        agent = create_agent(self.mode, self.style)
        session_service = InMemorySessionService()
        runner = Runner(
            agent=agent,
            app_name="voicecanvas",
            session_service=session_service,
        )
        adk_session = await session_service.create_session(
            app_name="voicecanvas",
            user_id=self.user_id,
            session_id=self.session_id,
        )

        live_request_queue = LiveRequestQueue()

        run_config = RunConfig(
            response_modalities=["AUDIO"],
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        upstream_task = asyncio.create_task(
            self._upstream(live_request_queue)
        )
        downstream_task = asyncio.create_task(
            self._downstream(runner, adk_session.id, live_request_queue, run_config)
        )

        done, pending = await asyncio.wait(
            [upstream_task, downstream_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def _upstream(self, live_request_queue: LiveRequestQueue):
        try:
            while True:
                data = await self.websocket.receive()
                if data.get("bytes"):
                    await live_request_queue.send_realtime(
                        types.Blob(
                            data=data["bytes"],
                            mime_type="audio/pcm;rate=16000",
                        )
                    )
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"[WebSocket] Upstream error: {e}")
        finally:
            live_request_queue.close()

    async def _downstream(
        self,
        runner: Runner,
        adk_session_id: str,
        live_request_queue: LiveRequestQueue,
        run_config: RunConfig,
    ):
        try:
            async for event in runner.run_live(
                user_id=self.user_id,
                session_id=adk_session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                await self._handle_event(event)
        except Exception as e:
            print(f"[WebSocket] Downstream error: {e}")

    async def _handle_event(self, event):
        if not event.content or not event.content.parts:
            return

        for part in event.content.parts:
            # Audio chunk — forward as binary frame
            if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                try:
                    await self.websocket.send_bytes(part.inline_data.data)
                except Exception:
                    pass

            # Transcription — forward as JSON text frame
            elif part.text:
                role = "user" if event.author == "user" else "agent"
                try:
                    await self.websocket.send_text(json.dumps({
                        "type": "transcript",
                        "role": role,
                        "text": part.text,
                        "is_final": not bool(event.partial),
                    }))
                except Exception:
                    pass

        # Function calls — ADK executes stubs automatically
        # Logging here for Phase 2 visibility, dispatcher wired in Phase 3
        function_calls = event.get_function_calls() if hasattr(event, "get_function_calls") else []
        for call in function_calls:
            print(f"[TOOL] {call.name}({call.args})")
