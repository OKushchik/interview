/** Випадково обирає count елементів зі списку (Fisher-Yates), оригінал не змінює. */
export function pickRandom(list, count) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.max(0, count))
}
