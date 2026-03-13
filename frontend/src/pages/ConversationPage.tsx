import { useState, useEffect, useMemo } from 'react'
import { startSession } from '../services/api'
import { getUserId, addSessionId } from '../utils/storage'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import { useWebSocket, type TranscriptEvent, type WebSocketHandlers } from '../hooks/useWebSocket'

interface TranscriptLine {
  role: 'user' | 'agent'
  text: string
}

export default function ConversationPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)

  const userId = useMemo(() => getUserId(), [])
  const wsParams = useMemo(
    () => ({ user_id: userId, mode: 'moment', style: 'watercolor' }),
    [userId],
  )

  const { enqueue, stop: stopPlayback } = useAudioPlayback()
  // This instance of useAudioCapture is only for stopCapture in the
  // session-complete handler. The capturing instance is created below
  // with sendAudio wired in.
  const { stopCapture } = useAudioCapture(() => {})

  // Handlers are stable via useMemo — no useRef needed because useWebSocket
  // already maintains its own internal handlersRef and syncs it after every render.
  // Accessing .current during render (the old approach) is what the React
  // Compiler was correctly flagging.
  const handlers = useMemo<WebSocketHandlers>(
    () => ({
      onAudioChunk: (buffer: ArrayBuffer) => enqueue(buffer),
      onTranscript: (event: TranscriptEvent) => {
        if (event.is_final) {
          setTranscript((prev) => [...prev, { role: event.role, text: event.text }])
        }
      },
      onSessionComplete: () => {
        console.log('[Session] session_complete received — ending session')
        stopCapture()
        stopPlayback()
        setIsCapturing(false)
        setSessionEnded(true)
      },
    }),
    [enqueue, stopPlayback, stopCapture],
  )

  const { sendAudio, connectionState } = useWebSocket(sessionId, wsParams, handlers)

  const { startCapture, isMuted, toggleMute } = useAudioCapture(sendAudio)

  useEffect(() => {
    startSession('moment', 'watercolor')
      .then(({ session_id }) => {
        addSessionId(session_id)
        setSessionId(session_id)
      })
      .catch(console.error)
  }, [])

  const handleMicClick = async () => {
    if (isCapturing) {
      stopCapture()
      stopPlayback()
      setIsCapturing(false)
    } else {
      await startCapture()
      setIsCapturing(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-between p-6">
      <div className="w-full max-w-lg">
        <p className="text-sm text-gray-400 mb-4">
          Status:{' '}
          <span className="font-mono">
            {sessionEnded ? 'session complete' : connectionState}
          </span>
        </p>

        {sessionEnded && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-green-800 text-green-200 text-sm text-center">
            Session complete. Your canvas is ready.
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          {transcript.map((line, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg text-sm max-w-xs ${
                line.role === 'user'
                  ? 'bg-blue-600 self-end ml-auto'
                  : 'bg-gray-700 self-start'
              }`}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 mt-8">
        {isCapturing && !sessionEnded && (
          <button
            onClick={toggleMute}
            className="text-xs text-gray-400 underline"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
        {!sessionEnded && (
          <button
            onClick={handleMicClick}
            className={`w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-colors ${
              isCapturing
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {isCapturing ? '⏹' : '🎙'}
          </button>
        )}
      </div>
    </div>
  )
}
