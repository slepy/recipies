export type HeaderLink = { label: string; onClick: () => void }

type PageHeaderProps = {
  accountEmail: string
  links: HeaderLink[]
  onSignOut: () => void
}

export default function PageHeader({ accountEmail, links, onSignOut }: PageHeaderProps) {
  return (
    <header className="recipe-topbar">
      <a className="wordmark wordmark--dark" href="/" aria-label="Miska, strona główna">
        miska<span>.</span>
      </a>
      <nav className="recipe-account" aria-label="Nawigacja">
        <span>{accountEmail}</span>
        {links.map((link) => (
          <button className="text-button" key={link.label} onClick={link.onClick} type="button">
            {link.label}
          </button>
        ))}
        <button className="text-button" onClick={onSignOut} type="button">
          Wyloguj się
        </button>
      </nav>
    </header>
  )
}
