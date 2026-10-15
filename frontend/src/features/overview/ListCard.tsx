import { plural } from "../../shared/lib/plural"
import { isDone, SourcedList } from "./listSources"

type ListCardProps = {
  list: SourcedList
  onOpen: () => void
}

// One shopping list as a clickable card: name, where it comes from and how much is bought.
export default function ListCard({ list, onOpen }: ListCardProps) {
  const left = list.item_count - list.bought_count
  const percent = list.item_count === 0 ? 0 : Math.round((list.bought_count / list.item_count) * 100)
  // The verb follows the noun form: "została 1 pozycja", "zostały 3 pozycje", "zostało 5 pozycji".
  const items = plural(left, "pozycja", "pozycje", "pozycji")
  const verb = left === 1 ? "Została" : items.endsWith("pozycje") ? "Zostały" : "Zostało"
  const status = list.item_count === 0 ? "Pusta lista" : isDone(list) ? "Wszystko kupione" : `${verb} ${items}`

  return (
    <button className="list-card" onClick={onOpen} type="button">
      <span className="list-card__source">{list.source}</span>
      <strong className="list-card__name">{list.name}</strong>
      <span className="progress" aria-hidden="true">
        <span className="progress__bar" style={{ width: `${percent}%` }} />
      </span>
      <span className="list-card__status">
        <span>{status}</span>
        <span>Kupione {list.bought_count} z {list.item_count}</span>
      </span>
    </button>
  )
}
