export function sessionId() {
  const key = 'trustguard-session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function saveResult(id: string, value: unknown) {
  sessionStorage.setItem(`trustguard-result-${id}`, JSON.stringify(value));
}

export function loadResult<T>(id: string): T | null {
  const value = sessionStorage.getItem(`trustguard-result-${id}`);
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

export function clearLocalResults() {
  Object.keys(sessionStorage).filter((key) => key.startsWith('trustguard-result-'))
    .forEach((key) => sessionStorage.removeItem(key));
}