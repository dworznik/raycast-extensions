import { getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PROBE_SCRIPT, buildEditSessionScript, buildReadProfileScript } from "./lib/applescript";
import { resolveProfileName, setProfileEscapeSequence, ttyWriteCommand, type ProfilePreferences } from "./lib/iterm";
import { ITERM_BUNDLE_ID, parseProbeOutput, screenForWindow } from "./lib/screens";

const run = promisify(execFile);

/** iTerm2 applies a profile change a moment after the control sequence lands. */
const APPLY_MS = 250;

export default async function Command() {
  const preferences = getPreferenceValues<ProfilePreferences>();

  try {
    const probe = parseProbeOutput(await runAppleScript(PROBE_SCRIPT));

    if (probe.frontmostBundleId !== ITERM_BUNDLE_ID) {
      await showFailureToast("Bring an iTerm2 window to the front and try again.", {
        title: "iTerm2 is not frontmost",
      });
      return;
    }
    if (probe.error !== null) {
      await showFailureToast(probe.error, { title: "Could not inspect iTerm2" });
      return;
    }
    if (probe.window === null || probe.tty === null) {
      await showFailureToast("iTerm2 has no window with an active session.", { title: "No iTerm2 session" });
      return;
    }

    const screen = screenForWindow(probe.screens, probe.window);
    const profileName = resolveProfileName(screen?.name, preferences);
    const onScreen = screen === undefined ? "an unknown screen" : screen.name;

    if (probe.profileName === profileName) {
      await showHUD(`iTerm2 already on “${profileName}” (${onScreen})`);
      return;
    }

    const applied = await applyProfile(probe.tty, profileName);
    if (!applied) {
      await showFailureToast(`iTerm2 stayed on “${probe.profileName ?? "unknown"}”.`, {
        title: `Could not switch to “${profileName}”`,
      });
      return;
    }

    await showHUD(`iTerm2 profile “${profileName}” (${onScreen})`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not switch the iTerm2 profile" });
  }
}

/**
 * Switches the session on `tty` by writing iTerm2's SetProfile control
 * sequence to it, and falls back to UI-scripting the "Edit Session" panel if
 * that did not take.
 */
async function applyProfile(tty: string, profileName: string): Promise<boolean> {
  const { file, args } = ttyWriteCommand(tty, setProfileEscapeSequence(profileName));
  await run(file, args);
  if (await profileIsActive(tty, profileName)) return true;

  await runAppleScript(buildEditSessionScript(profileName));
  return profileIsActive(tty, profileName);
}

async function profileIsActive(tty: string, profileName: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, APPLY_MS));
  const active = await runAppleScript(buildReadProfileScript(tty));
  return active.trim() === profileName.trim();
}
