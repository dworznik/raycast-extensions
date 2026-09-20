/**
 * Pure iTerm2 logic: which profile belongs on which screen, and the escape
 * sequence that switches a session over to it.
 */

export interface ProfilePreferences {
  /** Case-insensitive prefix identifying the external screen, e.g. `ASUS`. */
  screenNamePrefix: string;
  /** Profile to use when the window is on the matching external screen. */
  externalProfile: string;
  /** Profile to use on every other screen. */
  defaultProfile: string;
}

/** True when the screen name starts with the configured prefix. */
export function matchesExternalScreen(screenName: string | null | undefined, prefix: string): boolean {
  const normalizedPrefix = prefix.trim().toLowerCase();
  if (normalizedPrefix === "") return false;
  const normalizedName = (screenName ?? "").trim().toLowerCase();
  if (normalizedName === "") return false;
  return normalizedName.startsWith(normalizedPrefix);
}

/**
 * Maps a screen name to the iTerm2 profile that should be active on it. An
 * unknown screen (null, empty, or non-matching) always falls back to the
 * default profile.
 */
export function resolveProfileName(screenName: string | null | undefined, preferences: ProfilePreferences): string {
  return matchesExternalScreen(screenName, preferences.screenNamePrefix)
    ? preferences.externalProfile
    : preferences.defaultProfile;
}

/**
 * Builds iTerm2's `SetProfile` control sequence. Writing it to a session's tty
 * switches that session's profile, which beats UI-scripting the "Edit Session"
 * panel: no Accessibility permission, no window focus stealing, no timing.
 *
 * See https://iterm2.com/documentation-escape-codes.html
 */
export function setProfileEscapeSequence(profileName: string): string {
  const name = profileName.trim();
  if (name === "") {
    throw new Error("Profile name is empty");
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("Profile name contains control characters");
  }
  return `\u001b]1337;SetProfile=${name}\u0007`;
}

/**
 * How to deliver the control sequence to a session's tty.
 *
 * Writing to the device directly is the obvious thing, and works on Node. It is
 * routed through `printf` instead because a Raycast-compatible runtime may
 * implement `fs.writeFile` as "create a file at this path", which a character
 * device is not. The sequence and the path are positional arguments, so neither
 * is ever parsed as shell syntax.
 */
export function ttyWriteCommand(tty: string, payload: string): { file: string; args: string[] } {
  const target = tty.trim();
  if (target === "") {
    throw new Error("The session reported no tty");
  }
  return { file: "/bin/sh", args: ["-c", 'printf %s "$1" > "$2"', "sh", payload, target] };
}
