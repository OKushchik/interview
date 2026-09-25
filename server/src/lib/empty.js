export function isEmptyList(value) {
  return value == null || (Array.isArray(value) && value.length === 0)
}

export function isEmptyObject(value) {
  return value == null || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
}
