export type Account = {
  id: number
  email: string
}

const authPath = "/api/auth"
let csrfToken: string | null = null
let refreshRequest: Promise<string | null> | null = null

async function readPayload(response: Response) {
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = getErrorMessage(payload)
    throw new Error(message)
  }
  return payload
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const messages = Object.values(payload).flatMap((value) =>
      Array.isArray(value) ? value : [value],
    )
    const message = messages.find((value) => typeof value === "string")
    if (typeof message === "string") return message
  }
  return "Wystąpił problem. Spróbuj ponownie."
}

async function getCsrfToken() {
  const response = await fetch(`${authPath}/csrf/`, { credentials: "include" })
  const payload = (await readPayload(response)) as { csrfToken: string }
  csrfToken = payload.csrfToken
  return csrfToken
}

async function protectedCookieRequest(path: string) {
  const token = csrfToken ?? (await getCsrfToken())
  return fetch(`${authPath}/${path}/`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": token },
  })
}

async function authenticate(path: "login" | "register", email: string, password: string) {
  const response = await fetch(`${authPath}/${path}/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const payload = (await readPayload(response)) as { accessToken: string }
  return payload.accessToken
}

export function logIn(email: string, password: string) {
  return authenticate("login", email, password)
}

export function register(email: string, password: string) {
  return authenticate("register", email, password)
}

export function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      try {
        const response = await protectedCookieRequest("refresh")
        const payload = (await readPayload(response)) as { accessToken: string }
        return payload.accessToken
      } catch {
        return null
      } finally {
        refreshRequest = null
      }
    })()
  }
  return refreshRequest
}

export async function getCurrentUser(accessToken: string): Promise<Account> {
  const response = await fetch(`${authPath}/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return (await readPayload(response)) as Account
}

export async function logOut() {
  const response = await protectedCookieRequest("logout")
  if (!response.ok) await readPayload(response)
  csrfToken = null
}