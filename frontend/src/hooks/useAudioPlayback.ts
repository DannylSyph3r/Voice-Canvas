import { useRef, useState, useCallback } from 'react'

export function useAudioPlayback() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const nextStartTimeRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const getContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      nextStartTimeRef.current = 0
    }
    return audioContextRef.current
  }, [])

  const enqueue = useCallback(
    (int16Buffer: ArrayBuffer) => {
      const ctx = getContext()
      const int16 = new Int16Array(int16Buffer)
      const float32 = new Float32Array(int16.length)

      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000)
      audioBuffer.getChannelData(0).set(float32)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current)
      source.start(startTime)
      nextStartTimeRef.current = startTime + audioBuffer.duration

      setIsPlaying(true)
      source.onended = () => {
        if (nextStartTimeRef.current <= ctx.currentTime) {
          setIsPlaying(false)
        }
      }
    },
    [getContext],
  )

  const stop = useCallback(() => {
    audioContextRef.current?.close()
    audioContextRef.current = null
    nextStartTimeRef.current = 0
    setIsPlaying(false)
  }, [])

  return { enqueue, stop, isPlaying }
}
