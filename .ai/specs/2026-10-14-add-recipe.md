# Specyfikacja: Ręczne dodawanie przepisu, zdjęcie potrawy i import ze zdjęcia

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-14
> Updated: 2026-10-15
> Related issue/decision: `2026-10-14-openrouter-openai-integration.md` (połączenie z dostawcą AI i kontrakt rozpoznawania)

## Stan implementacji

> Sprawdzono: 2026-10-15, kod z gałęzi `feature/add-recipe-exif-and-image-input` (PR #5; baza `main` @ `3f708ea`). Jeśli od tego czasu nie zmieniał się kod ani specyfikacja, ta sekcja wystarcza.

| Obszar | Stan | Szczegóły |
| --- | --- | --- |
| FR-001 ręczne dodawanie | ✅ Zrobione | Model `Recipe`, `POST/GET /api/recipes/`, `RecipeWorkspace` |
| FR-007 JWT i właściciel | ✅ Zrobione | Zapis, zdjęcie i rozpoznawanie wymagają access JWT |
| FR-008 zdjęcie potrawy | ✅ Zrobione | AC-020: `PhotoSanitizer` stosuje orientację EXIF i zapisuje plik bez metadanych; plik niebędący obrazem i obraz powyżej 40 Mpx są odrzucane |
| FR-002 wybór obrazu do rozpoznania | ✅ Zrobione | `RecognitionImagePicker` (aparat, plik, walidacja, podgląd, odrzucenie); backend ponownie sprawdza typ, rozmiar i czytelność w `POST /api/recipes/recognize/` |
| FR-003 zgoda i jawna wysyłka | ✅ Zrobione | Informacja o zewnętrznej usłudze AI; wysyłka tylko po „Rozpoznaj przepis”; stan oczekiwania, blokada powtórzeń, anulowanie |
| FR-004 szkic do edycji | ✅ Zrobione | Odpowiedź wypełnia formularz; puste pola zostają puste; tytuł wymagany dopiero przy zapisie |
| FR-005 zapis po zatwierdzeniu | ✅ Zrobione | Rozpoznanie nic nie zapisuje (test: brak plików w mediach, brak rekordu); zapis zwykłym `POST /api/recipes/` |
| FR-006 błędy | ✅ Zrobione | Kontrolowane błędy (brak dostawcy 409, klucz odrzucony, limit 429, niedostępność, zła odpowiedź); ponowienie i ścieżka ręczna |
| FR-009 propozycja kadru | ✅ Zrobione | `DishCropper` (Pillow) przycina współrzędne, odrzuca obszar pusty lub zbyt mały; szkic oznacza zdjęcie jako „Propozycja AI”, usunięcie lub zastąpienie jednym kliknięciem |
| Fazy (sekcja 11) | 1–6 zrobione; 7 (weryfikacja całości) częściowo | Brak ręcznego testu dostępności (QR-004) i testu na prawdziwym dostawcy |

**Znane problemy:**

- Katalog `frontend/.vite/` (wygenerowane zależności) jest w repozytorium.
- Ręczny test dostępności (QR-004) dla formularza i wyboru obrazu nie był jeszcze wykonany.
- Rozpoznawanie przetestowano na mockach dostawcy. Nie uruchamiano go na prawdziwym OpenAI/OpenRouter (domyślne modele to założenie, patrz specyfikacja integracji).
- Import nie powinien być udostępniony użytkownikom przed rozstrzygnięciem retencji i warunków dostawcy (sekcja „Compliance Review”).

**Następny krok:** próba na prawdziwym dostawcy, ręczny test dostępności i rozstrzygnięcie compliance (faza 7).

## 1. Podsumowanie

Zalogowany użytkownik może dodać przepis ręcznie albo zacząć od jednego obrazu z tekstem przepisu, który aplikacja przekazuje do rozpoznania przez AI. Wynik rozpoznania jest edytowalnym szkicem. Przepis zapisuje się dopiero po zatwierdzeniu przez użytkownika.

Specyfikacja rozróżnia dwa rodzaje obrazów:

- **Obraz do rozpoznania** jest tymczasowym wejściem dla AI. Nigdy nie jest zapisywany z przepisem.
- **Zdjęcie potrawy** jest trwałą, opcjonalną częścią przepisu. Użytkownik może je wgrać ręcznie. Jeśli obraz do rozpoznania zawiera zdjęcie gotowego dania, AI może zaproponować jego kadr jako zdjęcie potrawy. Kadr trafia do przepisu tylko wtedy, gdy użytkownik go zostawi w szkicu i zapisze przepis.

**Ustalenia z rund doprecyzowania:**

- *2026-10-14:* obie ścieżki dodawania są w zakresie. Import obsługuje jeden obraz z tekstem przepisu, nie samo zdjęcie gotowego dania. Wynik AI jest szkicem do sprawdzenia, a niepełne rozpoznanie można poprawić ręcznie. Obraz do rozpoznania jest używany tymczasowo. Przed rozpoznaniem użytkownik widzi informację o wysłaniu obrazu do zewnętrznej usługi AI.
- *2026-10-15:*
  - Zdjęcie potrawy jest osobną, trwałą częścią przepisu.
  - AI może zaproponować kadr zdjęcia potrawy z obrazu do rozpoznania. Użytkownik widzi podgląd i może kadr zostawić albo usunąć. Ręczna korekta ramki jest poza zakresem.
  - Kadr wycina backend (Pillow) na podstawie współrzędnych zwróconych przez AI. Model nie generuje ani nie modyfikuje obrazów.
  - Oba rodzaje obrazów mają te same limity: JPG, PNG lub WebP, maksymalnie 5 MB.

## 2. Problem i kontekst

- **Problem:** ręczne przepisywanie przepisu ze zdjęcia jest czasochłonne i podatne na pomyłki. Zdjęcia przepisów z książek i stron internetowych często zawierają też zdjęcie gotowego dania, które użytkownik musiałby osobno wycinać i wgrywać.
- **Kontekst:** backend Django i frontend React/TypeScript. Ręczne dodawanie przepisu i ręczne wgrywanie zdjęcia potrawy są już zaimplementowane (aplikacja `recipes`, `RecipeWorkspace`). Konfiguracja dostawcy AI jest zaimplementowana, rozpoznawanie obrazu jeszcze nie.
- **Pożądany rezultat:** użytkownik szybko tworzy własny przepis ręcznie albo z danych odczytanych z obrazu. Jeśli na obrazie jest zdjęcie dania, dostaje je gotowe do zatwierdzenia jako zdjęcie potrawy.
- **Granica zakresu:** połączenie z OpenRouter/OpenAI, wybór modelu, poświadczenia, format żądania do dostawcy i szczegóły przetwarzania opisuje specyfikacja integracji. Ta specyfikacja opisuje zachowanie produktu i wymagany rezultat tej zależności.

### Pojęcia

| Pojęcie | Znaczenie |
| --- | --- |
| Obraz do rozpoznania | Jeden obraz z tekstem przepisu, wysyłany do AI po jawnej akcji użytkownika. Tymczasowy, nigdy nie zapisywany z przepisem. |
| Zdjęcie potrawy | Opcjonalne zdjęcie gotowego dania, zapisane trwale jako część przepisu i widoczne tylko dla właściciela. |
| Propozycja kadru | Fragment obrazu do rozpoznania, który według AI przedstawia gotowe danie, wycięty przez backend i pokazany w szkicu jako proponowane zdjęcie potrawy. |
| Szkic | Niezapisany formularz przepisu wypełniony wynikiem rozpoznania, który użytkownik może edytować, zapisać albo odrzucić. |

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Zalogowany użytkownik | Wpisuje przepis w formularzu | Zapisuje przepis na swoim koncie |
| Zalogowany użytkownik | Dodaje do przepisu własne zdjęcie gotowego dania | Zdjęcie potrawy zapisuje się z przepisem i jest widoczne tylko dla niego |
| Zalogowany użytkownik | Robi zdjęcie lub wybiera obraz z tekstem przepisu | Widzi informację o wysłaniu obrazu, a następnie szkic do sprawdzenia |
| Zalogowany użytkownik | Rozpoznaje obraz strony z przepisem i zdjęciem dania | W szkicu widzi proponowany kadr dania; zostawia go albo usuwa |
| Użytkownik poprawiający szkic | Uzupełnia braki lub koryguje błędnie rozpoznane dane | Może zapisać poprawiony przepis albo porzucić szkic |
| Użytkownik bez ważnego access JWT | Próbuje dodać lub zapisać przepis albo pobrać zdjęcie potrawy | Operacja jest niedostępna do czasu uwierzytelnienia |

## 4. Zakres

### W zakresie

- Ręczne tworzenie przepisu.
- Ręczne dodanie, zmiana i usunięcie jednego zdjęcia potrawy w formularzu przed zapisem.
- Zrobienie zdjęcia na urządzeniu, które to umożliwia, albo wybranie jednego obrazu do rozpoznania.
- Wysłanie obrazu do rozpoznania po jawnej akcji użytkownika i pokazaniu informacji o przekazaniu go zewnętrznej usłudze AI.
- Wyświetlenie rozpoznanych danych jako edytowalnego szkicu, również gdy część pól jest pusta lub niepewna.
- Propozycja kadru zdjęcia potrawy z obrazu do rozpoznania, z podglądem w szkicu oraz możliwością usunięcia albo zastąpienia własnym zdjęciem.
- Zapis przepisu dopiero po zatwierdzeniu przez użytkownika i przypisanie go do prywatnej kolekcji.
- Obsługa stanów ładowania, błędów, ponowienia, anulowania i odrzucenia szkicu.

### Poza zakresem

- Konfiguracja połączenia z OpenRouter/OpenAI, wybór dostawcy lub modelu, sekrety i szczegółowy kontrakt API dostawcy (specyfikacja integracji).
- Odczytywanie przepisu ze zdjęcia samej potrawy bez widocznego tekstu.
- Import wielu obrazów lub stron jednego przepisu, import z adresu URL, PDF lub pliku tekstowego.
- Automatyczny zapis wyniku AI bez sprawdzenia i zatwierdzenia przez użytkownika.
- Zapisywanie obrazu do rozpoznania (w całości) jako załącznika przepisu.
- Ręczna korekta ramki kadru (przesuwanie, zmiana rozmiaru), obracanie, filtry i inna edycja zdjęć.
- Generowanie, ulepszanie lub retusz obrazów przez AI.
- Więcej niż jedno zdjęcie potrawy na przepis.
- Edycja i usuwanie zapisanego przepisu, współdzielenie przepisów, listy zakupów i inne operacje na zapisanym przepisie.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

> Oznaczenia kryteriów: ✅ zrobione, 🟡 zrobione częściowo, bez znaku – jeszcze nie zrobione.

- **FR-001:** System umożliwia zalogowanemu użytkownikowi ręczne utworzenie przepisu.
  - **AC-001:** ✅ Formularz wyraźnie rozdziela przepis na dwie części. „Część opisowa” zawiera tytuł, opis lub notatkę, zdjęcie potrawy, porcje, czasy przygotowania i gotowania oraz kroki przygotowania. „Składniki” to osobna lista pozycji, z których każda ma nazwę, ilość i jednostkę.
  - **AC-002:** ✅ Tytuł jest wymagany do zapisu. Pozostałe pola, w tym zdjęcie potrawy, mogą pozostać puste, aby można było zapisać częściowo uzupełniony przepis.
  - **AC-003:** ✅ Po poprawnym zapisie przepis pojawia się w prywatnej kolekcji bieżącego użytkownika i nie jest dostępny innemu użytkownikowi.
- **FR-002:** System pozwala użytkownikowi zrobić zdjęcie albo wybrać jeden obraz do rozpoznania.
  - **AC-004:** ✅ Przed wyborem interfejs pokazuje obsługiwane formaty i maksymalny rozmiar: JPG, PNG lub WebP, do 5 MB.
  - **AC-005:** 🟡 Nieobsługiwany lub za duży plik jest odrzucany przed wysłaniem, a użytkownik dostaje informację pozwalającą wybrać inny obraz. Backend ponownie sprawdza typ i rozmiar oraz to, czy plik da się odczytać jako obraz.
  - **AC-006:** ✅ Gdy przeglądarka lub urządzenie nie udostępnia aparatu, użytkownik może wybrać obraz z urządzenia albo wrócić do formularza ręcznego.
- **FR-003:** System przekazuje obraz do rozpoznania wyłącznie po działaniu użytkownika.
  - **AC-007:** ✅ Przed rozpoznaniem interfejs jasno informuje, że obraz zostanie wysłany do zewnętrznej usługi AI i że wycięty z niego fragment może zostać zaproponowany jako zdjęcie potrawy. Samo wybranie pliku nie rozpoczyna wysyłki.
  - **AC-008:** Podczas rozpoznawania użytkownik widzi stan oczekiwania i nie może przypadkowo uruchomić kilku rozpoznań ani utworzyć kilku przepisów przez wielokrotne wysłanie tej samej akcji.
- **FR-004:** System przedstawia wynik rozpoznania jako szkic możliwy do edycji.
  - **AC-009:** Rozpoznane dane trafiają do dwóch części przepisu z AC-001: opisu i listy składników. Każdy rozpoznany składnik trafia do osobnej pozycji listy. Pola nierozpoznane pozostają puste i można je uzupełnić ręcznie.
  - **AC-010:** Użytkownik może zmienić wszystkie pola szkicu przed zapisem, w tym usunąć lub zastąpić proponowane zdjęcie potrawy.
  - **AC-011:** Rozpoznanie częściowe nie blokuje edycji ani zapisu. Brak tytułu blokuje zapis do chwili jego uzupełnienia.
- **FR-005:** System zapisuje wynik importu wyłącznie po zatwierdzeniu przez użytkownika.
  - **AC-012:** Zamknięcie, odrzucenie lub anulowanie szkicu nie tworzy przepisu i nie zapisuje żadnego obrazu.
  - **AC-013:** Po zatwierdzeniu zapisuje się wyłącznie zaakceptowana treść przepisu. Obraz do rozpoznania nie jest dołączany do przepisu. Jeśli w chwili zapisu szkic zawiera zdjęcie potrawy (proponowany kadr albo zdjęcie wgrane ręcznie), zapisuje się tylko ono, na zasadach FR-008.
- **FR-006:** System obsługuje błędy rozpoznawania i przesyłania.
  - **AC-014:** Jeśli rozpoznanie się nie powiedzie, użytkownik dostaje zrozumiały komunikat i może spróbować ponownie albo przejść do formularza ręcznego. Przepis nie zostaje utworzony automatycznie.
  - **AC-015:** Użytkownik może anulować operację albo odrzucić wybrany obraz bez zapisywania przepisu.
- **FR-007:** System chroni dodawanie, zapis i zdjęcia zgodnie z uwierzytelnieniem i własnością danych.
  - **AC-016:** ✅ Żądanie zapisu, rozpoznania albo pobrania zdjęcia potrawy bez ważnego access JWT zostaje odrzucone. Backend nie tworzy ani nie ujawnia przepisu ani zdjęcia.
  - **AC-017:** ✅ Backend przypisuje zapis do użytkownika z zweryfikowanego access JWT, a nie do identyfikatora właściciela podanego przez frontend.
- **FR-008:** System pozwala dołączyć do przepisu jedno zdjęcie potrawy.
  - **AC-018:** ✅ W formularzu użytkownik może wybrać zdjęcie potrawy (JPG, PNG lub WebP, do 5 MB), zobaczyć jego podgląd, zastąpić je innym albo usunąć przed zapisem. Nieobsługiwany lub za duży plik jest odrzucany z komunikatem, a backend sprawdza to ponownie.
  - **AC-019:** ✅ Zdjęcie potrawy zapisuje się razem z przepisem w jednej operacji. Jeśli zapis przepisu się nie uda, zdjęcie też nie zostaje zapisane.
  - **AC-020:** ✅ Przed trwałym zapisem backend wczytuje zdjęcie, uwzględnia orientację z EXIF i zapisuje je ponownie bez metadanych (m.in. bez lokalizacji GPS i danych aparatu).
  - **AC-021:** ✅ Zdjęcie potrawy może pobrać wyłącznie właściciel przepisu. Inny użytkownik dostaje odpowiedź „nie znaleziono”, a odpowiedź nie jest zapisywana w pamięci podręcznej przeglądarki ani pośredników.
- **FR-009:** System proponuje kadr zdjęcia potrawy z obrazu do rozpoznania.
  - **AC-022:** Gdy AI wskaże na obrazie do rozpoznania obszar przedstawiający gotowe danie, szkic zawiera wycięty fragment jako proponowane zdjęcie potrawy, wyraźnie oznaczony jako propozycja AI i z podglądem.
  - **AC-023:** Gdy AI nie wskaże takiego obszaru albo wskazany obszar jest nieprawidłowy (poza obrazem, pusty lub zbyt mały, by był użyteczny), szkic nie zawiera propozycji. Pozostałe pola szkicu działają normalnie, a użytkownik może wgrać zdjęcie ręcznie.
  - **AC-024:** Użytkownik może usunąć propozycję kadru jedną akcją albo zastąpić ją własnym zdjęciem. Usunięta propozycja nie jest zapisywana.
  - **AC-025:** Propozycja kadru zawiera wyłącznie piksele z obrazu użytkownika. AI nie generuje ani nie modyfikuje obrazu.

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Prywatność | Obraz do rozpoznania nie jest zapisywany na serwerze ani dołączany do przepisu. Jest przetwarzany w pamięci żądania, a tymczasowe kopie kontrolowane przez aplikację są usuwane po zakończeniu, błędzie lub anulowaniu. Trwale może zostać zapisane tylko zdjęcie potrawy zaakceptowane przez użytkownika. | Testy sukcesu, błędu i anulowania; sprawdzenie, że po rozpoznaniu bez zapisu w katalogu mediów nie pojawia się nowy plik |
| QR-002 | Bezpieczeństwo | Backend sprawdza access JWT, typ, rozmiar i czytelność obrazu, zanim przekaże go do rozpoznania albo zapisze. Obraz jest traktowany jako niezaufane wejście, a współrzędne kadru od AI są walidowane i przycinane do granic obrazu. | Testy dostępu, walidacji pliku i nieprawidłowych współrzędnych |
| QR-003 | Prywatność | Logi aplikacji nie zawierają obrazów, ich zawartości ani pełnej treści przepisu. Sekrety i poświadczenia dostawcy nie trafiają do frontendu. Zapisane zdjęcie potrawy nie zawiera metadanych EXIF. | Przegląd logów i konfiguracji integracji; test braku EXIF w zapisanym pliku |
| QR-004 | Dostępność | Wybór pliku, zrobienie zdjęcia, błędy, edycja szkicu, podgląd i usunięcie propozycji kadru oraz zapis działają z klawiatury. Pola, podglądy i komunikaty mają etykiety dla technologii asystujących, a podgląd zdjęcia ma tekst alternatywny. | Ręczny test klawiaturą i kontrola dostępności po implementacji |
| QR-005 | Niezawodność | Błąd lub przerwanie rozpoznawania nie powoduje częściowego zapisu przepisu. Błąd samego kadrowania nie blokuje szkicu: szkic pokazuje się bez propozycji. Po błędzie użytkownik może wrócić do formularza ręcznego. | Testy błędów, przerwania żądania i błędu kadrowania |

## 6. Dane i informacje

- **Dane przepisu (zaimplementowane):** tytuł; opcjonalny opis lub notatka, liczba porcji, czasy przygotowania i gotowania w minutach; składniki jako uporządkowana lista pozycji z nazwą, ilością i jednostką (tekst); kroki jako uporządkowana lista tekstów; opcjonalne zdjęcie potrawy; właściciel; daty utworzenia i zmiany. Ilość jest tekstem, bo rozpoznane wartości bywają nienumeryczne („szczypta”, „1/2”).
- **Zdjęcie potrawy:** jeden plik na przepis, przechowywany w prywatnym katalogu mediów aplikacji i serwowany wyłącznie przez uwierzytelniony endpoint właściciela. Plik jest zapisywany bez metadanych EXIF.
- **Dane wejściowe AI:** jeden obraz do rozpoznania. Może zawierać dane osobowe lub niezamierzone informacje, dlatego interfejs informuje o wysłaniu go do usługi zewnętrznej.
- **Wynik rozpoznania (kontrakt produktu):** wartości pól przepisu zgodne z FR-001, opcjonalna propozycja kadru zdjęcia potrawy oraz informacja o błędzie lub braku rozpoznania. Szczegółowy format należy do specyfikacji integracji.
- **Źródło prawdy i własność:** zapisany przepis i jego zdjęcie potrawy należą do zalogowanego użytkownika, a backend jest źródłem prawdy. Wartości i kadr od AI nie są wiarygodne do czasu sprawdzenia przez użytkownika.
- **Walidacja:** tytuł jest jedynym wymaganym polem. Ilości, jednostki, porcje i czasy muszą być edytowalne. Brak lub niepewność rozpoznania nie może być zastępowana wymyślonymi wartościami. Oba rodzaje obrazów: JPG, PNG lub WebP, do 5 MB, plik musi dać się odczytać jako obraz.
- **Retencja i usuwanie:** obraz do rozpoznania jest tymczasowy i nie jest zapisywany. Zdjęcie potrawy żyje tak długo jak przepis. Usuwanie i edycja przepisu są poza zakresem tej specyfikacji. Gdy zostaną dodane, usunięcie lub zastąpienie zdjęcia musi usuwać też plik z dysku, a nie tylko odwołanie w bazie.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne do | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| Specyfikacja integracji OpenRouter/OpenAI | Upstream / decyzja | Projekt, `2026-10-14-openrouter-openai-integration.md` | Określa przekazanie obrazu, zwracane pola i obszar dania, błędy, retencję, model i sekrety | Import ze zdjęcia i propozycja kadru | Konfiguracja dostawcy zaimplementowana; rozpoznawanie nie | Nie można wdrożyć rozpoznawania ani kadrowania |
| Uwierzytelnianie JWT | Upstream | `2026-10-14-registration-and-login.md` | Backend weryfikuje access JWT i egzekwuje prywatny dostęp | Dodawanie, zapis, zdjęcia | Zaimplementowane | Nie można przypisać przepisu ani chronić danych |
| Pillow | Biblioteka | `requirements.txt` | Odczyt, orientacja EXIF, kadrowanie i ponowny zapis obrazów | FR-008, FR-009 | Zainstalowana (`Pillow>=11.3,<13`) | Brak walidacji obrazu i kadrowania |
| Przechowywanie plików mediów | Infrastruktura | `MEDIA_ROOT`, wolumen `recipes_media` w Compose | Pliki prywatne, nie serwowane publicznie | Zdjęcie potrawy | Zaimplementowane lokalnie; docelowy hosting nieustalony | Zdjęcia nie będą trwałe |
| Model AI wskazujący obszar na obrazie | Zewnętrzna zdolność | Dostawca i model wybrany w specyfikacji integracji | Modele multimodalne podają współrzędne tylko w przybliżeniu | FR-009 | Do weryfikacji | Propozycje kadru będą niedokładne albo niedostępne; reszta importu działa |

- **Kontrakt rozpoznawania (produkt):** wejściem jest jeden obraz. Wynikiem jest szkic pól przepisu, opcjonalnie gotowy wycinek zdjęcia potrawy (już przycięty przez backend), albo kontrolowany błąd.
- **Kontrakt UI/API:** frontend wysyła access JWT jako Bearer. Zapis przepisu ze zdjęciem potrawy używa tego samego endpointu niezależnie od tego, czy zdjęcie wgrano ręcznie, czy pochodzi z propozycji kadru. Dzięki temu jedna ścieżka walidacji i zapisu obsługuje oba przypadki. Dokładna trasa i format endpointu rozpoznawania to decyzja implementacyjna.
- **Kompatybilność:** istniejący `POST /api/recipes/` przyjmuje JSON albo `multipart/form-data` (pole `recipe` z JSON-em i pole `photo`), a `GET /api/recipes/<id>/photo/` zwraca zdjęcie właścicielowi. Propozycja kadru powinna korzystać z tej samej ścieżki zapisu.

## 8. Architektura i projekt

- **Komponenty:** frontend obsługuje formularz, wybór lub wykonanie zdjęcia, podgląd, status rozpoznawania, szkic i podgląd propozycji kadru. Backend waliduje wejście, sprawdza użytkownika, koordynuje rozpoznawanie przez integrację AI, wycina kadr i zapisuje zaakceptowany przepis ze zdjęciem potrawy. Baza danych przechowuje przepis, a katalog mediów plik zdjęcia potrawy.
- **Granice zaufania:** przeglądarka, obrazy i odpowiedź modelu są niezaufane. Backend weryfikuje JWT, pliki, współrzędne kadru i właściciela. Dostawca AI jest zewnętrzną granicą przetwarzania, a użytkownik jest o tym informowany przed wysłaniem obrazu.
- **Przepływ ręczny:** użytkownik wypełnia pola i opcjonalnie wybiera zdjęcie potrawy. Backend waliduje tytuł i zdjęcie, usuwa metadane i zapisuje przepis pod właścicielem z JWT.
- **Przepływ importu:**
  1. Użytkownik wybiera lub robi zdjęcie, frontend pokazuje informację o wysyłce i czeka na jawne rozpoczęcie rozpoznawania.
  2. Backend sprawdza access JWT i plik, normalizuje orientację, a następnie przekazuje obraz do integracji AI.
  3. AI zwraca pola przepisu i opcjonalnie obszar dania. Backend waliduje obszar i wycina go z tego samego, znormalizowanego obrazu.
  4. Szkic i ewentualny wycinek wracają do frontendu. Na serwerze nic nie zostaje zapisane.
  5. Użytkownik poprawia dane, zostawia albo usuwa propozycję kadru i jawnie zapisuje albo odrzuca szkic. Zapis przesyła wycinek jak zwykłe zdjęcie potrawy.
- **Decyzje:**
  - Wynik AI nigdy nie zapisuje się automatycznie, a brakujące dane zostają puste.
  - Obraz do rozpoznania nie jest trwałym załącznikiem. Trwałe jest tylko zdjęcie potrawy zaakceptowane przez użytkownika.
  - Kadr wycina backend, a nie model ani przeglądarka. Backend i tak ma już obraz, Pillow daje pełną kontrolę nad walidacją i usunięciem metadanych, a model nie musi umieć edytować obrazów.
  - Szkic nie jest przechowywany po stronie serwera, więc nie trzeba sprzątać porzuconych szkiców.
  - Propozycję kadru można tylko zostawić albo usunąć. Ręczna korekta ramki byłaby osobnym, złożonym komponentem i nie jest potrzebna w pierwszej wersji.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby i granice zaufania:** prywatne przepisy i zdjęcia potraw, obrazy do rozpoznania, tokeny JWT oraz sekrety dostawcy AI. Obrazy mogą zawierać więcej informacji niż sam przepis, w tym metadane z lokalizacją.
- **Kontrola dostępu:** tylko zalogowany użytkownik może tworzyć i zapisywać własne przepisy oraz pobierać własne zdjęcia potraw. Backend bierze właściciela z zweryfikowanego JWT i nie ufa polom właściciela z klienta.
- **Zagrożenia:** nieobsługiwany, uszkodzony lub nadmiernie duży plik (także „bomba dekompresyjna”), plik z fałszywym rozszerzeniem, dostęp bez ważnego JWT, pobranie cudzego zdjęcia przez zmianę identyfikatora, ujawnienie lokalizacji przez EXIF, obrazy lub przepisy w logach, błędne rozpoznanie ilości lub składników, prompt injection w tekście na obrazie, nieprawidłowe współrzędne kadru oraz przechowywanie obrazu przez usługę zewnętrzną.
- **Ograniczenia:**
  - Walidować pliki po obu stronach i odczytywać je przez Pillow z limitem liczby pikseli.
  - Usuwać metadane przed zapisem zdjęcia potrawy.
  - Walidować i przycinać współrzędne kadru do granic obrazu.
  - Nie logować obrazów, sekretów ani pełnych treści przepisów.
  - Nie zwracać sekretów do frontendu.
  - Pokazywać informację przed transferem obrazu.
  - Wymagać sprawdzenia i zatwierdzenia szkicu.
  - Serwować zdjęcia potraw tylko właścicielowi, z `Cache-Control: private, no-store` i `X-Content-Type-Options: nosniff`.
- **Weryfikacja:** FR-002 do FR-009, QR-001 do QR-005 oraz testy kontroli dostępu i scenariuszy błędów. Retencja i zabezpieczenia po stronie dostawcy wymagają dowodów ze specyfikacji integracji.

## Compliance Review

To wstępna ocena zakresu i dowodów, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| Wymogi ochrony danych osobowych, w tym GDPR/RODO; zastosowanie i aktualny zakres do weryfikacji | Nieustalone | Obrazy są wysyłane do zewnętrznej usługi i mogą zawierać dane osobowe. Zdjęcia potraw są przechowywane trwale i mogą zawierać metadane z lokalizacją. Użytkownicy i jurysdykcja nie są znani. | FR-003, FR-008, QR-001, QR-003 | Inwentaryzacja przepływu obrazu, warunków dostawcy, retencji, lokalizacji i podstaw przetwarzania; test usuwania EXIF; przegląd przez właściwą osobę | Właściciel projektu | Nie oceniono; wymaga ustaleń ze specyfikacji integracji i decyzji o wdrożeniu |
| OWASP ASVS 5.0.0 jako źródło kontroli technicznych | Referencja, obowiązek nieustalony | Może wspierać przegląd kontroli wejścia (w tym przesyłania plików), uwierzytelniania, dostępu i logowania. Nie jest samodzielnym dowodem zgodności prawnej. | FR-002, FR-007, FR-008, QR-001–QR-003 | Przegląd odpowiednich kontroli i testów bezpieczeństwa | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i wdrożenie:** nieustalone.
- **Pytania do przeglądu:** kto jest dostawcą przetwarzania, gdzie przetwarza i przechowuje dane, czy obrazy są używane do trenowania modeli, jak długo są przechowywane i jakie warunki obowiązują. Odpowiedzi powinny znaleźć się w specyfikacji integracji.
- **Ryzyko nierozstrzygnięte:** importu nie należy udostępniać przed udokumentowaniem przepływu danych do zewnętrznej usługi, retencji i informacji przekazywanej użytkownikowi.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres i rezultat | Zależności | Kryteria zakończenia i weryfikacja |
| --- | --- | --- | --- |
| 1. Model i zapis ręczny | Model przepisu z migracją; prywatny zapis i odczyt; formularz ręcznego dodawania. | Uwierzytelnianie Django. | **Zrobione.** Przepis z wymaganym tytułem zapisuje się wyłącznie na koncie właściciela; testy pokrywają AC-001–AC-003 i FR-007. |
| 2. Formularz i walidacja | Edycja części opisowej, składników i kroków, walidacja tytułu i stany błędu. | Faza 1. | **Zrobione, poza ręcznym testem dostępności (QR-004).** |
| 3. Zdjęcie potrawy | Wybór, podgląd, zastąpienie i usunięcie zdjęcia w formularzu; zapis z przepisem; prywatny endpoint; usunięcie metadanych EXIF. | Faza 2; Pillow. | **Zrobione.** Testy pokrywają AC-018–AC-021 i test QR-003 dla metadanych. |
| 4. Wejście obrazu i zgoda | Wybór lub wykonanie jednego obrazu do rozpoznania, kontrola typu i rozmiaru, informacja o zewnętrznym przetwarzaniu, stany anulowania i oczekiwania. | Faza 2. | **Zrobione.** Obraz nie jest wysyłany przed jawną akcją; nieobsługiwane wejście jest odrzucane przed transferem; testy pokrywają AC-004–AC-008. |
| 5. Rozpoznawanie i edytowalny szkic | Połączenie z integracją OpenRouter/OpenAI, mapowanie wyniku na formularz, korekta przed zapisem. | Faza 4; rozpoznawanie ze specyfikacji integracji. | **Zrobione** (na mockach dostawcy). Testy mapowania, błędów i ponowień przechodzą; nic nie zapisuje się bez zatwierdzenia; testy pokrywają AC-009–AC-017 i QR-001–QR-002. |
| 6. Propozycja kadru zdjęcia potrawy | Walidacja obszaru od AI, wycięcie kadru w backendzie, podgląd w szkicu, usunięcie lub zastąpienie propozycji, zapis przez ścieżkę z fazy 3. | Fazy 3 i 5; obszar dania w kontrakcie integracji. | Testy pokrywają AC-022–AC-025 i QR-005: poprawny obszar daje wycinek, brak lub błędny obszar daje szkic bez propozycji, usunięta propozycja nie zostaje zapisana. **Zrobione.** |
| 7. Weryfikacja całości | Przepływy ręczny i importu, prywatność, dostępność, brak częściowego zapisu przy awarii. | Fazy 1–6. | Testy end-to-end obejmują sukces, anulowanie i awarię dostawcy; pozostałe luki są jawne przed udostępnieniem funkcji. |

- **Wdrożenie/migracja:** model przepisu i zdjęcia potrawy jest wdrożony (migracje `0001_initial`, `0002_recipe_photo`). Usunięcie metadanych dotyczy nowych zapisów. Zdjęcia zapisane wcześniej w środowisku developerskim można pominąć albo przetworzyć jednorazowo, bo nie ma danych produkcyjnych.
- **Monitoring:** monitorować zagregowaną liczbę powodzeń i błędów importu oraz odsetek szkiców z propozycją kadru, bez rejestrowania obrazów, sekretów ani pełnej treści przepisów.
- **Obsługa błędów i odzyskiwanie:** błąd integracji nie może zapisać przepisu. Błąd kadrowania usuwa tylko propozycję, a nie cały szkic. Użytkownik może ponowić próbę albo kontynuować ręcznie.

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| FR-001, AC-001–AC-003 | Testy formularza, walidacji i zapisu backendu | `backend/tests/recipes/test_recipe_collection.py`, `RecipeWorkspace.test.tsx` | Zrobione |
| FR-002, AC-004–AC-006 | Testy wyboru, zdjęcia, formatu i rozmiaru | `RecipeWorkspace.test.tsx` (obraz do rozpoznania) | Zrobione |
| FR-003, AC-007–AC-008 | Test UI wysyłki i blokady powtórzeń | `RecipeWorkspace.test.tsx` | Zrobione |
| FR-004, AC-009–AC-011 | Test mapowania wyniku do edytowalnego szkicu i brakujących pól | `test_recipe_image_recognizer.py`, `RecipeWorkspace.test.tsx` (wypełnienie szkicu) | Zrobione |
| FR-005, AC-012–AC-013 | Test braku automatycznego zapisu, zapisu po akceptacji i braku obrazu do rozpoznania w przepisie | `test_recipe_recognition.py` (brak plików i rekordu), `RecipeWorkspace.test.tsx` (zapis kadru zwykłą ścieżką) | Zrobione |
| FR-006, AC-014–AC-015 | Test błędu, anulowania, ponowienia i ścieżki ręcznej | `test_recipe_recognition.py`, `RecipeWorkspace.test.tsx` (błąd, ponowienie, anulowanie) | Zrobione |
| FR-007, AC-016–AC-017 | Testy backendu dla braku lub niepoprawnego JWT i przypisania właściciela | `test_recipe_collection.py`, `test_recipe_recognition.py` | Zrobione |
| FR-008, AC-018–AC-019, AC-021 | Testy formatu, zapisu w jednej operacji i dostępu tylko dla właściciela | `test_recipe_collection.py`, `RecipeWorkspace.test.tsx` | Zrobione |
| FR-008, AC-020 | Test, że zapisany plik nie ma EXIF i ma poprawną orientację | `test_saved_photo_has_no_exif_and_keeps_its_orientation` | Zrobione |
| FR-009, AC-022–AC-025 | Testy backendu wycinania (poprawny, brakujący, poza obrazem, zbyt mały obszar) i test UI podglądu oraz usunięcia propozycji | `test_dish_cropper.py`, `test_recipe_recognition.py`, `RecipeWorkspace.test.tsx` | Zrobione |
| QR-001–QR-003 | Test braku nowych plików po rozpoznaniu bez zapisu, walidacji plików i współrzędnych, braku EXIF; przegląd logów | `test_recipe_recognition.py` (brak plików, EXIF wysyłany do dostawcy), `test_dish_cropper.py`; przegląd logów: kod nie loguje obrazów ani treści | Zrobione w testach |
| QR-004–QR-005 | Ręczne testy dostępności i scenariuszy awarii, w tym błędu kadrowania | Błąd kadrowania: `test_crop_failure_keeps_the_draft`; ręczny test dostępności nie wykonany | QR-005 zrobione; QR-004 planowane |

## 13. Ryzyka, założenia i decyzje

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Ograniczenie lub decyzja | Właściciel |
| --- | --- | --- | --- |
| AI błędnie odczyta ilości, jednostki lub kroki | Średnie / średni | Dane jako edytowalny szkic, brak automatycznego zapisu, braki zostają puste | Właściciel produktu |
| AI wskaże obszar dania niedokładnie albo wytnie fragment tekstu | Wysokie / niski | Kadr jest tylko propozycją z podglądem; użytkownik usuwa go jedną akcją albo wgrywa własne zdjęcie | Właściciel produktu |
| Obraz zawiera niezamierzone dane osobowe lub dostawca zachowuje kopię | Nieznane / wysoki | Informacja przed wysłaniem; retencja i warunki dostawcy w specyfikacji integracji przed udostępnieniem funkcji | Właściciel projektu |
| Zapisane zdjęcie potrawy ujawnia lokalizację przez EXIF | Średnie / średni | Ponowny zapis bez metadanych (AC-020) | Osoba techniczna |
| Pliki osierocone po przyszłej edycji lub usunięciu przepisu | Średnie / niski | Wymóg usuwania pliku przy usuwaniu lub zastępowaniu zdjęcia, zapisany w sekcji 6 | Osoba techniczna |

### Założenia

- Funkcja jest przeznaczona dla zalogowanego użytkownika, a przepisy są prywatne i przypisane do jednego konta.
- Obraz do rozpoznania zawiera czytelny tekst przepisu. Rozpoznawanie dania wyłącznie z wyglądu nie jest wymagane.
- Obraz do rozpoznania może, ale nie musi, zawierać zdjęcie gotowego dania. Brak takiego zdjęcia nie jest błędem.
- Użytkownik sprawdza wynik AI. Tytuł jest wymagany do zapisu, pozostałe pola mogą być niekompletne.
- Wybrany model multimodalny potrafi zwrócić przybliżone współrzędne obszaru na obrazie. Jeśli nie potrafi, funkcja FR-009 nie daje propozycji, a reszta importu działa.

### Otwarte pytania

- [ ] Jaka będzie polityka dostawcy AI dotycząca retencji, trenowania na przesłanych obrazach, lokalizacji przetwarzania i błędów? Właściciel: osoba przygotowująca specyfikację integracji; blokuje udostępnienie importu.

**Rozstrzygnięte 2026-10-15:** formaty i rozmiar obrazów (JPG, PNG, WebP, do 5 MB dla obu rodzajów); model danych przepisu (zaimplementowany, opisany w sekcji 6); sposób kadrowania (backend, propozycja do akceptacji).

## 14. Przegląd i akceptacja

- **Przegląd produktu/domeny:** zakres, rozróżnienie obrazu do rozpoznania i zdjęcia potrawy oraz propozycja kadru uzgodnione w rundach pytań; formalna akceptacja oczekuje.
- **Przegląd techniczny:** oczekuje na kontrakt rozpoznawania z obszarem dania w specyfikacji integracji.
- **Przegląd bezpieczeństwa/prywatności/compliance:** wymagany przed udostępnieniem importu; jurysdykcja i przetwarzanie przez dostawcę nieustalone.
- **Decyzja i data:** brak; dokument pozostaje szkicem.
