import { useCallback, useEffect, useState } from "react"

import ConfirmBar from "../../shared/ui/ConfirmBar"
import { deleteShoppingList, getRefreshPreview, getShoppingList, RefreshPreview, refreshShoppingList, ShoppingList } from "./api"
import ShoppingListItems from "./ShoppingListItems"

type ShoppingListViewProps = {
  accessToken: string
  listId: number
  onBack: () => void
  onBackToPlan: (planId: number) => void
}

export default function ShoppingListView({
  accessToken,
  listId,
  onBack,
  onBackToPlan,
}: ShoppingListViewProps) {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  // An item change reloads the list when it finishes, so a refresh must not run at the same time.
  const [isSavingItem, setIsSavingItem] = useState(false)
  const [preview, setPreview] = useState<RefreshPreview | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

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

  return (
    <div className="page">
      <button className="text-button recipe-back" onClick={onBack} type="button">
        ← Listy zakupów
      </button>
      {!list && !error && <p role="status">Wczytuję listę...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {list && (
        <>
          <header className="page-header plan-heading">
            <div>
              <span className="eyebrow">LISTA ZAKUPÓW</span>
              <h1>{list.name}</h1>
              <p className="page-intro">Kupione {list.bought_count} z {list.item_count}</p>
            </div>
            <div className="plan-heading__actions">
              {list.plan && (
                <button className="secondary-button" onClick={() => onBackToPlan(list.plan!)} type="button">
                  Otwórz plan
                </button>
              )}
              <button className="text-button text-button--danger" onClick={() => setIsConfirmingDelete(true)} type="button">
                Usuń listę
              </button>
            </div>
          </header>

          {list.is_stale && !preview && (
            <section className="stale-notice" aria-label="Plan zmienił się">
              <p>Plan zmienił się od wygenerowania listy.</p>
              <button className="secondary-button" disabled={isBusy || isSavingItem} onClick={showPreview} type="button">
                Odśwież z planu
              </button>
            </section>
          )}

          {preview && (
            <ConfirmBar
              confirmLabel="Odśwież listę"
              isBusy={isBusy || isSavingItem}
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
              isBusy={isBusy || isSavingItem}
              onCancel={() => setIsConfirmingDelete(false)}
              onConfirm={() => void removeList()}
              title="Usunąć listę zakupów?"
            >
              <p>Lista i jej własne pozycje zostaną usunięte. Plan pozostanie bez zmian.</p>
            </ConfirmBar>
          )}

          <ShoppingListItems
            accessToken={accessToken}
            disabled={isBusy}
            list={list}
            onBusyChange={setIsSavingItem}
            onListChange={setList}
          />
        </>
      )}
    </div>
  )
}
