import { Fragment } from 'react'

interface TopicContentProps {
  content: string
}

const FENCE = /```[^\n`]*\n([\s\S]*?)```/g
const INLINE = /`([^`\n]+)`/g

/** Текст з `inline` кодом у <code>. */
function renderInline(text: string) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0
    if (start > last) parts.push(text.slice(last, start))
    parts.push(
      <code key={start} className="px-1.5 py-0.5 rounded bg-hover-strong text-cyan font-mono text-[0.9em]">
        {m[1]}
      </code>,
    )
    last = start + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/**
 * Текст теми: блоки коду між ``` ... ``` відображаються як <pre><code>,
 * фрагменти в `зворотних лапках` — як inline <code>. Решта — звичайний текст.
 */
export function TopicContent({ content }: TopicContentProps) {
  const nodes: React.ReactNode[] = []
  let last = 0
  for (const m of content.matchAll(FENCE)) {
    const start = m.index ?? 0
    if (start > last) nodes.push(<Fragment key={`t${last}`}>{renderInline(content.slice(last, start))}</Fragment>)
    nodes.push(
      <pre key={`c${start}`} className="my-4 p-4 rounded-xl bg-black/40 border border-border overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-text">{m[1].replace(/\n$/, '')}</code>
      </pre>,
    )
    last = start + m[0].length
  }
  if (last < content.length) nodes.push(<Fragment key={`t${last}`}>{renderInline(content.slice(last))}</Fragment>)

  return <div className="text-text whitespace-pre-wrap leading-relaxed">{nodes}</div>
}
