import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SCREEN_NAMES_SCRIPT } from "./lib/applescript";
import { parseDisplayList, parseLayoutCommand } from "./lib/displayplacer";
import { rotateLayout } from "./lib/layout";
import { parseRotationArgument, resolveTargetRotation, rotationLabel } from "./lib/rotation";
import { defaultScreen, matchScreens, nameDisplays, parseScreenNames, type NamedDisplay } from "./lib/screens";

const run = promisify(execFile);

/** displayplacer exits before macOS has finished rearranging the desktop. */
const SETTLE_MS = 1000;

interface Preferences {
  displayplacerPath: string;
}

interface RotateDisplayArguments {
  /** Screen name or prefix. Empty means "the one external screen". */
  screen?: string;
  /** Empty means "toggle". */
  rotation?: string;
}

export default async function Command(props: LaunchProps<{ arguments: RotateDisplayArguments }>) {
  const { displayplacerPath } = getPreferenceValues<Preferences>();
  const query = props.arguments?.screen ?? "";

  try {
    const requested = parseRotationArgument(props.arguments?.rotation);
    const { screens, layout } = await readScreens(displayplacerPath);

    if (screens.length === 0) {
      await showFailureToast("displayplacer reported no screens.", { title: "No screens found" });
      return;
    }

    const screen = pickScreen(screens, query);
    if ("problem" in screen) {
      await showFailureToast(`Connected: ${screens.map((candidate) => candidate.name).join(", ")}.`, {
        title: screen.problem,
      });
      return;
    }

    const target = resolveTargetRotation(screen.rotation, requested);
    if (screen.rotation === target) {
      await showHUD(`${screen.name} already ${rotationLabel(target)}`);
      return;
    }

    await run(displayplacerPath, rotateLayout(layout, screen.persistentId, target));
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    const applied = (await readScreens(displayplacerPath)).screens.find(
      (candidate) => candidate.persistentId === screen.persistentId,
    );
    if (applied?.rotation !== target) {
      await showFailureToast(`${screen.name} reports ${rotationLabel(applied?.rotation ?? screen.rotation)}.`, {
        title: `Could not rotate to ${rotationLabel(target)}`,
      });
      return;
    }

    await showHUD(`${screen.name} rotated to ${rotationLabel(target)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not rotate the display" });
  }
}

/** Everything the command knows about the desktop, all of it discovered. */
async function readScreens(displayplacerPath: string): Promise<{ screens: NamedDisplay[]; layout: string[] }> {
  const [{ stdout }, names] = await Promise.all([
    run(displayplacerPath, ["list"]),
    runAppleScript(SCREEN_NAMES_SCRIPT),
  ]);

  return {
    screens: nameDisplays(parseDisplayList(stdout), parseScreenNames(names)),
    layout: parseLayoutCommand(stdout),
  };
}

function pickScreen(screens: NamedDisplay[], query: string): NamedDisplay | { problem: string } {
  if (query.trim() === "") {
    return defaultScreen(screens) ?? { problem: "Name the screen to rotate" };
  }

  const matches = matchScreens(screens, query);
  if (matches.length === 1) return matches[0];
  return {
    problem: matches.length === 0 ? `No screen matches “${query.trim()}”` : `Several screens match “${query.trim()}”`,
  };
}
