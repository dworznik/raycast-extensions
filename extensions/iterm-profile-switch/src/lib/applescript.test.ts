import { describe, expect, it } from "vitest";
import { PROBE_SCRIPT, buildEditSessionScript, buildReadProfileScript, escapeAppleScriptString } from "./applescript";
import { ITERM_BUNDLE_ID } from "./screens";

describe("escapeAppleScriptString", () => {
  it("escapes quotes and backslashes", () => {
    expect(escapeAppleScriptString('Pro "fancy" \\ profile')).toBe('Pro \\"fancy\\" \\\\ profile');
  });

  it("leaves an ordinary name alone", () => {
    expect(escapeAppleScriptString("Hotkey Window")).toBe("Hotkey Window");
  });
});

describe("PROBE_SCRIPT", () => {
  it("checks the frontmost app before it ever addresses iTerm2", () => {
    const guard = PROBE_SCRIPT.indexOf(`if frontId is not "${ITERM_BUNDLE_ID}" then return out`);
    const firstITermTell = PROBE_SCRIPT.indexOf('tell application "iTerm2"');

    expect(guard).toBeGreaterThan(-1);
    expect(firstITermTell).toBeGreaterThan(guard);
  });

  it("emits the lines the parser understands", () => {
    for (const marker of ['"frontmost"', '"window"', '"session"', '"screen"', '"error"']) {
      expect(PROBE_SCRIPT).toContain(marker);
    }
  });
});

describe("buildReadProfileScript", () => {
  it("looks the session up by its tty", () => {
    expect(buildReadProfileScript("/dev/ttys003")).toContain('if tty of theSession is "/dev/ttys003" then');
  });

  it("escapes the tty it interpolates", () => {
    expect(buildReadProfileScript('/dev/tty"s003')).toContain('"/dev/tty\\"s003"');
  });
});

describe("buildEditSessionScript", () => {
  it("drives the Edit Session panel with the requested profile", () => {
    const script = buildEditSessionScript("Asus");

    expect(script).toContain('click menu item "Edit Session..." of menu "Session" of menu bar 1');
    expect(script).toContain('set value of combo box 1 of tab group 1 of group 1 of window 1 to "Asus"');
  });

  it("escapes a profile name containing a quote", () => {
    expect(buildEditSessionScript('Ops "prod"')).toContain('to "Ops \\"prod\\""');
  });
});
