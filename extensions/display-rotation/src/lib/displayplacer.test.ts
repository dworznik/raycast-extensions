import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDisplayById, normalizeRotation, parseArgString, parseDisplayList } from "./displayplacer";

const BUILTIN_ID = "11111111-1111-4111-8111-111111111111";
const EXTERNAL_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_EXTERNAL_ID = "33333333-3333-4333-8333-333333333333";

function fixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
}

describe("parseDisplayList", () => {
  it("parses a built-in screen next to an external one", () => {
    const displays = parseDisplayList(fixture("builtin-and-external.txt"));

    expect(displays).toEqual([
      {
        persistentId: BUILTIN_ID,
        contextualId: "1",
        serialId: "s4251086178",
        resolution: { width: 1440, height: 900 },
        rotation: 0,
        origin: { x: 0, y: 0 },
        enabled: true,
      },
      {
        persistentId: EXTERNAL_ID,
        contextualId: "2",
        serialId: "s8293",
        resolution: { width: 1920, height: 1080 },
        rotation: 0,
        origin: { x: 1440, y: -180 },
        enabled: true,
      },
    ]);
  });

  it("ignores the mode list, which mentions resolutions but is not a display", () => {
    const stdout = fixture("builtin-and-external.txt");

    expect(stdout).toContain("Resolutions for rotation 0:");
    expect(stdout).toContain("  mode 8: res:1440x900");
    expect(parseDisplayList(stdout)).toHaveLength(2);
  });

  it("ignores the trailing command that displayplacer prints", () => {
    const stdout = fixture("builtin-and-external.txt");

    expect(stdout).toContain('displayplacer "id:');
    expect(parseDisplayList(stdout).map((display) => display.persistentId)).toEqual([BUILTIN_ID, EXTERNAL_ID]);
  });

  it("handles a laptop with no external display", () => {
    const displays = parseDisplayList(fixture("builtin-only.txt"));

    expect(displays).toHaveLength(1);
    expect(displays[0].persistentId).toBe(BUILTIN_ID);
    expect(displays[0].enabled).toBe(true);
  });

  it("handles two external displays, including one to the left of the origin", () => {
    const displays = parseDisplayList(fixture("two-externals.txt"));

    expect(displays.map((display) => display.persistentId)).toEqual([BUILTIN_ID, EXTERNAL_ID, SECOND_EXTERNAL_ID]);
    expect(displays[2]).toMatchObject({
      resolution: { width: 2560, height: 1440 },
      origin: { x: -2560, y: -360 },
      rotation: 180,
    });
  });

  it("reports a disabled display without dropping it", () => {
    const displays = parseDisplayList(fixture("disabled-external.txt"));

    expect(displays).toHaveLength(2);
    expect(displays[1]).toMatchObject({ persistentId: EXTERNAL_ID, enabled: false });
  });

  it.each([
    ["external-rotated-90.txt", 90],
    ["external-rotated-270.txt", 270],
  ])("reads the rotation and the swapped resolution from %s", (name, rotation) => {
    const displays = parseDisplayList(fixture(name));

    expect(displays[1]).toMatchObject({
      persistentId: EXTERNAL_ID,
      rotation,
      resolution: { width: 1080, height: 1920 },
    });
  });

  it("returns nothing for empty or unrelated output", () => {
    expect(parseDisplayList("")).toEqual([]);
    expect(parseDisplayList("displayplacer: command not found\n")).toEqual([]);
  });

  it("skips a block whose geometry is incomplete", () => {
    const truncated = [
      "Persistent screen id: 44444444-4444-4444-8444-444444444444",
      "Contextual screen id: 4",
      "Resolution: 1920x1080",
      "Enabled: true",
    ].join("\n");

    expect(parseDisplayList(truncated)).toEqual([]);
  });

  it("accepts CRLF line endings", () => {
    const crlf = fixture("builtin-only.txt").replace(/\n/g, "\r\n");

    expect(parseDisplayList(crlf)).toHaveLength(1);
  });
});

describe("findDisplayById", () => {
  const displays = parseDisplayList(fixture("builtin-and-external.txt"));

  it("finds a display by its persistent id", () => {
    expect(findDisplayById(displays, EXTERNAL_ID)?.contextualId).toBe("2");
  });

  it("tolerates casing and stray whitespace from a pasted preference", () => {
    expect(findDisplayById(displays, `  ${EXTERNAL_ID.toLowerCase()} `)?.contextualId).toBe("2");
  });

  it("returns undefined when the display is not connected", () => {
    expect(findDisplayById(displays, SECOND_EXTERNAL_ID)).toBeUndefined();
  });

  it("returns undefined for an unset preference", () => {
    expect(findDisplayById(displays, "   ")).toBeUndefined();
  });
});

describe("normalizeRotation", () => {
  it.each([
    [0, 0],
    [90, 90],
    [270, 270],
    [-90, 270],
    [360, 0],
    [450, 90],
  ])("maps %i onto %i", (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });
});

describe("parseArgString", () => {
  it("splits the quoted layout string displayplacer prints", () => {
    const args = parseArgString(
      '"id:11111111 res:1440x900 origin:(0,0) degree:0" "id:22222222 res:1080x1920 origin:(1440,-1020) degree:90"',
    );

    expect(args).toEqual([
      "id:11111111 res:1440x900 origin:(0,0) degree:0",
      "id:22222222 res:1080x1920 origin:(1440,-1020) degree:90",
    ]);
  });

  it("splits unquoted arguments on whitespace", () => {
    expect(parseArgString("  id:11111111\tdegree:0\n")).toEqual(["id:11111111", "degree:0"]);
  });

  it("supports single quotes and quoted empty arguments", () => {
    expect(parseArgString("'id:11111111 degree:0' \"\"")).toEqual(["id:11111111 degree:0", ""]);
  });

  it("keeps a quoted section glued to its neighbours", () => {
    expect(parseArgString('id:"11111111 2" ')).toEqual(["id:11111111 2"]);
  });

  it("returns nothing for an empty preference", () => {
    expect(parseArgString("   ")).toEqual([]);
  });

  it("rejects an unterminated quote instead of guessing", () => {
    expect(() => parseArgString('"id:11111111 degree:0')).toThrow(/Unterminated/);
  });
});
