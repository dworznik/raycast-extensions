/**
 * Turning the arrangement displayplacer reports into the arrangement we want.
 *
 * Nothing about the setup is stored anywhere: `displayplacer list` ends with a
 * command that recreates the current arrangement, so rotating a screen means
 * taking those arguments and changing one segment.
 */

import { normalizeRotation } from "./displayplacer";

const ID = /^id:([^\s+]+)/;
const RESOLUTION = /\bres:(\d+)x(\d+)\b/;
const DEGREE = /\bdegree:(-?\d+)\b/;

/** The persistent id a layout segment applies to, or undefined if it has none. */
export function segmentId(segment: string): string | undefined {
  return ID.exec(segment)?.[1];
}

/** True when the two rotations differ in orientation, so width and height swap. */
export function swapsDimensions(from: number, to: number): boolean {
  return normalizeRotation(from) % 180 !== normalizeRotation(to) % 180;
}

/**
 * Rewrites one screen's segment for a new rotation, swapping the resolution
 * when the orientation changes and leaving hertz, colour depth, scaling and
 * origin exactly as displayplacer reported them.
 */
export function rotateSegment(segment: string, degrees: number): string {
  const target = normalizeRotation(degrees);
  const current = DEGREE.exec(segment);
  if (current === null) {
    // A segment without a degree is not a full screen config, e.g. `id:… enabled:false`.
    return segment;
  }

  let rotated = segment;
  if (swapsDimensions(Number(current[1]), target)) {
    rotated = rotated.replace(RESOLUTION, (_match, width: string, height: string) => `res:${height}x${width}`);
  }
  return rotated.replace(DEGREE, `degree:${target}`);
}

/**
 * The full argument list for rotating one screen: every other screen keeps the
 * exact configuration it already has, so nothing else on the desktop moves.
 */
export function rotateLayout(segments: string[], persistentId: string, degrees: number): string[] {
  const wanted = persistentId.trim().toLowerCase();
  let touched = false;

  const rotated = segments.map((segment) => {
    if (segmentId(segment)?.toLowerCase() !== wanted) return segment;
    touched = true;
    return rotateSegment(segment, degrees);
  });

  if (!touched) {
    throw new Error(`No layout entry for display ${persistentId}`);
  }
  return rotated;
}
