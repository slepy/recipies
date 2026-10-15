import { MouseEvent, ReactNode } from "react"

export type NavItem = { label: string; href: string; icon: ReactNode; isActive: boolean }

type AppShellProps = {
  accountEmail: string
  navItems: NavItem[]
  // An account-level problem, such as a failed sign-out, shown above every screen.
  accountError?: string
  onNavigate: (href: string) => void
  onSignOut: () => void
  children: ReactNode
}

// Real links, so they can be opened in a new tab; a plain click navigates inside the app instead.
function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export default function AppShell({ accountEmail, navItems, accountError, onNavigate, onSignOut, children }: AppShellProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isPlainClick(event)) return
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <a className="wordmark wordmark--dark" href="/" onClick={(event) => follow(event, "/")} aria-label="Miska, strona główna">
          miska<span>.</span>
        </a>
        <nav className="app-nav" aria-label="Nawigacja główna">
          {navItems.map((item) => (
            <a
              aria-current={item.isActive ? "page" : undefined}
              className="app-nav__link"
              href={item.href}
              key={item.href}
              onClick={(event) => follow(event, item.href)}
            >
              <span className="app-nav__icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="app-account">
          <span className="app-account__avatar" aria-hidden="true">{accountEmail.charAt(0).toUpperCase()}</span>
          <span className="app-account__email">{accountEmail}</span>
          <button className="text-button" onClick={onSignOut} type="button">
            Wyloguj się
          </button>
        </div>
      </aside>
      <main className="app-main">
        {accountError && <p className="form-error app-main__alert" role="alert">{accountError}</p>}
        {children}
      </main>
    </div>
  )
}
