import { FormEvent, useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "../../shared/api/client"
import ConfirmBar from "../../shared/ui/ConfirmBar"
import {
  createUnitWeight,
  deleteUnitWeight,
  getUnitWeights,
  updateUnitWeight,
  UnitWeight,
  UnitWeightInput,
} from "./api"

type IngredientBaseProps = {
  accessToken: string
}

const sourceLabels: Record<UnitWeight["source"], string> = { auto: "automatycznie", manual: "ręcznie" }

function entryLabel(entry: UnitWeight) {
  return [entry.name, entry.unit, `${entry.grams_per_unit} g`].filter(Boolean).join(", ")
}

function parseGrams(text: string) {
  const value = Number(text.trim().replace(",", "."))
  return text.trim() && Number.isFinite(value) ? value : null
}

// Name, optional unit and grams per unit; used both to add an entry and to correct one.
function EntryForm({ label, initial, submitLabel, isBusy, onSubmit, onCancel }: {
  label: string
  initial: { name: string; unit: string; grams: string }
  submitLabel: string
  isBusy: boolean
  onSubmit: (entry: UnitWeightInput) => Promise<void>
  onCancel?: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [unit, setUnit] = useState(initial.unit)
  const [grams, setGrams] = useState(initial.grams)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError("")
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = "Podaj nazwę produktu."
    const parsedGrams = parseGrams(grams)
    if (parsedGrams === null) errors.grams_per_unit = "Podaj wagę jednostki jako liczbę."
    if (Object.keys(errors).length > 0 || parsedGrams === null) {
      setFieldErrors(errors)
      return
    }
    try {
      await onSubmit({ name, unit, grams_per_unit: parsedGrams })
      if (!onCancel) {
        setName("")
        setUnit("")
        setGrams("")
      }
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setFieldErrors(error.fields)
      else setFormError(error instanceof Error ? error.message : "Nie udało się zapisać wpisu.")
    }
  }

  return (
    <form aria-label={label} className="plan-form" noValidate onSubmit={submit}>
      <label className="field">
        <span>Nazwa produktu</span>
        <input maxLength={200} onChange={(event) => setName(event.target.value)} value={name} />
        {fieldErrors.name && <small className="form-error" role="alert">{fieldErrors.name}</small>}
      </label>
      <label className="field">
        <span>Jednostka (np. szt., garść; może zostać pusta)</span>
        <input maxLength={100} onChange={(event) => setUnit(event.target.value)} value={unit} />
      </label>
      <label className="field">
        <span>Gramy na jednostkę</span>
        <input inputMode="decimal" maxLength={12} onChange={(event) => setGrams(event.target.value)} value={grams} />
        {fieldErrors.grams_per_unit && <small className="form-error" role="alert">{fieldErrors.grams_per_unit}</small>}
      </label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="plan-heading__actions">
        <button className="primary-button" disabled={isBusy} type="submit">{submitLabel}</button>
        {onCancel && (
          <button className="text-button" onClick={onCancel} type="button">Anuluj</button>
        )}
      </div>
    </form>
  )
}

export default function IngredientBase({ accessToken }: IngredientBaseProps) {
  const [query, setQuery] = useState("")
  const [entries, setEntries] = useState<UnitWeight[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<UnitWeight | null>(null)
  // Only the answer to the latest search may land on screen, however the requests finish.
  const latestRequest = useRef(0)

  const load = useCallback(
    async (phrase: string, pageNumber = 1) => {
      const request = ++latestRequest.current
      setIsLoading(true)
      try {
        const result = await getUnitWeights(accessToken, phrase, pageNumber)
        if (request !== latestRequest.current) return
        setEntries((current) => (pageNumber === 1 ? result.results : [...current, ...result.results]))
        setPage(pageNumber)
        setHasMore(result.next !== null)
        setError("")
      } catch (loadError) {
        if (request === latestRequest.current) {
          setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać bazy składników.")
        }
      } finally {
        if (request === latestRequest.current) setIsLoading(false)
      }
    },
    [accessToken],
  )

  useEffect(() => {
    void load(query)
  }, [load, query])

  // Saving disables the forms, so a second click cannot send the same entry again.
  async function whileBusy(action: () => Promise<void>) {
    setIsBusy(true)
    try {
      await action()
    } finally {
      setIsBusy(false)
    }
  }

  function add(entry: UnitWeightInput) {
    return whileBusy(async () => {
      await createUnitWeight(accessToken, entry)
      await load(query)
    })
  }

  function save(entryId: number, entry: UnitWeightInput) {
    return whileBusy(async () => {
      await updateUnitWeight(accessToken, entryId, entry)
      setEditingId(null)
      await load(query)
    })
  }

  async function remove(entry: UnitWeight) {
    setIsBusy(true)
    try {
      await deleteUnitWeight(accessToken, entry.id)
      setDeleting(null)
      await load(query)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć wpisu.")
      setDeleting(null)
    } finally {
      setIsBusy(false)
    }
  }

  const isEmptyBase = !isLoading && !error && entries.length === 0 && !query.trim()

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">USTAWIENIA KUCHNI</span>
          <h1>Baza składników</h1>
          <p className="page-intro">Ile waży jedna jednostka produktu. Dzięki temu lista zakupów sama przelicza gramaturę.</p>
        </div>
      </header>

      <section aria-labelledby="new-entry-heading" className="plan-card">
        <h2 id="new-entry-heading">Nowy wpis</h2>
        <EntryForm
          initial={{ name: "", unit: "", grams: "" }}
          isBusy={isBusy}
          label="Nowy wpis"
          onSubmit={add}
          submitLabel="Dodaj wpis"
        />
      </section>

      <section aria-labelledby="entries-heading">
        <h2 id="entries-heading">Zapisane produkty</h2>
        <label className="field" htmlFor="entry-search">
          <span>Szukaj produktu</span>
          <input id="entry-search" onChange={(event) => setQuery(event.target.value)} type="search" value={query} />
        </label>

        {deleting && (
          <ConfirmBar
            confirmLabel="Usuń wpis"
            isBusy={isBusy}
            onCancel={() => setDeleting(null)}
            onConfirm={() => void remove(deleting)}
            title={`Usunąć wpis „${entryLabel(deleting)}”?`}
          >
            <p>Listy zakupów i przepisy zostaną bez zmian. Wpis może wrócić przy zapisie przepisu.</p>
          </ConfirmBar>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading && entries.length === 0 && <p role="status">Wczytuję bazę...</p>}
        {isEmptyBase && (
          <p>
            Baza jest jeszcze pusta. Wpisy powstają same, gdy zapiszesz przepis albo własną pozycję listy z ilością i
            wagą, np. „12 szt., 240 g” daje „20 g na sztukę”. Możesz też dodać wpis ręcznie.
          </p>
        )}
        {!isLoading && !error && entries.length === 0 && query.trim() && <p>Nie znaleziono produktu „{query.trim()}”.</p>}

        <ul className="list-items">
          {entries.map((entry) => (
            <li className="list-item" key={entry.id}>
              {editingId === entry.id ? (
                <EntryForm
                  initial={{ name: entry.name, unit: entry.unit, grams: String(entry.grams_per_unit) }}
                  isBusy={isBusy}
                  label={`Popraw wpis: ${entry.name}`}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(changed) => save(entry.id, changed)}
                  submitLabel="Zapisz"
                />
              ) : (
                <>
                  <span>{entryLabel(entry)}</span>
                  <span className="badge">{sourceLabels[entry.source]}</span>
                  <button aria-label={`Popraw: ${entry.name}`} className="text-button" onClick={() => setEditingId(entry.id)} type="button">
                    Popraw
                  </button>
                  <button aria-label={`Usuń: ${entry.name}`} className="text-button text-button--danger" onClick={() => setDeleting(entry)} type="button">
                    Usuń
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button className="secondary-button" disabled={isLoading} onClick={() => void load(query, page + 1)} type="button">
            Pokaż więcej
          </button>
        )}
      </section>
    </div>
  )
}
