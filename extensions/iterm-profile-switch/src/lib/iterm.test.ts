import { describe, expect, it } from "vitest";
import {
  matchesExternalScreen,
  resolveProfileName,
  setProfileEscapeSequence,
  ttyWriteCommand,
  type ProfilePreferences,
} from "./iterm";

const PREFERENCES: ProfilePreferences = {
  screenNamePrefix: "ASUS",
  externalProfile: "Asus",
  defaultProfile: "Default",
};

describe("matchesExternalScreen", () => {
  it.each([
    ["ASUS MB16AH", true],
    ["asus mb16ah", true],
    ["  ASUS MB16AH  ", true],
    ["Built-in Retina Display", false],
    ["Dell ASUS lookalike", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("matches %s against the ASUS prefix: %s", (name, expected) => {
    expect(matchesExternalScreen(name, PREFERENCES.screenNamePrefix)).toBe(expected);
  });

  it("never matches when the prefix is blank", () => {
    expect(matchesExternalScreen("ASUS MB16AH", "   ")).toBe(false);
  });

  it("ignores whitespace around the configured prefix", () => {
    expect(matchesExternalScreen("ASUS MB16AH", " asus ")).toBe(true);
  });
});

describe("resolveProfileName", () => {
  it("uses the external profile on the matching screen", () => {
    expect(resolveProfileName("ASUS MB16AH", PREFERENCES)).toBe("Asus");
  });

  it("uses the default profile on any other screen", () => {
    expect(resolveProfileName("Built-in Retina Display", PREFERENCES)).toBe("Default");
  });

  it("uses the default profile when the screen could not be determined", () => {
    expect(resolveProfileName(null, PREFERENCES)).toBe("Default");
    expect(resolveProfileName("", PREFERENCES)).toBe("Default");
  });

  it("uses the default profile when the prefix preference is blank", () => {
    expect(resolveProfileName("ASUS MB16AH", { ...PREFERENCES, screenNamePrefix: "" })).toBe("Default");
  });
});

describe("setProfileEscapeSequence", () => {
  it("builds iTerm2's SetProfile control sequence", () => {
    expect(setProfileEscapeSequence("Asus")).toBe("\u001b]1337;SetProfile=Asus\u0007");
  });

  it("keeps spaces inside a profile name but trims the edges", () => {
    expect(setProfileEscapeSequence("  Hotkey Window  ")).toBe("\u001b]1337;SetProfile=Hotkey Window\u0007");
  });

  it("refuses an empty profile name", () => {
    expect(() => setProfileEscapeSequence("   ")).toThrow(/empty/i);
  });

  it("refuses a name that could terminate the sequence early", () => {
    expect(() => setProfileEscapeSequence("Asus\u0007Default")).toThrow(/control characters/i);
    expect(() => setProfileEscapeSequence("Asus\u001b]1337;SetProfile=Other")).toThrow(/control characters/i);
  });
});

describe("ttyWriteCommand", () => {
  it("writes the payload to the tty through printf", () => {
    expect(ttyWriteCommand("/dev/ttys003", "\u001b]1337;SetProfile=Asus\u0007")).toEqual({
      file: "/bin/sh",
      args: ["-c", 'printf %s "$1" > "$2"', "sh", "\u001b]1337;SetProfile=Asus\u0007", "/dev/ttys003"],
    });
  });

  it("passes the payload and the path as arguments, never as script text", () => {
    const { args } = ttyWriteCommand("/dev/ttys003; rm -rf /", "$(whoami) `id` > /tmp/x");

    expect(args[1]).toBe('printf %s "$1" > "$2"');
    expect(args[3]).toBe("$(whoami) `id` > /tmp/x");
    expect(args[4]).toBe("/dev/ttys003; rm -rf /");
  });

  it("trims the tty and refuses an empty one", () => {
    expect(ttyWriteCommand(" /dev/ttys003 ", "x").args[4]).toBe("/dev/ttys003");
    expect(() => ttyWriteCommand("   ", "x")).toThrow(/no tty/i);
  });
});
