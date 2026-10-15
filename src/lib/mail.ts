export function decodeEmail(encoded: string): string {
  return [...atob(encoded)].reverse().join('');
}

export function readableEmail(encoded: string): string {
  return decodeEmail(encoded).replace('@', ' [at] ');
}
