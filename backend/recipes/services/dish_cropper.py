from io import BytesIO

from PIL import Image

from recipes.services.dish_photo_locator import DishPhotoLocator

MIN_SIDE_PIXELS = 32
MAX_ASPECT_RATIO = 4  # a very long, thin blob is a line of text, not a dish photo
# A box covering most of the image is not a dish photo inside a recipe page.
MAX_AREA_FRACTION = 0.6


class DishCropper:
    """Cuts the dish photo out of a recipe image, or returns None.

    The AI only hints where the photo is, as {"left", "top", "right", "bottom"} in pixels or
    0-1 fractions. The exact edges come from analysing the pixels, which keeps page text out.
    """

    def __init__(self, locator=None):
        self.locator = locator or DishPhotoLocator()

    def crop(self, image_bytes: bytes, region) -> bytes | None:
        corners = self._read_region(region)
        if corners is None:
            return None

        with Image.open(BytesIO(image_bytes)) as image:
            width, height = image.size
            if max(corners) > 1:  # the AI answered in pixels, not fractions
                corners = tuple(value / size for value, size in zip(corners, (width, height, width, height)))
            left, top, right, bottom = (min(max(value, 0.0), 1.0) for value in corners)
            hint = (round(left * width), round(top * height), round(right * width), round(bottom * height))

            box = self.locator.locate(image, hint)
            if box is None or not self._looks_like_a_photo(box, image.size):
                return None

            output = BytesIO()
            image.crop(box).save(output, format=image.format)
            return output.getvalue()

    def _looks_like_a_photo(self, box, image_size):
        box_width, box_height = box[2] - box[0], box[3] - box[1]
        if min(box_width, box_height) < MIN_SIDE_PIXELS:
            return False
        if max(box_width, box_height) / min(box_width, box_height) > MAX_ASPECT_RATIO:
            return False
        return box_width * box_height <= MAX_AREA_FRACTION * image_size[0] * image_size[1]

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
