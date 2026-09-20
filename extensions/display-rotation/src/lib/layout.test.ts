import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLayoutCommand } from "./displayplacer";
import { rotateLayout, rotateSegment, segmentId, swapsDimensions } from "./layout";

const BUILTIN_ID = "11111111-1111-4111-8111-111111111111";
const EXTERNAL_ID = "22222222-2222-4222-8222-222222222222";

function fixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
}

describe("segmentId", () => {
  it("reads the id a segment configures", () => {
    expect(segmentId(`id:${EXTERNAL_ID} res:1920x1080 degree:0`)).toBe(EXTERNAL_ID);
  });

  it("reads the first id of a mirroring set", () => {
    expect(segmentId(`id:${BUILTIN_ID}+${EXTERNAL_ID} res:1440x900 degree:0`)).toBe(BUILTIN_ID);
  });

  it("returns undefined for a segment without one", () => {
    expect(segmentId("res:1920x1080 degree:0")).toBeUndefined();
  });
});

describe("swapsDimensions", () => {
  it.each([
    [0, 90, true],
    [0, 270, true],
    [90, 180, true],
    [0, 180, false],
    [90, 270, false],
    [0, 0, false],
  ])("from %i to %i: %s", (from, to, expected) => {
    expect(swapsDimensions(from, to)).toBe(expected);
  });
});

describe("rotateSegment", () => {
  const landscape = `id:${EXTERNAL_ID} res:1920x1080 hz:60 color_depth:8 enabled:true scaling:off origin:(1440,-180) degree:0`;

  it("swaps the resolution when the orientation changes", () => {
    expect(rotateSegment(landscape, 90)).toBe(
      `id:${EXTERNAL_ID} res:1080x1920 hz:60 color_depth:8 enabled:true scaling:off origin:(1440,-180) degree:90`,
    );
  });

  it("keeps the resolution for a half turn", () => {
    expect(rotateSegment(landscape, 180)).toBe(
      `id:${EXTERNAL_ID} res:1920x1080 hz:60 color_depth:8 enabled:true scaling:off origin:(1440,-180) degree:180`,
    );
  });

  it("swaps back when returning to natural", () => {
    const portrait = rotateSegment(landscape, 90);

    expect(rotateSegment(portrait, 0)).toBe(landscape);
  });

  it("normalizes the requested rotation", () => {
    expect(rotateSegment(landscape, 450)).toContain("degree:90");
    expect(rotateSegment(landscape, 450)).toContain("res:1080x1920");
  });

  it("leaves everything but the resolution and the degree alone", () => {
    const rotated = rotateSegment(landscape, 90);

    expect(rotated).toContain("hz:60");
    expect(rotated).toContain("color_depth:8");
    expect(rotated).toContain("scaling:off");
    expect(rotated).toContain("origin:(1440,-180)");
  });

  it("passes through a disabled screen, which carries no degree", () => {
    const disabled = `id:${EXTERNAL_ID} enabled:false`;

    expect(rotateSegment(disabled, 90)).toBe(disabled);
  });
});

describe("rotateLayout", () => {
  const segments = parseLayoutCommand(fixture("builtin-and-external.txt"));

  it("starts from the arrangement displayplacer reported", () => {
    expect(segments).toHaveLength(2);
    expect(segments[1]).toContain(`id:${EXTERNAL_ID}`);
  });

  it("rotates one screen and leaves the others untouched", () => {
    const rotated = rotateLayout(segments, EXTERNAL_ID, 90);

    expect(rotated[0]).toBe(segments[0]);
    expect(rotated[1]).toContain("res:1080x1920");
    expect(rotated[1]).toContain("degree:90");
  });

  it("matches the id case-insensitively", () => {
    expect(rotateLayout(segments, EXTERNAL_ID.toLowerCase(), 90)[1]).toContain("degree:90");
  });

  it("round-trips back to the original arrangement", () => {
    expect(rotateLayout(rotateLayout(segments, EXTERNAL_ID, 90), EXTERNAL_ID, 0)).toEqual(segments);
  });

  it("refuses an id that is not in the layout", () => {
    expect(() => rotateLayout(segments, "33333333-3333-4333-8333-333333333333", 90)).toThrow(/No layout entry/);
  });
});
