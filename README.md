# VoiceCanvas

A voice-first AI journaling app. Speak your thoughts — VoiceCanvas listens, asks questions, and generates images that capture the mood, story, or moment you are describing.

## How it works

The user selects a session mode and art style, then speaks freely. The AI agent guides the conversation and generates scene images in real time. At the end of the session, the user receives a visual canvas of their experience.

**Modes:** Story, Mood, Moment
**Art styles:** Watercolor, Oil, Manga, Pixel, Superhero, Minecraft, Photorealistic

## Tech Stack

- **Backend:** FastAPI, Google ADK, Gemini Live API
- **Storage:** Google Cloud Storage
- **Frontend:** React, Vite, Tailwind CSS

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn backend.main:app --reload
```

Requires a `.env` file — copy `.env.example` and fill in your `GOOGLE_API_KEY`.

## Project Structure

```
voicecanvas/
├── backend/
│   ├── agent/        # ADK agent, instructions, tools
│   ├── config/       # Environment settings
│   ├── services/     # GCS session service
│   └── websocket/    # WebSocket handler
└── frontend/         # React app
```
