from io import BytesIO

from PIL import Image

MIN_SIDE_FRACTION = 0.1
MIN_SIDE_PIXELS = 32


class DishCropper:
    """Cuts the dish area suggested by the AI out of the image, or returns None."""

    def crop(self, image_bytes: bytes, region) -> bytes | None:
        coordinates = self._read_region(region)
        if coordinates is None:
            return None

        with Image.open(BytesIO(image_bytes)) as image:
            width, height = image.size
            left, top, region_width, region_height = coordinates
            # Clamp to the image, so a slightly-too-big box still gives a usable crop.
            right = min(left + region_width, 1.0)
            bottom = min(top + region_height, 1.0)
            left, top = max(left, 0.0), max(top, 0.0)
            if right - left < MIN_SIDE_FRACTION or bottom - top < MIN_SIDE_FRACTION:
                return None

            box = (round(left * width), round(top * height), round(right * width), round(bottom * height))
            if box[2] - box[0] < MIN_SIDE_PIXELS or box[3] - box[1] < MIN_SIDE_PIXELS:
                return None

            output = BytesIO()
            image.crop(box).save(output, format=image.format)
            return output.getvalue()

    def _read_region(self, region):
        if not isinstance(region, dict):
            return None
        values = [region.get(key) for key in ("left", "top", "width", "height")]
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
            return None
        left, top, width, height = (float(value) for value in values)
        if width <= 0 or height <= 0 or left >= 1 or top >= 1:
            return None
        return left, top, width, height
