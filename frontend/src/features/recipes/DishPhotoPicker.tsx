import { DragEvent, useState } from "react"

import { imageAccept, imageFormatsHint } from "./imageRules"

type DishPhotoPickerProps = {
  file: File | null
  previewUrl: string
  // True when the photo was cut out of a recognised image rather than chosen by the user.
  isProposed: boolean
  error: string
  onSelect: (file: File) => void
  onRemove: () => void
}

const inputId = "recipe-photo"

// The photo of the finished dish: a drop area while empty, a preview with "change" and "remove" once chosen.
export default function DishPhotoPicker({ file, previewUrl, isProposed, error, onSelect, onRemove }: DishPhotoPickerProps) {
  const [isDragging, setIsDragging] = useState(false)

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onSelect(dropped)
  }

  function dragOver(event: DragEvent<HTMLElement>) {
    // Without preventDefault the browser opens the dropped file instead of handing it to the page.
    event.preventDefault()
    setIsDragging(true)
  }

  return (
    <div className="photo-picker">
      <span className="photo-picker__label" id={`${inputId}-label`}>Zdjęcie gotowego dania</span>
      <input
        accept={imageAccept}
        aria-describedby={`${inputId}-hint`}
        aria-labelledby={`${inputId}-label`}
        className="visually-hidden"
        id={inputId}
        onChange={(event) => {
          // Cancelling the file dialog picks nothing and keeps the current photo.
          const picked = event.target.files?.[0]
          if (picked) onSelect(picked)
          // Clearing the value lets the same file be picked again after removing it.
          event.target.value = ""
        }}
        type="file"
      />

      {previewUrl ? (
        <div className="photo-picker__preview" onDragLeave={() => setIsDragging(false)} onDragOver={dragOver} onDrop={drop}>
          <img src={previewUrl} alt="Podgląd zdjęcia gotowego dania" />
          <div className="photo-picker__details">
            <strong>{isProposed ? "Zdjęcie z rozpoznanego obrazu" : file?.name}</strong>
            {isProposed && <small>Propozycja AI: wycięte z obrazu zdjęcie dania. Usuń je albo zastąp własnym.</small>}
            <div className="photo-picker__actions">
              <label className="secondary-button" htmlFor={inputId}>Zmień zdjęcie</label>
              <button className="text-button text-button--danger" onClick={onRemove} type="button">
                Usuń zdjęcie
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          className={isDragging ? "photo-picker__drop is-dragging" : "photo-picker__drop"}
          htmlFor={inputId}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={dragOver}
          onDrop={drop}
        >
          <svg aria-hidden="true" fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
            <rect height="16" rx="2.5" width="18" x="3" y="4" />
            <circle cx="9" cy="9.5" r="1.8" />
            <path d="m21 15-4.5-4.5L7 20" />
          </svg>
          <span>
            <strong>Wybierz zdjęcie</strong> lub upuść je tutaj
          </span>
        </label>
      )}

      <small id={`${inputId}-hint`}>{imageFormatsHint}</small>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
