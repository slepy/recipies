import { FormEvent, useEffect, useState } from "react"

import {
  activateProvider,
  getProviderConfiguration,
  Provider,
  ProviderConfiguration,
  removeProviderConfiguration,
  saveProviderConfiguration,
} from "./api"

type IntegrationSettingsProps = {
  accessToken: string
  onBack: () => void
}

const emptyConfiguration: ProviderConfiguration = {
  configured: false,
  provider: null,
  is_active: false,
}

export default function IntegrationSettings({ accessToken, onBack }: IntegrationSettingsProps) {
  const [configuration, setConfiguration] = useState(emptyConfiguration)
  const [provider, setProvider] = useState<Provider>("openai")
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let isCurrent = true

    getProviderConfiguration(accessToken)
      .then((result) => {
        if (!isCurrent) return
        setConfiguration(result)
        if (result.provider) setProvider(result.provider)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : "Nie udało się pobrać ustawień.")
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsSaving(true)

    try {
      const result = await saveProviderConfiguration(accessToken, provider, apiKey)
      setConfiguration(result)
      setProvider(result.provider ?? provider)
      setApiKey("")
      setNotice("Połączenie sprawdzone. Konfiguracja zapisana; aktywuj ją, aby używać dostawcy.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać konfiguracji.")
    } finally {
      setIsSaving(false)
    }
  }

  async function activate() {
    setError("")
    setNotice("")
    setIsActivating(true)
    try {
      setConfiguration(await activateProvider(accessToken))
      setNotice("Dostawca AI jest aktywny.")
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Nie udało się aktywować dostawcy.")
    } finally {
      setIsActivating(false)
    }
  }

  async function removeConfiguration() {
    setError("")
    setNotice("")
    setIsRemoving(true)
    try {
      await removeProviderConfiguration(accessToken)
      setConfiguration(emptyConfiguration)
      setApiKey("")
      setNotice("Konfiguracja dostawcy została usunięta.")
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Nie udało się usunąć konfiguracji.")
    } finally {
      setIsRemoving(false)
    }
  }

  const isBusy = isSaving || isActivating || isRemoving

  return (
    <section className="settings-content" aria-labelledby="integrations-heading">
      <button className="settings-back" type="button" onClick={onBack}>
        ← Wróć
      </button>
      <span className="eyebrow">USTAWIENIA KONTA</span>
      <h1 id="integrations-heading">Integracje AI</h1>
      <p className="settings-intro">
        Skonfiguruj jednego dostawcę naraz. Klucz jest przechowywany wyłącznie po stronie serwera i nie
        będzie ponownie wyświetlany.
      </p>

      {isLoading ? (
        <p className="session-message" role="status">Pobieram stan integracji...</p>
      ) : (
        <>
          <p
            className={`integration-status${configuration.configured ? "" : " integration-status--empty"}`}
            role="status"
          >
            {configuration.configured
              ? `${configuration.provider === "openai" ? "OpenAI" : "OpenRouter"} · ${configuration.is_active ? "Aktywny" : "Skonfigurowany, nieaktywny"}`
              : "Nie skonfigurowano dostawcy AI"}
          </p>

          <form className="auth-form" onSubmit={saveConfiguration}>
            <fieldset className="provider-picker">
              <legend>Dostawca</legend>
              <label className="provider-choice">
                <input
                  checked={provider === "openai"}
                  name="provider"
                  onChange={() => setProvider("openai")}
                  type="radio"
                  value="openai"
                />
                OpenAI
              </label>
              <label className="provider-choice">
                <input
                  checked={provider === "openrouter"}
                  name="provider"
                  onChange={() => setProvider("openrouter")}
                  type="radio"
                  value="openrouter"
                />
                OpenRouter
              </label>
            </fieldset>

            <label className="field" htmlFor="integration-api-key">
              <span>Klucz API</span>
              <input
                autoCapitalize="none"
                autoComplete="off"
                id="integration-api-key"
                name="api-key"
                onChange={(event) => setApiKey(event.target.value)}
                required
                spellCheck={false}
                type="password"
                value={apiKey}
              />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="integration-status" role="status">{notice}</p>}

            <div className="integration-actions">
              <button className="primary-button" disabled={isBusy} type="submit">
                {isSaving ? "Sprawdzam połączenie..." : "Sprawdź i zapisz"}
              </button>
              {configuration.configured && !configuration.is_active && (
                <button
                  className="secondary-button"
                  disabled={isBusy}
                  onClick={activate}
                  type="button"
                >
                  {isActivating ? "Aktywuję..." : "Aktywuj dostawcę"}
                </button>
              )}
              {configuration.configured && (
                <button
                  className="danger-button"
                  disabled={isBusy}
                  onClick={removeConfiguration}
                  type="button"
                >
                  {isRemoving ? "Usuwam..." : "Usuń konfigurację"}
                </button>
              )}
            </div>
          </form>
          <p className="integration-notice">
            Korzystanie z dostawcy może powodować opłaty na Twoim koncie u tego dostawcy. Klucz nie
            trafia do przeglądarki poza chwilą jego wprowadzania.
          </p>
        </>
      )}
    </section>
  )
}