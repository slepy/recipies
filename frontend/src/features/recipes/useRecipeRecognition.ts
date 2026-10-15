import { useEffect, useRef, useState } from "react"

import { ApiError, recognizeRecipeImage, RecipeDraft } from "./api"

const fallbackError = "Nie udało się rozpoznać przepisu. Spróbuj ponownie albo wypełnij formularz ręcznie."

// Runs one recognition request at a time and owns its pending, error and cancel state.
export default function useRecipeRecognition(accessToken: string) {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [error, setError] = useState("")
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  function cancel() {
    request.current?.abort()
  }

  function clearError() {
    setError("")
  }

  // Resolves to the draft, or null when the request failed or was cancelled.
  async function recognize(image: File): Promise<RecipeDraft | null> {
    if (request.current) return null
    const controller = new AbortController()
    request.current = controller
    setError("")
    setIsRecognizing(true)
    try {
      return await recognizeRecipeImage(accessToken, image, controller.signal)
    } catch (recognizeError) {
      if (!controller.signal.aborted) {
        setError(recognizeError instanceof ApiError && recognizeError.message ? recognizeError.message : fallbackError)
      }
      return null
    } finally {
      request.current = null
      setIsRecognizing(false)
    }
  }

  return { isRecognizing, error, recognize, cancel, clearError }
}
