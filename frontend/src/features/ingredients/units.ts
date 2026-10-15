// The same rules as the backend (ingredients/normalization.py), so the screen and the server agree.

const numberPattern = /^(?:(\d+)\s+)?(\d+)\/(\d+)$|^\d+(?:[.,]\d+)?$/

export function nameKey(name: string) {
  return name.toLocaleLowerCase("pl").split(/\s+/).filter(Boolean).join(" ")
}

export function unitKey(unit: string) {
  return unit.trim().toLocaleLowerCase("pl").replace(/\.+$/, "").trim()
}

// "2", "1,5", "1/2" or "1 1/2" as a number; null for anything else ("do smaku", "2-3").
export function parseAmount(text: string): number | null {
  const value = text.trim()
  const match = numberPattern.exec(value)
  if (!match) return null
  if (match[2] === undefined) return Number(value.replace(",", "."))
  const denominator = Number(match[3])
  if (denominator === 0) return null
  return Number(match[1] ?? 0) + Number(match[2]) / denominator
}

// Grams as the shopping list shows sums: g below one thousand, kg from it, two decimal places.
export function formatGrams(grams: number) {
  const round = (value: number) => Math.round(value * 100) / 100
  return grams >= 1000 ? `${round(grams / 1000)} kg` : `${round(grams)} g`
}
