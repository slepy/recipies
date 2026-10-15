from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 40_000_000
SAVE_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


class InvalidPhotoError(ValueError):
    pass


class PhotoSanitizer:
    """Re-encodes an uploaded photo so it keeps its pixels but no metadata.

    Pillow only writes the metadata we pass to ``save()``, so decoding the
    image and saving it again drops EXIF (GPS, camera data) by default.
    """

    def sanitize(self, upload):
        try:
            with Image.open(upload) as image:
                if image.width * image.height > MAX_PIXELS:
                    raise InvalidPhotoError("Zdjęcie ma zbyt dużą rozdzielczość.")
                image_format = image.format
                if image_format not in SAVE_FORMATS:
                    raise InvalidPhotoError("Wybierz zdjęcie w formacie JPG, PNG lub WebP.")
                # The EXIF orientation tag is lost on re-save, so apply it to the pixels first.
                oriented = ImageOps.exif_transpose(image)
                output = BytesIO()
                oriented.save(output, format=image_format)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
            raise InvalidPhotoError("Nie udało się odczytać zdjęcia.") from error

        return SimpleUploadedFile(
            upload.name,
            output.getvalue(),
            content_type=SAVE_FORMATS[image_format],
        )
