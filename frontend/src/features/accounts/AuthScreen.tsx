import { FormEvent, useEffect, useState } from "react"

type AuthMode = "login" | "register"

type AuthScreenProps = {
  mode: AuthMode
  isLoading: boolean
  onSubmit: (email: string, password: string) => Promise<void>
  onSwitchMode: () => void
}

const foodImage =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1800&q=85"

export default function AuthScreen({ mode, isLoading, onSubmit, onSwitchMode }: AuthScreenProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [error, setError] = useState("")
  const [confirmationError, setConfirmationError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === "register"

  useEffect(() => {
    setError("")
    setConfirmationError("")
    setPasswordConfirmation("")
  }, [mode])

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setConfirmationError("")
    // The server receives one password; the second field only catches a typo before sending it.
    if (isRegistering && password !== passwordConfirmation) {
      setConfirmationError("Hasła nie są takie same.")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(email, password)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Nie udało się zalogować.")
      setIsSubmitting(false)
    }
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
        <a className="wordmark wordmark--dark wordmark--mobile" href="/" aria-label="Miska, strona główna">
          miska<span>.</span>
        </a>

        {isLoading ? (
          <p className="session-message" role="status">Sprawdzam sesję...</p>
        ) : (
          <div className="form-content">
            <span className="eyebrow">{isRegistering ? "ZACZNIJ OD DOBREGO SMAKU" : "WRÓĆ DO SWOJEJ KUCHNI"}</span>
            <h1>{isRegistering ? "Utwórz konto" : "Zaloguj się"}</h1>
            <p className="form-intro">
              {isRegistering ? "Zachowaj przepisy i miej zakupy pod ręką." : "Zapisane przepisy już na Ciebie czekają."}
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
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  id="password"
                  minLength={isRegistering ? 12 : undefined}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                {isRegistering && <small>Co najmniej 12 znaków</small>}
              </label>
              {isRegistering && (
                <label className="field" htmlFor="password-confirmation">
                  <span>Powtórz hasło</span>
                  <input
                    aria-describedby={confirmationError ? "password-confirmation-error" : undefined}
                    aria-invalid={confirmationError ? true : undefined}
                    autoComplete="new-password"
                    id="password-confirmation"
                    name="password-confirmation"
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    required
                    type="password"
                    value={passwordConfirmation}
                  />
                  {confirmationError && (
                    <small className="form-error" id="password-confirmation-error" role="alert">
                      {confirmationError}
                    </small>
                  )}
                </label>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button primary-button--block" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Chwila..." : isRegistering ? "Utwórz konto" : "Zaloguj się"}
              </button>
            </form>

            <p className="mode-switch">
              {isRegistering ? "Masz już konto?" : "Nie masz jeszcze konta?"}{" "}
              <button onClick={onSwitchMode} type="button">
                {isRegistering ? "Zaloguj się" : "Utwórz konto"}
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
