import { useEffect, useRef, useState } from "react"

import { ApiError, recognizeRecipeImage, RecipeDraft } from "./api"
import { imageAccept, imageFormatsHint, validateImage } from "./imageRules"

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
  const [recognitionError, setRecognitionError] = useState("")
  const [isRecognizing, setIsRecognizing] = useState(false)
  const request = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!image) {
      setPreview("")
      return
    }
    const previewUrl = URL.createObjectURL(image)
    setPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [image])

  useEffect(() => () => request.current?.abort(), [])

  function selectImage(file: File | undefined) {
    if (!file || isRecognizing) return
    const message = validateImage(file, "obraz")
    setError(message)
    setRecognitionError("")
    setImage(message ? null : file)
  }

  function discardImage() {
    request.current?.abort()
    setImage(null)
    setError("")
    setRecognitionError("")
  }

  async function recognize() {
    if (!image || isRecognizing) return
    const controller = new AbortController()
    request.current = controller
    setRecognitionError("")
    setIsRecognizing(true)
    try {
      onRecognized(await recognizeRecipeImage(accessToken, image, controller.signal))
      setImage(null)
    } catch (recognizeError) {
      if (controller.signal.aborted) return
      setRecognitionError(
        recognizeError instanceof ApiError && recognizeError.message
          ? recognizeError.message
          : "Nie udało się rozpoznać przepisu. Spróbuj ponownie albo wypełnij formularz ręcznie.",
      )
    } finally {
      if (request.current === controller) {
        request.current = null
        setIsRecognizing(false)
      }
    }
  }

  const fileInputs = [
    { id: "recognition-camera", label: "Zrób zdjęcie", capture: "environment" as const },
    { id: "recognition-file", label: "Wybierz obraz z urządzenia", capture: undefined },
  ]

  return (
    <section className="recognition-picker" aria-labelledby="recognition-heading">
      <h2 id="recognition-heading">Obraz do rozpoznania</h2>
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
      {recognitionError && (
        <p className="form-error" role="alert">{recognitionError}</p>
      )}
    </section>
  )
}
