# Specyfikacja: Baza wiedzy o składnikach (waga jednej jednostki)

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-15
> Updated: 2026-10-15
> Related issue/decision: Brak. Powiązane: `2026-10-15-meal-plan.md`, `2026-10-14-recipe-based-shopping-lists.md` (pozycje listy, `extra_metric`), ADR-0005

## Stan implementacji

> Sprawdzono: 2026-10-15, kod z commitu `ffa7d07` (`feature/ingredient-knowledge-base`, PR do `feature/meal-plan`).

| Obszar | Stan | Szczegóły |
| --- | --- | --- |
| FR-001–FR-003, FR-010 (baza, ręczna edycja, wyszukiwanie, ochrona) | ✅ Zrobione | Aplikacja `ingredients`, `GET/POST /api/ingredients/unit-weights/`, `PATCH/DELETE …/<id>/`; testy w `backend/tests/ingredients/` |
| FR-004 (ekran „Baza składników”) | ✅ Zrobione | Trasa `/ingredients`, `features/ingredients/IngredientBase.tsx` |
| FR-005–FR-006 (uczenie z przepisów i pozycji) | ✅ Zrobione | `UnitWeightLearner` wywoływany przy zapisie przepisu i własnej pozycji listy |
| FR-007–FR-009 (lista zakupów: automatyczna gramatura, dodawanie z bazy) | ✅ Zrobione | `unit_weight` i `metric_estimated` w API pozycji, `CustomItemMeasure`, `UnitWeightPicker` |
| QR-001–QR-005 | ✅ Zrobione | QR-001: test stałej liczby zapytań (bez pomiaru czasu p95); QR-003: test klawiatury w Vitest (bez ręcznego testu) |

**Znane problemy i założenia:** pusta jednostka jest dopuszczalna także dla własnych pozycji (AC-014, AC-020), zgodnie z AC-001. Parser ilości przeniesiono do `ingredients/normalization.py` (`meal_plans` nadal go eksportuje). Migracje nie były uruchomione na lokalnej bazie deweloperskiej (wykona je start kontenera).

**Następny krok:** przegląd PR; ręczny test klawiaturą i pomiar QR-001 przy 5 000 wpisów.

## 1. Podsumowanie

Aplikacja uczy się, ile waży **jedna jednostka** danego składnika, i zapamiętuje to w prywatnej bazie użytkownika. Gdy przepis lub pozycja listy mówi „12 sztuk pomidorków koktajlowych (240 g)”, baza zapisuje „pomidorki koktajlowe / sztuka = 20 g”. Dzięki temu na liście zakupów zwiększenie ilości (12 → 18 sztuk) automatycznie zwiększa gramaturę, a użytkownik może dodać do listy produkt wybrany z zapisanych (wyszukiwarka), podając tylko liczbę jednostek.

**Decyzje z rundy doprecyzowania:**

- Źródło wiedzy: automatycznie (z przepisów i własnych pozycji listy) oraz ręcznie (ekran „Baza składników” do poprawiania i dodawania wpisów).
- Konflikty: automat **nigdy nie nadpisuje** istniejącego wpisu; tylko uzupełnia brakujące. Zmiana wartości jest możliwa wyłącznie z ekranu bazy.
- Zakres pierwszej wersji: lista zakupów. Formularz przepisu nie podpowiada wagi z bazy (przepisy tylko zasilają bazę).
- Klucz wpisu: znormalizowana nazwa produktu + jednostka domowa („rukola / garść”, „rukola / sztuka” to dwa wpisy). Tylko waga (g); objętość poza zakresem.

## 2. Problem i kontekst

- **Problem:** pozycja listy zakupów ma ilość domową („12 szt.”) i metryczną („240 g”), ale po zwiększeniu jednej użytkownik musi ręcznie przeliczyć drugą. Wiedzę „pomidorek waży 20 g” użytkownik ma w głowie, a aplikacja ją ma już w danych (ilość + waga w przepisie), tylko jej nie zapamiętuje.
- **Kontekst:** składnik przepisu ma `amount`, `unit`, `metric_amount`, `metric_unit` (g, kg, ml, l). Pozycja listy trzyma ręczne zwiększenia osobno: `extra_amount` i `extra_metric` (w g/ml). Sumator łączy pozycje po znormalizowanej nazwie (`" ".join(name.casefold().split())`).
- **Pożądany rezultat:** po zwiększeniu ilości pozycji o znanej wadze jednostki gramatura rośnie bez ręcznego liczenia; użytkownik dodaje znany produkt do listy jednym wyborem i jedną liczbą.
- **Założenie do potwierdzenia:** waga jednostki jest stała dla pary nazwa + jednostka (przybliżenie: „garść” rukoli jest zawsze tyle samo).

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Zalogowany użytkownik | Zapisuje przepis ze składnikiem „12 szt. pomidorki koktajlowe, 240 g” | Baza dostaje wpis „pomidorki koktajlowe / szt. = 20 g” |
| Użytkownik z listą zakupów | Zwiększa pomidorki o 6 sztuk | Gramatura rośnie o 120 g bez ręcznego liczenia |
| Użytkownik dopisujący produkt | Wyszukuje „awokado” wśród zapisanych i wpisuje 3 | Na liście pojawia się „awokado, 3, ≈ 420 g” |
| Użytkownik poprawiający dane | Zmienia 20 g na 25 g w ekranie bazy | Kolejne wyliczenia używają 25 g |
| Użytkownik z nietypowym składnikiem | Składnik nie ma wpisu w bazie | Zwiększenie ilości działa jak dotąd: ręcznie, bez wyliczeń |

## 4. Zakres

### W zakresie

- Prywatna baza wpisów „produkt + jednostka → gramy na jednostkę” dla każdego użytkownika.
- Automatyczne uzupełnianie bazy przy zapisie przepisu i własnej pozycji listy.
- Ekran „Baza składników”: lista, wyszukiwanie, dodawanie, edycja, usuwanie wpisów.
- Lista zakupów: automatyczne wyliczanie gramatury przy zwiększaniu ilości pozycji z przepisów oraz przy własnych pozycjach; dodawanie własnej pozycji wybranej z bazy.

### Poza zakresem

- Podpowiedzi wagi w formularzu przepisu i uzupełnianie brakującej wagi składników przepisów.
- Objętość (ml, l) i przeliczenia gęstości; tylko masa (g, kg).
- Wspólna lub globalna baza produktów, import danych (np. tabele kalorii), kalorie i makroskładniki.
- Łączenie podobnych nazw („pomidor” i „pomidorki”) i słownik synonimów jednostek („szt.”, „sztuka”, „sztuki”); wpisy rozróżnia tylko normalizacja z FR-001.
- Wyliczanie gramatury dla pozycji, które nie mają jeszcze miary metrycznej (zob. otwarte pytania).
- Średnie i statystyka obserwacji, ukrywanie wpisów, współdzielenie.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

- **FR-001:** System przechowuje dla użytkownika wpisy wagi jednostki: nazwa produktu, jednostka, gramy na jednostkę oraz źródło (`auto` lub `manual`).
  - **AC-001:** Wpis jest identyfikowany przez klucz: nazwa po normalizacji (`casefold`, zbite białe znaki) oraz jednostka po normalizacji (`casefold`, przycięcie spacji i końcowej kropki). Pusta jednostka jest dozwolona i oznacza „sztuka bez nazwy” (np. „awokado” bez jednostki).
  - **AC-002:** Dla jednego użytkownika klucz jest unikalny; ten sam klucz nie tworzy duplikatu, a nazwa i jednostka zachowują pisownię z pierwszego zapisu.
  - **AC-003:** Waga na jednostkę to liczba z przedziału 0,01–100 000 g; wartości spoza przedziału, zerowe i ujemne są odrzucane.
- **FR-002:** System umożliwia ręczne dodawanie, edycję i usuwanie wpisów.
  - **AC-004:** Dodanie wpisu wymaga nazwy i wagi; zapis ma źródło `manual`. Dodanie wpisu o istniejącym kluczu jest odrzucane z komunikatem wskazującym istniejący wpis.
  - **AC-005:** Edycja zmienia wagę (oraz nazwę i jednostkę, jeśli nowy klucz nie koliduje) i ustawia źródło `manual`.
  - **AC-006:** Usunięcie wpisu nie zmienia istniejących pozycji list ani przepisów. Wpis może później powstać ponownie z przepisu (FR-005).
- **FR-003:** System umożliwia przeszukiwanie wpisów.
  - **AC-007:** Wyszukiwanie po fragmencie nazwy ignoruje wielkość liter, zwraca tylko wpisy bieżącego użytkownika i działa także na ekranie bazy, i w wyborze produktu na liście zakupów (FR-009).
  - **AC-008:** Bez frazy wyszukiwanie zwraca listę posortowaną alfabetycznie po nazwie, potem jednostce, z paginacją (po 50 wpisów).
- **FR-004:** Ekran „Baza składników” pokazuje wpisy i pozwala wykonać operacje z FR-002.
  - **AC-009:** Wpis wyświetla „nazwa, jednostka, X g” oraz etykietę tekstową źródła („automatycznie” / „ręcznie”), nie tylko kolor.
  - **AC-010:** Pusta baza pokazuje komunikat z wyjaśnieniem, skąd biorą się wpisy.
- **FR-005:** System uzupełnia bazę przy zapisie przepisu.
  - **AC-011:** Składnik przepisu z `amount` będącym liczbą dodatnią (przecinek dziesiętny jak „0,5” jest akceptowany), niepustą nazwą oraz `metric_unit` g lub kg i `metric_amount` > 0 daje wagę jednostki `metric_amount × (1 lub 1000) ÷ amount`, zaokrągloną do 2 miejsc. Przykłady: „12 szt., 240 g” → 20 g; „2 garście, 40 g” → 20 g; „0,5 (bez jednostki), 70 g” → 140 g.
  - **AC-012:** Jeśli wpis o tym kluczu już istnieje (dowolne źródło), wartość nie jest zmieniana. Jeśli ten sam przepis zawiera ten sam produkt kilka razy z różnymi wagami, obowiązuje pierwsza wartość w kolejności składników.
  - **AC-013:** Składniki bez ilości liczbowej, bez miary metrycznej, z miarą w ml/l, a także z wynikiem poza przedziałem z AC-003 są pomijane bez błędu; zapis przepisu nigdy nie kończy się błędem z powodu uczenia się bazy.
- **FR-006:** System uzupełnia bazę przy zapisie własnej pozycji listy zakupów.
  - **AC-014:** Własna pozycja z ilością liczbową (`amount_text`), jednostką i miarą metryczną w g/kg, wprowadzoną przez użytkownika, uzupełnia bazę według tych samych reguł co AC-011–AC-013. Pozycja, której miara została wyliczona z bazy (FR-008), nie zasila bazy.
- **FR-007:** System wylicza gramaturę przy zwiększaniu ilości pozycji z przepisów.
  - **AC-015:** Gdy pozycja z przepisów ma miarę metryczną w g/kg, a baza ma wpis dla jej nazwy i jednostki (po normalizacji), zwiększenie ilości (`increase_amount`) bez podania `increase_metric_amount` zwiększa `extra_metric` o `increase_amount × waga` g. Przykład: pomidorki 12 szt. = 240 g, +6 szt. → 18 szt. i 360 g.
  - **AC-016:** Gdy klient poda `increase_metric_amount` jawnie, ta wartość wygrywa nad wyliczeniem.
  - **AC-017:** Gdy wpisu w bazie nie ma, albo pozycja nie ma miary metrycznej w g/kg, zachowanie jest takie jak dotąd: zwiększa się tylko ilość domowa.
  - **AC-018:** Resetowanie zwiększenia (`reset_increase`) zeruje oba zwiększenia, jak dotąd.
  - **AC-019:** Odpowiedź pozycji zawiera `unit_weight` (g na jednostkę lub `null`), a interfejs w oknie zwiększania pokazuje podgląd („+6 szt. ≈ +120 g”) przed zapisem.
- **FR-008:** System wylicza gramaturę własnej pozycji z bazy.
  - **AC-020:** Własna pozycja zapisana z ilością liczbową i jednostką, bez miary metrycznej, której wpis istnieje w bazie, dostaje `metric_amount` = `ilość × waga` (w g, a od 1000 g w kg, jak w formacie sum listy) i flagę `metric_estimated = true`. Interfejs pokazuje taką gramaturę z „≈”.
  - **AC-021:** Zmiana ilości takiej pozycji bez jawnej miary metrycznej przelicza gramaturę ponownie. Jawne podanie miary przez użytkownika ustawia `metric_estimated = false`, a wyliczanie dla tej pozycji kończy się.
  - **AC-022:** Pozycja bez wpisu w bazie lub z ilością nieliczbową zachowuje się jak dotąd, bez gramatury.
- **FR-009:** Użytkownik dodaje do listy produkt wybrany z bazy.
  - **AC-023:** W formularzu dodawania pozycji jest wyszukiwarka wpisów bazy (FR-003). Wybór wypełnia nazwę i jednostkę; użytkownik wpisuje tylko ilość, a gramatura pokazuje się na bieżąco i jest zapisywana zgodnie z FR-008.
  - **AC-024:** Wpisy, których produkt (po normalizacji nazwy) już jest na liście, są oznaczone „już na liście” i niedostępne do wyboru. Produkt już obecny zwiększa się przez zwiększenie ilości jego pozycji (FR-007).
  - **AC-025:** Brak wyników wyszukiwania pokazuje komunikat i nadal pozwala dodać pozycję ręcznie, jak dotąd.
- **FR-010:** System chroni dane bazy.
  - **AC-026:** Wszystkie operacje wymagają JWT i działają wyłącznie na wpisach bieżącego użytkownika; żądanie bez JWT daje 401, a odwołanie do wpisu innego konta 404. Pole właściciela nie jest przyjmowane od klienta.

### Wymagania jakościowe

| ID | Cecha jakości | Scenariusz i cel pomiarowy | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Wydajność | Wyszukanie we wpisach przy 5 000 wpisów użytkownika zwraca odpowiedź w ≤ 500 ms (p95, lokalnie) i wykonuje stałą liczbę zapytań SQL. | Test liczby zapytań; pomiar ręczny |
| QR-002 | Niezawodność | Awaria uczenia się bazy (np. błąd walidacji wpisu) nie przerywa zapisu przepisu ani pozycji listy. | Test automatyczny |
| QR-003 | Dostępność | Wyszukiwarka produktu ma etykietę tekstową, obsługę klawiaturą (strzałki, Enter, Esc), a stan „już na liście” jest komunikowany tekstem. | Test Testing Library; ręczny test klawiaturą |
| QR-004 | Spójność | Zapis wpisów przy równoległych zapisach przepisów nie tworzy duplikatów klucza. | Ograniczenie unikalności w bazie + test |
| QR-005 | Limit danych | Użytkownik ma najwyżej 5 000 wpisów; po przekroczeniu uczenie pomija nowe wpisy bez błędu, a ręczne dodanie zwraca komunikat. | Test automatyczny |

## 6. Dane i informacje

- **Dane tworzone/czytane/zmieniane/usuwane:** nowy model `IngredientUnitWeight`: `owner`, `name`, `name_key`, `unit`, `unit_key`, `grams_per_unit` (float, 0,01–100 000), `source` (`auto`/`manual`), `created_at`, `updated_at`; unikalność (`owner`, `name_key`, `unit_key`). Nowe pole `ShoppingListItem.metric_estimated` (bool, domyślnie `false`). Czytane: składniki przepisów (JSON), pozycje list.
- **Źródło prawdy i własność:** wpis należy do użytkownika; aplikacja `ingredients` jest właścicielem modelu.
- **Wrażliwość i dane osobowe:** wpisy to preferencje kulinarne powiązane z kontem, bez danych szczególnych kategorii; nie są udostępniane.
- **Walidacja i spójność:** normalizacja klucza w jednym miejscu (współdzielona z sumatorem list, aby nazwa na liście i w bazie dawała ten sam klucz); wagi tylko w gramach; zaokrąglenie do 2 miejsc przy zapisie wpisu, a wyliczenia zaokrąglane dopiero w wyniku.
- **Retencja, usuwanie, migracja:** wpisy znikają z kontem (`CASCADE`); usunięcie przepisu ich nie usuwa. Migracja dodaje tabelę i pole `metric_estimated`; istniejące dane nie są wstecznie przetwarzane (baza zapełnia się od nowych zapisów). Kopia zapasowa jak reszta bazy.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne na | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| Przepisy (`recipes`) | Upstream | Projekt | Składniki to JSON z `amount`, `unit`, `metric_*` | Faza 2 | Ready | Brak automatycznego uczenia |
| Listy zakupów (`shopping_lists`) | Upstream/downstream | Projekt | `extra_metric`, `increase_*`, `amount_text` | Faza 4 | Ready | Brak korzyści na liście |
| Uwierzytelnianie JWT | Upstream | `authentication` | Bearer, zakres po `request.user` | Faza 1 | Ready | Blokada |
| ADR-0004 (nawigacja frontendu) | Decyzja | Projekt | Sposób dodania ekranu „Baza składników” | Faza 3 | Ready | Ekran bez wejścia |

- **Kontrakty API (propozycja):** `GET /api/ingredients/unit-weights/?q=&page=`, `POST /api/ingredients/unit-weights/` (`name`, `unit`, `grams_per_unit`), `PATCH`/`DELETE /api/ingredients/unit-weights/<id>/`. Pozycja listy zyskuje pola `unit_weight` i `metric_estimated` (tylko odczyt).
- **Zgodność wsteczna:** `increase_amount` bez wpisu w bazie działa jak dotąd; nowe pola odpowiedzi są addytywne; istniejące testy listy muszą nadal przechodzić.

## 8. Architektura i projekt

- **Dotknięte komponenty:** nowa aplikacja `ingredients` (model, serializery, widoki, serwisy) w stylu prostych aplikacji projektu (modele, serializery i widoki bez portów i adapterów); `recipes` (wywołanie uczenia po zapisie), `shopping_lists` (uczenie z własnej pozycji, wyliczenia przy zwiększaniu i zapisie pozycji, `unit_weight` w odpowiedzi); frontend: nowa funkcja `features/ingredients/` oraz zmiany w `features/shopping-lists/`.
- **Kontekst i granice:** zależności idą w jedną stronę: `recipes` i `shopping_lists` → `ingredients`; `ingredients` nie importuje ich modeli (dostaje zwykłe wartości: nazwa, ilość, jednostka, miara).
- **Przepływ kluczowy:**
  1. Użytkownik zapisuje przepis → serwis `UnitWeightLearner` przechodzi po składnikach, liczy wagę (AC-011) i tworzy brakujące wpisy (`get_or_create` po kluczu, nigdy nie aktualizuje).
  2. Użytkownik zwiększa pozycję listy → widok pobiera wpis po (`nazwa`, `jednostka`) pozycji i, jeśli jest, wylicza `extra_metric` (AC-015).
  3. Użytkownik wybiera produkt z bazy → pozycja własna z nazwą i jednostką wpisu; serwer wylicza miarę (AC-020).
- **Zmiany modelu danych:** jak w sekcji 6.
- **Decyzje:** (a) osobna aplikacja zamiast pola na przepisie, bo wiedza jest niezależna od przepisów i ma własny ekran; (b) uczenie jako serwis wywoływany z widoków zapisu, nie sygnały Django, bo przepływ ma być czytelny w kodzie; (c) „nie nadpisuj” zamiast średniej, bo jest przewidywalne i prostsze do wyjaśnienia; (d) flaga `metric_estimated`, by odróżnić gramaturę wyliczoną od wpisanej i bezpiecznie ją przeliczać. Zapisać w ADR-0006 podczas implementacji, jeśli zmieni się granica modułów.
- **Wdrożenie i operacje:** tylko migracje; brak nowej infrastruktury.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby i granice zaufania:** wpisy bazy użytkownika; granica to API chronione JWT.
- **Kontrola dostępu:** każdy zapytanie ograniczone do `request.user`; właściciel nigdy z żądania (AC-026).
- **Zagrożenia/nadużycia:** zapełnianie bazy masą wpisów (limit z QR-005); skrajne wartości wag zawyżające gramaturę (AC-003); nazwy z HTML/skryptami (API zwraca JSON, a React escapuje tekst).
- **Sekrety, logi, ekspozycja:** brak sekretów; nie logować treści wpisów.
- **Mitygacje i weryfikacja:** AC-003, AC-026, QR-005 testami automatycznymi.

## Przegląd zgodności

To przegląd zastosowania i dowodów, nie opinia prawna ani certyfikacja.

| Źródło/obowiązek i wersja | Dotyczy? | Uzasadnienie i zakres | ID wymagań | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| RODO (UE 2016/679), zasada minimalizacji i usuwania | Możliwe | Wpisy są powiązane z kontem użytkownika; zawierają preferencje kulinarne, nie dane szczególnych kategorii | FR-010 | Usuwanie wpisów z kontem (`CASCADE`), brak współdzielenia | Do ustalenia | Do oceny, czy aplikacja wyjdzie poza użytek prywatny |
| Polityki projektu (ADR-0003: brak ujawniania sekretów) | Nie | Funkcja nie dotyka kluczy dostawców | N/D | N/D | N/D | N/D |

- **Rozważone jurysdykcje i konteksty wdrożenia:** użytek osobisty / lokalny; inne niezidentyfikowane.
- **Pytania do eksperta:** brak na tym etapie.
- **Nierozwiązane ryzyka zgodności:** brak.

## 11. Wdrożenie i operacje

### Fazy implementacji

| Faza | Zakres i rezultat | Zależności | Kryteria wyjścia i weryfikacja |
| --- | --- | --- | --- |
| 1. Model i API bazy | Aplikacja `ingredients`: model, normalizacja klucza, CRUD, wyszukiwanie, paginacja, limit | JWT | FR-001–FR-003, FR-010, QR-001, QR-004, QR-005 testami w `backend/tests/ingredients/` |
| 2. Uczenie automatyczne | `UnitWeightLearner` wywoływany po zapisie przepisu i własnej pozycji listy | Faza 1 | AC-011–AC-014, QR-002 testami |
| 3. Ekran „Baza składników” | Lista, wyszukiwanie, dodawanie, edycja, usuwanie, stany puste i błędów | Faza 1, ADR-0004 | FR-004, QR-003 testem Vitest i `npm run build` |
| 4. Integracja z listą zakupów | Wyliczanie przy zwiększaniu (FR-007), `metric_estimated` i wyliczanie własnych pozycji (FR-008), wybór z bazy (FR-009), `unit_weight` w API | Fazy 1–3 | AC-015–AC-025 testami backendu i `ShoppingListView.test.tsx`; pełne zestawy testów przechodzą |

- **Podejście do wydania/migracji:** migracje uruchamiają się przy starcie kontenera; baza zaczyna pusta i zapełnia się od nowych zapisów. Opcjonalnie później polecenie zasilające bazę z istniejących przepisów (zob. pytania).
- **Sygnały monitorowania:** brak (aplikacja lokalna).
- **Obsługa awarii i wycofanie:** funkcje są addytywne; wycofanie to cofnięcie migracji. Błąd uczenia nie blokuje zapisów (QR-002).

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| AC-001–AC-003 | Test automatyczny | `backend/tests/ingredients/` (planowane) | Planned |
| AC-004–AC-010, AC-026 | Test automatyczny | backend + Vitest dla ekranu | Planned |
| AC-011–AC-014, QR-002 | Test automatyczny | testy uczenia przy zapisie przepisu i pozycji | Planned |
| AC-015–AC-019 | Test automatyczny | `backend/tests/shopping_lists/`, `ShoppingListView.test.tsx` | Planned |
| AC-020–AC-025 | Test automatyczny | j.w. | Planned |
| QR-001, QR-003 | Test + pomiar ręczny | do ustalenia | Planned |

## 13. Ryzyka, założenia i otwarte pytania

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Mitygacja lub potrzebna decyzja | Owner |
| --- | --- | --- | --- |
| Różne zapisy jednostki („szt.”, „sztuka”, „sztuk”) rozbijają wiedzę na osobne wpisy | Wysokie / średni | Poza zakresem v1; ekran bazy pozwala scalić ręcznie; rozważyć słownik synonimów w kolejnej specyfikacji | Do ustalenia |
| Błędny pierwszy wpis z automatu (np. literówka wagi w przepisie) blokuje poprawne | Średnie / średni | Reguła „nie nadpisuj” + łatwa edycja na ekranie bazy, etykieta źródła | Do ustalenia |
| Waga jednostki zależy od wielkości (mały i duży pomidor) | Średnie / niski | Przybliżenie jawnie oznaczone „≈” | Do ustalenia |
| Różnica nazw (liczba mnoga, odmiana) między bazą a listą powoduje brak trafień | Wysokie / średni | Poza zakresem v1 (łączenie nazw); wyszukiwarka po fragmencie ułatwia ręczny wybór | Do ustalenia |

### Założenia

- Pozycje z przepisów mają ilość domową parsowaną jak dotąd w `IngredientScaler` (wspólny parser dla „0,5”); potwierdzić w fazie 2.
- Użytkownik akceptuje, że baza zaczyna pusta (bez przetwarzania istniejących przepisów).

### Otwarte pytania

- [ ] Czy pozycje z przepisów bez miary metrycznej (a ze znaną wagą jednostki) mają dostawać wyliczoną gramaturę przy zwiększeniu? W v1: nie (AC-017); decyzja dla nowej specyfikacji.
- [ ] Czy dodać polecenie zasilające bazę z istniejących przepisów? Nie blokuje v1.

## 14. Przegląd i zatwierdzenie

- **Przegląd produktowy/domenowy:** do wykonania.
- **Przegląd techniczny:** do wykonania.
- **Przegląd bezpieczeństwa/prywatności/zgodności:** do wykonania; ryzyko niskie, dane tylko prywatne.
- **Decyzja i data:** brak.
