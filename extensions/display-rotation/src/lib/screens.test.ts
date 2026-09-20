import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDisplayList, type Display } from "./displayplacer";
import { defaultScreen, matchScreens, nameDisplays, parseScreenNames, type NamedDisplay } from "./screens";

/** Captured from the real probe on a laptop with one external screen. */
const NAME_TABLE = ["1\tBuilt-in Retina Display", "2\tASUS MB16AH", ""].join("\n");

function fixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
}

function screensFrom(fixtureName: string, table = NAME_TABLE): NamedDisplay[] {
  return nameDisplays(parseDisplayList(fixture(fixtureName)), parseScreenNames(table));
}

describe("parseScreenNames", () => {
  it("maps contextual screen ids onto names", () => {
    expect(parseScreenNames(NAME_TABLE)).toEqual(
      new Map([
        ["1", "Built-in Retina Display"],
        ["2", "ASUS MB16AH"],
      ]),
    );
  });

  it("keeps a name that contains spaces and punctuation", () => {
    expect(parseScreenNames("7\tDELL U2720Q (DisplayPort)").get("7")).toBe("DELL U2720Q (DisplayPort)");
  });

  it("ignores blank and malformed lines", () => {
    expect(parseScreenNames(["", "no-tab-here", "\tnameless", "3\t"].join("\n")).size).toBe(0);
  });
});

describe("nameDisplays", () => {
  it("names each display from the probe", () => {
    expect(screensFrom("builtin-and-external.txt").map((screen) => screen.name)).toEqual([
      "Built-in Retina Display",
      "ASUS MB16AH",
    ]);
  });

  it("falls back when macOS reported no name for a screen", () => {
    const unnamed = screensFrom("builtin-and-external.txt", "");

    expect(unnamed.map((screen) => screen.name)).toEqual(["Built-in Display", "Display 2"]);
  });

  it("keeps the rest of the display untouched", () => {
    const [builtIn] = screensFrom("builtin-and-external.txt");
    const [rawBuiltIn] = parseDisplayList(fixture("builtin-and-external.txt")) as Display[];

    expect(builtIn).toMatchObject(rawBuiltIn);
  });
});

describe("defaultScreen", () => {
  it("picks the one external screen", () => {
    expect(defaultScreen(screensFrom("builtin-and-external.txt"))?.name).toBe("ASUS MB16AH");
  });

  it("never picks the built-in screen on its own", () => {
    expect(defaultScreen(screensFrom("builtin-only.txt"))).toBeUndefined();
  });

  it("refuses to guess between two external screens", () => {
    expect(defaultScreen(screensFrom("two-externals.txt"))).toBeUndefined();
  });

  it("ignores a disabled external screen", () => {
    expect(defaultScreen(screensFrom("disabled-external.txt"))).toBeUndefined();
  });
});

describe("matchScreens", () => {
  const screens = screensFrom("builtin-and-external.txt");

  it("matches a name prefix, case-insensitively", () => {
    expect(matchScreens(screens, "asus").map((screen) => screen.name)).toEqual(["ASUS MB16AH"]);
  });

  it("matches the full name", () => {
    expect(matchScreens(screens, "built-in retina display")).toHaveLength(1);
  });

  it("matches a persistent id, for anyone who prefers pasting one", () => {
    expect(matchScreens(screens, "22222222-2222-4222-8222-222222222222")[0].name).toBe("ASUS MB16AH");
  });

  it("falls back to a substring when nothing starts with the query", () => {
    expect(matchScreens(screens, "mb16").map((screen) => screen.name)).toEqual(["ASUS MB16AH"]);
  });

  it("returns every candidate when the query is ambiguous", () => {
    expect(
      matchScreens(screensFrom("two-externals.txt", "1\tScreen A\n2\tScreen B\n3\tScreen C"), "screen"),
    ).toHaveLength(3);
  });

  it("returns nothing for an unknown screen or an empty query", () => {
    expect(matchScreens(screens, "philips")).toEqual([]);
    expect(matchScreens(screens, "   ")).toEqual([]);
  });

  it("prefers an exact name over a screen that merely starts with it", () => {
    const table = "1\tStudio\n2\tStudio Display";
    const matches = matchScreens(screensFrom("builtin-and-external.txt", table), "studio");

    expect(matches.map((screen) => screen.name)).toEqual(["Studio"]);
  });
});
