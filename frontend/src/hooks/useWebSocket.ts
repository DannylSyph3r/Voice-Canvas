import { useRef, useState, useCallback, useEffect } from 'react'

export type ConnectionState = 'connected' | 'reconnecting' | 'failed' | 'disconnected'

export interface TranscriptEvent {
  type: 'transcript'
  role: 'user' | 'agent'
  text: string
  is_final: boolean
}

export interface WebSocketHandlers {
  onAudioChunk?: (buffer: ArrayBuffer) => void
  onTranscript?: (event: TranscriptEvent) => void
  onImageGenerating?: () => void
  onImageReady?: (url: string) => void
  onSessionComplete?: () => void
}

const MAX_ATTEMPTS = 5

export function useWebSocket(
  sessionId: string | null,
  params: Record<string, string>,
  handlers: WebSocketHandlers,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)
  const handlersRef = useRef(handlers)
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    handlersRef.current = handlers
  })

  const [connectionState, setConnectionState] = useState<ConnectionState>('reconnecting')

  const connect = useCallback(() => {
    if (!sessionId) return

    const query = new URLSearchParams(params).toString()
    const ws = new WebSocket(`ws://${window.location.host}/ws/${sessionId}?${query}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      attemptsRef.current = 0
      setConnectionState('connected')
    }

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        handlersRef.current.onAudioChunk?.(event.data)
        return
      }
      try {
        const msg = JSON.parse(event.data as string)
        switch (msg.type) {
          case 'transcript':
            handlersRef.current.onTranscript?.(msg as TranscriptEvent)
            break
          case 'image_generating':
            handlersRef.current.onImageGenerating?.()
            break
          case 'image_ready':
            handlersRef.current.onImageReady?.(msg.url)
            break
          case 'session_complete':
            handlersRef.current.onSessionComplete?.()
            break
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = (event: CloseEvent) => {
      if (event.wasClean) {
        setConnectionState('disconnected')
        return
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setConnectionState('failed')
        return
      }
      attemptsRef.current += 1
      setConnectionState('reconnecting')
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000)
      setTimeout(() => connectRef.current(), delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [sessionId, params])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer)
    }
  }, [])

  const sendControl = useCallback((action: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'control', action }))
    }
  }, [])

  return { sendAudio, sendControl, connectionState }
}
