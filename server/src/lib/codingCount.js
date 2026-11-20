/** How many coding tasks a config needs (old configs without codingCount had one). */
export function codingTaskCount(config) {
  if (!config?.enableCoding) return 0
  return config.codingCount ?? 1
}
