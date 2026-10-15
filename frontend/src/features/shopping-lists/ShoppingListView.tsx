import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"

import ConfirmBar from "../../shared/ui/ConfirmBar"
import PageHeader, { HeaderLink } from "../../shared/ui/PageHeader"
import { UnitWeight } from "../ingredients/api"
import UnitWeightPicker from "../ingredients/UnitWeightPicker"
import { formatGrams, nameKey, parseAmount, unitKey } from "../ingredients/units"
import {
  addCustomItem,
  CustomItemInput,
  deleteCustomItem,
  deleteShoppingList,
  getRefreshPreview,
  getShoppingList,
  increaseItem,
  ListItem,
  RefreshPreview,
  refreshShoppingList,
  resetItemIncrease,
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

const metricUnits = ["g", "kg", "ml", "l"] as const

function quantity(item: ListItem) {
  // Custom items keep the amount as typed ("1/2"); recipe items carry a summed number.
  const amount = item.amount_text || (item.amount === null ? "" : String(item.amount))
  // An estimated weight comes from the knowledge base, so it is marked as approximate.
  const metric = item.metric_amount === null ? "" : `(${item.metric_estimated ? "≈ " : ""}${item.metric_amount} ${item.metric_unit})`
  return [amount, item.unit, metric].filter(Boolean).join(" ")
}

const metricFactor: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 }

function ItemRow({ item, isBusy, onToggle, onDelete, onIncrease, onResetIncrease }: {
  item: ListItem
  isBusy: boolean
  onToggle: () => void
  onDelete: () => void
  onIncrease: (increase: { increase_amount?: number; increase_metric_amount?: number }) => void
  onResetIncrease: () => void
}) {
  const [isIncreasing, setIsIncreasing] = useState(false)
  const [moreAmount, setMoreAmount] = useState("")
  const [moreMetric, setMoreMetric] = useState("")
  const label = [item.name, quantity(item)].filter(Boolean).join(" ")
  const canIncrease = item.origin === "recipe" && (item.amount !== null || item.metric_amount !== null)
  const hasIncrease = item.extra_amount > 0 || item.extra_metric > 0

  // A bought item whose amount grew since it was bought still needs the difference.
  const missingAmount =
    item.bought && item.amount !== null && item.bought_amount !== null
      ? Math.round((item.amount - item.bought_amount) * 100) / 100
      : 0
  const currentBase = item.metric_amount === null ? null : item.metric_amount * (metricFactor[item.metric_unit] ?? 1)
  const missingMetric =
    item.bought && currentBase !== null && item.bought_metric_base !== null
      ? Math.round((currentBase - item.bought_metric_base) / (metricFactor[item.metric_unit] ?? 1) * 100) / 100
      : 0
  // With a known unit weight the server adds the grams itself; show how many before saving.
  const addedAmount = Number(moreAmount.trim().replace(",", "."))
  const increasePreview =
    item.unit_weight !== null && (item.metric_unit === "g" || item.metric_unit === "kg") && !moreMetric.trim() && moreAmount.trim() && addedAmount > 0
      ? `${`+${addedAmount} ${item.unit}`.trim()} ≈ +${formatGrams(addedAmount * item.unit_weight)}`
      : ""
  const missing = [
    missingAmount > 0 ? `${missingAmount} ${item.unit}`.trim() : "",
    missingMetric > 0 ? `${missingMetric} ${item.metric_unit}` : "",
  ].filter(Boolean)

  function submitIncrease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const increase: { increase_amount?: number; increase_metric_amount?: number } = {}
    const amount = Number(moreAmount.trim().replace(",", "."))
    const metric = Number(moreMetric.trim().replace(",", "."))
    if (moreAmount.trim() && amount > 0) increase.increase_amount = amount
    if (moreMetric.trim() && metric > 0) increase.increase_metric_amount = metric
    if (Object.keys(increase).length === 0) return
    onIncrease(increase)
    setMoreAmount("")
    setMoreMetric("")
    setIsIncreasing(false)
  }

  return (
    <li className={item.bought ? "list-item list-item--bought" : "list-item"}>
      <label>
        <input checked={item.bought} disabled={isBusy} onChange={onToggle} type="checkbox" />
        <span>{label}</span>
      </label>
      {item.origin === "custom" ? <span className="badge">własna</span> : <span className="badge badge--recipe">z przepisów</span>}
      {item.is_new && <span className="badge">nowa</span>}
      {item.bought && <span className="badge">kupione</span>}
      {hasIncrease && <span className="badge">zwiększona ręcznie</span>}
      {item.partial && <small>Suma obejmuje tylko część: ten składnik występuje też w innej mierze.</small>}
      {missing.length > 0 && <small>Ilość zmieniona od zakupu: dokup {missing.join(" i ")}</small>}
      {canIncrease && !isIncreasing && (
        <button className="text-button" disabled={isBusy} onClick={() => setIsIncreasing(true)} type="button">
          Zwiększ ilość: {item.name}
        </button>
      )}
      {hasIncrease && (
        <button className="text-button" disabled={isBusy} onClick={onResetIncrease} type="button">
          Cofnij zwiększenie: {item.name}
        </button>
      )}
      {isIncreasing && (
        <form className="list-item__increase" onSubmit={submitIncrease} noValidate aria-label={`Zwiększ ilość: ${item.name}`}>
          {item.amount !== null && (
            <label>
              <span>Dodaj ilość{item.unit && ` (${item.unit})`}</span>
              <input
                aria-label={`Dodaj ilość: ${item.name}`}
                inputMode="decimal"
                onChange={(event) => setMoreAmount(event.target.value)}
                value={moreAmount}
              />
            </label>
          )}
          {item.metric_amount !== null && (
            <label>
              <span>Dodaj wagę lub objętość ({item.metric_unit})</span>
              <input
                aria-label={`Dodaj wagę lub objętość: ${item.name}`}
                inputMode="decimal"
                onChange={(event) => setMoreMetric(event.target.value)}
                value={moreMetric}
              />
            </label>
          )}
          {increasePreview && <p role="status">{increasePreview}</p>}
          <button className="secondary-button" disabled={isBusy} type="submit">Zwiększ</button>
          <button className="text-button" onClick={() => setIsIncreasing(false)} type="button">Anuluj</button>
        </form>
      )}
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
  const [metricAmount, setMetricAmount] = useState("")
  const [metricUnit, setMetricUnit] = useState<CustomItemInput["metric_unit"]>("")
  const [nameError, setNameError] = useState("")
  // The knowledge base entry the user picked; its weight is previewed while name and unit still match it.
  const [picked, setPicked] = useState<UnitWeight | null>(null)
  const amountInput = useRef<HTMLInputElement>(null)

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
    // A metric measure needs both the number and the unit, as in the recipe form.
    const parsedMetric = metricAmount.trim() === "" ? null : Number(metricAmount.trim().replace(",", "."))
    const hasMetric = parsedMetric !== null && Number.isFinite(parsedMetric) && Boolean(metricUnit)
    void run(async () => {
      await addCustomItem(accessToken, listId, {
        name,
        amount,
        unit,
        metric_amount: hasMetric ? parsedMetric : null,
        metric_unit: hasMetric ? metricUnit : "",
      })
      setName("")
      setAmount("")
      setUnit("")
      setMetricAmount("")
      setMetricUnit("")
      setPicked(null)
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

  function pickEntry(entry: UnitWeight) {
    setName(entry.name)
    setUnit(entry.unit)
    setMetricAmount("")
    setMetricUnit("")
    setNameError("")
    setPicked(entry)
    amountInput.current?.focus()
  }

  const takenNames = useMemo(() => new Set(list?.items.map((item) => nameKey(item.name)) ?? []), [list])
  const pickedAmount = parseAmount(amount)
  const estimate =
    picked &&
    nameKey(name) === nameKey(picked.name) &&
    unitKey(unit) === unitKey(picked.unit) &&
    !metricAmount.trim() &&
    pickedAmount !== null &&
    pickedAmount > 0
      ? formatGrams(pickedAmount * picked.grams_per_unit)
      : ""

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
                  <ItemRow
                    isBusy={isBusy}
                    item={item}
                    key={item.id}
                    onDelete={() => void run(async () => { await deleteCustomItem(accessToken, listId, item.id); await load() })}
                    onIncrease={(increase) => void run(async () => { await increaseItem(accessToken, listId, item.id, increase); await load() })}
                    onResetIncrease={() => void run(async () => { await resetItemIncrease(accessToken, listId, item.id); await load() })}
                    onToggle={() => toggle(item)}
                  />
                ))}
              </ul>
            </section>

            <form className="plan-form plan-card" onSubmit={addItem} noValidate aria-label="Dodawanie własnej pozycji">
              <UnitWeightPicker accessToken={accessToken} onPick={pickEntry} takenNames={takenNames} />
              <label className="field" htmlFor="custom-name">
                <span>Własna pozycja</span>
                <input id="custom-name" onChange={(event) => setName(event.target.value)} value={name} />
                {nameError && <small className="form-error" role="alert">{nameError}</small>}
              </label>
              <label className="field" htmlFor="custom-amount">
                <span>Ilość</span>
                <input id="custom-amount" maxLength={100} onChange={(event) => setAmount(event.target.value)} ref={amountInput} value={amount} />
                {estimate && <small role="status">≈ {estimate} według bazy składników</small>}
              </label>
              <label className="field" htmlFor="custom-unit">
                <span>Jednostka</span>
                <input id="custom-unit" maxLength={100} onChange={(event) => setUnit(event.target.value)} value={unit} />
              </label>
              <label className="field" htmlFor="custom-metric-amount">
                <span>Waga lub objętość</span>
                <input id="custom-metric-amount" inputMode="decimal" maxLength={12} onChange={(event) => setMetricAmount(event.target.value)} value={metricAmount} />
              </label>
              <label className="field" htmlFor="custom-metric-unit">
                <span>Miara</span>
                <select id="custom-metric-unit" onChange={(event) => setMetricUnit(event.target.value as CustomItemInput["metric_unit"])} value={metricUnit}>
                  <option value="">—</option>
                  {metricUnits.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <button className="primary-button" disabled={isBusy} type="submit">Dodaj pozycję</button>
            </form>

            <section aria-labelledby="bought-heading">
              <h2 id="bought-heading">Kupione ({bought.length})</h2>
              <ul className="list-items">
                {bought.map((item) => (
                  <ItemRow
                    isBusy={isBusy}
                    item={item}
                    key={item.id}
                    onDelete={() => void run(async () => { await deleteCustomItem(accessToken, listId, item.id); await load() })}
                    onIncrease={(increase) => void run(async () => { await increaseItem(accessToken, listId, item.id, increase); await load() })}
                    onResetIncrease={() => void run(async () => { await resetItemIncrease(accessToken, listId, item.id); await load() })}
                    onToggle={() => toggle(item)}
                  />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
