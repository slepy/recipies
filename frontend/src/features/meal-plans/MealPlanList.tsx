import { FormEvent, useEffect, useState } from "react"

import { ApiError } from "../../shared/api/client"
import { formatPeriod } from "../../shared/lib/formatDate"
import { plural } from "../../shared/lib/plural"
import { createPlan, getPlans, PlanSummary } from "./api"

type MealPlanListProps = {
  accessToken: string
  onOpenPlan: (planId: number) => void
}

export default function MealPlanList({ accessToken, onOpenPlan }: MealPlanListProps) {
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isCurrent = true
    getPlans(accessToken)
      .then((result) => {
        if (isCurrent) setPlans(result)
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(error instanceof Error ? error.message : "Nie udało się wczytać planów.")
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [accessToken])

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError("")
    setIsSaving(true)
    try {
      const plan = await createPlan(accessToken, { name, start_date: startDate, end_date: endDate })
      onOpenPlan(plan.id)
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) setFieldErrors(error.fields)
      else setFormError(error instanceof Error ? error.message : "Nie udało się utworzyć planu.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PLANOWANIE</span>
          <h1>Plany żywieniowe</h1>
          <p className="page-intro">Rozpisz posiłki na kolejne dni, a potem zrób z nich listę zakupów.</p>
        </div>
      </header>

      <section aria-labelledby="new-plan-heading" className="plan-card">
        <h2 id="new-plan-heading">Nowy plan</h2>
        <form className="plan-form" onSubmit={submitPlan} noValidate>
          <label className="field" htmlFor="plan-name">
            <span>Nazwa planu</span>
            <input id="plan-name" onChange={(event) => setName(event.target.value)} value={name} />
            {fieldErrors.name && <small className="form-error" role="alert">{fieldErrors.name}</small>}
          </label>
          <label className="field" htmlFor="plan-start">
            <span>Od</span>
            <input id="plan-start" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            {fieldErrors.start_date && <small className="form-error" role="alert">{fieldErrors.start_date}</small>}
          </label>
          <label className="field" htmlFor="plan-end">
            <span>Do</span>
            <input id="plan-end" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            {fieldErrors.end_date && <small className="form-error" role="alert">{fieldErrors.end_date}</small>}
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Chwila..." : "Utwórz plan"}
          </button>
        </form>
      </section>

      <section aria-labelledby="plans-heading">
        <h2 id="plans-heading">Moje plany</h2>
        {isLoading && <p role="status">Wczytuję plany...</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {!isLoading && !loadError && plans.length === 0 && <p>Nie masz jeszcze żadnego planu.</p>}
        <ul className="plan-list">
          {plans.map((plan) => (
            <li key={plan.id}>
              <button className="plan-list__item" onClick={() => onOpenPlan(plan.id)} type="button">
                <strong>{plan.name}</strong>
                <span>{formatPeriod(plan.start_date, plan.end_date)}</span>
                <span className="plan-list__meta">{plural(plan.entry_count, "przepis", "przepisy", "przepisów")} w planie</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
