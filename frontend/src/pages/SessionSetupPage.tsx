import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { startSession } from '../services/api'
import { addSessionId } from '../utils/storage'

const MODES = [
  {
    id: 'story',
    label: 'Story',
    description: 'Unfold a narrative from your life',
    icon: '◈',
  },
  {
    id: 'mood',
    label: 'Mood',
    description: 'Explore how you feel right now',
    icon: '◉',
  },
  {
    id: 'moment',
    label: 'Moment',
    description: 'Capture a specific memory in detail',
    icon: '✦',
  },
]

const STYLES = [
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'oil', label: 'Oil Paint' },
  { id: 'manga', label: 'Manga' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'superhero', label: 'Superhero' },
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'photorealistic', label: 'Photo' },
]

export default function SessionSetupPage() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const canBegin = selectedMode !== null && selectedStyle !== null && !loading

  const handleBegin = async () => {
    if (!selectedMode || !selectedStyle) return
    setLoading(true)
    setError(null)
    try {
      const { session_id } = await startSession(selectedMode, selectedStyle)
      addSessionId(session_id)
      navigate(
        `/session/${session_id}/live?mode=${selectedMode}&style=${selectedStyle}`,
      )
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--vc-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header style={{ padding: '52px 24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--vc-text-secondary)',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '6px',
            marginLeft: '-6px',
            lineHeight: 1,
          }}
          aria-label="Back"
        >
          ←
        </button>
        <h1
          className="font-display"
          style={{
            fontSize: '26px',
            fontWeight: 400,
            color: 'var(--vc-text-primary)',
            letterSpacing: '-0.3px',
          }}
        >
          New session
        </h1>
      </header>

      {/* Steps */}
      <main
        style={{
          padding: '36px 24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '44px',
        }}
      >
        {/* Step 1: Mode */}
        <section>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: 'var(--vc-text-muted)',
              marginBottom: '16px',
            }}
          >
            01 — Mode
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id
              return (
                <motion.button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    border: `1px solid ${isSelected ? 'rgba(200,149,108,0.5)' : 'var(--vc-border)'}`,
                    background: isSelected
                      ? 'var(--vc-accent-dim)'
                      : 'var(--vc-surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.2s, background 0.2s',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      color: isSelected
                        ? 'var(--vc-accent)'
                        : 'var(--vc-text-muted)',
                      lineHeight: 1,
                      transition: 'color 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {mode.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'var(--vc-text-primary)',
                        marginBottom: '3px',
                      }}
                    >
                      {mode.label}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--vc-text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {mode.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'var(--vc-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '10px',
                        color: '#0d0d0f',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* Step 2: Art style */}
        <AnimatePresence>
          {selectedMode && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
            >
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  color: 'var(--vc-text-muted)',
                  marginBottom: '16px',
                }}
              >
                02 — Art style
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  scrollbarWidth: 'none',
                }}
              >
                {STYLES.map((style) => {
                  const isSelected = selectedStyle === style.id
                  return (
                    <motion.button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      whileTap={{ scale: 0.94 }}
                      style={{
                        flexShrink: 0,
                        padding: '12px 18px',
                        borderRadius: '12px',
                        border: `1px solid ${isSelected ? 'rgba(200,149,108,0.5)' : 'var(--vc-border)'}`,
                        background: isSelected
                          ? 'var(--vc-accent-dim)'
                          : 'var(--vc-surface)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isSelected
                            ? 'var(--vc-accent)'
                            : 'var(--vc-text-secondary)',
                          letterSpacing: '0.2px',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.2s',
                        }}
                      >
                        {style.label}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom action */}
      <div
        style={{
          padding: '16px 24px 48px',
          borderTop: '1px solid var(--vc-border-subtle)',
        }}
      >
        {error && (
          <p
            style={{
              color: '#e07070',
              fontSize: '13px',
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleBegin}
          disabled={!canBegin}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: canBegin ? 'var(--vc-accent)' : 'var(--vc-surface)',
            color: canBegin ? '#0d0d0f' : 'var(--vc-text-muted)',
            fontSize: '15px',
            fontWeight: 600,
            border: `1px solid ${canBegin ? 'transparent' : 'var(--vc-border)'}`,
            cursor: canBegin ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            letterSpacing: '0.2px',
          }}
        >
          {loading ? 'Starting…' : 'Begin'}
        </button>
      </div>
    </div>
  )
}
