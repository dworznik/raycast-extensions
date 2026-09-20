import { describe, expect, it } from "vitest";
import {
  NATURAL,
  ROTATED,
  layoutArgumentsFor,
  parseRotationArgument,
  resolveTargetRotation,
  rotationLabel,
} from "./rotation";

describe("parseRotationArgument", () => {
  it("reads the two dropdown values", () => {
    expect(parseRotationArgument("0")).toBe(NATURAL);
    expect(parseRotationArgument("90")).toBe(ROTATED);
  });

  it("treats an unpicked dropdown as a toggle", () => {
    expect(parseRotationArgument("")).toBeUndefined();
    expect(parseRotationArgument("  ")).toBeUndefined();
    expect(parseRotationArgument(undefined)).toBeUndefined();
    expect(parseRotationArgument(null)).toBeUndefined();
  });

  it("rejects a value the manifest does not offer", () => {
    expect(() => parseRotationArgument("180")).toThrow(/Unknown rotation argument/);
  });
});

describe("resolveTargetRotation", () => {
  it("honours an explicit choice, whatever the display is doing", () => {
    expect(resolveTargetRotation(0, NATURAL)).toBe(NATURAL);
    expect(resolveTargetRotation(0, ROTATED)).toBe(ROTATED);
    expect(resolveTargetRotation(90, ROTATED)).toBe(ROTATED);
  });

  it("toggles out of the natural rotation", () => {
    expect(resolveTargetRotation(0, undefined)).toBe(ROTATED);
  });

  it("toggles back to natural from any other rotation", () => {
    expect(resolveTargetRotation(90, undefined)).toBe(NATURAL);
    expect(resolveTargetRotation(180, undefined)).toBe(NATURAL);
    expect(resolveTargetRotation(270, undefined)).toBe(NATURAL);
  });

  it("normalizes the current rotation before toggling", () => {
    expect(resolveTargetRotation(360, undefined)).toBe(ROTATED);
    expect(resolveTargetRotation(-90, undefined)).toBe(NATURAL);
  });
});

describe("layoutArgumentsFor", () => {
  const preferences = { naturalArgs: '"id:1 degree:0"', rotatedArgs: '"id:1 degree:90"' };

  it("picks the layout preference matching the target", () => {
    expect(layoutArgumentsFor(NATURAL, preferences)).toBe('"id:1 degree:0"');
    expect(layoutArgumentsFor(ROTATED, preferences)).toBe('"id:1 degree:90"');
  });
});

describe("rotationLabel", () => {
  it.each([
    [0, "Natural"],
    [90, "90°"],
    [180, "180°"],
    [270, "270°"],
    [-90, "270°"],
  ])("names rotation %i", (rotation, expected) => {
    expect(rotationLabel(rotation)).toBe(expected);
  });
});
