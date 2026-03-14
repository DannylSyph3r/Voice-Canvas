import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { startSession } from '../services/api'
import { getUserId, addSessionId } from '../utils/storage'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import {
  useWebSocket,
  type TranscriptEvent,
  type WebSocketHandlers,
  type ImageReadyEvent,
} from '../hooks/useWebSocket'
import LiveImagePreview from '../components/LiveImagePreview'

interface TranscriptLine {
  role: 'user' | 'agent'
  text: string
}

export default function ConversationPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [latestImageUrl, setLatestImageUrl] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState(0)

  const userId = useMemo(() => getUserId(), [])
  const wsParams = useMemo(
    () => ({ user_id: userId, mode: 'moment', style: 'watercolor' }),
    [userId],
  )

  const { enqueue, stop: stopPlayback } = useAudioPlayback()

  const sendAudioRef = useRef<(buf: ArrayBuffer) => void>(() => {})
  const stableSendAudio = useCallback((buf: ArrayBuffer) => {
    sendAudioRef.current(buf)
  }, [])

  const { startCapture, stopCapture, isMuted, toggleMute } = useAudioCapture(stableSendAudio)

  const handlers = useMemo<WebSocketHandlers>(
    () => ({
      onAudioChunk: (buffer: ArrayBuffer) => enqueue(buffer),
      onTranscript: (event: TranscriptEvent) => {
        if (event.is_final) {
          setTranscript((prev) => [...prev, { role: event.role, text: event.text }])
        }
      },
      onImageGenerating: () => {
        setIsGenerating(true)
      },
      onImageReady: (event: ImageReadyEvent) => {
        setLatestImageUrl(event.url)
        setImageCount(event.index + 1)
        setIsGenerating(false)
      },
      onSessionComplete: () => {
        console.log('[Session] session_complete received')
        stopCapture()
        stopPlayback()
        setIsCapturing(false)
        setSessionEnded(true)
        setIsGenerating(false)
      },
    }),
    [enqueue, stopPlayback, stopCapture],
  )

  const { sendAudio, connectionState } = useWebSocket(sessionId, wsParams, handlers)

  useEffect(() => {
    sendAudioRef.current = sendAudio
  }, [sendAudio])

  const sessionStarted = useRef(false)
  useEffect(() => {
    if (sessionStarted.current) return
    sessionStarted.current = true

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

        <LiveImagePreview
          isGenerating={isGenerating}
          latestImageUrl={latestImageUrl}
          imageCount={imageCount}
        />

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
