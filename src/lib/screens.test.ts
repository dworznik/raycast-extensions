import { describe, expect, it } from "vitest";
import {
  ITERM_BUNDLE_ID,
  parseProbeOutput,
  primaryScreenHeight,
  screenForWindow,
  toTopLeftFrame,
  type ScreenInfo,
} from "./screens";

/** Captured from the real probe: a 1440x900 built-in screen with a 1920x1080 screen to its right. */
const PROBE_OUTPUT = [
  `frontmost\t${ITERM_BUNDLE_ID}`,
  "window\t0\t35\t1089\t840",
  "session\t/dev/ttys000\tDefault",
  "screen\tBuilt-in Retina Display\t0\t0\t1440\t900",
  "screen\tASUS MB16AH\t1440\t0\t1920\t1080",
  "",
].join("\n");

const BUILTIN: ScreenInfo = { name: "Built-in Retina Display", frame: { x: 0, y: 0, width: 1440, height: 900 } };
const EXTERNAL: ScreenInfo = { name: "ASUS MB16AH", frame: { x: 1440, y: 0, width: 1920, height: 1080 } };

describe("parseProbeOutput", () => {
  it("reads the full probe", () => {
    expect(parseProbeOutput(PROBE_OUTPUT)).toEqual({
      frontmostBundleId: ITERM_BUNDLE_ID,
      window: { x: 0, y: 35, width: 1089, height: 805 },
      tty: "/dev/ttys000",
      profileName: "Default",
      screens: [BUILTIN, EXTERNAL],
      error: null,
    });
  });

  it("reads the short probe emitted when iTerm2 is not frontmost", () => {
    const result = parseProbeOutput("frontmost\tcom.apple.Safari\n");

    expect(result.frontmostBundleId).toBe("com.apple.Safari");
    expect(result.window).toBeNull();
    expect(result.tty).toBeNull();
    expect(result.screens).toEqual([]);
  });

  it("surfaces an AppleScript error line", () => {
    const result = parseProbeOutput(`frontmost\t${ITERM_BUNDLE_ID}\nerror\tiTerm got an error: Can't get window 1.\n`);

    expect(result.error).toBe("iTerm got an error: Can't get window 1.");
    expect(result.window).toBeNull();
  });

  it("keeps tabs that belong to a screen name", () => {
    const result = parseProbeOutput("screen\tOdd\tName\t0\t0\t1440\t900\n");

    expect(result.screens).toEqual([{ name: "Odd\tName", frame: { x: 0, y: 0, width: 1440, height: 900 } }]);
  });

  it("ignores blank, unknown and malformed lines", () => {
    const result = parseProbeOutput(
      ["", "whatever\tvalue", "screen\tBroken\tx\t0\t1440\t900", "window\t0\t35", "screen\t\t0\t0\t10\t10"].join("\n"),
    );

    expect(result).toEqual({
      frontmostBundleId: null,
      window: null,
      tty: null,
      profileName: null,
      screens: [],
      error: null,
    });
  });

  it("treats a session line without a profile as an unknown profile", () => {
    expect(parseProbeOutput("session\t/dev/ttys003\n").profileName).toBeNull();
  });
});

describe("primaryScreenHeight", () => {
  it("uses the screen sitting at the Cocoa origin", () => {
    expect(primaryScreenHeight([EXTERNAL, BUILTIN])).toBe(900);
  });

  it("falls back to the first screen when none is at the origin", () => {
    expect(primaryScreenHeight([EXTERNAL])).toBe(1080);
  });

  it("returns null without screens", () => {
    expect(primaryScreenHeight([])).toBeNull();
  });
});

describe("toTopLeftFrame", () => {
  it("agrees with the origin displayplacer reports for the same arrangement", () => {
    // `displayplacer list` prints origin (1440,-180) for this screen.
    expect(toTopLeftFrame(EXTERNAL.frame, 900)).toEqual({ x: 1440, y: -180, width: 1920, height: 1080 });
  });

  it("leaves the primary screen at the origin", () => {
    expect(toTopLeftFrame(BUILTIN.frame, 900)).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  });
});

describe("screenForWindow", () => {
  const screens = [BUILTIN, EXTERNAL];

  it("picks the built-in screen for a window on the left", () => {
    expect(screenForWindow(screens, { x: 0, y: 35, width: 1089, height: 805 })?.name).toBe(BUILTIN.name);
  });

  it("picks the external screen for a window on the right", () => {
    expect(screenForWindow(screens, { x: 1600, y: 100, width: 1200, height: 700 })?.name).toBe(EXTERNAL.name);
  });

  it("picks the screen holding the window center when a window straddles both", () => {
    // Center at x=1500, which is 60pt into the external screen.
    expect(screenForWindow(screens, { x: 1000, y: 100, width: 1000, height: 400 })?.name).toBe(EXTERNAL.name);
    // Center at x=1400, still on the built-in screen.
    expect(screenForWindow(screens, { x: 900, y: 100, width: 1000, height: 400 })?.name).toBe(BUILTIN.name);
  });

  it("falls back to the largest overlap when the center is off every screen", () => {
    // Dragged off the top: the center at (1400,-250) is above both screens, but the window still
    // pokes into the external screen, which reaches 180pt higher than the built-in one.
    expect(screenForWindow(screens, { x: 1200, y: -400, width: 400, height: 300 })?.name).toBe(EXTERNAL.name);
  });

  it("returns undefined when the window is nowhere near a screen", () => {
    expect(screenForWindow(screens, { x: -5000, y: -5000, width: 100, height: 100 })).toBeUndefined();
  });

  it("returns undefined when no screens were reported", () => {
    expect(screenForWindow([], { x: 0, y: 0, width: 100, height: 100 })).toBeUndefined();
  });
});
