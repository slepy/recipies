# Specyfikacja: Edycja przepisu

> Status: Implemented
> Owner: Właściciel projektu
> Created: 2026-10-15
> Updated: 2026-10-15
> Related issue/decision: `2026-10-14-add-recipe.md` (formularz i zdjęcie potrawy), ADR-0004 (routing), ADR-0005 (listy zakupów z planu)

## Stan implementacji

> Sprawdzono: 2026-10-15, kod z gałęzi `feature/edit-recipe` (baza `main` @ `964ea21`). Jeśli od tego czasu nie zmieniał się kod ani specyfikacja, ta sekcja wystarcza.

| Obszar | Stan | Szczegóły |
| --- | --- | --- |
| FR-001 pobranie jednego przepisu | ✅ Zrobione | `RecipeDetailView.get`, `GET /api/recipes/<id>/`; cudzy lub brakujący przepis daje 404 |
| FR-002 zapis zmian | ✅ Zrobione | `RecipeDetailView.patch` (`partial=True`), JSON lub multipart przez wspólne `read_recipe_payload`; uczenie wag jednostek |
| FR-003 zdjęcie przy edycji | ✅ Zrobione | Plik `photo` podmienia, `remove_photo: true` usuwa; stary plik usuwany po udanym zapisie |
| FR-004 wejście w edycję | ✅ Zrobione | Przycisk „Edytuj” na karcie, trasa `/recipes/:recipeId/edit` (`RecipeEditRoute`), nieliczbowy id → `/recipes` |
| FR-005 formularz edycji | ✅ Zrobione | `RecipeEditor` + wspólny `RecipeForm` (także dla dodawania); bez sekcji AI |
| FR-006 wpływ na plany i listy | ✅ Zrobione | Komunikat nad formularzem edycji |
| Fazy (sekcja 11) | 1–4 zrobione | Pełne zestawy: backend 227 testów, frontend 122 testy, `npm run build` bez błędów |

**Znane problemy:**

- Ręczny test w przeglądarce i test dostępności nie były wykonane.

Naprawione w przeglądzie PR: zapisane składniki bez części pól (starsze przepisy bez miary metrycznej), treść JSON niebędąca obiektem (400 zamiast 500), utrata danych po wyjściu z formularza dodawania, brak możliwości usunięcia zdjęcia, którego podgląd się nie wczytał.

**Następny krok:** przegląd PR.

## 1. Podsumowanie

Użytkownik może zmienić zapisany przepis: wszystkie pola z formularza dodawania (tytuł, opis, porcje, czasy, kroki, składniki) oraz zdjęcie potrawy, które może zostawić, podmienić albo usunąć. Edycja ma własny adres `/recipes/:recipeId/edit` i korzysta z tego samego formularza co dodawanie.

## 2. Problem i kontekst

- **Problem:** przepis po zapisie jest tylko do odczytu. Literówki, zmienione ilości albo brakująca miara metryczna (potrzebna do sumowania na liście zakupów) wymagają dziś utworzenia nowego przepisu, co gubi jego miejsce w planach i zestawach.
- **Kontekst (fakty z kodu):** backend udostępnia tylko `GET/POST /api/recipes/` i `GET /api/recipes/<id>/photo/`. Wpisy planu (`MealEntry`) wskazują przepis kluczem obcym i skalują jego składniki w chwili odczytu. Pozycje list zakupów (`ShoppingListItem`) są kopiami z chwili zbudowania listy.
- **Oczekiwany efekt:** użytkownik poprawia przepis w miejscu, a plany od razu widzą nową wersję.

## 3. Użytkownicy i przypadki użycia

| Użytkownik | Scenariusz | Oczekiwany wynik |
| --- | --- | --- |
| Zalogowany właściciel przepisu | Poprawia literówkę lub ilość składnika | Zmiana widoczna na liście przepisów i w planach |
| Zalogowany właściciel przepisu | Dodaje, podmienia lub usuwa zdjęcie potrawy | Przepis ma nowe zdjęcie albo nie ma żadnego |
| Zalogowany właściciel przepisu | Otwiera link do edycji lub przeładowuje stronę edycji | Formularz ładuje się z aktualnymi danymi |
| Inny użytkownik | Zna identyfikator cudzego przepisu | Dostaje „nie znaleziono”, nic nie zostaje ujawnione ani zmienione |

## 4. Zakres

### W zakresie

- `GET` i `PATCH /api/recipes/<id>/` dla właściciela.
- Zostawienie, podmiana i usunięcie zdjęcia potrawy.
- Akcja „Edytuj” na karcie przepisu, trasa `/recipes/:recipeId/edit`, formularz wypełniony aktualnymi danymi.
- Wydzielenie formularza przepisu do komponentu wspólnego dla dodawania i edycji.
- Informacja w formularzu, jak zmiana wpływa na plany i listy zakupów.

### Poza zakresem

- Usuwanie przepisu.
- Rozpoznawanie przepisu ze zdjęcia (AI) w trybie edycji. Pozostaje tylko przy dodawaniu.
- Historia wersji, cofanie zmian i wykrywanie równoczesnej edycji (obowiązuje „ostatni zapis wygrywa”).
- Ostrzeżenie o niezapisanych zmianach przy opuszczaniu formularza.
- Aktualizacja istniejących list zakupów po zmianie przepisu.
- Osobny adres dla dodawania przepisu (pozostaje stanem w `RecipeWorkspace`).

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

> Oznaczenia kryteriów: ✅ zrobione, 🟡 zrobione częściowo, bez znaku – jeszcze nie zrobione.

- **FR-001:** System zwraca jeden przepis jego właścicielowi.
  - **AC-001:** ✅ `GET /api/recipes/<id>/` z ważnym access JWT właściciela zwraca 200 i ten sam kształt danych co element listy (`id`, pola przepisu, `photo_url`, `created_at`).
  - **AC-002:** ✅ Dla przepisu innego użytkownika albo nieistniejącego identyfikatora odpowiedź to 404. Bez ważnego access JWT odpowiedź to 401.
- **FR-002:** System zapisuje zmiany przepisu.
  - **AC-003:** ✅ `PATCH /api/recipes/<id>/` przyjmuje JSON albo `multipart/form-data` (dane przepisu w polu `recipe` jako JSON, plik w polu `photo`), tak jak `POST`. Zwraca 200 i zaktualizowany przepis.
  - **AC-004:** ✅ Obowiązują te same reguły walidacji co przy tworzeniu (tytuł wymagany i niepusty, miara metryczna z liczbą i jednostką razem, dozwolone jednostki). Przy błędzie odpowiedź to 400, a przepis i zdjęcie pozostają bez zmian.
  - **AC-005:** ✅ Przesłane `ingredients` i `steps` zastępują poprzednie listy w całości.
  - **AC-006:** ✅ `PATCH` cudzego lub nieistniejącego przepisu daje 404 i niczego nie zmienia. Pole właściciela nie jest przyjmowane z żądania.
  - **AC-007:** ✅ Po zapisie zmian system uczy się wag jednostek ze składników (`UnitWeightLearner`), tak jak po utworzeniu przepisu. Nie zmienia to istniejących wpisów bazy składników.
- **FR-003:** System pozwala zostawić, podmienić albo usunąć zdjęcie potrawy.
  - **AC-008:** ✅ Żądanie bez pliku `photo` i bez `remove_photo` zostawia obecne zdjęcie.
  - **AC-009:** ✅ Żądanie z plikiem `photo` zastępuje zdjęcie. Plik przechodzi te same kontrole co przy tworzeniu (format, 5 MB, czytelność, usunięcie EXIF).
  - **AC-010:** ✅ Żądanie z `remove_photo: true` usuwa zdjęcie, a `photo_url` w odpowiedzi to `null`. Wysłanie jednocześnie `photo` i `remove_photo: true` daje 400.
  - **AC-011:** ✅ Po udanej podmianie albo usunięciu poprzedni plik zostaje usunięty z magazynu plików. Przy nieudanym zapisie poprzedni plik zostaje.
- **FR-004:** Użytkownik może wejść w edycję z listy przepisów.
  - **AC-012:** ✅ Każda karta na liście „Moje przepisy” ma przycisk „Edytuj” z dostępną nazwą wskazującą przepis. Przycisk otwiera `/recipes/<id>/edit`.
  - **AC-013:** ✅ Wejście bezpośrednio na `/recipes/<id>/edit` (link, przeładowanie) ładuje formularz. Nieliczbowy identyfikator przekierowuje na `/recipes`. Przepis nieistniejący lub cudzy pokazuje komunikat „Nie znaleziono przepisu.” i drogę powrotu do listy.
  - **AC-014:** ✅ Element nawigacji „Przepisy” jest aktywny na stronie edycji.
- **FR-005:** Formularz edycji pokazuje aktualne dane i zapisuje zmiany.
  - **AC-015:** ✅ Formularz ma nagłówek „Edytuj przepis”, te same pola i układ co dodawanie, i jest wypełniony danymi przepisu. Pusty przepis bez kroków lub składników pokazuje jeden pusty wiersz, jak przy dodawaniu.
  - **AC-016:** ✅ Jeśli przepis ma zdjęcie, formularz pokazuje jego podgląd z akcjami „Zmień zdjęcie” i „Usuń zdjęcie”.
  - **AC-017:** ✅ „Zapisz zmiany” wysyła `PATCH`. Podczas zapisu przycisk jest zablokowany. Po sukcesie użytkownik wraca na `/recipes`, gdzie widzi zmieniony przepis.
  - **AC-018:** ✅ Błąd zapisu pokazuje komunikat, a wpisane dane zostają w formularzu.
  - **AC-019:** ✅ „Anuluj” wraca na `/recipes` bez zapisu.
  - **AC-020:** ✅ Formularz edycji nie pokazuje sekcji rozpoznawania przepisu przez AI.
- **FR-006:** Użytkownik wie, jak zmiana wpływa na inne części aplikacji.
  - **AC-021:** ✅ Formularz edycji informuje: „Zmiany zobaczysz od razu w planach, w których jest ten przepis. Gotowe listy zakupów się nie zmienią.”

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Bezpieczeństwo | Żądanie `GET`/`PATCH` cudzego przepisu: 404, brak zmian w bazie i plikach (100% przypadków w testach) | Testy API |
| QR-002 | Niezawodność | Nieudana walidacja `PATCH` nie zmienia ani pól, ani zdjęcia | Testy API |
| QR-003 | Dostępność | Przyciski „Edytuj” mają nazwę zawierającą tytuł przepisu; formularz edycji używa tych samych etykiet co dodawanie | Testy Testing Library (zapytania po roli i nazwie) |
| QR-004 | Utrzymywalność | Dodawanie i edycja korzystają z jednego komponentu formularza | Przegląd kodu |

## 6. Dane i informacje

- **Dane:** odczyt i aktualizacja istniejącego `Recipe` (wszystkie pola edytowalne z formularza, `photo`). `updated_at` zmienia się automatycznie. Brak nowych pól i migracji.
- **Właściciel danych:** użytkownik z access JWT; zapytania są zawężone do `request.user`.
- **Dane wrażliwe:** zdjęcie potrawy może zawierać dane osobowe w metadanych; usuwa je ten sam `PhotoSanitizer` co przy tworzeniu.
- **Spójność:** plany czytają przepis na żywo, więc zmiana porcji lub składników od razu zmienia skalowanie w planach. Listy zakupów pozostają kopiami.
- **Usuwanie:** poprzedni plik zdjęcia jest usuwany po udanej podmianie lub usunięciu (AC-011).

## 7. Zależności i interfejsy

| Zależność | Typ | Źródło | Ograniczenie | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- |
| `RecipeSerializer`, `PhotoSanitizer` | Upstream | `recipes` | Te same reguły walidacji co `POST` | Gotowe | — |
| `UnitWeightLearner` | Upstream | `ingredients` (ADR-0007) | Tylko dodaje nowe wpisy | Gotowe | — |
| React Router | Pakiet | ADR-0004 | Trasa w `app/AuthenticatedApp.tsx` | Gotowe | — |
| `meal_plans` | Downstream | ADR-0005 | Czyta przepis na żywo | Gotowe | Zmiany od razu widoczne w planach |

- **API:**
  - `GET /api/recipes/<id>/` → 200 `Recipe` | 401 | 404.
  - `PATCH /api/recipes/<id>/` — JSON: pola przepisu i opcjonalnie `remove_photo: true`; multipart: `recipe` (JSON z polami i opcjonalnym `remove_photo`) oraz opcjonalnie `photo`. → 200 `Recipe` | 400 (błędy pól jak przy `POST`) | 401 | 404.
- **UI:** trasa `/recipes/:recipeId/edit`. `RecipeWorkspace` dostaje callback `onEditRecipe(recipeId)` zamiast importować router (ADR-0004).
- **Zgodność:** istniejące `GET/POST /api/recipes/` i `GET /api/recipes/<id>/photo/` bez zmian.

## 8. Architektura i projekt

- **Backend:** nowy widok `RecipeDetailView` (`recipes/views/recipe_detail.py`) z `get` i `patch`, zarejestrowany pod `<int:recipe_id>/`. Odczyt danych z JSON lub multipart wspólny dla `POST` i `PATCH`, żeby nie powielać kodu. Serializer dostaje `partial=True`; obsługa `remove_photo` i usunięcie starego pliku w widoku lub serializerze, po udanym zapisie.
- **Frontend:**
  - `features/recipes/RecipeForm.tsx` — pola przepisu, zdjęcie potrawy, przycisk zapisu. Przyjmuje wartości początkowe i zwraca `RecipeInput` oraz decyzję o zdjęciu (zostaw/podmień/usuń). Szkic z AI przy dodawaniu trafia do formularza przez nowe wartości początkowe (ponowne zamontowanie po zmianie `key`).
  - `features/recipes/RecipeEditor.tsx` — ekran edycji: pobiera przepis i zdjęcie, renderuje `RecipeForm`, wysyła `PATCH`.
  - `features/recipes/api.ts` — `getRecipe`, `updateRecipe`.
  - `app/AuthenticatedApp.tsx` — trasa `/recipes/:recipeId/edit` i przekazanie callbacków.
- **Przepływ:** „Edytuj” → `navigate('/recipes/12/edit')` → `RecipeEditor` pobiera `GET /api/recipes/12/` i zdjęcie → użytkownik zmienia dane → `PATCH` → powrót na `/recipes`, który pobiera listę od nowa.
- **Decyzje:** osobny URL zamiast stanu komponentu (przeładowanie i przycisk „wstecz” działają, ADR-0004). `PATCH` z pełnym zestawem pól zamiast `PUT`, bo zdjęcie nie jest wysyłane, gdy się nie zmienia. Flaga `remove_photo`, bo brak pliku oznacza „bez zmian”.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Kontrola dostępu:** `get_object_or_404(Recipe, pk=recipe_id, owner=request.user)` dla obu metod; cudzy przepis daje 404, nie 403, żeby nie ujawniać istnienia (AC-002, AC-006).
- **Nadużycia:** podmiana właściciela w treści żądania jest ignorowana (pole nie jest zapisywalne). Wysyłanie plików przechodzi przez te same limity i `PhotoSanitizer` (AC-009).
- **Ujawnianie danych:** odpowiedzi nie zawierają ścieżek plików, tylko `photo_url` chronionego widoku zdjęcia.

## Compliance Review

To wstępna ocena zakresu i dowodów, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| GDPR/RODO; zakres do weryfikacji | Nieustalone | Edycja nie wprowadza nowych kategorii danych. Podmienione zdjęcie przechodzi usunięcie EXIF, a usunięte znika z magazynu. | FR-003, AC-011 | Testy API usuwania pliku i EXIF | Właściciel projektu | Jak w `2026-10-14-add-recipe.md` |
| OWASP ASVS 5.0.0 (referencja) | Referencja | Kontrola dostępu do obiektu (IDOR) i przesyłanie plików | FR-001, FR-002, QR-001 | Testy cudzego przepisu | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i wdrożenie:** nieustalone.
- **Ryzyko nierozstrzygnięte:** brak nowego ponad to, co opisuje specyfikacja dodawania przepisu.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres | Zależności | Kryterium ukończenia |
| --- | --- | --- | --- |
| 1. Backend | `RecipeDetailView` z `GET` i `PATCH`, obsługa zdjęcia, testy API | — | Testy `tests.recipes` przechodzą, w tym AC-001–AC-011 |
| 2. Formularz wspólny | Wydzielenie `RecipeForm` z `RecipeWorkspace` bez zmiany zachowania dodawania | — | Istniejące testy `RecipeWorkspace` przechodzą |
| 3. Edycja we froncie | `getRecipe`/`updateRecipe`, `RecipeEditor`, trasa, przycisk „Edytuj”, informacja o planach | Fazy 1–2 | Testy `RecipeEditor` i `RecipeWorkspace` dla AC-012–AC-021 |
| 4. Weryfikacja i dokumentacja | Pełne zestawy testów, `npm run build`, wpis trasy w ADR-0004 | Fazy 1–3 | Wszystkie testy i build przechodzą |

- **Migracja:** brak zmian schematu.
- **Wycofanie:** usunięcie trasy i widoku; dane pozostają zgodne.

## 12. Weryfikacja i śledzenie

| ID | Metoda | Miejsce | Status |
| --- | --- | --- | --- |
| AC-001–AC-011, QR-001, QR-002 | Testy automatyczne API | `backend/tests/recipes/test_recipe_detail.py` | Przechodzi |
| AC-012 | Test komponentu | `frontend/src/features/recipes/RecipeWorkspace.test.tsx` | Przechodzi |
| AC-013, AC-015–AC-021 | Test komponentu | `frontend/src/features/recipes/RecipeEditor.test.tsx` | Przechodzi |
| AC-013 (przekierowanie), AC-014 | Przegląd kodu trasy | `frontend/src/app/AuthenticatedApp.tsx` | Przechodzi |
| QR-004 | Przegląd kodu | `RecipeForm.tsx` | Przechodzi |

## 13. Ryzyka, założenia i decyzje

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Działanie |
| --- | --- | --- |
| Zmiana porcji lub składników nieoczekiwanie zmienia plany | Średnie/niski | Komunikat z AC-021 |
| Wydzielenie formularza psuje dodawanie | Niskie/średni | Faza 2 osobno, istniejące testy jako zabezpieczenie |
| Osierocone pliki zdjęć | Niskie/niski | AC-011 |

### Założenia

- Wystarczy „ostatni zapis wygrywa”; jeden użytkownik rzadko edytuje ten sam przepis w dwóch kartach.
- Po zapisie wystarczy powrót na listę bez osobnego komunikatu sukcesu; zmiana jest widoczna na karcie.

### Decyzje z rundy pytań (2026-10-15)

- Najpierw specyfikacja, potem implementacja według `spec-development`.
- Edycja pod osobnym adresem `/recipes/:recipeId/edit`.
- Zdjęcie: zostaw, podmień albo usuń.
- Baza: `main`.

### Otwarte pytania

- Brak.

## 14. Przegląd i akceptacja

- **Produkt:** właściciel projektu, decyzje z 2026-10-15.
- **Technika:** przegląd PR.
- **Bezpieczeństwo/prywatność:** w ramach przeglądu PR (kontrola dostępu, pliki).
