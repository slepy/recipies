# Specyfikacja: Rejestracja i logowanie

> Status: Draft
> Owner: Do ustalenia
> Created: 2026-10-14
> Updated: 2026-10-15
> Related issue/decision: ADR-0002 (stos uwierzytelniania)

## Stan implementacji

> Sprawdzono: 2026-10-15, kod z commitu `f42cc28` (`main`). Jeśli od tego czasu nie zmieniał się kod ani specyfikacja, ta sekcja wystarcza.

| Obszar | Stan | Szczegóły |
| --- | --- | --- |
| FR-001 rejestracja (AC-001–AC-003) | ✅ Zrobione | `POST /api/auth/register/`; e-mail unikalny bez względu na wielkość liter (ograniczenie w bazie); hasło min. 12 znaków |
| FR-002 logowanie (AC-004–AC-005) | ✅ Zrobione | Neutralny komunikat błędu |
| FR-003 rotacja refresh i wylogowanie (AC-006) | ✅ Zrobione | Ponowne użycie refresh tokenu jest odrzucane; ale patrz znane problemy (czas życia access tokenu) |
| FR-004 odnowienie sesji (AC-007, AC-010) | 🟡 Częściowo | CSRF i sprawdzanie origin działają, refresh żyje 7 dni; **access token żyje 24 h zamiast ≤ 10 min** |
| FR-005 własność zasobów (AC-008–AC-009) | ✅ Zrobione | Przepisy i integracje filtrowane po `request.user` |
| QR-001 haszowanie haseł | ✅ Zrobione | Mechanizm Django |
| QR-002 token w pamięci, ciasteczko HttpOnly/Secure/Lax | ✅ Zrobione | Brak `localStorage`; `Secure` gdy `DEBUG=false` |
| QR-003 brak sekretów w logach | 🟡 Nie zweryfikowano testem | Kod nie loguje haseł ani tokenów |
| QR-004 limit prób logowania | ✅ Zrobione | 5 na minutę na logowanie, 5 na godzinę na rejestrację |
| QR-005 dostępność formularzy | 🟡 Nie zweryfikowano ręcznie | Etykiety i komunikaty z `role="alert"` są |

**Znane problemy:**

- Commit `eb2b15c` zmienił `ACCESS_TOKEN_LIFETIME` z 10 minut na 24 godziny (`backend/config/settings.py`), a w `App.tsx` dodał odświeżanie co 23 h. To narusza AC-006 i AC-010. Żaden test nie sprawdza czasu życia tokenu.

**Następny krok:** przywrócić 10 minut, odświeżać token przed wygaśnięciem (np. po 9 minutach) i dodać test czasu życia tokenu.

## 1. Podsumowanie

Aplikacja ma umożliwiać utworzenie konta, logowanie, odświeżanie i wylogowanie użytkownika z użyciem JWT. Uwierzytelniony użytkownik będzie mógł korzystać ze swoich danych, a backend będzie weryfikował token oraz uprawnienia przy każdym żądaniu wymagającym zalogowania.

**Ustalenia dla pierwszej wersji:** prywatny prototyp z rejestracją przez e-mail i hasło oraz uwierzytelnianiem JWT: krótko żyjący access token jest trzymany w pamięci frontendu, a rotowany refresh token w ciasteczku `HttpOnly`. Dane są prywatne i przypisane do jednego użytkownika. Prototyp nie weryfikuje adresu e-mail i nie obsługuje samodzielnego resetu hasła. Logowanie społecznościowe i MFA są poza zakresem.

## 2. Problem i kontekst

- **Problem:** aplikacja z przepisami i listami zakupów potrzebuje rozpoznawać użytkowników, aby przypisywać im dane i chronić prywatne zasoby.
- **Kontekst:** projekt używa backendu Django i frontendu w React/TypeScript. Pierwsza wersja jest prywatnym prototypem, a dane nie są współdzielone. Baza danych i szczegóły integracji API pozostają decyzjami implementacyjnymi.
- **Pożądany rezultat:** użytkownik może bezpiecznie utworzyć konto i wracać do swoich danych po zalogowaniu; niezalogowane osoby nie uzyskują dostępu do zasobów prywatnych.

## 3. Użytkownicy i przypadki użycia

| Użytkownik/aktor | Potrzeba lub scenariusz | Oczekiwany rezultat |
| --- | --- | --- |
| Nowy użytkownik | Zakłada konto, podając e-mail i hasło | Konto zostaje utworzone albo użytkownik otrzymuje jasną informację, jak poprawić dane |
| Zarejestrowany użytkownik | Loguje się i wraca do aplikacji | Backend wydaje tokeny, a frontend pokazuje stan zalogowania |
| Zalogowany użytkownik | Wylogowuje się | Refresh token zostaje unieważniony, a ciasteczko usunięte |
| Niezalogowany użytkownik | Próbuje otworzyć prywatny zasób | Żądanie zostaje odrzucone lub użytkownik zostaje przekierowany do logowania |

## 4. Zakres

### W zakresie

- Rejestracja e-mailem i hasłem.
- Logowanie i wylogowanie.
- Wydawanie, odświeżanie i unieważnianie tokenów JWT.
- Ochrona endpointów wymagających uwierzytelnienia i kontrola dostępu do danych użytkownika.
- Bezpieczne przechowywanie danych uwierzytelniających i obsługa typowych błędów.

### Poza zakresem pierwszej wersji, chyba że decyzje poniżej zmienią zakres

- Logowanie przez Google, Apple lub innego dostawcę (OAuth/OIDC).
- Uwierzytelnianie wieloskładnikowe.
- Role administracyjne i panel administratora.
- Współdzielenie kont, przepisów lub list między użytkownikami.
- Weryfikacja adresu e-mail i samodzielne odzyskiwanie/reset hasła; utrata hasła w prototypie wymaga ręcznej pomocy lub ponownego utworzenia konta.
- Usuwanie konta i eksport danych; wymagają osobnego ustalenia oraz oceny retencji.

## 5. Wymagania i kryteria akceptacji

### Wymagania funkcjonalne

- **FR-001:** System umożliwia utworzenie konta przy użyciu adresu e-mail i hasła.
  - **AC-001:** Gdy podano poprawny, nieużywany e-mail i hasło spełniające przyjętą politykę, konto zostaje utworzone bez weryfikacji e-maila, wydany zostaje access JWT, a refresh JWT jest ustawiany w ciasteczku `HttpOnly`.
  - **AC-002:** E-mail jest porównywany bez rozróżniania wielkości liter, a baza danych wymusza jego unikalność.
  - **AC-003:** Niepoprawne dane nie tworzą konta, a odpowiedź wskazuje, które pola wymagają poprawy bez ujawniania sekretów.
- **FR-002:** System umożliwia logowanie istniejącego konta.
  - **AC-004:** Poprawne dane uwierzytelniające powodują wydanie access JWT w odpowiedzi oraz refresh JWT w ciasteczku `HttpOnly`.
  - **AC-005:** Błędny e-mail lub hasło zwraca neutralny komunikat, który nie potwierdza, czy konto istnieje.
- **FR-003:** System umożliwia odświeżenie access tokenu i wylogowanie.
  - **AC-006:** Refresh token jest rotowany przy każdym użyciu; po wylogowaniu backend unieważnia refresh token/token family i usuwa ciasteczko. Ponowne użycie unieważnionego refresh tokenu nie wydaje nowych tokenów. Wydany wcześniej access token może działać do wygaśnięcia, maksymalnie 10 minut.
- **FR-004:** System udostępnia frontendowi sposób uzyskania nowego access tokenu i sprawdzenia tożsamości bieżącego użytkownika.
  - **AC-007:** Po odświeżeniu strony frontend może uzyskać nowy access token przez refresh endpoint, o ile refresh token nie wygasł ani nie został unieważniony.
  - **AC-010:** Refresh endpoint odrzuca żądanie bez prawidłowej ochrony CSRF lub z niezaufanego originu; access JWT wygasa nie później niż po 10 minutach, a refresh JWT nie później niż po 7 dniach.
- **FR-005:** Backend wymaga uwierzytelnienia dla prywatnych operacji i sprawdza właściciela zasobu.
  - **AC-008:** Użytkownik A nie może odczytać ani zmienić prywatnego zasobu użytkownika B przez zmianę identyfikatora zasobu w żądaniu.
  - **AC-009:** Żądanie bez ważnego access JWT do chronionej operacji jest odrzucane i nie zmienia danych.

### Wymagania jakościowe

| ID | Atrybut | Scenariusz i cel | Weryfikacja |
| --- | --- | --- | --- |
| QR-001 | Bezpieczeństwo | Hasła nie są przechowywane ani logowane w postaci jawnej; w bazie znajduje się wyłącznie wynik bezpiecznego, adaptacyjnego haszowania. | Test sprawdzający zapis użytkownika i przegląd konfiguracji haszowania |
| QR-002 | Bezpieczeństwo | Access JWT jest przechowywany wyłącznie w pamięci frontendu; refresh JWT jest ustawiony jako `HttpOnly`, `Secure` w produkcji i `SameSite=Lax`; tokeny wygasają i są rotowane według polityki. | Test odpowiedzi HTTP, atrybutów cookie, wygaśnięcia, rotacji i ponownego użycia refresh tokenu |
| QR-003 | Prywatność | Logi aplikacji nie zawierają haseł, access/refresh tokenów ani sekretu podpisującego. | Przegląd logowania i test logów dla ścieżek rejestracji/logowania/odświeżania |
| QR-004 | Bezpieczeństwo | Powtarzane próby logowania są ograniczane mechanizmem dobranym do wdrożenia, aby utrudnić zgadywanie haseł bez trwałego blokowania konta przez osobę trzecią. | Test zachowania limitu i przegląd konfiguracji; wartości limitów do ustalenia przed wdrożeniem publicznym |
| QR-005 | Dostępność | Formularze rejestracji i logowania mają etykiety powiązane z polami, komunikaty błędów dostępne dla czytników ekranu i obsługę klawiaturą. | Ręczny test klawiaturą i kontrola dostępności formularzy |

## 6. Dane i informacje

- **Dane tworzone:** identyfikator użytkownika, znormalizowany adres e-mail, wynik haszowania hasła, znaczniki utworzenia/zmiany konta oraz minimalne metadane refresh tokenów potrzebne do rotacji i unieważniania (np. identyfikator `jti`, użytkownik, termin ważności i status). Weryfikacja adresu e-mail nie jest częścią prototypu.
- **Źródło prawdy i właściciel:** backend oraz jego baza danych; właścicielem konta jest użytkownik.
- **Dane osobowe i wrażliwość:** adres e-mail jest daną pozwalającą zidentyfikować lub skontaktować się z użytkownikiem. Hasła, tokeny JWT, ich identyfikatory i klucz podpisujący są danymi uwierzytelniającymi i wymagają ochrony.
- **Walidacja i spójność:** normalizacja e-maila musi być jednakowa w rejestracji i logowaniu; unikalność musi być egzekwowana również przez bazę danych, nie tylko przez wcześniejsze sprawdzenie w aplikacji.
- **Hasła:** nie przechowywać w postaci jawnej ani odwracalnie zaszyfrowanej. Użyć mechanizmu haszowania haseł Django; politykę długości i konfigurację algorytmu potwierdzić przy implementacji.
- **Retencja i usuwanie:** access token proponowany na 10 minut, refresh token na 7 dni; wartości należy skonfigurować i potwierdzić przy implementacji. Metadane unieważnionych/wygasłych refresh tokenów należy usuwać według ustalonej polityki retencji.

## 7. Zależności i interfejsy

| Zależność | Typ | Właściciel/źródło | Ograniczenie | Potrzebne do | Status | Skutek braku |
| --- | --- | --- | --- | --- | --- | --- |
| PostgreSQL | Decyzja techniczna | Projekt | Rekomendowana relacyjna baza danych; Docker Compose zalecany lokalnie, lecz nie jest wymagany przez PostgreSQL | Konta, tokeny i dane aplikacji | Rekomendowane, do potwierdzenia | Wymaga konfiguracji środowiska i migracji |
| Django i podejście do API | Decyzja techniczna | Projekt | Django wybrane; Django REST Framework rekomendowany, ale niezatwierdzony | Implementacja endpointów JWT | Django wybrane, DRF otwarte | Kontrakty API wymagają decyzji |
| JWT i biblioteka | Decyzja techniczna | Projekt | Access JWT jako Bearer; rotowany refresh JWT w ciasteczku `HttpOnly`; biblioteka do wyboru | Uwierzytelnianie i autoryzacja | JWT wybrane, biblioteka otwarta | Wymaga bezpiecznej implementacji rotacji i unieważniania |
| Frontend React/TypeScript | Downstream | Projekt | Access token w pamięci; refresh cookie wymaga ochrony CSRF i zgodnej konfiguracji origin/CORS | Rejestracja/logowanie | Potwierdzone na poziomie projektu | Bez integracji użytkownik nie może korzystać z przepływu w UI |

- **Rekomendowany kontrakt API:** osobne operacje rejestracji, logowania, odświeżenia tokenów, wylogowania i pobrania bieżącego użytkownika. Szczegóły ścieżek i payloadów ustalić przy wyborze podejścia do API dla Django.
- **Tokeny:** access JWT wysyłany w nagłówku `Authorization: Bearer`; refresh JWT przekazywany wyłącznie w ciasteczku `HttpOnly`, `Secure` w produkcji, `SameSite=Lax`, z rotacją i unieważnianiem po stronie backendu. Nie przechowywać tokenów w `localStorage` ani `sessionStorage`. Ponieważ cookie jest wysyłane automatycznie, endpointy refresh/logout wymagają ochrony CSRF i kontroli origin.
- **Klucz podpisujący:** sekret z konfiguracji środowiska/menedżera sekretów, niezależny od danych klienta i niewłączany do repozytorium. Token zawiera tylko niezbędne claims: identyfikator użytkownika, issuer, audience, typ tokenu, `jti` i terminy `iat`/`exp`.
- **Kompatybilność:** brak istniejących klientów i danych potwierdzonych w dokumentacji; migracja istniejących użytkowników nie jest obecnie zakładana.

## 8. Architektura i projekt

- **Komponenty:** frontend React/TypeScript zbiera dane, trzyma access token w pamięci i wysyła go jako Bearer; backend Django waliduje dane, weryfikuje hasło i JWT oraz egzekwuje dostęp; PostgreSQL przechowuje konto i metadane refresh tokenów.
- **Granice zaufania:** przeglądarka i żądania sieciowe są niezaufane; backend jest jedynym miejscem podejmującym decyzje o uwierzytelnieniu i uprawnieniach. Frontend nie może sam przyznawać dostępu.
- **Przepływ logowania:** formularz wysyła e-mail i hasło przez HTTPS; backend weryfikuje dane, zwraca krótko żyjący access JWT i ustawia refresh JWT w ciasteczku; frontend trzyma access token w pamięci i dołącza go do żądań API. Po odświeżeniu strony frontend używa refresh endpointu, by uzyskać nowy access token.
- **Zmiany danych:** konto i stan rotacji/unieważnienia refresh tokenów są przechowywane w PostgreSQL; każdy prywatny przepis i każda lista należą do jednego identyfikatora użytkownika. Współdzielenie nie jest obsługiwane.
- **Decyzje:** e-mail + hasło, JWT access/refresh, access token w pamięci, refresh token w `HttpOnly` cookie; brak OAuth i MFA w pierwszej wersji.
- **Operacje:** produkcyjne endpointy uwierzytelniania muszą być dostępne wyłącznie przez HTTPS. Ograniczyć CORS do zaufanych originów; chronić refresh/logout przed CSRF; klucz podpisujący i konfiguracja bazy pochodzą z sekretów środowiska. Docker Compose jest rekomendowany dla lokalnego PostgreSQL, nie jest wymagany na produkcji.

## 9. Bezpieczeństwo, prywatność i nadużycia

- **Zasoby:** hasła, klucz podpisujący, access/refresh JWT, metadane odświeżania, adresy e-mail oraz prywatne przepisy i listy.
- **Kontrola dostępu:** backend weryfikuje podpis, issuer, audience, typ i termin ważności access JWT oraz uprawnienia do konkretnego zasobu przy każdym żądaniu; sam identyfikator zasobu ani claims z niezaufanego tokenu nie zastępują kontroli właściciela.
- **Zagrożenia:** zgadywanie haseł, kradzież lub replay tokenu, niewłaściwa walidacja claims, enumeracja kont, CSRF na endpointach używających refresh cookie, XSS kradnący access token z pamięci oraz dostęp do danych innego użytkownika.
- **Ograniczenia:** haszowanie haseł mechanizmem Django, neutralne błędy logowania, limity prób, krótki czas życia access JWT, rotacja i unieważnianie refresh JWT, access token wyłącznie w pamięci, cookie `HttpOnly`/`Secure`/`SameSite`, ochrona CSRF i origin dla endpointów cookie. Nie logować haseł, tokenów ani sekretu podpisującego.
- **Weryfikacja:** kryteria AC-005, AC-006, AC-008, AC-009 oraz QR-001–QR-004; szczegóły ochrony CSRF i limity prób potwierdzić po wyborze podejścia do API i wdrożenia.

## Compliance Review

To jest wstępna ocena zakresu, nie porada prawna ani potwierdzenie zgodności.

| Źródło/obowiązek i wersja | Czy dotyczy? | Uzasadnienie i zakres | Wymagania | Dowód/weryfikacja | Właściciel | Status/luka |
| --- | --- | --- | --- | --- | --- | --- |
| Wymogi ochrony danych osobowych, w tym GDPR/RODO; aktualna wersja i zakres do weryfikacji | Nieustalone | Aplikacja przetwarza co najmniej adres e-mail; jurysdykcja, użytkownicy, hosting i zakres przetwarzania nie są znane | FR-001, QR-003 | Inwentaryzacja danych, przepływów, retencji i konfiguracji wdrożenia; przegląd przez właściwą osobę | Właściciel produktu/projektu | Nie oceniono; nie formułować deklaracji zgodności |
| OWASP ASVS 5.0.0, jako źródło kontroli technicznych | Referencja, nie ustalono obowiązku | Może pomóc w doborze testów dla uwierzytelniania; nie jest samo w sobie dowodem zgodności prawnej | FR-002–FR-005, QR-001–QR-004 | Przegląd wymagań bezpieczeństwa względem aktualnego wydania i zakresu aplikacji | Osoba techniczna | Do przeglądu przed wdrożeniem publicznym |

- **Jurysdykcje i wdrożenie:** nieustalone; wymagają decyzji przed oceną zastosowania przepisów.
- **Pytania do przeglądu:** gdzie aplikacja będzie hostowana, kto będzie jej użytkownikiem i czy będzie zbierać informacje o alergiach/dietach lub inne dane mogące ujawniać informacje o zdrowiu.
- **Ryzyko nierozstrzygnięte:** brak ustalonej retencji, usuwania kont i lokalizacji danych; wpływ na publiczne wdrożenie wymaga oceny przed uruchomieniem.

## 11. Wdrożenie i operacje

### Fazy wdrożenia

| Faza | Zakres i rezultat | Zależności | Kryteria zakończenia i weryfikacja |
| --- | --- | --- | --- |
| 1. Decyzje i fundamenty | Skonfigurować Django, PostgreSQL (jeśli wybór zostanie potwierdzony), migracje, haszowanie haseł i sekret podpisujący; ustalić bibliotekę JWT oraz czasy życia tokenów. | Decyzja o bazie, podejściu do API i środowisku. | Migracje/model są gotowe, e-mail jest unikalny bez względu na wielkość liter, a polityka tokenów i sekretów jest zapisana; przegląd schematu i konfiguracji. |
| 2. API uwierzytelniania | Zaimplementować rejestrację, logowanie, wydawanie/rotację JWT, wylogowanie, odczyt bieżącego użytkownika i kontrolę dostępu. | Faza 1. | Testy backendu pokrywają AC-001–AC-009, w tym błędy neutralne, replay refresh tokenu i izolację właściciela. |
| 3. Formularze i integracja UI | Dodać formularze rejestracji i logowania, przechowywanie access tokenu w pamięci, odświeżanie po restarcie strony i wylogowanie. | API z fazy 2; ustalone domeny, CORS, CSRF i ciasteczka. | Ręczne testy przepływu UI przechodzą; formularze są dostępne z klawiaturą, a tokeny nie trafiają do trwałego storage. |
| 4. Utwardzenie i gotowość środowiska | Zweryfikować HTTPS, flagi ciasteczek, CSRF/origin, rotację i unieważnianie refresh tokenów, ograniczanie prób oraz logowanie. | Fazy 1–3; decyzja o docelowym środowisku. | QR-001–QR-004 są sprawdzone; przegląd bezpieczeństwa nie wykazuje otwartych blokad dla prywatnego prototypu. |

- **Wdrożenie/migracja:** brak istniejących kont według dostępnego kontekstu. PostgreSQL jest rekomendowany; Compose może uruchamiać bazę lokalnie, a produkcja powinna używać zarządzanej/usługowej bazy lub kontrolowanego wdrożenia. Migracje wykonuje Django.
- **Monitoring:** rejestrować zagregowane niepowodzenia logowania i błędy wysyłki e-maila, jeśli taka funkcja powstanie; nie zapisywać haseł, identyfikatorów tokenów ani tokenów.
- **Obsługa błędów i odzyskiwanie:** awaria bazy nie może skutkować wydaniem tokenu bez prawidłowego uwierzytelnienia; backend musi móc unieważnić refresh tokeny po incydencie. Access JWT pozostają ważne najwyżej do krótkiego terminu wygaśnięcia.

## 12. Weryfikacja i śledzenie

| Wymaganie/AC | Metoda weryfikacji | Test lub dowód | Status |
| --- | --- | --- | --- |
| FR-001, AC-001–AC-003 | Testy backendu rejestracji | Do utworzenia po przygotowaniu aplikacji Django | Planowane |
| FR-002, AC-004–AC-005 | Testy backendu logowania i błędnych danych | Do utworzenia | Planowane |
| FR-003, AC-006 | Test integracyjny rotacji, ponownego użycia i unieważnienia refresh tokenu | Do utworzenia | Planowane |
| FR-004, AC-007 | Test endpointu bieżącego użytkownika i odświeżenia UI | Do utworzenia | Planowane |
| FR-005, AC-008–AC-009 | Testy autoryzacji dla właściciela, innego użytkownika i braku/niepoprawnego JWT | Do utworzenia | Planowane |
| QR-001–QR-004 | Testy bezpieczeństwa i przegląd konfiguracji | Do ustalenia z frameworkiem i wdrożeniem | Planowane |
| QR-005 | Ręczny test dostępności formularzy | Do utworzenia po implementacji UI | Planowane |

## 13. Ryzyka, założenia i decyzje

### Ryzyka

| Ryzyko | Prawdopodobieństwo/wpływ | Ograniczenie lub potrzebna decyzja | Właściciel |
| --- | --- | --- | --- |
| Współdzielenie list lub przepisów zostanie dodane po wdrożeniu modelu wyłącznie prywatnego | Średnie / średni | Model prywatny jest przyjęty dla prototypu; współdzielenie wymaga osobnej specyfikacji kontroli dostępu | Właściciel projektu |
| Brak odzyskiwania konta utrudni użytkownikom dostęp po utracie hasła | Średnie / średni | Ograniczenie zaakceptowane dla prywatnego prototypu; utrata hasła wymaga ręcznej pomocy lub ponownego utworzenia konta. Dodać samodzielny reset przed udostępnieniem publicznym. | Właściciel projektu |
| Szczegóły domen, HTTPS, CORS i ciasteczek zostaną ustalone dopiero przy wdrożeniu | Średnie / wysoki | Ustalić środowisko wdrożenia przed testami end-to-end i publicznym uruchomieniem | Osoba techniczna |

### Założenia

- Pierwszym klientem będzie aplikacja webowa React/TypeScript, a API będzie obsługiwane przez backend Django.
- Konto jest indywidualne; logowanie społecznościowe i MFA nie są potrzebne w pierwszym etapie.
- Aplikacja nie ma jeszcze użytkowników ani istniejących kont wymagających migracji.
- Dane są prywatne i przypisane do jednego konta; prototyp nie udostępnia funkcji współdzielenia.
- Rejestracja nie wymaga potwierdzenia e-maila. Prototyp nie wysyła poczty transakcyjnej i nie oferuje resetu hasła.
- Zmiana prototypu w usługę publiczną wymaga ponownego przeglądu bezpieczeństwa, prywatności, odzyskiwania kont i wymagań prawnych.

### Decyzje implementacyjne

- Django i JWT są wybrane. Implementacja powinna korzystać ze sprawdzonych mechanizmów Django oraz biblioteki JWT; PostgreSQL jest rekomendowany, a Docker Compose do lokalnego uruchomienia bazy opcjonalny. Baza i podejście do API pozostają do potwierdzenia.
- Jurysdykcja i miejsce hostingu nie są określone; ocena zastosowania wymagań prawnych pozostaje nieustalona do czasu decyzji o wdrożeniu.

## 14. Przegląd i akceptacja

- **Przegląd produktu/domeny:** Założenia produktowe dla prywatnego prototypu ustalone.
- **Przegląd techniczny:** Oczekuje na wybór backendu, bazy danych i środowiska wdrożenia.
- **Przegląd bezpieczeństwa/prywatności/compliance:** Do wykonania przed wdrożeniem publicznym; zakres zależy od danych i jurysdykcji.
- **Decyzja i data:** Brak; dokument pozostaje szkicem.
