function decode(value: string): string {
  return [...atob(value)].reverse().join('');
}

document.querySelectorAll<HTMLAnchorElement>('a[data-email]').forEach((link) => {
  const address = decode(link.dataset.email ?? '');
  if (!address) return;
  link.href = `mailto:${address}`;
  if (link.hasAttribute('data-email-text')) link.textContent = address;
});

export { decode };
