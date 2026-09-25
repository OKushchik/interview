export function parseLlmJson<T = unknown>(raw: string): T {
  let text = raw.trim()

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    text = fenced[1].trim()
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T
    }
    throw error
  }
}
