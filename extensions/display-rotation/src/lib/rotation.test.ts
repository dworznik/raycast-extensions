import { describe, expect, it } from "vitest";
import {
  NATURAL,
  ROTATED,
  parseRotationArgument,
  resolveTargetRotation,
  rotationChoices,
  rotationLabel,
} from "./rotation";

describe("parseRotationArgument", () => {
  it("reads every dropdown value", () => {
    expect(parseRotationArgument("0")).toBe(NATURAL);
    expect(parseRotationArgument("90")).toBe(ROTATED);
    expect(parseRotationArgument("180")).toBe(180);
    expect(parseRotationArgument("270")).toBe(270);
  });

  it("treats an unpicked dropdown as a toggle", () => {
    expect(parseRotationArgument("")).toBeUndefined();
    expect(parseRotationArgument("  ")).toBeUndefined();
    expect(parseRotationArgument(undefined)).toBeUndefined();
    expect(parseRotationArgument(null)).toBeUndefined();
  });

  it("rejects a value the manifest does not offer", () => {
    expect(() => parseRotationArgument("45")).toThrow(/Unknown rotation argument/);
    expect(() => parseRotationArgument("natural")).toThrow(/Unknown rotation argument/);
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

describe("rotationChoices", () => {
  it.each([
    [0, [90, 180, 270]],
    [90, [0, 180, 270]],
    [180, [0, 90, 270]],
    [270, [0, 90, 180]],
  ])("offers the other rotations for %i, toggle target first", (current, expected) => {
    expect(rotationChoices(current)).toEqual(expected);
  });

  it("normalizes before choosing", () => {
    expect(rotationChoices(-90)).toEqual([0, 90, 180]);
  });
});
