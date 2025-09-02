/**
 * Exponential backoff with jitter for 429 retries
 */
export async function backoff<T>(
  fn: () => Promise<T>, 
  attempt = 0, 
  retryAfter?: number
): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const status = e?.status || e?.result?.error?.code;
    if (status !== 429) throw e;

    // Extract Retry-After header or use exponential backoff
    const ra = Number(e?.headers?.get?.('Retry-After')) || retryAfter || Math.min(2 ** attempt, 32);
    const jitter = ra * (0.8 + Math.random() * 0.4);
    
    console.log(`⏳ 429 rate limit hit, retrying in ${jitter.toFixed(1)}s (attempt ${attempt + 1})`);
    
    await new Promise(r => setTimeout(r, jitter * 1000));
    return backoff(fn, attempt + 1);
  }
}
