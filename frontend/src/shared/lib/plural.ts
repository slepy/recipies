// Polish noun forms after a number: 1 przepis, 2–4 przepisy (but 12–14 przepisów), 5+ przepisów.
export function plural(count: number, one: string, few: string, many: string) {
  if (count === 1) return `1 ${one}`
  const lastDigit = count % 10
  const lastTwo = count % 100
  const isFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
  return `${count} ${isFew ? few : many}`
}
