import { useRef, useState, useCallback } from 'react'
import workletUrl from '../worklets/pcm-capture.worklet.ts?url'

export function useAudioCapture(onChunk: (buffer: ArrayBuffer) => void) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  const startCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })
    streamRef.current = stream

    const audioContext = new AudioContext({ sampleRate: 16000 })
    audioContextRef.current = audioContext

    await audioContext.audioWorklet.addModule(workletUrl)

    const source = audioContext.createMediaStreamSource(stream)
    sourceRef.current = source

    const worklet = new AudioWorkletNode(audioContext, 'pcm-capture')
    workletRef.current = worklet

    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      onChunk(event.data)
    }

    source.connect(worklet)
  }, [onChunk])

  const stopCapture = useCallback(() => {
    workletRef.current?.disconnect()
    sourceRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    workletRef.current = null
    sourceRef.current = null
    audioContextRef.current = null
    streamRef.current = null
    setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsMuted(!track.enabled)
    }
  }, [])

  return { startCapture, stopCapture, isMuted, toggleMute }
}
