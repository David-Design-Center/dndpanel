/**
 * Rate limiter to control concurrent API requests
 */
export function createLimiter(max = 6) {
  let active = 0;
  const q: Array<() => void> = [];
  
  const run = () => {
    if (active >= max || q.length === 0) return;
    active++;
    const next = q.shift()!;
    next();
  };
  
  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const exec = () => task()
        .then((v) => { active--; run(); resolve(v); })
        .catch((e) => { active--; run(); reject(e); });
      q.push(exec);
      run();
    });
}
