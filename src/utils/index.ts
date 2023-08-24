export function truncateMiddle(
  str = '',
  takeLength = 6,
  tailLength = takeLength,
  pad = '...'
): string {
  if (takeLength + tailLength >= str.length) return str
  return `${str.slice(0, takeLength)}${pad}${str.slice(-tailLength)}`
}

export function remove0x(s: string) {
  return s.startsWith('0x') ? s.slice(2) : s
}

export function append0x(s: string) {
  if (s.startsWith('0x')) {
    return s
  }
  return `0x${s}`
}
