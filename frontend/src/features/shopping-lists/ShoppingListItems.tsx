import { FormEvent, useState } from "react"

import {
  addCustomItem,
  CustomItemInput,
  deleteCustomItem,
  getShoppingList,
  increaseItem,
  ListItem,
  resetItemIncrease,
  setItemBought,
  ShoppingList,
} from "./api"

type ShoppingListItemsProps = {
  accessToken: string
  list: ShoppingList
  // True while the owning screen saves something else, such as a refresh.
  disabled?: boolean
  onListChange: (list: ShoppingList) => void
}

const metricUnits = ["g", "kg", "ml", "l"] as const

function quantity(item: ListItem) {
  // Custom items keep the amount as typed ("1/2"); recipe items carry a summed number.
  const amount = item.amount_text || (item.amount === null ? "" : String(item.amount))
  const metric = item.metric_amount === null ? "" : `(${item.metric_amount} ${item.metric_unit})`
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

// The items of one list: active ones, the custom item form, then bought ones. Used by the plan
// list screen and by the "Lista zakupów" tab of a recipe set.
export default function ShoppingListItems({ accessToken, list, disabled = false, onListChange }: ShoppingListItemsProps) {
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [unit, setUnit] = useState("")
  const [metricAmount, setMetricAmount] = useState("")
  const [metricUnit, setMetricUnit] = useState<CustomItemInput["metric_unit"]>("")
  const [nameError, setNameError] = useState("")
  const listId = list.id
  const isBusy = disabled || isSaving

  async function run(action: () => Promise<unknown>) {
    setError("")
    setIsSaving(true)
    try {
      await action()
      onListChange(await getShoppingList(accessToken, listId))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nie udało się zapisać zmian.")
    } finally {
      setIsSaving(false)
    }
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
    })
  }

  function row(item: ListItem) {
    return (
      <ItemRow
        isBusy={isBusy}
        item={item}
        key={item.id}
        onDelete={() => void run(() => deleteCustomItem(accessToken, listId, item.id))}
        onIncrease={(increase) => void run(() => increaseItem(accessToken, listId, item.id, increase))}
        onResetIncrease={() => void run(() => resetItemIncrease(accessToken, listId, item.id))}
        onToggle={() => void run(() => setItemBought(accessToken, listId, item.id, !item.bought))}
      />
    )
  }

  const active = list.items.filter((item) => !item.bought)
  const bought = list.items.filter((item) => item.bought)

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section aria-labelledby="active-heading">
        <h2 id="active-heading">Do kupienia ({active.length})</h2>
        {active.length === 0 && <p>Wszystko kupione.</p>}
        <ul className="list-items">{active.map(row)}</ul>
      </section>

      <form className="plan-form plan-card" onSubmit={addItem} noValidate aria-label="Dodawanie własnej pozycji">
        <label className="field" htmlFor="custom-name">
          <span>Własna pozycja</span>
          <input id="custom-name" onChange={(event) => setName(event.target.value)} value={name} />
          {nameError && <small className="form-error" role="alert">{nameError}</small>}
        </label>
        <label className="field" htmlFor="custom-amount">
          <span>Ilość</span>
          <input id="custom-amount" maxLength={100} onChange={(event) => setAmount(event.target.value)} value={amount} />
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
        <ul className="list-items">{bought.map(row)}</ul>
      </section>
    </>
  )
}
