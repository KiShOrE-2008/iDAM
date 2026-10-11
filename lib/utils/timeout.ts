/**
 * Wraps a promise or PromiseLike (such as Supabase Postgrest builder) with a client-side timeout.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = 10000,
  timeoutMessage: string = 'Request timed out after waiting for server response.'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutMessage);
      (err as any).code = 'REQUEST_TIMEOUT';
      reject(err);
    }, ms);
  });

  return Promise.race([
    Promise.resolve(promise).then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise
  ]);
}
