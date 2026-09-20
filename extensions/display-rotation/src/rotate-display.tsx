import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Display, findDisplayById, parseArgString, parseDisplayList } from "./lib/displayplacer";
import { layoutArgumentsFor, parseRotationArgument, resolveTargetRotation, rotationLabel } from "./lib/rotation";

const run = promisify(execFile);

/** displayplacer exits before macOS has finished rearranging the desktop. */
const SETTLE_MS = 1000;

interface DisplayRotationPreferences {
  persistentId: string;
  naturalArgs: string;
  rotatedArgs: string;
  displayplacerPath: string;
}

interface RotateDisplayArguments {
  /** Empty when the dropdown was left alone, which means "toggle". */
  rotation?: string;
}

export default async function Command(props: LaunchProps<{ arguments: RotateDisplayArguments }>) {
  const preferences = getPreferenceValues<DisplayRotationPreferences>();

  try {
    const requested = parseRotationArgument(props.arguments?.rotation);
    const display = await readDisplay(preferences);

    if (display === undefined) {
      await showFailureToast("Check the persistent id in the extension preferences.", {
        title: "Display not connected",
      });
      return;
    }

    const target = resolveTargetRotation(display.rotation, requested);
    if (display.rotation === target) {
      await showHUD(`Display already ${rotationLabel(target)}`);
      return;
    }

    await run(preferences.displayplacerPath, parseArgString(layoutArgumentsFor(target, preferences)));
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

    const rotated = await readDisplay(preferences);
    if (rotated?.rotation !== target) {
      await showFailureToast(`The display reports ${rotationLabel(rotated?.rotation ?? display.rotation)}.`, {
        title: `Could not rotate to ${rotationLabel(target)}`,
      });
      return;
    }

    await showHUD(`Display rotated to ${rotationLabel(target)}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not rotate the display" });
  }
}

async function readDisplay(preferences: DisplayRotationPreferences): Promise<Display | undefined> {
  const { stdout } = await run(preferences.displayplacerPath, ["list"]);
  return findDisplayById(parseDisplayList(stdout), preferences.persistentId);
}
