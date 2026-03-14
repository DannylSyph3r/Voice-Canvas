import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from backend.agent.voicecanvas_agent import create_agent
from backend.services import image_generation as image_generation_service
from backend.services.session_service import finalise_session, get_session


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
        self.image_index = 0
        self._transcript_parts: list[str] = []

    async def run(self):
        loop = asyncio.get_event_loop()
        session = await loop.run_in_executor(
            None, get_session, self.user_id, self.session_id
        )
        if session is None:
            await self.websocket.close(code=4004, reason="Session not found")
            return

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
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        upstream_task = asyncio.create_task(self._upstream(live_request_queue))
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
                    live_request_queue.send_realtime(
                        types.Blob(
                            data=data["bytes"],
                            mime_type="audio/pcm;rate=16000",
                        )
                    )
        except WebSocketDisconnect:
            pass
        except RuntimeError:
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
        finally:
            print("[WebSocket] Downstream loop ended — sending session_complete")
            try:
                await self.websocket.send_text(json.dumps({"type": "session_complete"}))
            except Exception:
                pass

    async def _handle_event(self, event):
        if not event.content or not event.content.parts:
            return

        for part in event.content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                try:
                    await self.websocket.send_bytes(part.inline_data.data)
                except Exception:
                    pass
            elif part.text:
                role = "user" if event.author == "user" else "agent"
                is_final = not bool(event.partial)
                try:
                    await self.websocket.send_text(
                        json.dumps(
                            {
                                "type": "transcript",
                                "role": role,
                                "text": part.text,
                                "is_final": is_final,
                            }
                        )
                    )
                except Exception:
                    pass
                if is_final:
                    self._transcript_parts.append(f"{role.capitalize()}: {part.text}")

        function_calls = (
            event.get_function_calls() if hasattr(event, "get_function_calls") else []
        )
        for call in function_calls:
            print(f"[TOOL] {call.name}({call.args})")

            if call.name == "generate_scene_image":
                description = call.args.get("description", "")
                current_index = self.image_index

                if current_index < 8:
                    self.image_index += 1
                    try:
                        await self.websocket.send_text(
                            json.dumps(
                                {
                                    "type": "image_generating",
                                    "index": current_index,
                                    "style": self.style,
                                }
                            )
                        )
                    except Exception:
                        pass
                    asyncio.create_task(
                        self._run_image_generation(description, current_index)
                    )
                else:
                    print(
                        f"[ImageGen] Soft cap reached — ignoring call at index {current_index}"
                    )

            elif call.name == "finish_session":
                print("[WebSocket] finish_session — finalising session")
                transcript = "\n".join(self._transcript_parts)
                try:
                    await asyncio.to_thread(
                        finalise_session, self.user_id, self.session_id, transcript
                    )
                except Exception as e:
                    print(f"[WebSocket] finalise_session error: {e}")
                try:
                    await self.websocket.send_text(
                        json.dumps(
                            {
                                "type": "session_complete",
                                "offer_canvas": True,
                            }
                        )
                    )
                except Exception:
                    pass

    async def _run_image_generation(self, description: str, index: int):
        print(f"[ImageGen] Generating index {index} — {description[:60]}")
        url = await image_generation_service.generate_image(
            scene_description=description,
            art_style=self.style,
            user_id=self.user_id,
            session_id=self.session_id,
            index=index,
        )
        if url is None:
            print(f"[ImageGen] Generation returned None for index {index}")
            return

        try:
            await self.websocket.send_text(
                json.dumps(
                    {
                        "type": "image_ready",
                        "index": index,
                        "url": url,
                        "style": self.style,
                        "description": description,
                    }
                )
            )
        except Exception:
            pass
