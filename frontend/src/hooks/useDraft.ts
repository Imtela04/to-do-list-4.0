export function useDraft<T>(key: string) {
  const save = (data: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — draft won't persist
    }
  };

  const load = (): T | null => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null') as T;
    } catch {
      return null;
    }
  };

  const clear = (): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return { save, load, clear };
}