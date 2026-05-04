export function useDraft<T>(key: string) {
  const save  = (data: T): void => localStorage.setItem(key, JSON.stringify(data));
  const load  = (): T | null => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T; }
    catch { return null; }
  };
  const clear = (): void => localStorage.removeItem(key);
  return { save, load, clear };
}