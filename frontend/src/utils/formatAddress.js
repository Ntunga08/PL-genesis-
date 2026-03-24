export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatTxHash(hash, chars = 10) {
  if (!hash) return '';
  return `${hash.slice(0, chars)}...`;
}
