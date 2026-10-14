export type Provider = "openai" | "openrouter"

export type ProviderConfiguration = {
  configured: boolean
  provider: Provider | null
  is_active: boolean
}

const integrationsPath = "/api/integrations/ai"

async function readResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? payload.detail
        : null
    throw new Error(typeof detail === "string" ? detail : "Nie udało się wykonać operacji.")
  }
  return payload
}

async function request(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  return readResponse(response)
}

export async function getProviderConfiguration(accessToken: string) {
  return (await request(integrationsPath, accessToken)) as ProviderConfiguration
}

export async function saveProviderConfiguration(
  accessToken: string,
  provider: Provider,
  apiKey: string,
) {
  return (await request(integrationsPath, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, api_key: apiKey }),
  })) as ProviderConfiguration
}

export async function activateProvider(accessToken: string) {
  return (await request(`${integrationsPath}/activate/`, accessToken, {
    method: "POST",
  })) as ProviderConfiguration
}

export async function removeProviderConfiguration(accessToken: string) {
  await request(integrationsPath, accessToken, { method: "DELETE" })
}