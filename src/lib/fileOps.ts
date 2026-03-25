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
