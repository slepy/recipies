from collections import Counter, deque

from PIL import Image, ImageChops

ANALYSIS_SIDE = 800  # large images are analysed at a smaller size to keep this fast
CELL = 6  # pixels per analysis cell
BACKGROUND_TOLERANCE = 24
MIN_CELL_FILL = 0.7  # a photo cell is mostly non-background; a cell of text is not


class DishPhotoLocator:
    """Finds the photograph on a recipe page by analysing pixels instead of trusting an AI box.

    Text is thin ink on a plain page, so its cells are mostly background; a photo is dense. The
    dense cells are grouped into blobs, and the blob that overlaps the AI's hint the most wins.
    """

    def locate(self, image: Image.Image, hint: tuple[int, int, int, int]) -> tuple[int, int, int, int] | None:
        rgb = image.convert("RGB")
        scale = min(1.0, ANALYSIS_SIDE / max(rgb.size))
        if scale < 1.0:
            rgb = rgb.resize((round(image.width * scale), round(image.height * scale)))

        dense = self._dense_cells(rgb)
        hint_cells = tuple(round(value * scale / CELL) for value in hint)

        best, best_overlap = None, 0
        for blob in self._blobs(dense):
            overlap = self._overlap(self._bounds(blob), hint_cells)
            if overlap > best_overlap:
                best, best_overlap = blob, overlap
        if best is None:
            return None

        left, top, right, bottom = self._bounds([cell for cell in best if dense[cell[1]][cell[0]]])
        return tuple(min(round(value * CELL / scale), limit) for value, limit in zip(
            (left, top, right, bottom), (image.width, image.height, image.width, image.height)
        ))

    def _dense_cells(self, rgb):
        background = self._background(rgb)
        difference = ImageChops.difference(rgb, Image.new("RGB", rgb.size, background))
        red, green, blue = difference.split()
        ink = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(
            lambda value: 255 if value > BACKGROUND_TOLERANCE else 0
        )
        columns, rows = max(1, rgb.width // CELL), max(1, rgb.height // CELL)
        fill = ink.resize((columns, rows), Image.BOX)
        values = list(fill.tobytes())
        return [[values[y * columns + x] / 255 >= MIN_CELL_FILL for x in range(columns)] for y in range(rows)]

    def _background(self, rgb):
        """The most common coarse colour of the whole image: the page behind the text."""
        sample = rgb.resize((100, 100))
        data = sample.tobytes()
        coarse = Counter(tuple(channel // 16 for channel in data[i:i + 3]) for i in range(0, len(data), 3))
        return tuple(channel * 16 + 8 for channel in coarse.most_common(1)[0][0])

    def _blobs(self, dense):
        """Groups touching dense cells; a one-cell gap is bridged so a white plate does not split a photo."""
        rows, columns = len(dense), len(dense[0])
        grown = [
            [
                any(dense[yy][xx]
                    for yy in range(max(0, y - 1), min(rows, y + 2))
                    for xx in range(max(0, x - 1), min(columns, x + 2)))
                for x in range(columns)
            ]
            for y in range(rows)
        ]
        seen = set()
        for y in range(rows):
            for x in range(columns):
                if not grown[y][x] or (x, y) in seen:
                    continue
                blob, queue = [], deque([(x, y)])
                seen.add((x, y))
                while queue:
                    cx, cy = queue.popleft()
                    blob.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < columns and 0 <= ny < rows and grown[ny][nx] and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            queue.append((nx, ny))
                yield blob

    def _bounds(self, cells):
        xs = [cell[0] for cell in cells]
        ys = [cell[1] for cell in cells]
        return min(xs), min(ys), max(xs) + 1, max(ys) + 1

    def _overlap(self, a, b):
        width = min(a[2], b[2]) - max(a[0], b[0])
        height = min(a[3], b[3]) - max(a[1], b[1])
        return width * height if width > 0 and height > 0 else 0
