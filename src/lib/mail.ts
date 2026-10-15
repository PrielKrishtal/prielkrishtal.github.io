export function encodeEmail(address: string): string {
  return btoa([...address].reverse().join(''));
}

export function readableEmail(address: string): string {
  return address.replace('@', ' [at] ');
}
