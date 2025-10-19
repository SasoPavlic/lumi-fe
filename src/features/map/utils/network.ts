export function withTimeout<T>(p: Promise<T>, ms: number, abort: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => { abort.abort(); reject(new Error(`Request timed out after ${ms} ms`)); }, ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}
