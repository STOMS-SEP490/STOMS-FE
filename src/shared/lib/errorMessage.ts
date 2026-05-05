
export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.Message === 'string') return o.Message;
    if (typeof o.detail === 'string') return o.detail; 
    if (typeof o.title === 'string') return o.title;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Có lỗi xảy ra';
}
