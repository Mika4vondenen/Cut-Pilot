# CutPilot (autocut-studio) 0.1.0

Electron-Desktop-App für automatische Skripterstellung und Videoschnitt für Faceless Content
(YouTube Long- & Shortform).

## ⚠️ Herkunft dieses Repos

Der Inhalt stammt aus dem Windows-Build `CutPilot-0.1.0-win-x64.zip`, genauer aus dem darin
enthaltenen `resources/app.asar`. **Das ist kein Original-Quellcode**, sondern der gebündelte
Build-Output (electron-vite / esbuild):

| Datei | Zustand |
|---|---|
| `out/main/index.js` | Main-Prozess, gebündelt aber gut lesbar (~1.700 Zeilen) |
| `out/preload/index.js` | Preload-Bridge, lesbar |
| `out/renderer/assets/index-*.js` | Renderer (React), **minifiziert** |
| `out/renderer/assets/index-*.css` | Renderer-Styles, minifiziert |
| `out/renderer/index.html` | Entry-HTML |

Die ursprünglichen TypeScript-/React-Quellen (`src/`), die Build-Config (`electron.vite.config.ts`,
`tsconfig.json`, `electron-builder.yml`) und die Sourcemaps sind im ZIP **nicht enthalten** und
lassen sich daraus auch nicht rekonstruieren. Wer weiterentwickeln will, braucht das Original-Projekt.

Nicht mit eingecheckt: `node_modules/` (siehe `dependencies` in `package.json`) sowie die
mitgelieferten Binaries (Electron-Runtime, `ffmpeg`/`ffprobe` aus `ffmpeg-static` /
`ffprobe-static`, ~270 MB).

## Stack

- Electron (Main / Preload / Renderer)
- Claude Code CLI (Abo) **oder** `@anthropic-ai/sdk` (API-Key) — Skriptgenerierung, Default-Modell `claude-opus-5`
- `openai` — zusätzlicher Provider
- `zod` — Schema-Validierung
- `ffmpeg-static` / `ffprobe-static` — Rendering & Medienanalyse

## Funktionsumfang (aus den IPC-Kanälen im Main-Prozess)

- **Settings** — Anthropic-/OpenAI-API-Key, Skript-Modell, Output-Verzeichnis
- **Nischen & Projekte** — anlegen, speichern, löschen
- **Skriptgenerierung** (`script:generate`)
- **Materialauswahl** (`material:pick`) und **Stilanalyse** (`style:analyze`)
- **Rendering** (`render:start` / `render:cancel` / `render:progress`) inkl. Untertitel-Styling
  (Font, Größe, Primär-/Highlight-Farbe, Uppercase)
- **Accounts, Snapshots, Tracking, Optimierungen, Knowledge Base** — jeweils list/save/delete

API-Keys werden zur Laufzeit in den Settings gehalten; im Build sind keine Keys hinterlegt (geprüft).

## Skriptgenerierung über das Claude-Abo statt über API-Credits

`generateScript` wählt den Weg automatisch anhand des Anthropic-API-Keys in den Einstellungen:

| Key-Feld in den Settings | Weg | Abrechnung |
|---|---|---|
| **leer** (Default) | ruft die lokal installierte **Claude Code CLI** auf | läuft über dein Claude-Abo |
| gefüllt | `@anthropic-ai/sdk` → Anthropic-API | API-Credits |

Der Abo-Weg spawnt `claude -p --output-format json --model <modell> --system-prompt <…> --strict-mcp-config --disallowed-tools <…>`,
schickt den Prompt über **stdin** (kein `shell: true`, keine Injection-Fläche) und liest das `result`-Feld aus der JSON-Antwort.
Das Abschalten der Tools ist nicht kosmetisch: es senkt den Overhead pro Aufruf von ~30.500 auf ~3.900 Tokens,
weil die kompletten Tool-Definitionen sonst in jedem Request mitgeschickt werden.

Voraussetzung: Claude Code ist installiert und per `claude login` mit dem Abo angemeldet.
Die Binary wird in dieser Reihenfolge gesucht: `CUTPILOT_CLAUDE_BIN` (Env-Override) →
`%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe` → `~/.local/bin/claude[.exe]` →
`/opt/homebrew/bin/claude` → `/usr/local/bin/claude` → `claude` auf dem PATH.

**Was das Abo nicht abdeckt:** die Voiceover-Transkription (`transcribeWithWhisper`) läuft über OpenAI Whisper
und braucht weiterhin einen eigenen OpenAI-API-Key. Claude kann kein Audio transkribieren.

Getestet gegen Claude Code 2.1.220: schema-valides Skript-JSON, ~19 s pro Generierung.

## Start

```bash
npm install
npx electron .
```

`main` zeigt auf `./out/main/index.js`.
