# Specyfikacja: Lista zakupów na podstawie przepisów

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-14
> Updated: 2026-10-15
> Related issue/decision: Brak

## Stan implementacji

> Sprawdzono: 2026-10-15, kod z commitu `f42cc28` (`main`). Jeśli od tego czasu nie zmieniał się kod ani specyfikacja, ta sekcja wystarcza.

| Obszar | Stan | Szczegóły |
| --- | --- | --- |
| FR-001–FR-008 | ❌ Nie zaczęte | Brak aplikacji `shopping_lists` w backendzie i funkcji w frontendzie |

**Zależności gotowe:** zapisane przepisy ze składnikami (nazwa, ilość i jednostka jako tekst) z `2026-10-14-add-recipe.md` oraz uwierzytelnianie JWT.

**Następny krok:** faza 1 tej specyfikacji.

## 1. Podsumowanie

Zalogowany użytkownik może tworzyć nazwane „Zestawy przepisów”, wybierać do nich przepisy z listy lub z widoku szczegółów przepisu, a następnie zapisać wybór. Każdy zestaw ma własną zakładkę „Lista zakupów”, która pokazuje składniki wyliczone z wybranych przepisów. Użytkownik może dopisać własne pozycje, oznaczać składniki jako kupione i przywracać je na listę aktywną. Lista i jej stan są zapisywane.

**Decyzje z rundy doprecyzowania:** grupa nazywa się „Zestaw przepisów”; identyczne składniki z tą samą jednostką mają sumować ilości; zapisanie zmian zestawu przelicza składniki przepisowe, zachowując własne pozycje oraz stan kupienia dla nadal występujących składników; usunięcie zestawu usuwa powiązaną listę po potwierdzeniu.

## 2. Problem i kontekst

- **Problem:** użytkownik musi ręcznie przepisywać składniki z kilku przepisów do wspólnej listy zakupów i osobno pamiętać, które produkty już ma.
- **Kontekst:** projekt aplikacji do przepisów i list zakupów z backendem Python oraz frontendem React/TypeScript. Istniejąca specyfikacja przepisu opisuje składniki jako osobne pozycje z nazwą, ilością i jednostką. Inna specyfikacja zakłada, że przepisy i listy są prywatne dla zalogowanego użytkownika.
- **Pożądany rezultat:** użytkownik zapisuje wybór przepisów jako zestaw, dostaje z niego aktualną listę zakupów i może dopasować ją do własnych potrzeb.
- **Nieustalone fakty:** aplikacja i trwały model danych nie są jeszcze opisane jako zaimplementowane; Django jest wybrane, natomiast baza danych i szczegółowy kontrakt API pozostają do ustalenia.

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Zalogowany użytkownik | Tworzy zestaw i wybiera przepisy | Zapisany zestaw i powiązana lista zakupów |
| Zalogowany użytkownik | Dodaje przepis do zestawu z listy przepisów lub jego szczegółów | Wybrany przepis pojawia się w zestawie po zapisaniu zmian |
| Użytkownik robiący zakupy | Dopisuje brakującą pozycję i oznacza kupione składniki | Zmiany są zachowane; kupione pozycje są oddzielone od aktywnych |
| Użytkownik, który pomylił się przy odznaczaniu | Ponownie wybiera kupiony składnik | Składnik wraca na listę aktywną bez utraty danych |
| Użytkownik zarządzający zestawami | Usuwa niepotrzebny zestaw | Po potwierdzeniu znika zestaw wraz z jego listą zakupów |

## 4. Zakres

### W zakresie

- Tworzenie, nazywanie, edycja składu i usuwanie wielu prywatnych zestawów przepisów.
- Wybór istniejących przepisów z listy oraz dodawanie ich z widoku szczegółów przepisu do zestawu.
- Jedna zapisywana lista zakupów na zestaw, zawierająca składniki wyliczone z jego przepisów.
- Sumowanie ilości składników o tej samej nazwie i jednostce, bez automatycznego przeliczania jednostek ani łączenia podobnych nazw.
- Dodawanie własnych pozycji oraz trwałe oznaczanie składników jako kupionych lub ponownie niekupionych.
- Oddzielna prezentacja aktywnych i kupionych pozycji; kupione są pokazane pod aktywnymi w wizualnie odmiennym stylu, np. przekreślone.
- Ochrona zestawów i list przez uwierzytelnienie oraz kontrolę właściciela.

### Poza zakresem

- Współdzielenie zestawów lub list między użytkownikami.
- Automatyczne rozpoznawanie, czy dwie różne nazwy oznaczają ten sam składnik, oraz konwersje jednostek.
- Przeliczanie ilości w zależności od zmiany liczby porcji; używane są ilości zapisane w przepisach.
- Zakupy online, synchronizacja z zewnętrznymi sklepami, ceny, budżety i planowanie kalendarzowe.
- Automatyczna synchronizacja listy po edycji lub usunięciu samego przepisu. W tej wersji składniki są przeliczane przy zapisie zmian zestawu; obsługa edycji przepisów wymaga uzgodnienia z osobną funkcją edycji przepisów.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

- **FR-001:** System umożliwia zalogowanemu użytkownikowi utworzenie zestawu przepisów z nazwą.
  - **AC-001:** Zapis zestawu z niepustą nazwą tworzy go na koncie bieżącego użytkownika. Nazwy nie muszą być unikalne; zestawy są rozróżniane niezależnie od nazwy.
  - **AC-002:** Pusta lub składająca się wyłącznie z białych znaków nazwa nie zostaje zapisana, a interfejs wskazuje pole wymagające poprawy.
  - **AC-003:** Użytkownik widzi swoje zestawy i może otworzyć wybrany zestaw. Zestaw bez przepisów może istnieć i mieć listę, do której można dodać własne pozycje.
- **FR-002:** System umożliwia wybór przepisów do zestawu oraz zapisanie zmian.
  - **AC-004:** Użytkownik może znaleźć i dodać istniejący przepis z listy przepisów albo z widoku szczegółów przepisu.
  - **AC-005:** Ten sam przepis nie jest dodawany do jednego zestawu więcej niż raz; ponowna próba nie tworzy duplikatu.
  - **AC-006:** Użytkownik może usunąć przepis z zestawu. Zmiany składu stają się obowiązujące po jawnej akcji zapisu.
  - **AC-007:** Po zapisie ponowne otwarcie zestawu pokazuje zapisany wybór, niezależnie od tego, z którego widoku przepisy zostały dodane.
- **FR-003:** System tworzy i utrzymuje listę zakupów powiązaną z zestawem.
  - **AC-008:** Dla każdego składnika wybranego przepisu system tworzy pozycję zakupową. Składniki bez podanej ilości lub jednostki nadal pojawiają się na liście.
  - **AC-009:** Pozycje o tej samej nazwie i jednostce są łączone, a ich ilości sumowane, gdy obie ilości można dodać liczbowo. Jednostki ani podobne nazwy nie są automatycznie normalizowane; pozycje z nieznaną lub nienumeryczną ilością pozostają osobne.
  - **AC-010:** Lista jest przypisana do jednego zestawu; różne zestawy mają niezależne listy, nawet jeśli zawierają te same przepisy.
- **FR-004:** System przelicza składniki przepisowe po zapisaniu zmian składu zestawu.
  - **AC-011:** Po dodaniu lub usunięciu przepisu i zapisaniu zestawu, po ponownym otwarciu listy widoczne są składniki odpowiadające aktualnemu składowi zestawu; składniki pochodzące wyłącznie z usuniętego przepisu znikają.
  - **AC-012:** Własne pozycje użytkownika nie są usuwane ani modyfikowane podczas przeliczania składników przepisowych.
  - **AC-013:** Stan kupienia pozycji przepisowej pozostaje zachowany, jeśli odpowiadający jej składnik nadal występuje po przeliczeniu; nowe pozycje są domyślnie niekupione.
  - **AC-014:** Jeśli zapis zmian się nie powiedzie, system informuje użytkownika, a wcześniej zapisany zestaw i lista pozostają dostępne bez częściowych zmian.
- **FR-005:** System umożliwia dodanie własnej pozycji do listy zakupów.
  - **AC-015:** Użytkownik może zapisać własną pozycję z wymaganą nazwą i opcjonalną ilością oraz jednostką; pusta nazwa jest odrzucana.
  - **AC-016:** Własna pozycja jest zapisywana niezależnie od składników przepisowych i pozostaje na liście po przeliczeniu zestawu.
- **FR-006:** System umożliwia oznaczanie i przywracanie pozycji.
  - **AC-017:** Użytkownik może oznaczyć aktywny składnik jako kupiony; po zapisie pojawia się on pod aktywnymi pozycjami, w wizualnie odmiennym stylu i z widocznym stanem kupienia.
  - **AC-018:** Użytkownik może ponownie oznaczyć kupioną pozycję jako niekupioną; po zapisie wraca ona do aktywnej listy z zachowaną nazwą i ilością.
  - **AC-019:** Stan pozycji pozostaje taki sam po odświeżeniu strony i ponownym otwarciu zestawu.
- **FR-007:** System umożliwia usunięcie zestawu wraz z powiązaną listą.
  - **AC-020:** Przed usunięciem system wyświetla potwierdzenie informujące, że zostanie usunięta także lista zakupów oraz jej własne pozycje.
  - **AC-021:** Anulowanie potwierdzenia nie zmienia danych; potwierdzenie usuwa zestaw i powiązaną listę, a usunięte dane nie są widoczne na koncie użytkownika.
- **FR-008:** System chroni prywatność i własność danych.
  - **AC-022:** Żądanie bez ważnego access JWT nie może tworzyć, odczytywać, zmieniać ani usuwać zestawów lub list.
  - **AC-023:** Użytkownik nie może odczytać ani zmienić zestawu lub listy innego użytkownika przez podanie lub zmianę identyfikatora zasobu; backend ustala właściciela na podstawie zweryfikowanego JWT.

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Spójność danych | Przy nieudanym zapisie zmiany składu zestawu nie powstaje lista częściowo przeliczona; wcześniej zapisany stan pozostaje dostępny. | Test integracyjny zapisu zakończonego powodzeniem i błędem |
| QR-002 | Dostępność | Wszystkie akcje wyboru, zapisu, dodawania, kupienia, przywracania i usuwania są dostępne z klawiatury; stan kupienia nie jest komunikowany wyłącznie kolorem lub przekreśleniem. | Ręczny test klawiaturą i kontrola etykiet czytnika ekranu |
| QR-003 | Bezpieczeństwo i prywatność | Dane zestawów, list i treść pozycji nie trafiają do logów jako pełne dane użytkownika; backend sprawdza access JWT i właściciela dla każdej operacji. | Przegląd logów oraz testy braku/niepoprawnego JWT i dostępu między użytkownikami |
| QR-004 | Użyteczność i niezawodność | Po udanej akcji zapisu, zmiany stanu lub dodania pozycji wynik jest widoczny po odświeżeniu strony; podczas oczekiwania na zapis użytkownik widzi stan operacji, a wielokrotne kliknięcie nie tworzy duplikatów. | Testy integracyjne i ręczny test przepływu UI |

## 6. Dane i informacje

- **Dane tworzone:** zestaw (identyfikator, nazwa, właściciel, znaczniki utworzenia/zmiany), powiązania zestawu z przepisami, lista zakupów oraz jej pozycje. Pozycja zawiera nazwę, opcjonalną ilość i jednostkę, informację o pochodzeniu (przepis lub użytkownik) oraz stan kupienia.
- **Źródło prawdy i własność:** backend i baza danych są źródłem prawdy. Zestaw oraz lista należą do zalogowanego użytkownika; lista ma relację jeden-do-jednego z zestawem.
- **Dane odczytywane:** tytuły i składniki prywatnych przepisów użytkownika; przepisy nie mogą być pobierane z zasobów innego użytkownika.
- **Walidacja i spójność:** nazwa zestawu i nazwa pozycji są wymagane po usunięciu białych znaków z początku i końca. Ilość i jednostka są opcjonalne. Dodanie przepisu do zestawu jest unikalne dla pary zestaw/przepis. Sumowanie dotyczy wyłącznie zgodnych nazw i jednostek oraz ilości nadających się do dodania.
- **Retencja i usuwanie:** usunięcie zestawu usuwa powiązaną listę i pozycje. Zasady kopii zapasowych, trwałego usuwania z kopii oraz retencji kont i logów zależą od wdrożenia i nie są ustalone.
- **Wrażliwość:** lista zakupów i przepisy są danymi powiązanymi z kontem. Same składniki mogą ujawniać preferencje lub informacje o diecie; funkcja nie zbiera osobno danych o zdrowiu ani alergiach.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne do | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| Uwierzytelnianie JWT | Upstream | Osobna specyfikacja rejestracji i logowania | Backend musi weryfikować access JWT oraz egzekwować własność zasobu | Każda operacja zestawu i listy | Opisane, implementacja do ustalenia | Nie można bezpiecznie przypisać ani chronić danych |
| Model i trwały zapis przepisów | Upstream | Specyfikacja dodawania przepisu i projekt | Składnik ma nazwę, ilość i jednostkę; przepisy mają właściciela | Wybór i wyliczenie składników | Wymagany, schemat/baza do ustalenia | Nie można wygenerować listy |
| Frontend React/TypeScript i backend Django | Komponenty projektu | Projekt | Django wybrane; dokładne trasy API i kontrakt odpowiedzi pozostają do ustalenia | Pełny przepływ użytkownika | Potwierdzone na poziomie projektu | Wymaga decyzji implementacyjnych |
| Trwała baza danych i migracje | Decyzja techniczna | Projekt | Musi zachować relacje właściciela, zestawu, przepisów i listy | Zapis oraz ponowne otwarcie danych | Otwarta | Brak trwałości danych |

- **Kontrakt UI:** szczegóły zestawu zawierają zarządzanie wybranymi przepisami oraz zakładkę „Lista zakupów”. Lista pokazuje najpierw pozycje niekupione, następnie kupione. Wybór przepisu z listy i dodanie z jego szczegółów prowadzą do tego samego powiązania z zestawem.
- **Kontrakt API:** dokładne endpointy, formaty żądań/odpowiedzi i kody błędów pozostają decyzją implementacyjną. Każda operacja musi być autoryzowana po stronie backendu; zapis zmian składu i przeliczenie listy muszą być spójne.
- **Kompatybilność:** nie ma potwierdzonych istniejących danych ani API wymagających migracji. Zmiany schematu należy wprowadzić migracją właściwą dla wybranej bazy.
- **Zależności opcjonalne:** brak zewnętrznych usług i dodatkowych pakietów wymaganych przez zachowanie produktu.

## 8. Architektura i projekt

- **Komponenty:** frontend React/TypeScript prezentuje listę zestawów, wybór przepisów, szczegóły zestawu i listę zakupów. Backend Django waliduje wejście, sprawdza access JWT i właściciela, zapisuje zestawy i pozycje oraz przelicza składniki. Baza danych przechowuje powiązania i stan kupienia.
- **Granice zaufania:** przeglądarka jest niezaufana. Backend nie polega na identyfikatorze właściciela ani obliczeniach autoryzacyjnych z frontendu; sprawdza access JWT oraz dostęp do każdego zestawu, przepisu i listy.
- **Przepływ tworzenia:** użytkownik tworzy nazwany zestaw; wybiera przepisy z listy lub widoku szczegółów; zapisuje skład; backend sprawdza własność przepisów i zapisuje powiązania wraz z listą wyliczoną ze składników.
- **Przepływ zakupów:** użytkownik otwiera zakładkę listy, dodaje własną pozycję albo zmienia stan kupienia; backend zapisuje operację; przy kolejnym otwarciu aktywne i kupione pozycje są odtworzone z zapisanych danych.
- **Przeliczenie:** po zapisaniu zmian składu backend przelicza pozycje pochodzące z przepisów, zachowując pozycje dodane ręcznie oraz stan kupienia dla składników nadal obecnych. Błąd nie może pozostawić zestawu i listy w różnych wersjach.
- **Decyzje:** jedna lista na zestaw upraszcza nawigację i wiąże wybór przepisów z konkretnymi zakupami. Pochodzenie pozycji jest rozróżniane, by przeliczenie nie usuwało własnych wpisów. Nie wprowadza się konwersji jednostek ani fuzzy matching, aby nie pokazywać użytkownikowi pozornie dokładnych ilości.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby:** prywatne przepisy, zestawy, listy zakupów, stan kupienia i tokeny JWT.
- **Kontrola dostępu:** wszystkie operacje są dostępne tylko dla zalogowanego właściciela. Backend weryfikuje, że każdy wybrany przepis należy do tego samego użytkownika; nie przyjmuje właściciela z danych klienta.
- **Zagrożenia i błędy:** odczyt lub zmiana cudzej listy przez podmianę identyfikatora, dopisanie cudzego przepisu, przypadkowe usunięcie listy, utrata własnych pozycji podczas przeliczania i ujawnienie danych w logach.
- **Ograniczenia:** wymagane potwierdzenie usuwania; operacje zestaw/lista/przepis sprawdzane po stronie backendu; bezpieczne, spójne zapisy; logi nie zawierają pełnej treści pozycji ani tokenów.
- **Weryfikacja:** AC-020–AC-023 i QR-001–QR-003. Ocena kontroli bezpieczeństwa powinna odwołać się do aktualnego zakresu aplikacji, a nie traktować referencji jako certyfikacji.

## Compliance Review

To wstępna ocena zastosowania i potrzebnych dowodów, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679 z 27 kwietnia 2016 r. (RODO/GDPR); tekst: https://eur-lex.europa.eu/eli/reg/2016/679/oj | Nieustalone | Zestawy i listy są przypisane do konta; jurysdykcja, wdrożenie, zakres danych konta i role administratora nie zostały określone. Składniki mogą pośrednio ujawniać dietę lub preferencje. | FR-008, QR-003 | Inwentaryzacja danych, celów, dostępu, retencji i usuwania; przegląd przez właściwą osobę po określeniu wdrożenia | Właściciel projektu | Nie oceniono; brak podstaw do deklaracji zgodności |
| OWASP ASVS 5.0.0 jako źródło kontroli technicznych; https://owasp.org/www-project-application-security-verification-standard/ | Referencja; obowiązek nieustalony | Może pomóc dobrać testy autoryzacji, walidacji i obsługi danych; samo użycie referencji nie stanowi dowodu zgodności prawnej | FR-008, QR-003 | Przegląd wybranych kontroli i testy dostępu między użytkownikami | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i kontekst wdrożenia:** nieustalone; aplikacja jest projektem prywatnym według istniejącej specyfikacji uwierzytelniania, ale nie potwierdzono środowiska ani kręgu użytkowników tej funkcji.
- **Pytania wymagające przeglądu:** czy i gdzie aplikacja będzie udostępniona innym użytkownikom; jakie dane konta będą przechowywane; jaka będzie retencja i procedura usuwania.
- **Nierozstrzygnięte ryzyko:** przed wdrożeniem publicznym należy ocenić obowiązki dotyczące danych konta, list i ewentualnych informacji mogących ujawniać dietę lub zdrowie.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres i rezultat | Zależności | Kryteria zakończenia i weryfikacja |
| --- | --- | --- | --- |
| 1. Model danych i uprawnienia | Uzgodnić schemat zestawu, powiązań z przepisami, listy i pozycji; przygotować migracje oraz egzekwowanie właściciela. | Uwierzytelnianie Django, model przepisu i wybór bazy danych. | Migracje i ograniczenia własności są gotowe; testy potwierdzają dostęp wyłącznie właściciela oraz relację zestaw–lista. |
| 2. Zestawy i wybór przepisów | Dodać tworzenie, listowanie, zmianę nazwy i składu zestawu; obsłużyć dodanie z listy i widoku szczegółów oraz generowanie składników. | Faza 1; trwały model przepisów. | Testy pokrywają AC-001–AC-014, w tym deduplikację i spójność aktualizacji zestawu z listą. |
| 3. Edycja listy zakupów | Dodać własne pozycje, oznaczanie jako kupione i przywracanie, z trwałym zapisem oraz rozdzielną prezentacją stanów. | Fazy 1–2. | Testy API/UI pokrywają AC-015–AC-019; wpisy i stan pozostają po odświeżeniu. |
| 4. Usuwanie i odporność zapisu | Dodać potwierdzane usuwanie zestawu z listą oraz atomowe przeliczenie składników przy zapisie zmian. | Fazy 1–3. | Testy pokrywają AC-011–AC-014 i AC-020–AC-021; błąd nie pozostawia częściowych danych, a anulowanie nie zmienia stanu. |
| 5. Weryfikacja dostępu i użyteczności | Sprawdzić pełne przepływy, autoryzację, dostępność, logi i obsługę błędów. | Fazy 1–4; działające uwierzytelnianie JWT. | Testy end-to-end obejmują brak/niepoprawny JWT, dostęp między kontami, klawiaturę, odświeżenie i powtórzone akcje zgodnie z AC-022–AC-023 oraz QR-001–QR-004. |

- **Wdrożenie/migracja:** nie ma potwierdzonego istniejącego modelu danych. Implementacja wymaga migracji tworzącej zestawy, relacje zestaw/przepis, listy i pozycje z właścicielem oraz stanem kupienia.
- **Monitoring:** można rejestrować zagregowane powodzenia i błędy operacji bez zapisywania nazw przepisów, składników, zawartości list ani tokenów JWT.
- **Obsługa błędów i odzyskiwanie:** niepowodzenie zapisu lub przeliczenia pozostawia poprzedni zapisany zestaw i listę. Usunięcie zestawu jest jawne i potwierdzane; odtwarzanie danych z kopii zapasowej zależy od polityki całej aplikacji.

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| FR-001, AC-001–AC-003 | Testy walidacji, własności i odczytu zestawów | Do utworzenia z modelem danych | Planowane |
| FR-002, AC-004–AC-007 | Testy dodawania z obu widoków, deduplikacji i zapisu | Do utworzenia w frontendzie i backendzie | Planowane |
| FR-003, AC-008–AC-010 | Testy generowania pozycji, sumowania oraz niezależności list | Do utworzenia z modelem składnika | Planowane |
| FR-004, AC-011–AC-014 | Testy przeliczenia, zachowania wpisów/stanu i błędu zapisu | Testy integracyjne backendu | Planowane |
| FR-005, AC-015–AC-016 | Test walidacji i trwałości własnej pozycji | Testy API i UI | Planowane |
| FR-006, AC-017–AC-019 | Test kupienia, przywrócenia i trwałości po odświeżeniu | Testy API i UI | Planowane |
| FR-007, AC-020–AC-021 | Test potwierdzenia, anulowania i usunięcia powiązanych danych | Test integracyjny usuwania | Planowane |
| FR-008, AC-022–AC-023 | Testy braku/niepoprawnego JWT i dostępu między użytkownikami | Testy autoryzacji backendu | Planowane |
| QR-001–QR-004 | Testy spójności, dostępności, logów i powtórzonych akcji | Testy automatyczne oraz ręczna kontrola UI | Planowane |

## 13. Ryzyka, założenia i otwarte pytania

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Ograniczenie lub decyzja | Właściciel |
| --- | --- | --- | --- |
| Różne nazwy lub jednostki tego samego produktu nie zostaną połączone, a suma może wymagać ręcznej interpretacji | Wysokie / niskie | Łączyć wyłącznie zgodne nazwy i jednostki; nie zgadywać konwersji | Właściciel produktu |
| Przeliczenie może utracić stan kupienia, jeśli składnik przestanie pasować po zmianie składu zestawu | Średnie / średni | Zachować stan dla nadal występujących pozycji; pokryć testami; pozycje usuniętego przepisu usuwać zgodnie z decyzją użytkownika | Osoba techniczna |
| Zmiana lub usunięcie przepisu może pozostawić wcześniej wyliczoną listę nieaktualną | Nieznane / średni | Synchronizacja zmian samych przepisów jest poza zakresem; uzgodnić razem z przyszłą specyfikacją edycji przepisów | Właściciel produktu |

### Założenia

- Każdy zestaw ma jedną listę zakupów; własne pozycje nie są łączone automatycznie z pozycjami wygenerowanymi z przepisów.
- Użytkownik dodaje przepisy tylko ze swojej prywatnej kolekcji; wspólne przepisy nie są obsługiwane.
- Jeśli nazwa i jednostka są takie same, pozycje można połączyć tylko wtedy, gdy ich ilości nadają się do dodania liczbowego. Nieznane ilości i wartości opisowe pozostają osobne.
- „Zapisanie” oznacza jawne utrwalenie zmian na backendzie; zamknięcie widoku bez zapisu nie zatwierdza niezapisanych zmian składu zestawu.
- Edycja przepisu i zmiana jego składników po dodaniu do zestawu nie są obecnie opisane w zakresie projektu; ta specyfikacja nie zakłada automatycznej synchronizacji tych zmian.

### Otwarte pytania

- [ ] Jaka baza danych, mechanizm migracji i podejście do API zostaną wybrane dla backendu Django? Właściciel: osoba techniczna; blokuje kontrakt API i implementację trwałego zapisu, nie blokuje akceptacji zachowania produktu.
- [ ] Czy przed wdrożeniem funkcji będzie dostępna edycja/usuwanie przepisu i jak zmiana przepisu ma aktualizować istniejące listy? Właściciel: właściciel produktu; decyzja wymagana przed połączeniem tej funkcji z edycją przepisów.
- [ ] Jaki jest docelowy kontekst wdrożenia, jurysdykcja i polityka retencji/usuwania danych? Właściciel: właściciel projektu; wymaga przeglądu przed udostępnieniem publicznym.

## 14. Przegląd i akceptacja

- **Przegląd produktu/domeny:** Podstawowy przepływ i decyzje z rundy pytań zapisane; formalna akceptacja oczekuje.
- **Przegląd techniczny:** Oczekuje na wybór bazy danych, podejścia do API i schematu przepisów.
- **Przegląd bezpieczeństwa/prywatności/compliance:** Wymagany przed wdrożeniem publicznym; jurysdykcja i retencja pozostają nieustalone.
- **Decyzja i data:** Brak; dokument pozostaje szkicem.
