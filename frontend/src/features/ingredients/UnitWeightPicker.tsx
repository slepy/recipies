import { KeyboardEvent, useEffect, useId, useRef, useState } from "react"

import { getUnitWeights, UnitWeight } from "./api"
import { nameKey } from "./units"

type UnitWeightPickerProps = {
  accessToken: string
  // Normalized names (nameKey) of products already on the list; they are shown but cannot be picked.
  takenNames: Set<string>
  onPick: (entry: UnitWeight) => void
}

// A combobox over the knowledge base: type to search, arrows to move, Enter to pick, Esc to close.
export default function UnitWeightPicker({ accessToken, takenNames, onPick }: UnitWeightPickerProps) {
  const listboxId = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UnitWeight[]>([])
  // The phrase the current results answer, so "nothing found" never shows while a search is running.
  const [answered, setAnswered] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState("")
  const latestRequest = useRef(0)

  useEffect(() => {
    const phrase = query.trim()
    const request = ++latestRequest.current
    if (!phrase) {
      setResults([])
      setAnswered("")
      return
    }
    getUnitWeights(accessToken, phrase)
      .then((page) => {
        if (request !== latestRequest.current) return
        setResults(page.results)
        setAnswered(phrase)
        setActiveIndex(-1)
        setError("")
      })
      .catch((searchError: unknown) => {
        if (request === latestRequest.current) {
          setError(searchError instanceof Error ? searchError.message : "Nie udało się przeszukać bazy.")
        }
      })
  }, [accessToken, query])

  const isTaken = (entry: UnitWeight) => takenNames.has(nameKey(entry.name))

  function pick(entry: UnitWeight) {
    if (isTaken(entry)) return
    onPick(entry)
    setQuery("")
    setResults([])
    setAnswered("")
    setIsOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (results.length === 0) return
      setIsOpen(true)
      const step = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex((current) => (current + step + results.length) % results.length)
    } else if (event.key === "Enter") {
      // Enter picks from the open list instead of submitting the surrounding form.
      if (isOpen && activeIndex >= 0) {
        event.preventDefault()
        pick(results[activeIndex])
      }
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const showList = isOpen && query.trim() !== ""
  const optionId = (index: number) => `${listboxId}-option-${index}`

  return (
    <div className="unit-weight-picker">
      <label className="field" htmlFor={`${listboxId}-input`}>
        <span>Wybierz z bazy składników</span>
        <input
          aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showList}
          autoComplete="off"
          id={`${listboxId}-input`}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          value={query}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul className="unit-weight-picker__options" hidden={!showList || results.length === 0} id={listboxId} role="listbox">
        {results.map((entry, index) => {
          const taken = isTaken(entry)
          return (
            <li
              aria-disabled={taken || undefined}
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "unit-weight-picker__option is-active" : "unit-weight-picker__option"}
              id={optionId(index)}
              key={entry.id}
              // mousedown, not click, so the input keeps focus and does not close the list first.
              onMouseDown={(event) => {
                event.preventDefault()
                pick(entry)
              }}
              role="option"
            >
              {[entry.name, entry.unit, `${entry.grams_per_unit} g`].filter(Boolean).join(", ")}
              {taken && " (już na liście)"}
            </li>
          )
        })}
      </ul>
      {showList && answered === query.trim() && results.length === 0 && !error && (
        <p role="status">Nie ma takiego produktu w bazie. Wpisz pozycję ręcznie poniżej.</p>
      )}
    </div>
  )
}
