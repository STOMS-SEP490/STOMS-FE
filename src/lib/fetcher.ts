export const fetcher = async <T>(url: string, options?: RequestInit) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return (await res.json()) as T
}

export default fetcher
