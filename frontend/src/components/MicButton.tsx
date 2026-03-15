import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface MicButtonProps {
  isActive: boolean
  isMuted: boolean
  onClick: () => void
  volumeRef: React.RefObject<number>
}

const BAR_COUNT = 4

export default function MicButton({
  isActive,
  isMuted,
  onClick,
  volumeRef,
}: MicButtonProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive || isMuted) {
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '3px'
      })
      return
    }

    const animate = () => {
      const volume = volumeRef.current
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        const variation = Math.sin(Date.now() / 180 + i * 1.4) * 0.35 + 0.65
        const height = Math.max(3, Math.min(20, volume * 20 * variation))
        bar.style.height = `${height}px`
      })
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, isMuted, volumeRef])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      {/* Volume bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          height: '24px',
          opacity: isActive && !isMuted ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              barsRef.current[i] = el
            }}
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '2px',
              background: 'var(--vc-accent)',
              alignSelf: 'center',
              transition: 'height 0.06s ease',
            }}
          />
        ))}
      </div>

      {/* Circular button */}
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: isActive
            ? isMuted
              ? 'var(--vc-surface-raised)'
              : 'var(--vc-accent)'
            : 'var(--vc-surface)',
          boxShadow: isActive && !isMuted
            ? '0 0 0 1px rgba(200,149,108,0.3)'
            : '0 0 0 1px var(--vc-border)',
          transition: 'background 0.2s, box-shadow 0.2s',
          flexShrink: 0,
        }}
      >
        {/* Pulsing ring when active and unmuted */}
        {isActive && !isMuted && (
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.35, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid var(--vc-accent)',
              pointerEvents: 'none',
            }}
          />
        )}

        <span
          style={{
            fontSize: '20px',
            userSelect: 'none',
            filter: isActive && isMuted ? 'grayscale(1) opacity(0.5)' : 'none',
            transition: 'filter 0.2s',
          }}
        >
          {isActive ? (isMuted ? '🔇' : '⏹') : '🎙'}
        </span>
      </motion.button>

      {/* Spacer to optically balance the bars side */}
      <div
        style={{
          width: `${BAR_COUNT * 6}px`,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
