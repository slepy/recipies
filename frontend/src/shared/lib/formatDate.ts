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

// Today's date as "YYYY-MM-DD" in the user's time zone, comparable with dates from the API.
export function todayIsoDay(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}
