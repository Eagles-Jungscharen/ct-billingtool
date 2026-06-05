# GitHub Copilot Instructions for ct-billingtool

Diese Anweisungen gelten für das gesamte Repository.

## Repository-Kontext

- Monorepo mit npm Workspaces unter `packages/*`.
- Primäre Arbeitsbereiche:
  - `packages/frontend` (React + TypeScript + Vite)
  - `packages/backend` (.NET 10 Azure Functions)
  - `packages/shared` (gemeinsame TypeScript-Typen)
- Änderungen für das Monorepo grundsätzlich in `packages/*` umsetzen. Standalone-Verzeichnisse nur bearbeiten, wenn explizit angefragt.

## Sprachkonventionen

- **Code-Sprache**: Englisch
  - Verwende englische Bezeichner für Klassen, Methoden, Funktionen, Variablen, Typen, Properties, Felder und Konstanten.
  - Verwende englische Namen für Dateien, Ordner, API-Routen, DTOs und Datenbankfelder.

- **Kommentare im Code**: Deutsch
  - Inline-Kommentare (`//`) sind auf Deutsch zu verfassen.
  - Wenn XML-Dokumentationskommentare oder Blockkommentare nötig sind, ebenfalls auf Deutsch.
  - Kommentare sollen kurz, präzise und fachlich korrekt sein.

- **Fehlermeldungen in API-Antworten**: Deutsch
  - Das Feld `error` in JSON-Antworten enthält deutsche Fehlermeldungen.
  - Formuliere Meldungen verständlich und nutzerorientiert.
  - Technische Details nur dann ergänzen, wenn sie für Diagnose oder Support notwendig sind.
  - Für bestehende Kompatibilität darf `message` zusätzlich gesetzt werden, dann mit identischem Inhalt wie `error`.

## Monorepo- und Architekturregeln

- **Typ-Quelle der Wahrheit**:
  - DTOs und Request-Typen werden aus dem Backend in `packages/shared/src/generated/dtos.ts` generiert.
  - Keine manuelle Bearbeitung von `packages/shared/src/generated/dtos.ts`.
  - Frontend-Typimporte bevorzugt über `@ct-billingtool/shared`.

- **Build-Reihenfolge beachten**:
  - Bei Änderungen an Backend-DTOs zuerst Typen generieren und Shared bauen.
  - Relevante Befehle:
    - `npm run build:shared`
    - `npm run build:frontend`
    - `npm run build:backend`
    - `npm run build:all` (führt alles in korrekter Reihenfolge aus)

- **Backend-Projektstruktur respektieren**:
  - Hilfstools unter `packages/backend/Tools` nicht als Azure-Functions-Code kompilieren.
  - Die bestehende Exclude-Regel für `Tools/**/*.cs` in der csproj beibehalten.

- **API-Kontrakte stabil halten**:
  - Bestehende DTO-Feldnamen und Statuswerte nur mit guter Begründung ändern.
  - Bei Kontraktänderungen immer Shared-Typen und betroffene Frontend-Verwendung mitziehen.

- **Security- und Auth-Kontext beachten**:
  - API-Endpunkte standardmäßig mit JWT-Validierung und Benutzerkontext umsetzen.
  - Admin-Operationen klar von normalen Benutzeroperationen trennen.

## Arbeitsweise für Änderungen

- Änderungen so klein wie möglich und innerhalb des betroffenen Packages halten.
- Bei Cross-Package-Änderungen immer beide Seiten anpassen (Backend + Shared, ggf. Frontend).
- Vor Abschluss mindestens den relevanten Build/Lint ausführen.
- Bei Dokumentationsabweichungen (`docs/API.md`, `docs/ARCHITECTURE.md`, `README.md`) die Doku mit aktualisieren.

## Beispiele

- ✅ Korrekt:
  - Variablenname: `invoiceNumber`
  - Kommentar: `// Prüft, ob die Rechnung bereits bezahlt wurde`
  - JSON-Fehler: `{ "error": "Rechnung wurde nicht gefunden." }`
  - Kompatibler JSON-Fehler: `{ "error": "Rechnung wurde nicht gefunden.", "message": "Rechnung wurde nicht gefunden." }`

- ❌ Nicht korrekt:
  - Variablenname: `rechnungsNummer`
  - Kommentar: `// Checks whether invoice is paid`
  - JSON-Fehler: `{ "error": "Invoice not found." }`
  - Direkter Frontend-Import aus lokaler Typkopie statt `@ct-billingtool/shared`

## Priorität bei Konflikten

Wenn bestehender Code von diesen Regeln abweicht, orientiere neue Änderungen an diesen Konventionen und vereinheitliche betroffene Stellen bei Gelegenheit.