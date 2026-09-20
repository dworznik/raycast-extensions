/**
 * Pure parsing helpers for the `displayplacer` CLI.
 *
 * Nothing in `src/lib` may import `@raycast/api`: these modules are unit tested
 * with Vitest, and the Raycast runtime is not available there.
 */

export interface Resolution {
  width: number;
  height: number;
}

export interface Origin {
  x: number;
  y: number;
}

/** A single screen as reported by `displayplacer list`. */
export interface Display {
  /** UUID that survives reboots, e.g. `37D8832A-2D66-02CA-B9F7-8F30A301B230`. */
  persistentId: string;
  /** Small integer that changes when cables or GPUs change, e.g. `1`. */
  contextualId: string;
  /** Hardware serial, printed with its `s` prefix, e.g. `s4251086178`. */
  serialId: string;
  resolution: Resolution;
  /** Normalized to 0, 90, 180 or 270. */
  rotation: number;
  origin: Origin;
  enabled: boolean;
  /** `Type: MacBook built in screen`, which displayplacer warns about rotating. */
  isBuiltIn: boolean;
}

const PERSISTENT_ID = /^Persistent screen id:\s*(\S+)\s*$/m;
const CONTEXTUAL_ID = /^Contextual screen id:\s*(\S+)\s*$/m;
const SERIAL_ID = /^Serial screen id:\s*(\S+)\s*$/m;
const RESOLUTION = /^Resolution:\s*(\d+)x(\d+)\s*$/m;
const ORIGIN = /^Origin:\s*\((-?\d+),\s*(-?\d+)\)/m;
const ROTATION = /^Rotation:\s*(-?\d+)/m;
const ENABLED = /^Enabled:\s*(true|false)\s*$/m;
const BUILT_IN = /^Type:\s*MacBook built in screen\s*$/m;
const LAYOUT_COMMAND = /^displayplacer\s+(".*")\s*$/m;

/** Maps any degree value onto the 0-359 range macOS reports. */
export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Parses the human-formatted output of `displayplacer list`.
 *
 * The output is a series of blank-line separated blocks. Each display block
 * also embeds its available modes under `Resolutions for rotation N:`, and the
 * output ends with a footer holding the command that recreates the current
 * arrangement. Only blocks that carry a `Persistent screen id:` line and a
 * complete set of geometry fields are returned; everything else is ignored.
 */
export function parseDisplayList(stdout: string): Display[] {
  const blocks = stdout.replace(/\r\n/g, "\n").split(/\n[ \t]*\n/);
  const displays: Display[] = [];

  for (const block of blocks) {
    const persistentId = PERSISTENT_ID.exec(block)?.[1];
    if (!persistentId) continue;

    const resolution = RESOLUTION.exec(block);
    const origin = ORIGIN.exec(block);
    const rotation = ROTATION.exec(block);
    const enabled = ENABLED.exec(block);
    if (!resolution || !origin || !rotation || !enabled) continue;

    displays.push({
      persistentId,
      contextualId: CONTEXTUAL_ID.exec(block)?.[1] ?? "",
      serialId: SERIAL_ID.exec(block)?.[1] ?? "",
      resolution: { width: Number(resolution[1]), height: Number(resolution[2]) },
      rotation: normalizeRotation(Number(rotation[1])),
      origin: { x: Number(origin[1]), y: Number(origin[2]) },
      enabled: enabled[1] === "true",
      isBuiltIn: BUILT_IN.test(block),
    });
  }

  return displays;
}

/** Looks up a display by persistent id, tolerating stray whitespace and casing. */
export function findDisplayById(displays: Display[], persistentId: string): Display | undefined {
  const wanted = persistentId.trim().toLowerCase();
  if (wanted === "") return undefined;
  return displays.find((display) => display.persistentId.toLowerCase() === wanted);
}

/**
 * Splits a displayplacer argument string into argv entries.
 *
 * The rotation layouts are stored as preferences in exactly the form
 * displayplacer prints them (`"id:… degree:0" "id:… degree:90"`), so they have
 * to be tokenized before being handed to `execFile`, which takes an array and
 * never involves a shell.
 */
export function parseArgString(args: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let started = false;
  let quote: '"' | "'" | null = null;

  for (const char of args) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (started) {
        tokens.push(current);
        current = "";
        started = false;
      }
      continue;
    }

    current += char;
    started = true;
  }

  if (quote) {
    throw new Error(`Unterminated ${quote} quote in displayplacer arguments`);
  }
  if (started) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Pulls the per-screen arguments out of the command displayplacer prints at the
 * end of `list`, which describes the arrangement currently on screen.
 *
 * That line is the whole reason nothing has to be configured: it is a complete,
 * working layout for every connected screen, so a rotation is just this layout
 * with one segment changed.
 */
export function parseLayoutCommand(stdout: string): string[] {
  const line = LAYOUT_COMMAND.exec(stdout.replace(/\r\n/g, "\n"));
  if (line === null) return [];
  return [...line[1].matchAll(/"([^"]*)"/g)].map((match) => match[1]);
}
