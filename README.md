<p align="center">
  <img src="src-tauri/icons/128x128@2x.png" width="128" height="128" alt="Excalidraw Desktop Logo" />
</p>

<h1 align="center">Excalidraw Desktop</h1>

<p align="center">
  A lightweight, native desktop app for <a href="https://excalidraw.com">Excalidraw</a> — the open-source virtual whiteboard for sketching hand-drawn like diagrams.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-5B53FF?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-888?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## Features

- **Full Excalidraw canvas** — all shapes, tools, colors, and infinite canvas you love
- **Native file operations** — Save (`Ctrl+S`) and Open (`Ctrl+O`) `.excalidraw` files via native OS dialogs
- **OS menu bar** — File menu with Save, Open, and Quit for discoverability
- **Custom main menu** — in-app menu with export, theme toggle, canvas background, and more
- **Cross-platform** — builds to `.msi` (Windows), `.dmg` (macOS), `.AppImage` / `.deb` (Linux)
- **Lightweight** — Tauri keeps the binary small with no bundled browser engine bloat

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

### Install & Run

```bash
# Clone the repo
git clone https://github.com/hasnain7abbas/excalidraw-desktop.git
cd excalidraw-desktop

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle/`.

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Shell | **Tauri 2** (Rust) | Windowing, IPC, native filesystem, menus |
| Frontend | **React 19 + TypeScript** | UI host for Excalidraw |
| Bundler | **Vite 7** | Dev server, HMR, production builds |
| Canvas | **@excalidraw/excalidraw** | Infinite-canvas drawing engine |
| Persistence | **Tauri FS + Dialog plugins** | Save / open `.excalidraw` JSON files |

## Project Structure

```
excalidraw-desktop/
├── src/
│   ├── lib/
│   │   └── fileOps.ts          # Save / Open logic
│   ├── App.tsx                 # Root component + Excalidraw canvas
│   ├── index.css               # Global CSS reset
│   └── main.tsx                # React entry point
├── src-tauri/
│   ├── capabilities/
│   │   └── default.json        # FS & Dialog permissions
│   ├── icons/                  # App icons (all sizes)
│   ├── src/
│   │   ├── lib.rs              # Rust entry — plugins, native menu
│   │   └── main.rs             # Binary entry point
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Window & app config
├── public/
│   └── app-icon.svg            # In-app icon
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save to disk |
| `Ctrl+O` / `Cmd+O` | Open from disk |

## Author

**Hasnain Abbas**

- GitHub: [@hasnain7abbas](https://github.com/hasnain7abbas)
- Email: hasnainqau5112@gmail.com

## License

This project is open source and available under the [MIT License](LICENSE).
