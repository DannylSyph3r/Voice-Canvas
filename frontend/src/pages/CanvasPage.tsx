import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, type Session } from '../services/api'
import { getUserId } from '../utils/storage'

export default function CanvasPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = useMemo(() => getUserId(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    getSession(userId, sessionId)
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId, sessionId])

  const modeLabel = session
    ? session.mode.charAt(0).toUpperCase() + session.mode.slice(1)
    : 'Canvas'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--vc-bg)' }}>
      {/* Header */}
      <header
        style={{
          padding: '52px 24px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--vc-border-subtle)',
        }}
      >
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
          aria-label="Back to gallery"
        >
          ←
        </button>
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--vc-text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            {modeLabel} canvas
          </h1>
          {session && (
            <p
              style={{
                color: 'var(--vc-text-muted)',
                fontSize: '12px',
                marginTop: '3px',
                letterSpacing: '0.2px',
              }}
            >
              {session.style.charAt(0).toUpperCase() + session.style.slice(1)} ·{' '}
              {new Date(session.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </header>

      {/* Image grid */}
      <main style={{ padding: '24px 20px 60px' }}>
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: '12px',
                  background: 'linear-gradient(90deg, var(--vc-surface) 0%, var(--vc-surface-raised) 50%, var(--vc-surface) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.8s infinite',
                }}
              />
            ))}
          </div>
        ) : !session || session.images.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <p style={{ color: 'var(--vc-text-muted)', fontSize: '14px' }}>
              No scenes were captured in this session
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              {[...session.images]
                .sort((a, b) => a.index - b.index)
                .map((image) => (
                  <div
                    key={image.index}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid var(--vc-border)',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.description}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ))}
            </div>

            {/* Transcript — if available */}
            {session.transcript && (
              <div
                style={{
                  marginTop: '36px',
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'var(--vc-surface)',
                  border: '1px solid var(--vc-border)',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'var(--vc-text-muted)',
                    marginBottom: '14px',
                  }}
                >
                  Transcript
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--vc-text-secondary)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {session.transcript}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
