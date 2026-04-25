<p align="center">
  <img src="./roznomcha-dark.png" alt="Roznamcha" width="460" />
</p>

<p align="left">
  <img alt="Version" src="https://img.shields.io/badge/version-v0.2.0--alpha-6a5acd" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Electron-2f3241" />
  <img alt="Language" src="https://img.shields.io/badge/language-TypeScript-1f6feb" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-2e8b57" />
</p>

Roznamcha is a polished cross-platform desktop journal app built with Electron, React, and TypeScript. It combines fast local persistence, rich writing tools, configurable themes, and strong encryption.

## ✨ Highlights

- 📅 Calendar-first navigation with date-based entries
- 📝 Rich editor with headings, lists, quotes, links, tables, code blocks, and markdown workflows
- 🔐 Per-entry and global journal encryption using AES-256-GCM + PBKDF2
- 🎨 Extensive theming (muted, dark, pastel, neon, high contrast, gothic/crimson, sapphire, amethyst, metallic, and more)
- ⚙️ Settings for fonts, auto-save, backup, theme customization, security options, and LLM provider configuration
- 🔎 Search across titles, tags, and unlocked content
- 📦 Import markdown and export entries to Markdown, HTML, or PDF
- ⌨️ Keyboard shortcuts for fast writing workflows
- ℹ️ Clickable app logo opens an About modal with version, license, and repository metadata
- 🤖 Integrated LLM assistant drawer with markdown-rendered responses inserted directly into the active entry

## 🤖 LLM Assistant

Roznamcha includes an in-editor LLM interface that slides up from the bottom of the editor pane, matching the same visual language as the rest of the app.

### Supported Providers

- Ollama (`/api/chat`)
- OpenAI API-compatible servers (`/v1/chat/completions`)

### LLM Settings

Configure these options in Settings:

- Provider
- Base URL
- Model
- Context window size
- API key (for OpenAI-compatible services)

### Editor Behavior

- The LLM drawer is opened from the toolbar button beside Markdown.
- Raw Markdown and LLM drawers are mutually exclusive (opening one closes the other).
- LLM responses are parsed as markdown and inserted into the current entry as rendered rich text.

## 🧱 Tech Stack

- Electron + electron-vite
- React + TypeScript
- Zustand state management
- SQLite via better-sqlite3
- TipTap rich text editor
- Tailwind + custom CSS variables

## 🏗️ Architecture

### Process Layers

- Main process
  - SQLite setup, migrations, and persistence services
  - Encryption/key derivation services
  - File operations (import/export/backup)
  - IPC handlers for renderer interactions
- Preload process
  - Strongly typed `contextBridge` APIs for secure renderer access
- Renderer process
  - UI composition, UX logic, theme application
  - Zustand store for app state and async flows

### Core Modules

- `src/shared/models.ts`
- `src/main/services/database.ts`
- `src/main/services/crypto.ts`
- `src/main/services/journal-service.ts`
- `src/main/ipc/journal-ipc.ts`
- `src/preload/index.ts`
- `src/renderer/src/store/journal-store.ts`

## 🚀 Development

### Install

```bash
npm install
```

### Run (Development)

```bash
npm run dev
```

### Typecheck and Tests

```bash
npm run typecheck
npm run test
```

### Build

```bash
npm run build
```

### Package Desktop Binaries

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 🔒 Security Notes

- Passwords are never stored in plaintext.
- Global password verification uses PBKDF2-derived checks.
- Entry and global encryption use authenticated AES-256-GCM.
- Decrypted content is kept in session memory only while unlocked.

## 🧪 Current Test Coverage

- Encryption/decryption behavior
- Password verifier checks
- SQLite schema and persistence basics

Test files:

- `src/main/services/crypto.test.ts`
- `src/main/services/database.test.ts`

## 🔗 Repository

- https://github.com/jeddhor/Roznamcha

## 📜 License

MIT. See `LICENSE` for details.
