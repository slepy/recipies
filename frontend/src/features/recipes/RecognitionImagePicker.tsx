import { useEffect, useState } from "react"

import { RecipeDraft } from "./api"
import { imageAccept, imageFormatsHint, validateImage } from "./imageRules"
import useRecipeRecognition from "./useRecipeRecognition"

type RecognitionImagePickerProps = {
  accessToken: string
  isProviderActive: boolean
  onOpenIntegrations: () => void
  onRecognized: (draft: RecipeDraft) => void
}

export default function RecognitionImagePicker({
  accessToken,
  isProviderActive,
  onOpenIntegrations,
  onRecognized,
}: RecognitionImagePickerProps) {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [error, setError] = useState("")
  const recognition = useRecipeRecognition(accessToken)
  const { isRecognizing } = recognition

  useEffect(() => {
    if (!image) {
      setPreview("")
      return
    }
    const previewUrl = URL.createObjectURL(image)
    setPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [image])

  function selectImage(file: File | undefined) {
    if (!file || isRecognizing) return
    const message = validateImage(file, "obraz")
    setError(message)
    recognition.clearError()
    setImage(message ? null : file)
  }

  function discardImage() {
    recognition.cancel()
    setImage(null)
    setError("")
    recognition.clearError()
  }

  async function recognize() {
    if (!image) return
    const draft = await recognition.recognize(image)
    if (draft) {
      onRecognized(draft)
      setImage(null)
    }
  }

  const fileInputs = [
    { id: "recognition-camera", label: "Zrób zdjęcie", capture: "environment" as const },
    { id: "recognition-file", label: "Wybierz obraz z urządzenia", capture: undefined },
  ]

  return (
    <div className="recognition-picker">
      <p>Wybierz jeden obraz z tekstem przepisu. Samo wybranie pliku niczego nie wysyła.</p>
      <div className="recognition-picker__actions">
        {fileInputs.map(({ id, label, capture }) => (
          <label className="secondary-button recognition-picker__file" htmlFor={id} key={id}>
            {label}
            <input
              accept={imageAccept}
              capture={capture}
              disabled={isRecognizing}
              id={id}
              onChange={(event) => {
                selectImage(event.target.files?.[0])
                event.target.value = ""
              }}
              type="file"
            />
          </label>
        ))}
      </div>
      <small>{imageFormatsHint}</small>
      <p className="recognition-picker__fallback">
        Jeśli urządzenie nie udostępnia aparatu, wybierz obraz z urządzenia albo wypełnij formularz ręcznie.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {image && preview && (
        <div className="recipe-photo-preview">
          <img src={preview} alt="Podgląd obrazu do rozpoznania" />
          <div>
            <p>{image.name}</p>
            <button className="text-button" onClick={discardImage} type="button">
              {isRecognizing ? "Anuluj" : "Odrzuć obraz"}
            </button>
          </div>
        </div>
      )}
      {image && (
        <div className="recognition-picker__consent" role="note">
          <p>
            Po uruchomieniu rozpoznawania ten obraz zostanie wysłany do zewnętrznej usługi AI. Wycięty z niego
            fragment może zostać zaproponowany jako zdjęcie potrawy. Obraz nie jest zapisywany w przepisie.
          </p>
          {isProviderActive ? (
            <button
              className="primary-button"
              disabled={isRecognizing}
              onClick={recognize}
              type="button"
            >
              {isRecognizing ? "Rozpoznaję..." : "Rozpoznaj przepis"}
            </button>
          ) : (
            <>
              <small>Aby rozpoznać przepis, skonfiguruj i aktywuj dostawcę AI.</small>
              <button className="secondary-button" onClick={onOpenIntegrations} type="button">
                Przejdź do integracji AI
              </button>
            </>
          )}
        </div>
      )}
      {isRecognizing && <p role="status">Rozpoznaję przepis, to może potrwać do minuty...</p>}
      {recognition.error && <p className="form-error" role="alert">{recognition.error}</p>}
    </div>
  )
}
