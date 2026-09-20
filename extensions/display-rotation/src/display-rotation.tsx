import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { findDisplayById, parseArgString, parseDisplayList } from "./lib/displayplacer";

const run = promisify(execFile);

/** displayplacer exits before macOS has finished rearranging the desktop. */
const SETTLE_MS = 1000;
const NATURAL_DEGREES = 0;
const ROTATED_DEGREES = 90;

interface DisplayRotationPreferences {
  persistentId: string;
  naturalArgs: string;
  rotatedArgs: string;
  displayplacerPath: string;
}

export default function Command() {
  const preferences = getPreferenceValues<DisplayRotationPreferences>();

  const { data: display, error, isLoading, revalidate } = usePromise(() => loadDisplay(preferences));

  async function rotate(args: string) {
    try {
      await run(preferences.displayplacerPath, parseArgString(args));
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    } catch (rotationError) {
      await showFailureToast(rotationError, { title: "Could not change the rotation" });
    } finally {
      revalidate();
    }
  }

  return (
    <MenuBarExtra title="🖥️" tooltip="Display Rotation" isLoading={isLoading}>
      {error ? (
        <MenuBarExtra.Item title="Could not run displayplacer" subtitle={error.message} />
      ) : display === undefined ? (
        <MenuBarExtra.Item title="Display not connected" />
      ) : (
        <>
          <MenuBarExtra.Item
            title="Natural"
            icon={display.rotation === NATURAL_DEGREES ? Icon.CheckCircle : Icon.Circle}
            onAction={() => rotate(preferences.naturalArgs)}
          />
          <MenuBarExtra.Item
            title="Rotate 90°"
            icon={display.rotation === ROTATED_DEGREES ? Icon.CheckCircle : Icon.Circle}
            onAction={() => rotate(preferences.rotatedArgs)}
          />
        </>
      )}
    </MenuBarExtra>
  );
}

async function loadDisplay(preferences: DisplayRotationPreferences) {
  const { stdout } = await run(preferences.displayplacerPath, ["list"]);
  return findDisplayById(parseDisplayList(stdout), preferences.persistentId);
}
