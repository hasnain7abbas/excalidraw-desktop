import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawElement,
  AppState,
} from "@excalidraw/excalidraw/types";
import { useRef, useState, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { saveToDisk, openFromDisk } from "./lib/fileOps";

export default function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [title, setTitle] = useState("Excalidraw Desktop");
  const [showAbout, setShowAbout] = useState(false);

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

  // ── Shared save/open handlers ──────────────────────
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const handleSave = useCallback(async () => {
    if (!sceneRef.current) return;
    const { elements, appState } = sceneRef.current;
    const path = await saveToDisk(elements, appState, filePathRef.current);
    if (path) {
      setFilePath(path);
      setTitle(path.split(/[\\/]/).pop() ?? "Excalidraw Desktop");
    }
  }, []);

  const handleOpen = useCallback(async () => {
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
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      if (mod && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }

      if (e.key === "Escape") {
        setShowAbout(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, handleOpen]);

  // ── Native menu events from Tauri ─────────────────
  useEffect(() => {
    const unlistenSave = listen("menu-save", () => { handleSave(); });
    const unlistenOpen = listen("menu-open", () => { handleOpen(); });

    return () => {
      unlistenSave.then((f) => f());
      unlistenOpen.then((f) => f());
    };
  }, [handleSave, handleOpen]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw
        ref={(api) => { apiRef.current = api; }}
        onChange={handleChange}
        name={title}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Separator />
          <MainMenu.Item
            onSelect={() => setShowAbout(true)}
            icon={
              <img
                src="/app-icon.svg"
                alt=""
                style={{ width: 20, height: 20 }}
              />
            }
          >
            About
          </MainMenu.Item>
        </MainMenu>
      </Excalidraw>

      {/* About modal */}
      {showAbout && (
        <div
          onClick={() => setShowAbout(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 40px",
              maxWidth: 380,
              width: "90%",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              textAlign: "center",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <img
              src="/app-icon.svg"
              alt="Excalidraw Desktop"
              style={{ width: 72, height: 72, marginBottom: 16 }}
            />
            <h2 style={{ margin: "0 0 4px", fontSize: 20, color: "#1a1a2e" }}>
              Excalidraw Desktop
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#888" }}>
              v0.1.0
            </p>
            <div style={{ fontSize: 14, color: "#333", lineHeight: 1.8 }}>
              <p style={{ margin: 0 }}>
                Built by <strong>Hasnain Abbas</strong>
              </p>
              <p style={{ margin: 0 }}>
                <a
                  href="https://github.com/hasnain7abbas"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#5B53FF", textDecoration: "none" }}
                >
                  github.com/hasnain7abbas
                </a>
              </p>
              <p style={{ margin: 0 }}>
                <a
                  href="mailto:hasnainqau5112@gmail.com"
                  style={{ color: "#5B53FF", textDecoration: "none" }}
                >
                  hasnainqau5112@gmail.com
                </a>
              </p>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              style={{
                marginTop: 24,
                padding: "8px 28px",
                borderRadius: 8,
                border: "none",
                background: "#5B53FF",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
