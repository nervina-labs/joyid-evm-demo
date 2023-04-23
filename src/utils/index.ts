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

export function hexToArrayBuffer(input: string): ArrayBuffer {
  const view = new Uint8Array(input.length / 2)
  for (let i = 0; i < input.length; i += 2) {
    view[i / 2] = parseInt(input.substring(i, i + 2), 16)
  }

  return view.buffer
}

export function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
