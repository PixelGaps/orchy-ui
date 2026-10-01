const configuredBase = (import.meta.env.VITE_ORCHY_API_BASE_URL ?? "").trim()

export const ORCHY_API_BASE_URL = configuredBase.replace(/\/+$/, "")

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new TypeError("API path must start with /")
  }
  return `${ORCHY_API_BASE_URL}${path}`
}
