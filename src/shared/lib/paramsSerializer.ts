export function serializeParamsRepeatArray(
  rawParams: Record<string, unknown>
): string {
  const usp = new URLSearchParams();
  Object.entries(rawParams).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => usp.append(key, String(v)));
    } else {
      usp.append(key, String(value));
    }
  });
  return usp.toString();
}

