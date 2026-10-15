from io import BytesIO

from django.test import SimpleTestCase
from PIL import Image

from recipes.services import DishCropper


def image_bytes(size=(200, 100), image_format="PNG"):
    output = BytesIO()
    Image.new("RGB", size, "tomato").save(output, format=image_format)
    return output.getvalue()


class DishCropperTests(SimpleTestCase):
    def crop_size(self, region):
        cropped = DishCropper().crop(image_bytes(), region)
        if cropped is None:
            return None
        with Image.open(BytesIO(cropped)) as image:
            return image.size

    def test_cuts_the_requested_area(self):
        self.assertEqual(self.crop_size({"left": 0.5, "top": 0, "width": 0.5, "height": 1}), (100, 100))

    def test_clamps_an_area_that_sticks_out_of_the_image(self):
        self.assertEqual(self.crop_size({"left": 0.5, "top": 0.5, "width": 1, "height": 1}), (100, 50))

    def test_missing_or_invalid_area_gives_no_crop(self):
        for region in (None, "x", {}, {"left": 0, "top": 0, "width": "1", "height": 1},
                       {"left": 0, "top": 0, "width": 0, "height": 1},
                       {"left": 1.2, "top": 0, "width": 0.5, "height": 0.5},
                       {"left": True, "top": 0, "width": 0.5, "height": 0.5}):
            with self.subTest(region=region):
                self.assertIsNone(self.crop_size(region))

    def test_too_small_area_gives_no_crop(self):
        self.assertIsNone(self.crop_size({"left": 0, "top": 0, "width": 0.05, "height": 0.5}))
        small = DishCropper().crop(image_bytes((100, 100)), {"left": 0, "top": 0, "width": 0.2, "height": 0.2})
        self.assertIsNone(small)  # 20x20 px is below the useful minimum

    def test_keeps_the_source_format(self):
        cropped = DishCropper().crop(image_bytes(image_format="JPEG"), {"left": 0, "top": 0, "width": 0.5, "height": 0.5})
        with Image.open(BytesIO(cropped)) as image:
            self.assertEqual(image.format, "JPEG")
