/**
 * Pure helpers for working out which screen an iTerm2 window sits on.
 *
 * The AppleScript probe in `src/lib/applescript.ts` prints a small tab
 * separated table; everything below turns that text into geometry and answers
 * the only question the command cares about: what is the name of the screen
 * showing the frontmost window?
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenInfo {
  name: string;
  /** `NSScreen` frame: origin bottom-left, y growing upwards. */
  frame: Rect;
}

export interface ProbeResult {
  /** Bundle id of the frontmost application, or null when the probe omitted it. */
  frontmostBundleId: string | null;
  /** Frontmost iTerm2 window, in AppleScript coordinates: origin top-left, y growing downwards. */
  window: Rect | null;
  /** Device path of the frontmost session, e.g. `/dev/ttys000`. */
  tty: string | null;
  /** Profile the session is currently running, read from iTerm2's `profileName` variable. */
  profileName: string | null;
  screens: ScreenInfo[];
  /** Message from the AppleScript side when it could not inspect iTerm2. */
  error: string | null;
}

export const ITERM_BUNDLE_ID = "com.googlecode.iterm2";

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses the probe output.
 *
 * Lines are `<kind>\t<fields…>`; unknown or malformed lines are ignored so a
 * future extra line cannot break the command. Screen names may themselves
 * contain tabs, so the four geometry fields are read from the end of the line.
 */
export function parseProbeOutput(raw: string): ProbeResult {
  const result: ProbeResult = {
    frontmostBundleId: null,
    window: null,
    tty: null,
    profileName: null,
    screens: [],
    error: null,
  };

  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim() === "") continue;
    const parts = line.split("\t");
    const kind = parts[0];

    if (kind === "frontmost" && parts.length >= 2) {
      result.frontmostBundleId = parts[1].trim() || null;
    } else if (kind === "error" && parts.length >= 2) {
      result.error = parts.slice(1).join("\t").trim() || null;
    } else if (kind === "session" && parts.length >= 2) {
      result.tty = parts[1].trim() || null;
      result.profileName = parts.length >= 3 ? parts.slice(2).join("\t").trim() || null : null;
    } else if (kind === "window" && parts.length >= 5) {
      const [left, top, right, bottom] = parts.slice(1, 5).map(toNumber);
      if (left === null || top === null || right === null || bottom === null) continue;
      result.window = { x: left, y: top, width: right - left, height: bottom - top };
    } else if (kind === "screen" && parts.length >= 6) {
      const numbers = parts.slice(-4).map(toNumber);
      if (numbers.some((value) => value === null)) continue;
      const [x, y, width, height] = numbers as number[];
      const name = parts.slice(1, -4).join("\t").trim();
      if (name === "") continue;
      result.screens.push({ name, frame: { x, y, width, height } });
    }
  }

  return result;
}

/**
 * Height of the primary screen, which is the one whose `NSScreen` frame sits at
 * the Cocoa origin. It is the reference for converting to top-left coordinates.
 */
export function primaryScreenHeight(screens: ScreenInfo[]): number | null {
  if (screens.length === 0) return null;
  const primary = screens.find((screen) => screen.frame.x === 0 && screen.frame.y === 0) ?? screens[0];
  return primary.frame.height;
}

/**
 * Converts a bottom-left `NSScreen` frame into the top-left coordinate space
 * that AppleScript window bounds use.
 */
export function toTopLeftFrame(frame: Rect, primaryHeight: number): Rect {
  return { ...frame, y: primaryHeight - (frame.y + frame.height) };
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

/**
 * Picks the screen a window belongs to: the one containing the window's center,
 * falling back to the largest overlap when the center is off every screen (a
 * window dragged half off the desktop, for instance).
 */
export function screenForWindow(screens: ScreenInfo[], window: Rect): ScreenInfo | undefined {
  const primaryHeight = primaryScreenHeight(screens);
  if (primaryHeight === null) return undefined;

  const centerX = window.x + window.width / 2;
  const centerY = window.y + window.height / 2;

  let best: { screen: ScreenInfo; area: number } | undefined;

  for (const screen of screens) {
    const frame = toTopLeftFrame(screen.frame, primaryHeight);
    if (contains(frame, centerX, centerY)) return screen;

    const area = overlapArea(frame, window);
    if (area > 0 && (best === undefined || area > best.area)) {
      best = { screen, area };
    }
  }

  return best?.screen;
}
