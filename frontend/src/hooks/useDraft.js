export function useDraft(key) {
  const save  = (data) => localStorage.setItem(key, JSON.stringify(data));
  const load  = ()     => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  };
  const clear = ()     => localStorage.removeItem(key);
  return { save, load, clear };
}