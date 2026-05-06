export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string' && err.trim()) return err;

  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;

    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.Message === 'string' && o.Message.trim()) return o.Message;
    if (typeof o.detail === 'string' && o.detail.trim()) return o.detail;
    if (typeof o.title === 'string' && o.title.trim()) return o.title;

    if (o.errors && typeof o.errors === 'object' && !Array.isArray(o.errors)) {
      const msgs = Object.values(o.errors as Record<string, unknown>)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((v) => typeof v === 'string' && v.trim())
        .join('; ');
      if (msgs) return msgs;
    }

    const keys = Object.keys(o);
    if (keys.length === 1) {
      const val = o[keys[0]];
      if (typeof val === 'string' && val.trim()) return val;
    }
  }

  if (err instanceof Error && err.message) return err.message;

  return 'Có lỗi xảy ra';
}
