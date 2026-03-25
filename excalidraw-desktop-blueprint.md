# Excalidraw Desktop — Tauri Architecture Blueprint

> **Goal:** Ship a native desktop whiteboard app wrapping [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) via Tauri 2 (Rust backend · React 18 + TypeScript + Vite frontend).

---

## How to Use This Blueprint

| Symbol | Meaning |
|--------|---------|
| 🔒 | Hard requirement — skip it and the build breaks |
| ⚠️ | Common pitfall — most first attempts fail here |
| ✅ | Verification gate — confirm before moving on |

**Rule:** Complete one phase, hit the ✅ gate, and wait for confirmation before starting the next.

---

## Tech Stack at a Glance

| Layer | Technology | Role |
|-------|-----------|------|
| Shell | **Tauri 2** (Rust) | Windowing, IPC, native filesystem, menus |
| Frontend | **React 18 + TypeScript** | UI host for Excalidraw |
| Bundler | **Vite 5** | Dev server, HMR, production builds |
| Canvas | **@excalidraw/excalidraw** | Infinite-canvas drawing engine |
| Persistence | **Tauri FS + Dialog plugins** | Save / open `.excalidraw` JSON files |

---

## Phase 1 — Project Scaffolding

### 1.1 Create the Tauri App

```bash
npm create tauri-app@latest excalidraw-desktop -- \
  --template react-ts          # React + TypeScript + Vite
cd excalidraw-desktop
```

### 1.2 Install Dependencies

```bash
npm install
npm install @excalidraw/excalidraw
```

### 1.3 Add Tauri Plugins (for Phase 3)

```bash
# Inside the project root
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
```

Register them in `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-dialog = "2"
tauri-plugin-fs     = "2"
```

And in `src-tauri/src/lib.rs` (or `main.rs`):

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 1.4 Verify `tauri.conf.json` Window Defaults

```jsonc
// src-tauri/tauri.conf.json  (relevant excerpt)
{
  "app": {
    "windows": [
      {
        "title": "Excalidraw Desktop",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

### ✅ Gate 1 — Scaffold Healthy

```bash
npm run tauri dev
```

A blank Tauri window opens with the default Vite + React boilerplate. Close it and continue.

---

## Phase 2 — Excalidraw UI Integration

### 2.1 Nuke the Boilerplate

Delete everything inside `src/App.tsx` and `src/App.css`. Clear `src/index.css` as well.

### 2.2 Global CSS Reset

```css
/* src/index.css */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}
```

> 🔒 `overflow: hidden` is mandatory — without it the Excalidraw canvas will produce a second scrollbar on some OS/DPI combos.

### 2.3 Render the Canvas

```tsx
// src/App.tsx
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  AppState,
} from "@excalidraw/excalidraw/types";
import { useRef, useCallback } from "react";

export default function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], state: AppState) => {
      // Will wire up autosave in Phase 3
    },
    []
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        ref={(api) => { apiRef.current = api; }}
        onChange={handleChange}
      />
    </div>
  );
}
```

### 2.4 Fix Vite Config for Excalidraw Assets

⚠️ Excalidraw bundles fonts and locales as static assets. Vite needs to know about them:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
});
```

> ⚠️ The `process.env.IS_PREACT` define is required — Excalidraw's internals check this flag and Vite won't polyfill it automatically.

### ✅ Gate 2 — Canvas Renders

```bash
npm run tauri dev
```

A full-screen Excalidraw canvas fills the window with the toolbar, color picker, and shape tools all functional. No scrollbars, no overflow, no console errors.

---

## Phase 3 — Native File Operations (Save / Open)

### 3.1 Configure FS & Dialog Permissions

Tauri 2 uses a granular permissions model. Update `src-tauri/capabilities/default.json`:

```jsonc
{
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write"
  ]
}
```

### 3.2 File Service (Frontend)

Create a dedicated module that encapsulates all file I/O:

```ts
// src/lib/fileOps.ts
import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type {
  ExcalidrawElement,
  AppState,
} from "@excalidraw/excalidraw/types";

export interface ExcalidrawFile {
  type: "excalidraw";
  version: 2;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
}

const FILTER = {
  name: "Excalidraw",
  extensions: ["excalidraw", "json"],
};

/**
 * Serialize canvas state to the `.excalidraw` JSON format.
 */
function serialize(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>
): string {
  const file: ExcalidrawFile = {
    type: "excalidraw",
    version: 2,
    elements,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor ?? "#ffffff",
      gridSize: appState.gridSize ?? null,
    },
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Save current canvas to disk. Returns the chosen path, or null if cancelled.
 */
export async function saveToDisk(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  currentPath?: string | null
): Promise<string | null> {
  const filePath =
    currentPath ??
    (await save({
      filters: [FILTER],
      defaultPath: "untitled.excalidraw",
    }));

  if (!filePath) return null;

  await writeTextFile(filePath, serialize(elements, appState));
  return filePath;
}

/**
 * Open a `.excalidraw` file from disk. Returns parsed data or null.
 */
export async function openFromDisk(): Promise<{
  path: string;
  data: ExcalidrawFile;
} | null> {
  const selected = await open({
    filters: [FILTER],
    multiple: false,
  });

  if (!selected) return null;

  const raw = await readTextFile(selected);
  const data: ExcalidrawFile = JSON.parse(raw);

  if (data.type !== "excalidraw") {
    throw new Error("Invalid file: missing 'type: excalidraw' field.");
  }

  return { path: selected, data };
}
```

### 3.3 Wire It Up in `App.tsx`

```tsx
// src/App.tsx
import { Excalidraw } from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  AppState,
} from "@excalidraw/excalidraw/types";
import { useRef, useState, useCallback, useEffect } from "react";
import { saveToDisk, openFromDisk } from "./lib/fileOps";

export default function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [title, setTitle] = useState("Excalidraw Desktop");

  // Track latest scene for save operations
  const sceneRef = useRef<{
    elements: readonly ExcalidrawElement[];
    appState: AppState;
  } | null>(null);

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], state: AppState) => {
      sceneRef.current = { elements, appState: state };
    },
    []
  );

  // ── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + S → Save
      if (mod && e.key === "s") {
        e.preventDefault();
        if (!sceneRef.current) return;
        const { elements, appState } = sceneRef.current;
        const path = await saveToDisk(elements, appState, filePath);
        if (path) {
          setFilePath(path);
          setTitle(path.split(/[\\/]/).pop() ?? "Excalidraw Desktop");
        }
      }

      // Ctrl/Cmd + O → Open
      if (mod && e.key === "o") {
        e.preventDefault();
        const result = await openFromDisk();
        if (result && apiRef.current) {
          apiRef.current.updateScene({
            elements: result.data.elements,
          });
          setFilePath(result.path);
          setTitle(
            result.path.split(/[\\/]/).pop() ?? "Excalidraw Desktop"
          );
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filePath]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        ref={(api) => { apiRef.current = api; }}
        onChange={handleChange}
        name={title}
      />
    </div>
  );
}
```

### ✅ Gate 3 — Full Save/Open Cycle

1. Draw something on the canvas.
2. Press `Ctrl+S` → native save dialog appears → save as `test.excalidraw`.
3. Close and reopen the app.
4. Press `Ctrl+O` → pick `test.excalidraw` → drawing is restored exactly.

---

## Phase 4 — Polish & Production Readiness (Optional)

Once the core loop works, layer in these improvements:

### 4.1 Native Menu Bar

Replace keyboard-only shortcuts with an OS-native menu using Tauri's `Menu` API in Rust:

```rust
use tauri::menu::{MenuBuilder, SubmenuBuilder};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let file_menu = SubmenuBuilder::new(app, "File")
                .text("save", "Save")
                .text("open", "Open")
                .separator()
                .quit()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "save" => { app.emit("menu-save", ()).ok(); }
                "open" => { app.emit("menu-open", ()).ok(); }
                _ => {}
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Listen for these events on the frontend with `listen("menu-save", ...)` from `@tauri-apps/api/event`.

### 4.2 Dirty-State Tracking & Unsaved Changes Prompt

Track a `dirty` flag that flips `true` on every `onChange` and resets on save. Hook into Tauri's `close-requested` window event to show a confirmation dialog before quitting with unsaved work.

### 4.3 Autosave

Debounce `onChange` (e.g. 3 seconds of inactivity) and silently write to `filePath` if one exists. Use a `.excalidraw.autosave` sidecar file for crash recovery on unnamed canvases.

### 4.4 Theming

Excalidraw supports `theme="dark"` as a prop. Detect the OS preference with `window.matchMedia("(prefers-color-scheme: dark)")` and pass it through:

```tsx
<Excalidraw theme={isDark ? "dark" : "light"} />
```

### 4.5 Build & Bundle

```bash
npm run tauri build
```

Produces platform-specific installers in `src-tauri/target/release/bundle/` (.dmg, .msi, .AppImage, .deb).

---

## Project Structure Reference

```
excalidraw-desktop/
├── src/
│   ├── lib/
│   │   └── fileOps.ts          # Save / Open logic
│   ├── App.tsx                  # Root component + Excalidraw
│   ├── index.css                # Global reset
│   └── main.tsx                 # React entry
├── src-tauri/
│   ├── capabilities/
│   │   └── default.json         # FS + Dialog permissions
│   ├── src/
│   │   └── lib.rs               # Rust entry, plugins, menu
│   ├── Cargo.toml               # Rust deps (tauri-plugin-*)
│   └── tauri.conf.json          # Window & app config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank white screen, no canvas | `process.env.IS_PREACT` not defined | Add the `define` block to `vite.config.ts` |
| Scrollbars appear around the canvas | Missing `overflow: hidden` on html/body | Apply the global CSS reset from §2.2 |
| Save dialog doesn't open | Missing FS/Dialog permissions | Check `capabilities/default.json` for the plugin permissions |
| Fonts look broken or missing | Excalidraw assets not served | Ensure Vite's public dir includes Excalidraw's bundled fonts |
| `Cannot find module @tauri-apps/plugin-*` | Plugins not installed | Run `npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs` |
| Build fails on `tauri-plugin-*` crate | Cargo.toml version mismatch | Pin plugin crate versions to match your Tauri 2.x minor version |
