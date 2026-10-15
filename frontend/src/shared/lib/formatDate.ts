// Dates arrive as "YYYY-MM-DD"; parse them as local days so the weekday does not shift with the time zone.
function parseDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`)
}

export function formatDay(isoDate: string) {
  return parseDay(isoDate).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })
}

export function formatShortDay(isoDate: string) {
  return parseDay(isoDate).toLocaleDateString("pl-PL", { weekday: "short" })
}

export function formatPeriod(start: string, end: string) {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
  return `${parseDay(start).toLocaleDateString("pl-PL", options)} – ${parseDay(end).toLocaleDateString("pl-PL", options)}`
}
