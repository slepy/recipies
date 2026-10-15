import { useEffect, useState } from "react"

import { imageAccept, imageFormatsHint, validateImage } from "./imageRules"

export default function RecognitionImagePicker() {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [error, setError] = useState("")

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
    if (!file) return
    const message = validateImage(file, "obraz")
    setError(message)
    setImage(message ? null : file)
  }

  function discardImage() {
    setImage(null)
    setError("")
  }

  return (
    <section className="recognition-picker" aria-labelledby="recognition-heading">
      <h2 id="recognition-heading">Obraz do rozpoznania</h2>
      <p>Wybierz jeden obraz z tekstem przepisu. Samo wybranie pliku niczego nie wysyła.</p>
      <div className="recognition-picker__actions">
        <label className="secondary-button recognition-picker__file" htmlFor="recognition-camera">
          Zrób zdjęcie
          <input
            accept={imageAccept}
            capture="environment"
            id="recognition-camera"
            onChange={(event) => {
              selectImage(event.target.files?.[0])
              event.target.value = ""
            }}
            type="file"
          />
        </label>
        <label className="secondary-button recognition-picker__file" htmlFor="recognition-file">
          Wybierz obraz z urządzenia
          <input
            accept={imageAccept}
            id="recognition-file"
            onChange={(event) => {
              selectImage(event.target.files?.[0])
              event.target.value = ""
            }}
            type="file"
          />
        </label>
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
              Odrzuć obraz
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
          <button className="primary-button" disabled type="button">
            Rozpoznaj przepis
          </button>
          <small>Rozpoznawanie będzie dostępne po wdrożeniu integracji z dostawcą AI.</small>
        </div>
      )}
    </section>
  )
}
