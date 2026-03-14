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
  if (!isGenerating && latestImageUrl === null) return null

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-800">
      <AnimatePresence mode="wait">
        {latestImageUrl && (
          <motion.img
            key={latestImageUrl}
            src={latestImageUrl}
            alt="Generated scene"
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {isGenerating && !latestImageUrl && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-pulse" />
      )}

      {isGenerating && latestImageUrl && (
        <div className="absolute inset-x-0 top-0 h-1 bg-white/60 animate-pulse" />
      )}

      {imageCount > 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs bg-black/50 text-white">
          {imageCount} / 8
        </div>
      )}
    </div>
  )
}
