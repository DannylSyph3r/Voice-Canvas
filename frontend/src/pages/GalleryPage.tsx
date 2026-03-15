import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSessions, type Session } from '../services/api'
import { getUserId } from '../utils/storage'

const MODE_LABELS: Record<string, string> = {
  story: 'Story',
  mood: 'Mood',
  moment: 'Moment',
}

const STYLE_LABELS: Record<string, string> = {
  watercolor: 'Watercolor',
  oil: 'Oil Paint',
  manga: 'Manga',
  pixel: 'Pixel',
  superhero: 'Superhero',
  minecraft: 'Minecraft',
  photorealistic: 'Photo',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SkeletonCard() {
  return (
    <div
      style={{
        aspectRatio: '3/4',
        borderRadius: '16px',
        background: 'linear-gradient(90deg, var(--vc-surface) 0%, var(--vc-surface-raised) 50%, var(--vc-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite',
        border: '1px solid var(--vc-border)',
      }}
    />
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: '100px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function SessionCard({
  session,
  onClick,
}: {
  session: Session
  onClick: () => void
}) {
  const firstImage = session.images[0]

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        aspectRatio: '3/4',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--vc-border)',
        background: 'var(--vc-surface)',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        width: '100%',
        display: 'block',
      }}
    >
      {firstImage ? (
        <img
          src={firstImage.url}
          alt={firstImage.description}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--vc-surface-raised)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 35%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Top badges */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '6px',
        }}
      >
        <Badge>{MODE_LABELS[session.mode] ?? session.mode}</Badge>
        <Badge>{STYLE_LABELS[session.style] ?? session.style}</Badge>
      </div>

      {/* Bottom info */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
          {formatDate(session.created_at)}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
          {session.images.length}{' '}
          {session.images.length === 1 ? 'scene' : 'scenes'}
        </span>
      </div>
    </button>
  )
}

export default function GalleryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  const userId = useMemo(() => getUserId(), [])

  useEffect(() => {
    listSessions(userId)
      .then((data) =>
        setSessions(data.filter((s) => s.status === 'complete')),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--vc-bg)' }}>
      {/* Header */}
      <header
        style={{
          padding: '52px 24px 28px',
          borderBottom: '1px solid var(--vc-border-subtle)',
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: '34px',
            fontWeight: 400,
            color: 'var(--vc-text-primary)',
            letterSpacing: '-0.5px',
          }}
        >
          VoiceCanvas
        </h1>
        <p
          style={{
            color: 'var(--vc-text-muted)',
            fontSize: '13px',
            marginTop: '5px',
            letterSpacing: '0.1px',
          }}
        >
          Your memories, visualised
        </p>
      </header>

      {/* Content */}
      <main style={{ padding: '28px 20px 120px' }}>
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              color: 'var(--vc-text-muted)',
              fontSize: '14px',
            }}
          >
            Could not load sessions. Check your connection.
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '55vh',
              textAlign: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--vc-accent-dim)',
                border: '1px solid rgba(200,149,108,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              ✦
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: '24px',
                fontWeight: 400,
                color: 'var(--vc-text-primary)',
              }}
            >
              No stories yet
            </h2>
            <p
              style={{
                color: 'var(--vc-text-secondary)',
                fontSize: '14px',
                maxWidth: '220px',
                lineHeight: 1.6,
              }}
            >
              Speak a memory, a mood, or a moment. We'll paint it for you.
            </p>
            <button
              onClick={() => navigate('/session/new')}
              style={{
                marginTop: '6px',
                padding: '13px 30px',
                borderRadius: '100px',
                background: 'var(--vc-accent)',
                color: '#0d0d0f',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.2px',
              }}
            >
              Begin your first
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            {sessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                onClick={() =>
                  navigate(`/session/${session.session_id}/canvas`)
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/session/new')}
        style={{
          position: 'fixed',
          bottom: '36px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--vc-accent)',
          color: '#0d0d0f',
          fontSize: '26px',
          fontWeight: 300,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 28px var(--vc-accent-glow)',
          lineHeight: 1,
        }}
        aria-label="New session"
      >
        +
      </button>
    </div>
  )
}
