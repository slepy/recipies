from io import BytesIO

from django.test import SimpleTestCase
from PIL import Image, ImageDraw

from recipes.services import DishCropper


def recipe_page(size=(300, 150), dish=(10, 10, 110, 140), round_dish=True):
    """A white page with a dish photo without a frame and thin lines of text on the right."""
    page = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(page)
    shape = draw.ellipse if round_dish else draw.rectangle
    shape(dish, fill=(180, 60, 40))
    for y in range(15, size[1] - 10, 12):
        for x in range(130, size[0] - 10, 3):  # gaps between "letters"
            draw.line((x, y, x, y + 3), fill="black")
    return page


def to_bytes(image):
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


class DishCropperTests(SimpleTestCase):
    def crop_box(self, region, page=None, original=(10, 10, 110, 140)):
        """Crops the page and returns how far the crop is from the original dish, per edge."""
        page = page or recipe_page(dish=original)
        cropped = DishCropper().crop(to_bytes(page), region)
        if cropped is None:
            return None
        with Image.open(BytesIO(cropped)) as image:
            return image.size

    def assertAroundDish(self, size, expected=(100, 130), tolerance=14):
        self.assertIsNotNone(size)
        self.assertLessEqual(abs(size[0] - expected[0]), tolerance)
        self.assertLessEqual(abs(size[1] - expected[1]), tolerance)

    def test_finds_a_dish_on_a_white_page_without_a_frame(self):
        self.assertAroundDish(self.crop_box({"left": 0, "top": 0, "right": 120, "bottom": 150}))

    def test_a_loose_hint_that_includes_text_still_gives_only_the_dish(self):
        self.assertAroundDish(self.crop_box({"left": 0, "top": 0, "right": 300, "bottom": 150}))
        self.assertAroundDish(self.crop_box({"left": 0, "top": 0, "right": 0.9, "bottom": 1}))

    def test_finds_a_dish_anywhere_on_the_page(self):
        page = recipe_page(dish=(190, 10, 290, 140))
        # move the text to the left side instead
        page.paste("white", (0, 0, 190, 150))
        draw = ImageDraw.Draw(page)
        for y in range(15, 140, 12):
            for x in range(10, 170, 3):
                draw.line((x, y, x, y + 3), fill="black")

        self.assertAroundDish(self.crop_box({"left": 180, "top": 0, "right": 300, "bottom": 150}, page=page))

    def test_the_hint_picks_the_dish_when_there_are_several_blobs(self):
        page = recipe_page(size=(400, 150))
        ImageDraw.Draw(page).rectangle((300, 10, 330, 40), fill="blue")  # a small logo

        self.assertAroundDish(self.crop_box({"left": 0, "top": 0, "right": 130, "bottom": 150}, page=page))

    def test_missing_or_invalid_hint_gives_no_crop(self):
        for region in (None, "x", {}, {"left": 0, "top": 0, "right": "1", "bottom": 1},
                       {"left": 0.5, "top": 0, "right": 0.4, "bottom": 1},
                       {"left": True, "top": 0, "right": 0.5, "bottom": 0.5}):
            with self.subTest(region=region):
                self.assertIsNone(self.crop_box(region))

    def test_a_hint_over_text_only_gives_no_crop(self):
        self.assertIsNone(self.crop_box({"left": 130, "top": 0, "right": 300, "bottom": 150}))

    def test_a_page_with_only_text_gives_no_crop(self):
        page = Image.new("RGB", (300, 150), "white")
        draw = ImageDraw.Draw(page)
        for y in range(15, 140, 12):
            for x in range(10, 290, 3):
                draw.line((x, y, x, y + 3), fill="black")

        self.assertIsNone(self.crop_box({"left": 0, "top": 0, "right": 300, "bottom": 150}, page=page))

    def test_a_photo_filling_the_whole_image_gives_no_crop(self):
        page = Image.new("RGB", (200, 100), (180, 60, 40))

        self.assertIsNone(self.crop_box({"left": 0, "top": 0, "right": 200, "bottom": 100}, page=page))
