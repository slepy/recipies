export class ApiError extends Error {
  code: string
  entryCount: number
  fields: Record<string, string>

  constructor(message: string, code = "", entryCount = 0, fields: Record<string, string> = {}) {
    super(message)
    this.code = code
    this.entryCount = entryCount
    this.fields = fields
  }
}

// Per-field messages, so a form can show each one next to its own input.
function fieldMessages(payload: unknown) {
  const messages: Record<string, string> = {}
  if (!payload || typeof payload !== "object") return messages
  for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
    const message = Array.isArray(value) ? value[0] : value
    if (field !== "detail" && field !== "code" && typeof message === "string") messages[field] = message
  }
  return messages
}

// DRF reports a problem as {"detail": "..."} or as {"field": ["message"]}; show the first message found.
function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback
  for (const value of Object.values(payload as Record<string, unknown>)) {
    const message = Array.isArray(value) ? value[0] : value
    if (typeof message === "string" && message) return message
  }
  return fallback
}

export async function apiRequest<T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {},
  fallbackMessage = "Nie udało się zapisać zmian.",
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fields = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    throw new ApiError(
      errorMessage(payload, fallbackMessage),
      typeof fields.code === "string" ? fields.code : "",
      typeof fields.entry_count === "number" ? fields.entry_count : 0,
      fieldMessages(payload),
    )
  }
  return payload as T
}
