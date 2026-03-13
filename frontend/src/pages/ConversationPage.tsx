import { useState, useEffect, useMemo, useRef } from 'react'
import { startSession } from '../services/api'
import { getUserId, addSessionId } from '../utils/storage'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import { useWebSocket, type TranscriptEvent } from '../hooks/useWebSocket'

interface TranscriptLine {
  role: 'user' | 'agent'
  text: string
}

export default function ConversationPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [isCapturing, setIsCapturing] = useState(false)

  const userId = useMemo(() => getUserId(), [])
  const wsParams = useMemo(
    () => ({ user_id: userId, mode: 'moment', style: 'watercolor' }),
    [userId],
  )

  const { enqueue, stop: stopPlayback } = useAudioPlayback()

  const handlers = useRef({
    onAudioChunk: (buffer: ArrayBuffer) => enqueue(buffer),
    onTranscript: (event: TranscriptEvent) => {
      if (event.is_final) {
        setTranscript((prev) => [...prev, { role: event.role, text: event.text }])
      }
    },
  })

  const { sendAudio, connectionState } = useWebSocket(
    sessionId,
    wsParams,
    handlers.current,
  )

  const { startCapture, stopCapture, isMuted, toggleMute } =
    useAudioCapture(sendAudio)

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
          Status: <span className="font-mono">{connectionState}</span>
        </p>

        <div className="flex flex-col gap-2">
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
        {isCapturing && (
          <button
            onClick={toggleMute}
            className="text-xs text-gray-400 underline"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
        <button
          onClick={handleMicClick}
          className={`w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-colors ${
            isCapturing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isCapturing ? '⏹' : '🎤'}
        </button>
      </div>
    </div>
  )
}
