import { useEffect, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"

import AuthenticatedApp from "./app/AuthenticatedApp"
import {
  Account,
  getCurrentUser,
  logIn,
  logOut,
  refreshAccessToken,
  register,
} from "./features/accounts/api"
import AuthScreen from "./features/accounts/AuthScreen"

type AuthState = "loading" | "anonymous" | "authenticated"

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = pathname === "/register" ? "register" : "login"
  const [authState, setAuthState] = useState<AuthState>("loading")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [signOutError, setSignOutError] = useState("")

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

  async function authenticate(email: string, password: string) {
    const token = mode === "register" ? await register(email, password) : await logIn(email, password)
    const currentAccount = await getCurrentUser(token)
    setAccessToken(token)
    setAccount(currentAccount)
    setSignOutError("")
    setAuthState("authenticated")
  }

  async function signOut() {
    setSignOutError("")
    try {
      await logOut()
      setAccessToken(null)
      setAccount(null)
      setAuthState("anonymous")
    } catch {
      setSignOutError("Nie udało się zakończyć sesji. Spróbuj ponownie.")
    }
  }

  if (authState === "authenticated" && account && accessToken) {
    // Signing in from the login or registration screen lands on the dashboard.
    if (pathname === "/login" || pathname === "/register") return <Navigate to="/" replace />
    return (
      <AuthenticatedApp
        accessToken={accessToken}
        accountEmail={account.email}
        accountError={signOutError}
        onSignOut={signOut}
      />
    )
  }

  if (authState === "anonymous" && pathname !== "/login" && pathname !== "/register") {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthScreen
      isLoading={authState === "loading"}
      mode={mode}
      onSubmit={authenticate}
      onSwitchMode={() => navigate(mode === "login" ? "/register" : "/login")}
    />
  )
}
