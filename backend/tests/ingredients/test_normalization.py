from django.test import SimpleTestCase

from ingredients.normalization import name_key, parse_amount, unit_key


class NormalizationTests(SimpleTestCase):
    def test_name_key_ignores_case_and_extra_spaces(self):
        self.assertEqual(name_key("  Pomidorki   KOKTAJLOWE "), "pomidorki koktajlowe")

    def test_unit_key_ignores_case_spaces_and_a_trailing_dot(self):
        self.assertEqual(unit_key(" Szt. "), "szt")
        self.assertEqual(unit_key("garść"), "garść")
        self.assertEqual(unit_key(""), "")

    def test_unit_key_has_no_synonyms(self):
        self.assertNotEqual(unit_key("szt."), unit_key("sztuka"))

    def test_parse_amount_reads_decimal_commas_and_fractions(self):
        self.assertEqual(parse_amount("0,5"), 0.5)
        self.assertEqual(parse_amount("1 1/2"), 1.5)
        self.assertIsNone(parse_amount("do smaku"))
