/**
 * Which rotation a run of the command should end up in.
 *
 * The command takes an optional dropdown argument: pick a rotation to set it
 * explicitly, or leave it empty to toggle between the two.
 */

import { normalizeRotation } from "./displayplacer";

export const NATURAL = 0;
export const ROTATED = 90;

/** The rotations the dropdown offers, and the only ones macOS accepts. */
export const ROTATIONS = [0, 90, 180, 270] as const;

export type TargetRotation = (typeof ROTATIONS)[number];

/**
 * Reads the dropdown argument. Raycast hands over an empty string when nothing
 * was picked, which means "toggle".
 */
export function parseRotationArgument(value: string | undefined | null): TargetRotation | undefined {
  const raw = (value ?? "").trim();
  if (raw === "") return undefined;
  const rotation = ROTATIONS.find((candidate) => String(candidate) === raw);
  if (rotation === undefined) {
    throw new Error(`Unknown rotation argument: ${raw}`);
  }
  return rotation;
}

/**
 * An explicit request wins. Otherwise the natural layout toggles to 90°, and
 * anything else — 90°, but also a display someone left at 180° or 270° — goes
 * back to natural.
 */
export function resolveTargetRotation(currentRotation: number, requested: TargetRotation | undefined): TargetRotation {
  if (requested !== undefined) return requested;
  return normalizeRotation(currentRotation) === NATURAL ? ROTATED : NATURAL;
}

/** Human-readable name of a rotation, for toasts and HUDs. */
export function rotationLabel(rotation: number): string {
  return normalizeRotation(rotation) === NATURAL ? "Natural" : `${normalizeRotation(rotation)}°`;
}
