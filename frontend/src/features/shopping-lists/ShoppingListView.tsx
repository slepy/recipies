import { FormEvent, useCallback, useEffect, useState } from "react"

import { formatShortDay } from "../../shared/lib/formatDate"
import ConfirmBar from "../../shared/ui/ConfirmBar"
import PageHeader, { HeaderLink } from "../../shared/ui/PageHeader"
import {
  addCustomItem,
  deleteCustomItem,
  deleteShoppingList,
  getRefreshPreview,
  getShoppingList,
  ListItem,
  RefreshPreview,
  refreshShoppingList,
  setItemBought,
  ShoppingList,
} from "./api"

type ShoppingListViewProps = {
  accessToken: string
  listId: number
  accountEmail: string
  headerLinks: HeaderLink[]
  onSignOut: () => void
  onBack: () => void
  onBackToPlan: (planId: number) => void
}

function quantity(item: ListItem) {
  return item.amount === null ? "" : `${item.amount} ${item.unit}`.trim()
}

function sourceText(source: ListItem["sources"][number]) {
  return `${source.recipe} – ${formatShortDay(source.date)} ${source.meal.toLowerCase()}`
}

function ItemRow({ item, isBusy, onToggle, onDelete }: {
  item: ListItem
  isBusy: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const label = [item.name, quantity(item)].filter(Boolean).join(" ")
  // A bought item whose amount grew since it was bought still needs the difference.
  const missing =
    item.bought && item.amount !== null && item.bought_amount !== null && item.amount > item.bought_amount
      ? Math.round((item.amount - item.bought_amount) * 100) / 100
      : 0

  return (
    <li className={item.bought ? "list-item list-item--bought" : "list-item"}>
      <label>
        <input checked={item.bought} disabled={isBusy} onChange={onToggle} type="checkbox" />
        <span>{label}</span>
      </label>
      {item.origin === "custom" ? <span className="badge">własna</span> : <span className="badge badge--recipe">z przepisów</span>}
      {item.is_new && <span className="badge">nowa</span>}
      {item.bought && <span className="badge">kupione</span>}
      {item.partial && <small>Suma obejmuje tylko część: ten składnik występuje też w innej mierze.</small>}
      {missing > 0 && <small>Ilość zmieniona od zakupu: dokup {missing} {item.unit}</small>}
      {item.sources.length > 0 && <small>{item.sources.map(sourceText).join("; ")}</small>}
      {item.origin === "custom" && (
        <button className="text-button" disabled={isBusy} onClick={onDelete} type="button">
          Usuń pozycję: {item.name}
        </button>
      )}
    </li>
  )
}

export default function ShoppingListView({
  accessToken,
  listId,
  accountEmail,
  headerLinks,
  onSignOut,
  onBack,
  onBackToPlan,
}: ShoppingListViewProps) {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [preview, setPreview] = useState<RefreshPreview | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [unit, setUnit] = useState("")
  const [nameError, setNameError] = useState("")

  const load = useCallback(() => getShoppingList(accessToken, listId).then(setList), [accessToken, listId])

  useEffect(() => {
    load().catch((loadError: unknown) =>
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać listy."),
    )
  }, [load])

  async function run(action: () => Promise<unknown>) {
    setError("")
    setIsBusy(true)
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nie udało się zapisać zmian.")
    } finally {
      setIsBusy(false)
    }
  }

  function toggle(item: ListItem) {
    void run(async () => {
      await setItemBought(accessToken, listId, item.id, !item.bought)
      await load()
    })
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError("")
    if (!name.trim()) {
      setNameError("Podaj nazwę pozycji.")
      return
    }
    void run(async () => {
      await addCustomItem(accessToken, listId, { name, amount: amount === "" ? null : Number(amount), unit })
      setName("")
      setAmount("")
      setUnit("")
      await load()
    })
  }

  function showPreview() {
    void run(async () => setPreview(await getRefreshPreview(accessToken, listId)))
  }

  async function applyRefresh() {
    setIsBusy(true)
    try {
      setList(await refreshShoppingList(accessToken, listId))
      setPreview(null)
    } catch (refreshError) {
      // The refresh is all-or-nothing, so the list on screen is still the saved one.
      setError(refreshError instanceof Error ? refreshError.message : "Nie udało się odświeżyć listy.")
      setPreview(null)
    } finally {
      setIsBusy(false)
    }
  }

  async function removeList() {
    setIsBusy(true)
    try {
      await deleteShoppingList(accessToken, listId)
      onBack()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć listy.")
      setIsConfirmingDelete(false)
      setIsBusy(false)
    }
  }

  const active = list?.items.filter((item) => !item.bought) ?? []
  const bought = list?.items.filter((item) => item.bought) ?? []

  return (
    <main className="recipe-app">
      <PageHeader accountEmail={accountEmail} links={headerLinks} onSignOut={onSignOut} />
      <div className="recipe-home plan-page">
        <button
          className="text-button recipe-back"
          onClick={() => (list?.plan ? onBackToPlan(list.plan) : onBack())}
          type="button"
        >
          ← Plan
        </button>
        {!list && !error && <p role="status">Wczytuję listę...</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {list && (
          <>
            <header className="plan-heading">
              <h1>{list.name}</h1>
              <div className="plan-heading__actions">
                <button className="text-button" onClick={() => setIsConfirmingDelete(true)} type="button">
                  Usuń listę
                </button>
              </div>
            </header>

            {list.is_stale && !preview && (
              <section className="stale-notice" aria-label="Plan zmienił się">
                <p>Plan zmienił się od wygenerowania listy.</p>
                <button className="secondary-button" disabled={isBusy} onClick={showPreview} type="button">
                  Odśwież z planu
                </button>
              </section>
            )}

            {preview && (
              <ConfirmBar
                confirmLabel="Odśwież listę"
                isBusy={isBusy}
                onCancel={() => setPreview(null)}
                onConfirm={() => void applyRefresh()}
                title="Odświeżyć listę z planu?"
              >
                <ul>
                  <li>Dodane pozycje: {preview.added.length}{preview.added.length > 0 && ` (${preview.added.join(", ")})`}</li>
                  <li>Zmienione pozycje: {preview.changed.length}{preview.changed.length > 0 && ` (${preview.changed.join(", ")})`}</li>
                  <li>Usunięte pozycje: {preview.removed.length}{preview.removed.length > 0 && ` (${preview.removed.join(", ")})`}</li>
                  <li>Zachowane własne pozycje: {preview.custom_kept}</li>
                </ul>
              </ConfirmBar>
            )}

            {isConfirmingDelete && (
              <ConfirmBar
                confirmLabel="Usuń listę"
                isBusy={isBusy}
                onCancel={() => setIsConfirmingDelete(false)}
                onConfirm={() => void removeList()}
                title="Usunąć listę zakupów?"
              >
                <p>Lista i jej własne pozycje zostaną usunięte. Plan pozostanie bez zmian.</p>
              </ConfirmBar>
            )}

            <section aria-labelledby="active-heading">
              <h2 id="active-heading">Do kupienia ({active.length})</h2>
              {active.length === 0 && <p>Wszystko kupione.</p>}
              <ul className="list-items">
                {active.map((item) => (
                  <ItemRow isBusy={isBusy} item={item} key={item.id} onDelete={() => void run(async () => { await deleteCustomItem(accessToken, listId, item.id); await load() })} onToggle={() => toggle(item)} />
                ))}
              </ul>
            </section>

            <form className="plan-form plan-card" onSubmit={addItem} noValidate aria-label="Dodawanie własnej pozycji">
              <label className="field" htmlFor="custom-name">
                <span>Własna pozycja</span>
                <input id="custom-name" onChange={(event) => setName(event.target.value)} value={name} />
                {nameError && <small className="form-error" role="alert">{nameError}</small>}
              </label>
              <label className="field" htmlFor="custom-amount">
                <span>Ilość</span>
                <input id="custom-amount" min={0} onChange={(event) => setAmount(event.target.value)} step="any" type="number" value={amount} />
              </label>
              <label className="field" htmlFor="custom-unit">
                <span>Jednostka</span>
                <input id="custom-unit" onChange={(event) => setUnit(event.target.value)} value={unit} />
              </label>
              <button className="primary-button" disabled={isBusy} type="submit">Dodaj pozycję</button>
            </form>

            <section aria-labelledby="bought-heading">
              <h2 id="bought-heading">Kupione ({bought.length})</h2>
              <ul className="list-items">
                {bought.map((item) => (
                  <ItemRow isBusy={isBusy} item={item} key={item.id} onDelete={() => void run(async () => { await deleteCustomItem(accessToken, listId, item.id); await load() })} onToggle={() => toggle(item)} />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
