# Specyfikacja: Integracja OpenRouter i OpenAI

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-14
> Updated: 2026-10-14
> Related issue/decision: Import przepisu ze zdjęcia opisany w `2026-10-14-add-recipe.md`

## 1. Podsumowanie

Aplikacja udostępnia osobną zakładkę ustawień integracji AI, w której zalogowany użytkownik może skonfigurować OpenRouter lub OpenAI, zapisać własny klucz API, sprawdzić połączenie i wybrać aktywnego dostawcę. Backend przechowuje klucze zaszyfrowane i pośredniczy w żądaniach do dostawcy. W pierwszej wersji integracja służy do rozpoznawania tekstu przepisu ze zdjęcia; nie generuje ani nie zapisuje przepisu bez zatwierdzenia przez użytkownika.

**Ustalenia z rundy doprecyzowania:** obsługiwani są obaj dostawcy, użytkownik wybiera dostawcę w zakładce, klucze są konfigurowane osobno dla konta, a zastosowaniem jest import przepisu ze zdjęcia. Rekomendowane założenie pierwszej wersji: użytkownik może zachować konfigurację obu dostawców, ale aktywny jest jeden naraz. Model obsługujący obraz wybiera aplikacja; ręczny wybór modelu pozostaje poza zakresem.

## 2. Problem i kontekst

- **Problem:** import przepisu ze zdjęcia wymaga skonfigurowanego dostawcy AI, ale aplikacja nie ma jeszcze sposobu bezpiecznego wprowadzenia poświadczeń ani wyboru dostawcy.
- **Kontekst:** projekt używa backendu Django i frontendu React/TypeScript. Baza danych i infrastruktura wdrożenia pozostają nieustalone. Sąsiednia specyfikacja dodawania przepisu wymaga przekazania obrazu do zewnętrznej usługi AI po jawnej akcji użytkownika.
- **Pożądany rezultat:** użytkownik może skonfigurować połączenie w osobnej zakładce i użyć go do importu zdjęcia; awaria, brak konfiguracji ani błędne poświadczenia nie powodują ujawnienia klucza lub automatycznego zapisu przepisu.

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Zalogowany użytkownik | Otwiera zakładkę integracji AI | Widzi stan połączenia i może skonfigurować dostawcę |
| Zalogowany użytkownik | Wprowadza klucz OpenRouter lub OpenAI i sprawdza połączenie | Otrzymuje jasny sukces albo bezpieczny, użyteczny błąd |
| Zalogowany użytkownik | Przełącza aktywnego dostawcę | Kolejny import używa wybranego dostawcy i jego klucza |
| Zalogowany użytkownik | Importuje przepis ze zdjęcia | Obraz jest przekazany wyłącznie do aktywnego dostawcy, a wynik wraca jako edytowalny szkic |
| Użytkownik bez poprawnej konfiguracji | Rozpoczyna import lub używa nieprawidłowego klucza | Otrzymuje informację, jak naprawić konfigurację; przepis nie zostaje utworzony |

## 4. Zakres

### W zakresie

- Osobna zakładka ustawień połączenia z AI, dostępna dla zalogowanego użytkownika.
- Wybór OpenRouter lub OpenAI, konfiguracja klucza dla każdego dostawcy, zapis i usunięcie konfiguracji.
- Sprawdzenie połączenia przed aktywacją konfiguracji oraz widoczny stan aktywnego dostawcy.
- Bezpieczne przechowywanie kluczy po stronie backendu i używanie ich wyłącznie przez backend.
- Przekazanie pojedynczego obrazu z tekstem przepisu do aktywnego dostawcy i zwrócenie wyniku w formacie wymaganym przez specyfikację dodawania przepisu.
- Obsługa braku konfiguracji, nieprawidłowego klucza, limitu dostawcy, błędu sieci, timeoutu i niepoprawnej odpowiedzi modelu.
- Informacja dla użytkownika, że obraz trafia do wybranego zewnętrznego dostawcy i mogą obowiązywać jego zasady przetwarzania oraz opłaty.

### Poza zakresem

- Generowanie nowych przepisów, planów posiłków lub list zakupów; edycja istniejącego przepisu przez AI.
- Wybór dowolnego modelu, parametrów generowania, promptu ani endpointu zgodności z OpenAI.
- Równoległe wysyłanie obrazu do obu dostawców, automatyczne przełączenie na innego dostawcę lub mechanizm fallback.
- Klucz wspólny dla wszystkich użytkowników, rozliczanie kosztów przez aplikację, limity wydatków i panel administracyjny.
- Przechowywanie przesłanego obrazu jako części przepisu lub trenowanie modeli na danych aplikacji.
- Ustalenie umów, polityk retencji lub zgodności prawnej po stronie dostawców; wymagają osobnej weryfikacji.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

- **FR-001:** System udostępnia osobną zakładkę konfiguracji integracji AI wyłącznie zalogowanemu użytkownikowi.
  - **AC-001:** Zakładka pokazuje OpenRouter i OpenAI, stan konfiguracji każdego z nich oraz oznacza, który dostawca jest aktywny.
  - **AC-002:** Użytkownik bez ważnego access JWT nie może odczytać ani zmienić konfiguracji; frontend nie jest źródłem prawdy o uprawnieniach.
- **FR-002:** Użytkownik może zapisać oddzielny klucz API dla OpenRouter i OpenAI, sprawdzić go, aktywować dostawcę lub usunąć jego konfigurację.
  - **AC-003:** Sprawdzenie połączenia zwraca stan powodzenia albo zrozumiały błąd bez ujawniania klucza, pełnej odpowiedzi dostawcy ani wewnętrznych szczegółów serwera.
  - **AC-004:** Błędna konfiguracja nie zastępuje wcześniej działającej konfiguracji tego dostawcy; użytkownik może ją poprawić lub anulować zmianę.
  - **AC-005:** Po usunięciu klucza dostawca nie może być aktywny. Jeśli był aktywny, import zostaje zablokowany do czasu skonfigurowania i aktywowania innego dostawcy.
- **FR-003:** System używa wyłącznie aktywnego dostawcy dla żądań rozpoznawania zdjęcia.
  - **AC-006:** Backend sprawdza access JWT, aktywną konfigurację i dostępność modelu obsługującego obraz przed wywołaniem zewnętrznego API.
  - **AC-007:** Gdy brak aktywnego dostawcy, import nie wysyła obrazu i prowadzi użytkownika do zakładki konfiguracji.
  - **AC-008:** Odpowiedź dostawcy jest mapowana do pól szkicu przepisu ze specyfikacji dodawania przepisu; brakujące lub niepewne wartości nie są wymyślane.
- **FR-004:** System informuje użytkownika o przekazaniu obrazu do zewnętrznej usługi przed rozpoczęciem rozpoznawania.
  - **AC-009:** Wybranie pliku samo nie wysyła obrazu; wysyłka zaczyna się dopiero po jawnej akcji rozpoznawania i pokazaniu informacji o dostawcy.
  - **AC-010:** Oryginalny obraz nie jest zapisywany z przepisem, a tymczasowe kopie kontrolowane przez aplikację są usuwane po zakończeniu, błędzie lub anulowaniu.
- **FR-005:** System obsługuje awarie dostawcy bez ujawniania sekretów i bez zapisu przepisu.
  - **AC-011:** Błąd autoryzacji, limit, niedostępność, timeout lub błędna odpowiedź nie tworzą przepisu; użytkownik może poprawić ustawienia, ponowić próbę albo przejść do formularza ręcznego.
  - **AC-012:** UI pokazuje postęp i blokuje wielokrotne równoległe wysłanie tego samego żądania; błąd nie zawiera klucza ani surowego promptu/obrazu.
- **FR-006:** System izoluje konfigurację dostawców i klucze pomiędzy kontami.
  - **AC-013:** Użytkownik A nie może odczytać, zmienić, aktywować ani użyć konfiguracji użytkownika B, również przez zmianę identyfikatora w żądaniu.
  - **AC-014:** Odpowiedzi API i interfejs nigdy nie zwracają zapisanego klucza; po zapisie pole jest czyszczone lub pokazywane wyłącznie jako zamaskowany stan.

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Bezpieczeństwo sekretów | Przy odczycie bazy danych zapisany klucz nie jest dostępny w postaci jawnej; materiał używany do szyfrowania jest przechowywany poza bazą i nie trafia do repozytorium. | Test zapisu/odczytu oraz przegląd konfiguracji wdrożenia |
| QR-002 | Bezpieczeństwo i prywatność | Klucz, obraz, pełny prompt i pełna treść przepisu nie trafiają do logów aplikacji ani komunikatów błędów. | Test logów ścieżek sukcesu i błędu oraz przegląd loggerów |
| QR-003 | Izolacja dostępu | Żądania konfiguracji i rozpoznawania wymagają poprawnego access JWT, a dostęp do klucza jest ograniczony do operacji backendu danego użytkownika. | Testy integracyjne dwóch kont i żądania bez/ze złym JWT |
| QR-004 | Niezawodność | Odpowiedź rozpoznawania kończy się sukcesem albo kontrolowanym błędem; backend przerywa oczekiwanie najpóźniej po 60 sekundach i nie zapisuje częściowego przepisu. | Test timeoutu, błędów dostawcy i braku zapisu |
| QR-005 | Dostępność | Zakładka, pola kluczy, wybór dostawcy, statusy i błędy są obsługiwane klawiaturą i mają etykiety czytelne dla technologii asystujących. | Ręczny test klawiaturą i kontrola dostępności po implementacji |

## 6. Dane i informacje

- **Dane tworzone:** identyfikator użytkownika, dostawca, zaszyfrowany klucz API, informacja o aktywnym dostawcy oraz metadane niezbędne do obsługi konfiguracji. Nie przechowywać kopii jawnego klucza w logach, analityce ani odpowiedzi API.
- **Źródło prawdy i własność:** backend przechowuje konfigurację przypisaną do konta. Użytkownik kontroluje swój klucz i odpowiada za rozliczenie naliczane przez wybranego dostawcę.
- **Wrażliwość:** klucz API jest sekretem umożliwiającym korzystanie z konta dostawcy i potencjalne naliczanie opłat. Obraz może zawierać dane osobowe lub inne informacje niezwiązane z przepisem.
- **Walidacja i spójność:** dostawca musi należeć do obsługiwanej listy; jedno konto może mieć najwyżej jedną konfigurację na dostawcę i najwyżej jednego aktywnego dostawcę. Nie polegać wyłącznie na kształcie klucza jako dowodzie jego ważności.
- **Szyfrowanie i retencja:** klucz jest szyfrowany przed trwałym zapisem. Klucz szyfrujący powinien pochodzić z konfiguracji sekretów środowiska/hostingu, a nie z tej samej bazy danych; dokładny mechanizm zależy od wybranego backendu i hostingu. Usunięcie konfiguracji usuwa jej zaszyfrowany klucz. Oryginalny obraz jest tymczasowy.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne do | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| API OpenRouter | Zewnętrzna usługa | OpenRouter i oficjalna dokumentacja API | Klucz użytkownika; obsługa wejścia obrazowego zależna od modelu | Test połączenia i import | Do weryfikacji przy implementacji | Brak importu przez OpenRouter |
| API OpenAI | Zewnętrzna usługa | OpenAI i oficjalna dokumentacja API | Klucz użytkownika; obsługa obrazu zależna od modelu | Test połączenia i import | Do weryfikacji przy implementacji | Brak importu przez OpenAI |
| Specyfikacja dodawania przepisu | Downstream | Projekt, `2026-10-14-add-recipe.md` | Wynik musi zasilać edytowalny szkic i respektować zgodę przed wysłaniem | Import ze zdjęcia | Opisana | Brak kontraktu produktu dla wyniku |
| Uwierzytelnianie JWT | Upstream | Projekt, `2026-10-14-registration-and-login.md` | Backend musi zweryfikować access JWT i rozpoznać właściciela konfiguracji | Odczyt i użycie klucza | Opisane; implementacja nieustalona | Nie można bezpiecznie izolować kluczy |
| Baza danych i sekret szyfrujący | Decyzja/infrastruktura | Projekt i środowisko wdrożenia | Klucz szyfrujący nie może być przechowywany obok zaszyfrowanych danych | Trwała konfiguracja | Otwarte | Nie można bezpiecznie przechowywać poświadczeń |

- **Kontrakt UI:** osobna zakładka zawiera wybór dostawcy, pole klucza, akcję sprawdzenia połączenia, zapis/usunięcie konfiguracji, wybór aktywnego dostawcy oraz czytelny status. Klucz nie jest pobierany przy ponownym otwarciu widoku.
- **Kontrakt backendu:** wymagane są operacje uwierzytelnione do odczytu statusu, zapisania/sprawdzenia/usunięcia konfiguracji i uruchomienia rozpoznawania. Dokładne ścieżki oraz formaty żądań i odpowiedzi zależą od wybranego podejścia do API (Django REST Framework jest rekomendowany, ale nie został jeszcze wybrany); żadne endpointy przeglądarki nie łączą się bezpośrednio z dostawcą z użyciem klucza.
- **Kontrakt rozpoznawania:** wejściem jest pojedynczy obraz przepisu; odpowiedzią jest struktura szkicu zgodna z polami ze specyfikacji dodawania przepisu albo kontrolowany błąd. Szczegóły formatu wynikowego i mapowania należy ustalić przed implementacją.
- **Kompatybilność:** nie znaleziono istniejącego API ani konfiguracji do migracji. Szczegóły uwierzytelnienia, endpointów i zgodności modeli należy zweryfikować względem aktualnej dokumentacji obu dostawców podczas implementacji.

## 8. Architektura i projekt

- **Komponenty:** frontend React/TypeScript prezentuje osobną zakładkę i statusy; backend Python uwierzytelnia żądania, szyfruje i odszyfrowuje klucze, wywołuje wybranego dostawcę oraz mapuje wynik na szkic; baza danych przechowuje konfigurację per konto.
- **Granice zaufania:** przeglądarka nie jest zaufana i nie może otrzymać zapisanego klucza. Backend jest jedynym miejscem, w którym klucz może zostać odszyfrowany. OpenRouter/OpenAI są zewnętrznymi granicami przetwarzania obrazu i treści żądania.
- **Przepływ konfiguracji:** użytkownik wybiera dostawcę i podaje klucz; backend sprawdza poświadczenie bez wywołania generowania, jeśli dostawca udostępnia odpowiednią operację; po powodzeniu zapisuje klucz w postaci zaszyfrowanej; użytkownik jawnie aktywuje dostawcę. Nieudana zmiana nie nadpisuje działającej konfiguracji.
- **Przepływ importu:** użytkownik jawnie rozpoczyna rozpoznawanie po informacji o zewnętrznym przetwarzaniu; backend weryfikuje access JWT, konfigurację i format/rozmiar obrazu; odszyfrowuje klucz wyłącznie w pamięci procesu i wysyła żądanie do aktywnego dostawcy; mapuje odpowiedź na szkic; zwraca szkic frontendowi bez zapisywania przepisu.
- **Decyzje:** klucze należą do użytkownika, nie są wspólne; żądania do dostawców przechodzą przez backend; konfiguracja obu dostawców może być zachowana, ale aktywny jest jeden; aplikacja wybiera kompatybilny model w pierwszej wersji. Te decyzje ograniczają ujawnienie sekretów i utrzymują zakres importu małym.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby i granice zaufania:** klucze API, konta użytkowników, obrazy i treści przepisów; granice obejmują przeglądarkę, backend, bazę danych, konfigurację sekretów oraz dostawcę AI.
- **Kontrola dostępu:** każda operacja sprawdza access JWT i wiąże konfigurację z użytkownikiem ze zweryfikowanego tokenu; klient nie przekazuje wiarygodnego identyfikatora właściciela.
- **Zagrożenia:** kradzież lub wyciek klucza, odczyt klucza innego użytkownika, nieautoryzowane naliczenie opłat, przypadkowe wysłanie obrazu, prompt injection w treści zdjęcia, ujawnienie danych w logach oraz nadużycie limitów dostawcy.
- **Ograniczenia:** szyfrować klucze przed zapisem; trzymać sekret szyfrujący poza bazą i repozytorium; nie zwracać kluczy w API; redagować sekrety z błędów i logów; walidować pliki; nie udostępniać modelowi narzędzi ani możliwości wykonywania działań; traktować wynik modelu jako niezaufany szkic wymagający potwierdzenia przez użytkownika.
- **Weryfikacja:** FR-002, FR-004–FR-006 oraz QR-001–QR-004; wymagana jest kontrola dostępu między kontami, brak klucza w odpowiedziach/logach i brak zapisu przy błędzie integracji.

## Compliance Review

To wstępna ocena zakresu i dowodów, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| Wymogi ochrony danych osobowych, w tym GDPR/RODO; aktualne zastosowanie do ustalenia | Nieustalone | Obrazy i treść przepisu są przekazywane dostawcy zewnętrznemu; mogą zawierać dane osobowe. Użytkownicy, jurysdykcja i wdrożenie nie są określone. | FR-004, QR-002 | Inwentaryzacja transferu, retencji, lokalizacji i warunków dostawcy; przegląd przez właściwą osobę | Właściciel projektu | Nie oceniono; blokuje udostępnienie importu do czasu przeglądu |
| Warunki i polityki przetwarzania OpenRouter/OpenAI; aktualne wersje do sprawdzenia | Tak, dla wybranego dostawcy | Użytkownik przekazuje obraz i treść żądania bezpośrednio pośrednio przez aplikację do dostawcy, z użyciem własnego klucza. Warunki mogą różnić się zależnie od dostawcy/modelu/konta. | FR-004, QR-002 | Udokumentować politykę retencji, użycia danych, lokalizacji oraz opcji prywatności dla obsługiwanych modeli | Właściciel projektu | Otwarte; przed wdrożeniem użytkownik musi otrzymać jasną informację |
| OWASP ASVS 5.0.0 jako referencja kontroli technicznych | Referencja; obowiązek nieustalony | Może wspierać weryfikację sekretów, uwierzytelniania, autoryzacji i obsługi błędów; samo odwołanie nie dowodzi zgodności prawnej. | FR-002, FR-006, QR-001–QR-003 | Przegląd odpowiednich wymagań i testów po wyborze architektury | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i wdrożenie:** nieustalone.
- **Pytania do przeglądu:** czy dane użytkowników lub obrazy mogą zawierać informacje wrażliwe; gdzie dostawcy przetwarzają dane; jak długo je zachowują; czy wykorzystują je do trenowania; jakie umowy i ustawienia konta użytkownika mają zastosowanie.
- **Ryzyko nierozstrzygnięte:** nie należy udostępniać importu przed udokumentowaniem warunków dostawcy, informacji pokazywanej użytkownikowi oraz wpływu wyboru modelu na przetwarzanie.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres i rezultat | Zależności | Kryteria zakończenia i weryfikacja |
| --- | --- | --- | --- |
| 1. Decyzje dostawców i bezpieczeństwo kluczy | Zweryfikować aktualne API, modele obrazowe, limity i warunki przetwarzania; wybrać mechanizm szyfrowania oraz źródło sekretu. | Dokumentacja OpenRouter/OpenAI; decyzja o backendzie, bazie i hostingu. | Zapisany kontrakt dostawców, decyzja szyfrowania/rotacji i udokumentowane warunki retencji przed przesyłaniem obrazów. |
| 2. Konfiguracja dostawcy | Zaimplementować zakładkę ustawień i uwierzytelnione API do testowania, zapisu, aktywacji i usuwania konfiguracji per konto. | Faza 1 oraz działające uwierzytelnianie JWT. | Testy mockowanych odpowiedzi pokrywają AC-001–AC-005; klucze nie wracają w API ani logach; błędna zmiana zachowuje poprzednią konfigurację. |
| 3. Rozpoznawanie obrazu | Dodać backendowy adapter do aktywnego dostawcy, walidację wejścia, mapowanie do szkicu przepisu, limity czasu i kontrolę błędów. | Faza 2; kontrakt wyniku z `2026-10-14-add-recipe.md`. | Testy pokrywają AC-006–AC-012 i QR-004; brak konfiguracji lub awaria nie wysyła/nie zapisuje przepisu, a aplikacja nie przechowuje obrazu trwale. |
| 4. Izolacja i gotowość do użycia | Zweryfikować separację kont, ochronę sekretów, dostępność ustawień i pełny przepływ importu z informacją dla użytkownika. | Fazy 1–3; ustalony kontekst wdrożenia i przegląd warunków dostawców. | Testy dwóch kont, logów, odpowiedzi API i dostępności przechodzą; kwestie compliance/retencji wymagane do uruchomienia są rozstrzygnięte. |

- **Wdrożenie/migracja:** brak istniejących konfiguracji do migracji. Przed uruchomieniem funkcji należy skonfigurować sekret szyfrujący w środowisku backendu i zapewnić procedurę jego kopii/rotacji; utrata sekretu może uniemożliwić odszyfrowanie zapisanych kluczy.
- **Monitoring:** rejestrować zagregowane powodzenia i kategorie błędów bez klucza, obrazu, promptu ani pełnej treści przepisu. Nie logować surowych odpowiedzi dostawcy.
- **Obsługa błędów i odzyskiwanie:** awaria dostawcy nie może usuwać ani zmieniać konfiguracji; użytkownik może ponowić próbę, poprawić klucz lub przełączyć dostawcę. Nie ma automatycznego fallbacku. Usunięcie klucza jest jawne i blokuje kolejne wywołania tego dostawcy.
- **Koszty:** żądania AI mogą powodować opłaty na koncie dostawcy powiązanym z kluczem użytkownika. Interfejs ma to jasno komunikować przed użyciem funkcji; aplikacja nie szacuje ani nie ogranicza kosztów w pierwszej wersji.

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| FR-001, AC-001–AC-002 | Test UI i testy backendu dla braku/niepoprawnego JWT | Do utworzenia z implementacją zakładki | Planowane |
| FR-002, AC-003–AC-005 | Test poprawnego i błędnego klucza, nieudanej zmiany i usunięcia | Testy integracyjne z mockiem dostawcy | Planowane |
| FR-003, AC-006–AC-008 | Test aktywnego dostawcy, braku konfiguracji i mapowania wyniku | Testy backendu z odpowiedziami fixture | Planowane |
| FR-004, AC-009–AC-010 | Test jawnej akcji wysyłki i sprzątania pliku | Test UI oraz testy sukcesu, błędu i anulowania | Planowane |
| FR-005, AC-011–AC-012 | Test autoryzacji, limitu, timeoutu, błędnej odpowiedzi i braku zapisu | Testy backendu z mockiem dostawcy | Planowane |
| FR-006, AC-013–AC-014 | Test dwóch kont i inspekcja odpowiedzi API | Test integracyjny oraz test braku sekretu w payloadzie | Planowane |
| QR-001–QR-003 | Przegląd szyfrowania, sekretów, logów i izolacji | Test zapisu/odczytu oraz przegląd konfiguracji | Planowane |
| QR-004–QR-005 | Test limitu czasu i ręczny test dostępności | Testy backendu oraz kontrola po implementacji UI | Planowane |

## 13. Ryzyka, założenia i decyzje

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Ograniczenie lub decyzja | Właściciel |
| --- | --- | --- | --- |
| Wyciek klucza umożliwia nieautoryzowane użycie i opłaty | Średnie / wysoki | Szyfrowanie po stronie backendu, brak klucza w API/logach, instrukcja rotacji i usuwania | Osoba techniczna |
| Dostawca zachowuje lub wykorzystuje obraz na warunkach nieoczekiwanych przez użytkownika | Nieznane / wysoki | Przegląd warunków i ustawień kont/modeli; informacja przed wysyłką; nie uruchamiać funkcji bez decyzji | Właściciel projektu |
| Model nie obsługuje obrazów albo zmienia kontrakt API | Średnie / średni | Używać wyłącznie zweryfikowanych modeli multimodalnych; testy kontraktowe i kontrolowany błąd | Osoba techniczna |
| Utrata sekretu szyfrującego uniemożliwia odczyt konfiguracji | Niskie / wysoki | Bezpieczna kopia i udokumentowana rotacja/odzyskiwanie sekretu przed wdrożeniem | Osoba techniczna |

### Założenia

- Aplikacja ma konta użytkowników; konfiguracja i klucze są prywatne dla każdego konta.
- Obaj dostawcy są dostępni jako alternatywy; konto może skonfigurować oba, lecz w danym momencie używany jest jeden aktywny.
- Pierwszym zastosowaniem jest import pojedynczego zdjęcia z tekstem przepisu, zgodnie z osobną specyfikacją dodawania przepisu.
- Aplikacja dobiera domyślny model obsługujący obrazy dla aktywnego dostawcy; ręczny wybór modelu nie jest potrzebny w pierwszej wersji.
- Użytkownik posiada konto u dostawcy, własny klucz i ponosi ewentualne opłaty dostawcy.

### Otwarte pytania

- [ ] Jaki mechanizm szyfrowania kluczy i zarządzania sekretami udostępni wybrane środowisko wdrożenia? Właściciel: osoba techniczna; blokuje trwałe przechowywanie kluczy.
- [ ] Które konkretne modele każdego dostawcy będą obsługiwane i jakie mają warunki przetwarzania obrazu? Właściciel: osoba techniczna/właściciel projektu; blokuje uruchomienie importu dla danego dostawcy.
- [ ] Jakie formaty i limity rozmiaru obrazu będą przyjęte? Właściciel: osoba techniczna; zależy od kontraktu integracji i istniejącej specyfikacji dodawania przepisu.
- [ ] Jaka jurysdykcja i środowisko wdrożenia będą docelowe? Właściciel: właściciel projektu; blokuje końcową ocenę prywatności i compliance.

## 14. Przegląd i akceptacja

- **Przegląd produktu/domeny:** Zakres dostawców, zarządzania kluczami per konto i zastosowania do importu zdjęcia ustalony w rundzie pytań; formalna akceptacja oczekuje.
- **Przegląd techniczny:** Oczekuje na wybór bazy danych, podejścia do API, mechanizmu szyfrowania i listy modeli.
- **Przegląd bezpieczeństwa/prywatności/compliance:** Wymagany przed udostępnieniem integracji; warunki przetwarzania dostawców, jurysdykcja i wdrożenie pozostają do ustalenia.
- **Decyzja i data:** Brak; dokument pozostaje szkicem.
