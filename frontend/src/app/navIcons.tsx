import { ReactNode } from "react"

// Simple line icons for the main navigation; they inherit the link colour.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      {children}
    </svg>
  )
}

export const navIcons = {
  dashboard: (
    <Icon>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
    </Icon>
  ),
  recipes: (
    <Icon>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
      <path d="M9 8h6" />
    </Icon>
  ),
  plans: (
    <Icon>
      <rect height="17" rx="2" width="18" x="3" y="4.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </Icon>
  ),
  lists: (
    <Icon>
      <path d="M4 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 8H7" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </Icon>
  ),
  sets: (
    <Icon>
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </Icon>
  ),
  ingredients: (
    <Icon>
      <path d="M12 21c-4.5 0-8-3.4-8-8 0-4 3-7 6-8 0 3 2 5 4 5s4-2 4-4c1.5 1.5 2 4 2 7 0 4.6-3.5 8-8 8z" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </Icon>
  ),
}
