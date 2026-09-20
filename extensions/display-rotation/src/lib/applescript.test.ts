import { describe, expect, it } from "vitest";
import { SCREEN_NAMES_SCRIPT } from "./applescript";

describe("SCREEN_NAMES_SCRIPT", () => {
  it("emits the contextual screen id next to the name", () => {
    expect(SCREEN_NAMES_SCRIPT).toContain('objectForKey:"NSScreenNumber"');
    expect(SCREEN_NAMES_SCRIPT).toContain("localizedName()");
    expect(SCREEN_NAMES_SCRIPT).toContain("& tab &");
  });

  it("reaches NSScreen through AppleScriptObjC", () => {
    expect(SCREEN_NAMES_SCRIPT.startsWith('use framework "AppKit"')).toBe(true);
  });
});
