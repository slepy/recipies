# Specyfikacja: Ręczne dodawanie przepisu i import ze zdjęcia

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-14
> Updated: 2026-10-14
> Related issue/decision: Osobna specyfikacja połączenia z OpenRouter/OpenAI do przygotowania

## 1. Podsumowanie

Zalogowany użytkownik może dodać przepis ręcznie albo przesłać jedno zdjęcie zawierające tekst przepisu. System przekazuje obraz do funkcji rozpoznawania opisanej w osobnej specyfikacji integracji AI, a otrzymane dane pokazuje jako edytowalny szkic. Przepis zostaje zapisany dopiero po zatwierdzeniu przez użytkownika. Oryginalny obraz nie jest dołączany do zapisanego przepisu.

**Ustalenia z rundy doprecyzowania:** obie ścieżki dodawania są w zakresie; import obsługuje jeden obraz z tekstem przepisu, nie samo zdjęcie gotowego dania; wynik AI jest szkicem do sprawdzenia; niepełne rozpoznanie można poprawić ręcznie; obraz jest używany tymczasowo; przy akcji rozpoznawania użytkownik widzi informację o wysłaniu obrazu do zewnętrznej usługi AI.

## 2. Problem i kontekst

- **Problem:** ręczne przepisywanie przepisu ze zdjęcia jest czasochłonne i podatne na pomyłki.
- **Kontekst:** aplikacja używa backendu Django i frontendu React/TypeScript. Nie ma jeszcze ustalonego schematu przepisu ani zaimplementowanej funkcji dodawania. Sąsiednia specyfikacja rejestracji zakłada prywatne przepisy przypisane do jednego użytkownika.
- **Pożądany rezultat:** użytkownik może szybko utworzyć własny przepis ręcznie lub rozpocząć od danych odczytanych z obrazu, sprawdzić je i zdecydować o zapisie.
- **Fakt i granica zakresu:** połączenie z OpenRouter/OpenAI, wybór modelu, poświadczenia, format żądania do dostawcy oraz techniczne szczegóły przetwarzania są przedmiotem osobnej specyfikacji. Ta specyfikacja opisuje zachowanie produktu i wymagany rezultat tej zależności.

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Zalogowany użytkownik | Wpisuje przepis w formularzu | Zapisuje przepis na swoim koncie |
| Zalogowany użytkownik | Robi zdjęcie lub wybiera obraz z tekstem przepisu | Widzi informację o wysłaniu obrazu, a następnie szkic danych do sprawdzenia |
| Użytkownik poprawiający szkic | Uzupełnia braki lub koryguje błędnie rozpoznane dane | Może zapisać poprawiony przepis albo porzucić szkic |
| Użytkownik bez ważnego access JWT | Próbuje dodać lub zapisać przepis | Operacja jest niedostępna do czasu uwierzytelnienia |

## 4. Zakres

### W zakresie

- Ręczne tworzenie przepisu.
- Zrobienie zdjęcia na urządzeniu, które udostępnia taką możliwość, lub wybranie jednego obrazu z urządzenia.
- Wysłanie obrazu do funkcji rozpoznawania po jawnej akcji użytkownika i pokazaniu informacji o przekazaniu go zewnętrznej usłudze AI.
- Wyświetlenie rozpoznanych danych jako edytowalnego szkicu, również gdy część pól jest pusta lub niepewna.
- Zapis przepisu dopiero po zatwierdzeniu przez użytkownika oraz przypisanie go do jego prywatnej kolekcji.
- Obsługa stanów ładowania, błędów, ponowienia, anulowania i odrzucenia szkicu.

### Poza zakresem

- Konfiguracja połączenia z OpenRouter/OpenAI, wybór dostawcy lub modelu, zarządzanie sekretami i szczegółowy kontrakt API; opisze je osobna specyfikacja integracji.
- Odczytywanie przepisu ze zdjęcia samej potrawy bez widocznego tekstu.
- Import wielu zdjęć lub stron w ramach jednego przepisu, import z adresu URL, PDF lub pliku tekstowego.
- Automatyczny zapis wyniku AI bez sprawdzenia i zatwierdzenia przez użytkownika.
- Zachowywanie oryginalnego zdjęcia jako załącznika do przepisu.
- Współdzielenie przepisów, generowanie list zakupów i inne operacje na zapisanym przepisie.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

- **FR-001:** System umożliwia zalogowanemu użytkownikowi ręczne utworzenie przepisu.
  - **AC-001:** Formularz wyraźnie rozdziela przepis na dwie części: „Część opisowa” zawiera tytuł, opis lub notatkę, porcje, czasy przygotowania i gotowania oraz kroki przygotowania; „Składniki” to osobna lista pozycji, z których każda ma nazwę, ilość i jednostkę.
  - **AC-002:** Tytuł jest wymagany do zapisu; pozostałe pola mogą pozostać puste, aby można było zapisać częściowo uzupełniony przepis.
  - **AC-003:** Po poprawnym zapisie przepis pojawia się w prywatnej kolekcji bieżącego użytkownika i nie jest dostępny innemu użytkownikowi.
- **FR-002:** System pozwala użytkownikowi zrobić zdjęcie albo wybrać jeden obraz zawierający tekst przepisu.
  - **AC-004:** Interfejs wskazuje obsługiwane formaty i maksymalny rozmiar pliku przed wysłaniem; dokładne limity zostaną ustalone w specyfikacji integracji lub decyzji technicznej zależnej od możliwości przetwarzania.
  - **AC-005:** Nieobsługiwany lub za duży plik jest odrzucany przed wysłaniem, a użytkownik otrzymuje informację umożliwiającą wybranie innego obrazu.
  - **AC-006:** Gdy przeglądarka lub urządzenie nie udostępnia aparatu, użytkownik może wybrać obraz z urządzenia albo wrócić do formularza ręcznego.
- **FR-003:** System przekazuje obraz do rozpoznania wyłącznie po działaniu użytkownika.
  - **AC-007:** Przed akcją rozpoznawania interfejs jasno informuje, że obraz zostanie wysłany do zewnętrznej usługi AI; samo wybranie pliku nie rozpoczyna wysyłki.
  - **AC-008:** Podczas rozpoznawania użytkownik widzi stan oczekiwania i nie może przypadkowo utworzyć kilku przepisów przez wielokrotne wysłanie tej samej akcji.
- **FR-004:** System przedstawia wynik rozpoznania jako szkic możliwy do edycji.
  - **AC-009:** Rozpoznane dane są mapowane do dwóch oddzielnych części przepisu z AC-001: opisu i listy składników. Każdy rozpoznany składnik trafia do osobnej pozycji listy; pola nierozpoznane pozostają puste i mogą być uzupełnione ręcznie.
  - **AC-010:** Użytkownik może zmienić wszystkie pola szkicu przed zapisem.
  - **AC-011:** Rozpoznanie częściowe nie blokuje edycji ani zapisu; brak tytułu blokuje zapis do chwili jego uzupełnienia.
- **FR-005:** System zapisuje wynik importu wyłącznie po zatwierdzeniu przez użytkownika.
  - **AC-012:** Zamknięcie, odrzucenie lub anulowanie szkicu nie tworzy przepisu.
  - **AC-013:** Po zatwierdzeniu zapisuje się wyłącznie zaakceptowana treść przepisu; oryginalny obraz nie jest dołączany do przepisu.
- **FR-006:** System obsługuje błędy rozpoznawania i przesyłania.
  - **AC-014:** Jeśli rozpoznanie się nie powiedzie, użytkownik otrzymuje zrozumiały komunikat, może spróbować ponownie albo przejść do ręcznego formularza; przepis nie zostaje utworzony automatycznie.
  - **AC-015:** Użytkownik może anulować operację lub odrzucić wybrany obraz bez zapisywania przepisu.
- **FR-007:** System chroni dodawanie i zapis zgodnie z uwierzytelnieniem i własnością danych.
  - **AC-016:** Żądanie zapisu bez ważnego access JWT zostaje odrzucone, a backend nie tworzy ani nie ujawnia przepisu.
  - **AC-017:** Backend przypisuje zapis do użytkownika wskazanego przez zweryfikowany access JWT, nie do identyfikatora właściciela podanego przez frontend.

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Prywatność | Oryginalny obraz nie jest przechowywany jako część przepisu; tymczasowe kopie używane przez aplikację są usuwane po zakończeniu lub anulowaniu przetwarzania. | Test przepływu sukcesu, błędu i anulowania oraz przegląd retencji danych |
| QR-002 | Bezpieczeństwo | Backend sprawdza access JWT, typ i rozmiar obrazu przed przekazaniem do rozpoznawania; obraz jest traktowany jako niezaufane wejście. | Testy dostępu i walidacji pliku |
| QR-003 | Prywatność | Logi aplikacji nie zawierają obrazu, jego zawartości ani pełnej treści przepisu; sekrety i dane uwierzytelniające dostawcy nie są ujawniane frontendowi. | Test/przegląd logów i konfiguracji integracji |
| QR-004 | Dostępność | Wybór pliku, wykonanie zdjęcia, błędy, edycja szkicu i zapis są dostępne z klawiatury; pola i komunikaty mają etykiety dostępne dla technologii asystujących. | Ręczny test klawiaturą i kontrola dostępności po implementacji |
| QR-005 | Niezawodność | Błąd lub przerwanie rozpoznawania nie powoduje częściowego zapisu przepisu; po błędzie użytkownik może wrócić do formularza ręcznego. | Testy błędów i przerwania żądania |

## 6. Dane i informacje

- **Dane przepisu:** tytuł; opcjonalny opis/notatka, liczba porcji, składniki z nazwą, ilością i jednostką, uporządkowane kroki oraz opcjonalne czasy przygotowania i gotowania. Ostateczny model danych pozostaje decyzją implementacyjną.
- **Dane wejściowe AI:** pojedynczy obraz wybrany lub wykonany przez użytkownika. Obraz może zawierać dane osobowe lub inne niezamierzone informacje, dlatego interfejs ma informować o wysłaniu do usługi zewnętrznej.
- **Źródło prawdy i własność:** zapisany przepis jest własnością zalogowanego użytkownika; backend jest źródłem prawdy. Wartości rozpoznane przez AI nie są wiarygodne do czasu sprawdzenia przez użytkownika.
- **Walidacja:** tytuł jest jedynym wymaganym polem do zapisu. Ilości, jednostki, porcje i czasy muszą być edytowalne; brak lub niepewność rozpoznania nie mogą być zastępowane wymyślonymi wartościami.
- **Retencja i usuwanie:** oryginalny obraz jest tymczasowym wejściem i nie jest zapisywany z przepisem. Czasowe przechowywanie, przesyłanie do dostawcy, logowanie i ewentualna retencja po stronie dostawcy muszą zostać opisane w osobnej specyfikacji integracji.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne do | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| Specyfikacja integracji OpenRouter/OpenAI | Upstream / decyzja | Projekt | Musi określić sposób przekazania jednego obrazu, zwracane pola, błędy, retencję, model/dostawcę i obsługę sekretów | Import ze zdjęcia | Otwarta, wymagana przed implementacją importu | Nie można bezpiecznie wdrożyć rozpoznawania |
| Uwierzytelnianie JWT | Upstream | Specyfikacja rejestracji i logowania | Backend weryfikuje access JWT i egzekwuje prywatny dostęp | Dodawanie i zapis przepisu | Opisane w osobnej specyfikacji, implementacja do ustalenia | Nie można przypisać przepisu ani ochronić danych |
| Frontend React/TypeScript i backend Django | Komponenty projektu | Projekt | Django wybrane; szczegółowy kontrakt API i biblioteki pomocnicze pozostają do ustalenia | Ręczne dodawanie i import | Potwierdzone na poziomie projektu | Kontrakty wymagają decyzji podczas implementacji |
| Trwałe przechowywanie przepisów | Upstream / decyzja | Projekt | Schemat i baza danych nie są jeszcze określone | Zapis przepisu | Otwarta | Przepisy nie będą trwale dostępne |

- **Kontrakt produktu dla rozpoznawania:** wejściem jest jeden obraz; wynikiem są wartości pól przepisu zgodne z FR-001 oraz informacja o błędzie lub braku rozpoznania. Szczegółowy format API i reprezentacja niepewności należą do specyfikacji integracji.
- **Kontrakt UI/API:** dokładne trasy i kształt żądań/odpowiedzi pozostają decyzją implementacyjną. Frontend wysyła access JWT jako Bearer, a backend wiąże przepis z użytkownikiem z poprawnie zweryfikowanego tokenu.
- **Kompatybilność:** nie znaleziono istniejącego modelu danych ani klientów API. Migracja danych nie jest obecnie zakładana.

## 8. Architektura i projekt

- **Komponenty:** frontend obsługuje formularz, wybór lub wykonanie zdjęcia, podgląd, status rozpoznawania i edycję szkicu. Backend waliduje wejście, sprawdza użytkownika, koordynuje rozpoznawanie przez interfejs opisany w osobnej specyfikacji oraz zapisuje zaakceptowany przepis. Baza danych przechowuje przepis przypisany do właściciela.
- **Granice zaufania:** przeglądarka i plik obrazu są niezaufane. Backend weryfikuje JWT, dane pliku i właściciela. Dostawca AI jest zewnętrzną granicą przetwarzania; użytkownik jest informowany przed wysłaniem obrazu.
- **Przepływ importu:** użytkownik wybiera lub robi zdjęcie; frontend pokazuje informację o wysyłce i prosi o jawne rozpoczęcie rozpoznawania; backend sprawdza access JWT i plik, a następnie przekazuje go do integracji AI; rozpoznane wartości wracają do formularza jako szkic; użytkownik poprawia dane i jawnie zapisuje albo odrzuca szkic.
- **Przepływ ręczny:** użytkownik wypełnia te same pola formularza bez wysyłania obrazu ani wywoływania AI; backend waliduje wymagany tytuł i zapisuje przepis pod właścicielem wskazanym przez zweryfikowany JWT.
- **Decyzje:** wynik AI nigdy nie zapisuje się automatycznie; plik nie jest trwałym załącznikiem; brakujące dane pozostają puste. Te wybory ograniczają ryzyko zapisania błędnych informacji i zmniejszają zakres przechowywania obrazów.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby i granice zaufania:** prywatne przepisy, obrazy użytkowników, tokeny JWT oraz sekrety dostawcy AI. Obrazy mogą zawierać więcej informacji niż sam przepis.
- **Kontrola dostępu:** tylko zalogowany użytkownik może tworzyć i zapisywać własne przepisy; backend pobiera właściciela ze zweryfikowanego JWT i nie ufa polom właściciela z klienta.
- **Zagrożenia i przypadki nadużyć:** przesłanie nieobsługiwanego lub nadmiernie dużego pliku, próby dostępu bez ważnego JWT, ujawnienie obrazu/przepisu/tokenów w logach, błędne rozpoznanie ilości/składników oraz nieoczekiwane przechowywanie obrazu przez usługę zewnętrzną.
- **Ograniczenia:** walidować pliki przed wysłaniem; nie logować obrazów, sekretów ani pełnych treści przepisów; nie zwracać sekretów do frontend; pokazywać informację przed transferem; usuwać tymczasowe kopie; wymagać sprawdzenia i zatwierdzenia szkicu.
- **Weryfikacja:** FR-003–FR-007, QR-001–QR-005 oraz testy kontroli dostępu i scenariuszy błędów. Retencja i zabezpieczenia po stronie dostawcy wymagają dowodów w specyfikacji integracji.

## Compliance Review

To wstępna ocena zakresu i dowodów, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| Wymogi ochrony danych osobowych, w tym GDPR/RODO; zastosowanie i aktualny zakres do weryfikacji | Nieustalone | Obrazy są wysyłane do zewnętrznej usługi i mogą zawierać dane osobowe; użytkownicy i jurysdykcja nie są znani | FR-003, QR-001, QR-003 | Inwentaryzacja przepływu obrazu, warunków dostawcy, retencji, lokalizacji i podstaw przetwarzania; przegląd przez właściwą osobę | Właściciel projektu | Nie oceniono; wymaga osobnej specyfikacji integracji i ustalenia wdrożenia |
| OWASP ASVS 5.0.0 jako źródło kontroli technicznych | Referencja, obowiązek nieustalony | Może wspierać przegląd kontroli wejścia, uwierzytelniania, dostępu i logowania; nie jest samodzielnym dowodem zgodności prawnej | FR-002, FR-007, QR-001–QR-003 | Przegląd odpowiednich kontroli i testów bezpieczeństwa | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i wdrożenie:** nieustalone.
- **Pytania do przeglądu:** kto jest dostawcą przetwarzania, gdzie przetwarza i przechowuje dane, czy obrazy są używane do trenowania modeli, jak długo są przechowywane oraz jakie warunki i podstawy przetwarzania obowiązują. Odpowiedzi powinny znaleźć się w specyfikacji integracji.
- **Ryzyko nierozstrzygnięte:** importu nie należy udostępniać przed udokumentowaniem przepływu danych do zewnętrznej usługi, retencji oraz informacji przekazywanej użytkownikowi.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres i rezultat | Zależności | Kryteria zakończenia i weryfikacja |
| --- | --- | --- | --- |
| 1. Model i zapis ręczny | Uzgodnić model przepisu i migrację; wdrożyć prywatny zapis/odczyt oraz formularz ręcznego dodawania. | Uwierzytelnianie Django i decyzja o bazie danych. | Przepis z wymaganym tytułem zapisuje się wyłącznie na koncie właściciela; testy pokrywają AC-001–AC-003 i FR-007. |
| 2. Formularz i walidacja | Dopracować edycję części opisowej, składników i kroków, w tym walidację tytułu oraz stany błędu. | Faza 1. | Ręczne dodawanie, poprawa błędów i dostępność formularza przechodzą testy UI/API zgodnie z QR-004. |
| 3. Wejście obrazu i zgoda | Dodać wybór lub wykonanie pojedynczego zdjęcia, kontrolę typu/rozmiaru, informację o zewnętrznym przetwarzaniu oraz stany anulowania i oczekiwania. | Faza 2; ustalone limity pliku z integracją AI. | Obraz nie jest wysyłany przed jawną akcją; nieobsługiwane wejście jest odrzucane przed transferem; testy pokrywają AC-004–AC-008. |
| 4. Rozpoznawanie i edytowalny szkic | Połączyć przepływ z integracją OpenRouter/OpenAI, zmapować wynik na formularz i umożliwić korektę przed zapisem. | Faza 3 oraz gotowa konfiguracja i kontrakt z `2026-10-14-openrouter-openai-integration.md`. | Testy mapowania, błędów i ponowień przechodzą; nic nie zapisuje się bez zatwierdzenia; tymczasowy obraz jest usuwany zgodnie z AC-009–AC-017 i QR-001–QR-003. |
| 5. Weryfikacja całości | Sprawdzić przepływy ręczny i importu, prywatność, dostępność oraz brak częściowego zapisu przy awarii. | Fazy 1–4. | Testy end-to-end obejmują sukces, anulowanie i awarię dostawcy; pozostałe luki są jawne przed udostępnieniem funkcji. |

- **Wdrożenie/migracja:** brak potwierdzonych istniejących przepisów i schematu danych; model oraz migracje zostaną określone podczas implementacji. Współdzielenie nie jest zakładane.
- **Monitoring:** monitorować zagregowaną liczbę powodzeń i błędów importu bez rejestrowania obrazów, sekretów ani pełnej treści przepisów.
- **Obsługa błędów i odzyskiwanie:** błąd integracji nie może zapisać przepisu; użytkownik może ponowić próbę lub kontynuować ręcznie. Anulowanie i błąd muszą zwolnić tymczasowe dane obrazu kontrolowane przez aplikację.

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| FR-001, AC-001–AC-003 | Testy formularza, walidacji i zapisu backendu | Do utworzenia wraz z implementacją modelu przepisu | Planowane |
| FR-002, AC-004–AC-006 | Testy wyboru/zdjęcia, formatu i rozmiaru | Do utworzenia po ustaleniu ograniczeń pliku | Planowane |
| FR-003, AC-007–AC-008 | Test UI wysyłki i blokady powtórzeń | Do utworzenia | Planowane |
| FR-004, AC-009–AC-011 | Test mapowania wyniku do edytowalnego szkicu i brakujących pól | Kontrakt wyniku w osobnej specyfikacji integracji | Planowane |
| FR-005, AC-012–AC-013 | Test braku automatycznego zapisu i zapisu po akceptacji | Do utworzenia | Planowane |
| FR-006, AC-014–AC-015 | Test błędu, anulowania, ponowienia i ścieżki ręcznej | Do utworzenia z integracją | Planowane |
| FR-007, AC-016–AC-017 | Testy backendu dla braku/niepoprawnego JWT i przypisania właściciela | Do utworzenia z uwierzytelnianiem | Planowane |
| QR-001–QR-003 | Test retencji tymczasowych danych, walidacji plików i przegląd logów | Testy aplikacji oraz dowody z osobnej specyfikacji integracji | Planowane |
| QR-004–QR-005 | Ręczne testy dostępności i scenariuszy awarii | Po implementacji UI i integracji | Planowane |

## 13. Ryzyka, założenia i decyzje

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Ograniczenie lub decyzja | Właściciel |
| --- | --- | --- | --- |
| AI błędnie odczyta ilości, jednostki lub kroki | Średnie / średni | Pokazywać dane jako edytowalny szkic, nie zapisywać automatycznie i pozostawiać braki puste | Właściciel produktu |
| Obraz zawiera niezamierzone dane osobowe lub dostawca zachowuje kopię | Nieznane / wysoki | Informować przed wysłaniem; ustalić retencję i warunki dostawcy w osobnej specyfikacji przed udostępnieniem funkcji | Właściciel projektu |
| Model przepisu zostanie ustalony dopiero przy implementacji | Średnie / średni | Traktować pola FR-001 jako kontrakt produktu i uzgodnić schemat przed rozpoczęciem implementacji | Osoba techniczna |

### Założenia

- Funkcja jest przeznaczona dla zalogowanego użytkownika, a przepisy są prywatne i przypisane do jednego konta.
- Obraz zawiera czytelny tekst przepisu; rozpoznawanie gotowego dania wyłącznie na podstawie wyglądu nie jest wymagane.
- Użytkownik sprawdza wynik AI. Tytuł jest wymagany do zapisu; pozostałe pola mogą być niekompletne.
- Oryginalny obraz nie jest potrzebny po rozpoznaniu i nie jest załączany do przepisu.
- Limity i formaty obrazów zostaną określone zgodnie z możliwościami technicznymi integracji i pokazane w UI.

### Otwarte pytania

- [ ] Jaka będzie polityka dostawcy AI dotycząca retencji, trenowania na przesłanych obrazach, lokalizacji przetwarzania i błędów? Właściciel: osoba przygotowująca osobną specyfikację integracji; blokuje udostępnienie importu.
- [ ] Jakie formaty i maksymalny rozmiar obrazu zaakceptuje integracja? Właściciel: osoba techniczna; blokuje wdrożenie walidacji i UI importu.
- [ ] Jak będzie wyglądał trwały model danych przepisu? Właściciel: osoba techniczna; blokuje implementację zapisu, ale nie doprecyzowanie zachowania produktu.

## 14. Przegląd i akceptacja

- **Przegląd produktu/domeny:** Zakres i podstawowy przepływ uzgodnione w rundzie pytań; formalna akceptacja oczekuje.
- **Przegląd techniczny:** Oczekuje na specyfikację integracji AI, model danych i decyzje o limitach obrazów.
- **Przegląd bezpieczeństwa/prywatności/compliance:** Wymagany przed udostępnieniem importu; jurysdykcja i przetwarzanie przez dostawcę nieustalone.
- **Decyzja i data:** Brak; dokument pozostaje szkicem.
