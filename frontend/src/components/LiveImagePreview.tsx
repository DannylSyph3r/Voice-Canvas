import { AnimatePresence, motion } from 'framer-motion'

interface LiveImagePreviewProps {
  isGenerating: boolean
  latestImageUrl: string | null
  imageCount: number
}

export default function LiveImagePreview({
  isGenerating,
  latestImageUrl,
  imageCount,
}: LiveImagePreviewProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--vc-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Generated image with fade-in */}
      <AnimatePresence mode="wait">
        {latestImageUrl && (
          <motion.img
            key={latestImageUrl}
            src={latestImageUrl}
            alt="Generated scene"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Shimmer when generating with no prior image */}
      {isGenerating && !latestImageUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, var(--vc-surface) 0%, var(--vc-surface-raised) 50%, var(--vc-surface) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s infinite',
          }}
        />
      )}

      {/* Subtle top bar pulse when generating with a prior image */}
      {isGenerating && latestImageUrl && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--vc-accent)',
            opacity: 0.7,
            animation: 'blink 1.2s ease-in-out infinite',
          }}
        />
      )}

      {/* Empty state */}
      {!isGenerating && !latestImageUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              color: 'var(--vc-text-muted)',
              fontSize: '13px',
              letterSpacing: '0.2px',
            }}
          >
            Scenes will appear here
          </p>
        </div>
      )}

      {/* Scene count badge */}
      {imageCount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            padding: '4px 10px',
            borderRadius: '100px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {imageCount} / 8
        </div>
      )}
    </div>
  )
}
