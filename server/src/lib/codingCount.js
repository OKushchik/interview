/** Скільки завдань з кодингу потрібно для конфігурації (старі конфігурації без codingCount мали одне). */
export function codingTaskCount(config) {
  if (!config?.enableCoding) return 0
  return config.codingCount ?? 1
}
