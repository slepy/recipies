from io import BytesIO

from PIL import Image

MIN_SIDE_FRACTION = 0.1
MIN_SIDE_PIXELS = 32
# A box covering most of the image is the AI giving up, not a dish photo inside a recipe page.
MAX_AREA_FRACTION = 0.6


class DishCropper:
    """Cuts the dish area suggested by the AI out of the image, or returns None.

    The area is {"left", "top", "right", "bottom"}, either in pixels or as 0-1 fractions.
    """

    def crop(self, image_bytes: bytes, region) -> bytes | None:
        corners = self._read_region(region)
        if corners is None:
            return None

        with Image.open(BytesIO(image_bytes)) as image:
            width, height = image.size
            if max(corners) > 1:  # the AI answered in pixels, not fractions
                corners = tuple(value / size for value, size in zip(corners, (width, height, width, height)))
            # Clamp to the image, so a slightly-too-big box still gives a usable crop.
            left, top, right, bottom = (min(max(value, 0.0), 1.0) for value in corners)
            if right - left < MIN_SIDE_FRACTION or bottom - top < MIN_SIDE_FRACTION:
                return None
            if (right - left) * (bottom - top) > MAX_AREA_FRACTION:
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
        values = [region.get(key) for key in ("left", "top", "right", "bottom")]
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
            return None
        left, top, right, bottom = (float(value) for value in values)
        if right <= left or bottom <= top:
            return None
        return left, top, right, bottom
