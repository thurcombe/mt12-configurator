export function expoFeel(expo: number): string {
  if (expo <= 5)  return 'direct';
  if (expo <= 25) return 'slightly softer';
  if (expo <= 50) return 'noticeably softer';
  if (expo <= 75) return 'very soft';
  return 'extremely soft';
}

export function rampDesc(up: number, down: number): string {
  const u = (up * 0.1).toFixed(1);
  const d = (down * 0.1).toFixed(1);
  if (up > 0 && down > 0) return `${u}s to speed up, ${d}s to slow down`;
  if (up > 0) return `${u}s to speed up`;
  return `${d}s to slow down`;
}
