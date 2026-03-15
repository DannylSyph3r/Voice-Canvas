import { useEffect, useRef } from 'react'

interface TranscriptLine {
  role: 'user' | 'agent'
  text: string
}

interface TranscriptPanelProps {
  lines: TranscriptLine[]
  inProgressText: string
}

function Bubble({
  role,
  text,
  inProgress = false,
}: {
  role: 'user' | 'agent'
  text: string
  inProgress?: boolean
}) {
  const isUser = role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: isUser
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          background: isUser ? 'var(--vc-accent-dim)' : 'var(--vc-surface)',
          border: `1px solid ${isUser ? 'rgba(200,149,108,0.2)' : 'var(--vc-border)'}`,
          color: isUser ? 'var(--vc-text-primary)' : 'var(--vc-text-secondary)',
          fontSize: '14px',
          lineHeight: 1.55,
          opacity: inProgress ? 0.75 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {text}
        {inProgress && (
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '13px',
              background: 'var(--vc-accent)',
              marginLeft: '3px',
              verticalAlign: 'middle',
              borderRadius: '1px',
              animation: 'blink 1s step-end infinite',
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function TranscriptPanel({
  lines,
  inProgressText,
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length, inProgressText])

  const isEmpty = lines.length === 0 && !inProgressText

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        scrollbarWidth: 'none',
      }}
    >
      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              color: 'var(--vc-text-muted)',
              fontSize: '13px',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            Tap the mic to begin
          </p>
        </div>
      ) : (
        <>
          {lines.map((line, i) => (
            <Bubble key={i} role={line.role} text={line.text} />
          ))}
          {inProgressText && (
            <Bubble role="agent" text={inProgressText} inProgress />
          )}
        </>
      )}
      <div ref={bottomRef} style={{ height: '1px', flexShrink: 0 }} />
    </div>
  )
}
