import { FormEvent, useEffect, useState } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router"

import {
  Account,
  getCurrentUser,
  logIn,
  logOut,
  refreshAccessToken,
  register,
} from "./features/accounts/api"
import IntegrationSettings from "./features/integrations/IntegrationSettings"
import RecipeWorkspace from "./features/recipes/RecipeWorkspace"

type AuthState = "loading" | "anonymous" | "authenticated"

const foodImage =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1800&q=85"

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = pathname === "/register" ? "register" : "login"
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setError("")
  }, [mode])

  useEffect(() => {
    let isCurrent = true

    async function restoreSession() {
      const token = await refreshAccessToken()
      if (!isCurrent) return
      if (!token) {
        setAuthState("anonymous")
        return
      }

      try {
        const currentAccount = await getCurrentUser(token)
        if (!isCurrent) return
        setAccessToken(token)
        setAccount(currentAccount)
        setAuthState("authenticated")
      } catch {
        if (isCurrent) setAuthState("anonymous")
      }
    }

    void restoreSession()
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!accessToken) return

    let isCurrent = true
    const refreshTimer = window.setTimeout(async () => {
      const token = await refreshAccessToken()
      if (!isCurrent) return
      if (token) {
        setAccessToken(token)
        return
      }

      setAccessToken(null)
      setAccount(null)
      setAuthState("anonymous")
    }, 23 * 60 * 60 * 1000)

    return () => {
      isCurrent = false
      window.clearTimeout(refreshTimer)
    }
  }, [accessToken])

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const token = mode === "register" ? await register(email, password) : await logIn(email, password)
      const currentAccount = await getCurrentUser(token)
      setAccessToken(token)
      setAccount(currentAccount)
      setAuthState("authenticated")
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nie udało się zalogować.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signOut() {
    setError("")
    try {
      await logOut()
      setAccessToken(null)
      setAccount(null)
      setAuthState("anonymous")
    } catch {
      setError("Nie udało się zakończyć sesji. Spróbuj ponownie.")
    }
  }

  if (authState === "authenticated" && account && accessToken) {
    return (
      <Routes>
        <Route
          path="/recipes"
          element={
            <RecipeWorkspace
              accessToken={accessToken}
              accountEmail={account.email}
              accountError={error}
              onOpenIntegrations={() => navigate("/settings/integrations")}
              onSignOut={signOut}
            />
          }
        />
        <Route
          path="/settings/integrations"
          element={
            <main className="recipe-app integration-page">
              <IntegrationSettings accessToken={accessToken} onBack={() => navigate("/recipes")} />
            </main>
          }
        />
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
    )
  }

  if (authState === "anonymous" && pathname !== "/login" && pathname !== "/register") {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="auth-layout">
      <section className="food-panel" aria-label="Miska, przepisy na co dzień">
        <img className="food-panel__image" src={foodImage} alt="Kolorowa sałatka ze świeżych warzyw" />
        <div className="food-panel__shade" />
        <a className="wordmark wordmark--light" href="/" aria-label="Miska, strona główna">
          miska<span>.</span>
        </a>
        <div className="food-panel__caption">
          <span className="eyebrow">DOBRZE BYĆ U SIEBIE</span>
          <p>Codzienne gotowanie zaczyna się od dobrego pomysłu.</p>
        </div>
        <p className="food-panel__credit">PRZEPISY I LISTY ZAKUPÓW W JEDNYM MIEJSCU</p>
      </section>

      <section className="form-panel">
        <a className="wordmark wordmark--dark" href="/" aria-label="Miska, strona główna">
          miska<span>.</span>
        </a>

        {authState === "loading" ? (
          <p className="session-message" role="status">Sprawdzam sesję...</p>
        ) : (
          <div className="form-content">
            <span className="eyebrow">{mode === "login" ? "WRÓĆ DO SWOJEJ KUCHNI" : "ZACZNIJ OD DOBREGO SMAKU"}</span>
            <h1>{mode === "login" ? "Zaloguj się" : "Utwórz konto"}</h1>
            <p className="form-intro">
              {mode === "login"
                ? "Zapisane przepisy już na Ciebie czekają."
                : "Zachowaj przepisy i miej zakupy pod ręką."}
            </p>

            <form className="auth-form" onSubmit={submitForm}>
              <label className="field" htmlFor="email">
                <span>Adres e-mail</span>
                <input
                  autoComplete="email"
                  id="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label className="field" htmlFor="password">
                <span>Hasło</span>
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  id="password"
                  minLength={mode === "register" ? 12 : undefined}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                {mode === "register" && <small>Co najmniej 12 znaków</small>}
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Chwila..." : mode === "login" ? "Zaloguj się" : "Utwórz konto"}
              </button>
            </form>

            <p className="mode-switch">
              {mode === "login" ? "Nie masz jeszcze konta?" : "Masz już konto?"}{" "}
              <button
                type="button"
                onClick={() => {
                  navigate(mode === "login" ? "/register" : "/login")
                }}
              >
                {mode === "login" ? "Utwórz konto" : "Zaloguj się"}
              </button>
            </p>
            <p className="privacy-note">Twoje konto jest prywatne. Nie udostępniamy Twoich danych.</p>
          </div>
        )}

        <footer className="form-footer">MISKA · DOBRZE ZAPLANOWANE GOTOWANIE</footer>
      </section>
    </main>
  )
}