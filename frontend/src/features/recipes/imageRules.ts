export const imageAccept = "image/jpeg,image/png,image/webp"
export const imageFormatsHint = "JPG, PNG lub WebP · maks. 5 MB"

const maxImageSize = 5 * 1024 * 1024
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"]

// Returns a message for the user, or an empty string when the file is fine.
export function validateImage(file: File, subject: string) {
  if (!allowedImageTypes.includes(file.type)) {
    return `Wybierz ${subject} w formacie JPG, PNG lub WebP.`
  }
  if (file.size > maxImageSize) {
    return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} może mieć maksymalnie 5 MB.`
  }
  return ""
}
