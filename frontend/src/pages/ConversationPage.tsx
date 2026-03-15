import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserId } from '../utils/storage'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import {
  useWebSocket,
  type TranscriptEvent,
  type WebSocketHandlers,
  type ImageReadyEvent,
} from '../hooks/useWebSocket'
import LiveImagePreview from '../components/LiveImagePreview'
import TranscriptPanel from '../components/TranscriptPanel'
import MicButton from '../components/MicButton'

interface TranscriptLine {
  role: 'user' | 'agent'
  text: string
}

export default function ConversationPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const mode = searchParams.get('mode') ?? 'moment'
  const style = searchParams.get('style') ?? 'watercolor'

  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [inProgressText, setInProgressText] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [imageCount, setImageCount] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [latestImageUrl, setLatestImageUrl] = useState<string | null>(null)

  const userId = useMemo(() => getUserId(), [])
  const wsParams = useMemo(
    () => ({ user_id: userId, mode, style }),
    [userId, mode, style],
  )

  const { enqueue, stop: stopPlayback } = useAudioPlayback()

  const sendAudioRef = useRef<(buf: ArrayBuffer) => void>(() => {})
  const stableSendAudio = useCallback((buf: ArrayBuffer) => {
    sendAudioRef.current(buf)
  }, [])

  const { startCapture, stopCapture, isMuted, toggleMute, volumeRef } =
    useAudioCapture(stableSendAudio)

  const handlers = useMemo<WebSocketHandlers>(
    () => ({
      onAudioChunk: (buffer: ArrayBuffer) => enqueue(buffer),
      onTranscript: (event: TranscriptEvent) => {
        // Partial agent speech — update in-progress bubble
        if (event.role === 'agent' && !event.is_final) {
          setInProgressText(event.text)
          return
        }
        // Final transcript — commit to list, clear in-progress
        if (event.is_final) {
          if (event.role === 'agent') setInProgressText('')
          setTranscript((prev) => [
            ...prev,
            { role: event.role, text: event.text },
          ])
        }
      },
      onImageGenerating: () => setIsGenerating(true),
      onImageReady: (event: ImageReadyEvent) => {
        setLatestImageUrl(event.url)
        setImageCount(event.index + 1)
        setIsGenerating(false)
      },
      onSessionComplete: () => {
        stopCapture()
        stopPlayback()
        setIsCapturing(false)
        setSessionEnded(true)
        setIsGenerating(false)
        setInProgressText('')
      },
    }),
    [enqueue, stopPlayback, stopCapture],
  )

  const { sendAudio, connectionState } = useWebSocket(
    sessionId ?? null,
    wsParams,
    handlers,
  )

  useEffect(() => {
    sendAudioRef.current = sendAudio
  }, [sendAudio])

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
    <div
      style={{
        height: '100dvh',
        background: 'var(--vc-bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Reconnecting overlay */}
      <AnimatePresence>
        {connectionState === 'reconnecting' && !sessionEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(13,13,15,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              backdropFilter: 'blur(4px)',
            }}
          >
            <p
              style={{
                color: 'var(--vc-text-secondary)',
                fontSize: '14px',
                letterSpacing: '0.2px',
              }}
            >
              Reconnecting…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview — top 40% */}
      <div style={{ flex: '0 0 40%', overflow: 'hidden' }}>
        <LiveImagePreview
          isGenerating={isGenerating}
          latestImageUrl={latestImageUrl}
          imageCount={imageCount}
        />
      </div>

      {/* Transcript — fills remaining space above action bar */}
      <div
        style={{
          flex: '1 1 0',
          overflow: 'hidden',
          paddingBottom: '88px',
        }}
      >
        <TranscriptPanel lines={transcript} inProgressText={inProgressText} />
      </div>

      {/* Fixed bottom action bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '88px',
          background:
            'linear-gradient(to top, var(--vc-bg) 55%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0',
          padding: '0 24px',
          zIndex: 10,
        }}
      >
        {/* Mute toggle — right of MicButton layout handled inside MicButton spacer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {!sessionEnded && (
            <MicButton
              isActive={isCapturing}
              isMuted={isMuted}
              onClick={handleMicClick}
              volumeRef={volumeRef}
            />
          )}
          {isCapturing && !sessionEnded && (
            <button
              onClick={toggleMute}
              style={{
                background: 'none',
                border: 'none',
                color: isMuted
                  ? 'var(--vc-text-muted)'
                  : 'var(--vc-text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '8px',
                letterSpacing: '0.2px',
                transition: 'color 0.2s',
              }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
        </div>
      </div>

      {/* Session complete slide-up panel */}
      <AnimatePresence>
        {sessionEnded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--vc-surface)',
              borderTop: '1px solid var(--vc-border)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 24px 52px',
              zIndex: 30,
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: '32px',
                height: '3px',
                borderRadius: '2px',
                background: 'var(--vc-border)',
                margin: '0 auto 28px',
              }}
            />
            <h2
              className="font-display"
              style={{
                fontSize: '24px',
                fontWeight: 400,
                color: 'var(--vc-text-primary)',
                textAlign: 'center',
                marginBottom: '8px',
                letterSpacing: '-0.2px',
              }}
            >
              Your canvas is ready
            </h2>
            <p
              style={{
                color: 'var(--vc-text-secondary)',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '28px',
                lineHeight: 1.5,
              }}
            >
              {imageCount > 0
                ? `${imageCount} ${imageCount === 1 ? 'scene' : 'scenes'} captured`
                : 'Session complete'}
            </p>
            <button
              onClick={() => navigate(`/session/${sessionId}/canvas`)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--vc-accent)',
                color: '#0d0d0f',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.2px',
                marginBottom: '10px',
              }}
            >
              View canvas →
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: 'none',
                color: 'var(--vc-text-secondary)',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back to gallery
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
