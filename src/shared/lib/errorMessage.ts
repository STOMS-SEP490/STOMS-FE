/**
 * Lấy message lỗi từ object reject của axios interceptor.
 * Interceptor reject với error.response?.data, nên err là body API (string hoặc object).
 */
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.detail === 'string') return o.detail; // ASP.NET ProblemDetails
    if (typeof o.title === 'string') return o.title;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Có lỗi xảy ra';
}
