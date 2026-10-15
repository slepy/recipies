type ConfirmBarProps = {
  title: string
  children?: React.ReactNode
  confirmLabel: string
  isBusy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// An inline confirmation for destructive or large changes; nothing happens until the user confirms.
export default function ConfirmBar({ title, children, confirmLabel, isBusy = false, onConfirm, onCancel }: ConfirmBarProps) {
  return (
    <section className="confirm-bar" role="alertdialog" aria-label={title}>
      <p className="confirm-bar__title">{title}</p>
      {children}
      <div className="confirm-bar__actions">
        <button className="primary-button" disabled={isBusy} onClick={onConfirm} type="button">
          {isBusy ? "Chwila..." : confirmLabel}
        </button>
        <button className="secondary-button" disabled={isBusy} onClick={onCancel} type="button">
          Anuluj
        </button>
      </div>
    </section>
  )
}
