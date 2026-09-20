/**
 * Putting names on the screens displayplacer reports, and working out which
 * one a run of the command means.
 */

import type { Display } from "./displayplacer";

export interface NamedDisplay extends Display {
  /** `NSScreen`'s localized name, e.g. `ASUS MB16AH`, with a fallback. */
  name: string;
}

/** Parses the `<contextual id>\t<name>` table the AppleScript probe prints. */
export function parseScreenNames(raw: string): Map<string, string> {
  const names = new Map<string, string>();

  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim() === "") continue;
    const separator = line.indexOf("\t");
    if (separator <= 0) continue;
    const id = line.slice(0, separator).trim();
    const name = line.slice(separator + 1).trim();
    if (id === "" || name === "") continue;
    names.set(id, name);
  }

  return names;
}

/** Attaches a name to every display, falling back when macOS reported none. */
export function nameDisplays(displays: Display[], names: Map<string, string>): NamedDisplay[] {
  return displays.map((display) => ({
    ...display,
    name: names.get(display.contextualId) ?? fallbackName(display),
  }));
}

function fallbackName(display: Display): string {
  return display.isBuiltIn ? "Built-in Display" : `Display ${display.contextualId}`;
}

/**
 * Everything except the built-in screen. displayplacer warns that rotating the
 * internal display may crash the machine, so it is left out of the list
 * entirely rather than offered and guarded.
 */
export function externalScreens(screens: NamedDisplay[]): NamedDisplay[] {
  return screens.filter((screen) => !screen.isBuiltIn);
}

/** The one external screen, when there is exactly one to act on. */
export function defaultScreen(screens: NamedDisplay[]): NamedDisplay | undefined {
  const externals = externalScreens(screens).filter((screen) => screen.enabled);
  return externals.length === 1 ? externals[0] : undefined;
}

/**
 * Screens matching what was typed, narrowest match first: an exact persistent
 * id or name, otherwise a name prefix, otherwise a name substring. Returning
 * every match lets the command tell "no such screen" and "which one?" apart.
 */
export function matchScreens(screens: NamedDisplay[], query: string): NamedDisplay[] {
  const wanted = query.trim().toLowerCase();
  if (wanted === "") return [];

  const exact = screens.filter(
    (screen) => screen.persistentId.toLowerCase() === wanted || screen.name.toLowerCase() === wanted,
  );
  if (exact.length > 0) return exact;

  const prefixed = screens.filter((screen) => screen.name.toLowerCase().startsWith(wanted));
  if (prefixed.length > 0) return prefixed;

  return screens.filter((screen) => screen.name.toLowerCase().includes(wanted));
}
