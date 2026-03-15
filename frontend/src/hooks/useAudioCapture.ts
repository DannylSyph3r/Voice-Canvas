import { useRef, useState, useCallback } from 'react'
import workletUrl from '../worklets/pcm-capture.worklet.ts?url'

export function useAudioCapture(onChunk: (buffer: ArrayBuffer) => void) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
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

    // Analyser tapped off source for volume visualisation
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser
    source.connect(analyser)

    const worklet = new AudioWorkletNode(audioContext, 'pcm-capture')
    workletRef.current = worklet
    worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      onChunk(event.data)
    }
    source.connect(worklet)

    // Poll amplitude via rAF — writes to ref, no state, no re-renders
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const pollVolume = () => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      // avg speech sits around 20-70; normalize to 0-1 with some sensitivity boost
      volumeRef.current = Math.min(1, avg / 60)
      rafRef.current = requestAnimationFrame(pollVolume)
    }
    rafRef.current = requestAnimationFrame(pollVolume)
  }, [onChunk])

  const stopCapture = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    volumeRef.current = 0
    workletRef.current?.disconnect()
    sourceRef.current?.disconnect()
    analyserRef.current = null
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

  return { startCapture, stopCapture, isMuted, toggleMute, volumeRef }
}
