import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useState } from "react";
import { SCREEN_NAMES_SCRIPT } from "./lib/applescript";
import { parseDisplayList, parseLayoutCommand } from "./lib/displayplacer";
import { rotateLayout } from "./lib/layout";
import { rotationChoices, rotationLabel, type TargetRotation } from "./lib/rotation";
import { externalScreens, nameDisplays, parseScreenNames, type NamedDisplay } from "./lib/screens";

const run = promisify(execFile);

/** displayplacer exits before macOS has finished rearranging the desktop. */
const SETTLE_MS = 1000;

interface Preferences {
  displayplacerPath: string;
}

interface Desktop {
  screens: NamedDisplay[];
  /** The arrangement displayplacer reports, one entry per screen. */
  layout: string[];
}

interface PendingRotation {
  persistentId: string;
  degrees: TargetRotation;
}

export default function Command() {
  const { displayplacerPath } = getPreferenceValues<Preferences>();
  const { data, error, isLoading, revalidate } = usePromise(() => readDesktop(displayplacerPath));
  const [pending, setPending] = useState<PendingRotation | undefined>();

  async function rotate(screen: NamedDisplay, degrees: TargetRotation) {
    if (pending !== undefined) return;
    setPending({ persistentId: screen.persistentId, degrees });

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Rotating ${screen.name} to ${rotationLabel(degrees)}…`,
    });

    try {
      // Re-read rather than trusting the rendered list: the arrangement may
      // have changed since it was loaded.
      const { layout } = await readDesktop(displayplacerPath);
      await run(displayplacerPath, rotateLayout(layout, screen.persistentId, degrees));
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

      const applied = (await readDesktop(displayplacerPath)).screens.find(
        (candidate) => candidate.persistentId === screen.persistentId,
      );
      if (applied?.rotation !== degrees) {
        throw new Error(`${screen.name} reports ${rotationLabel(applied?.rotation ?? screen.rotation)}.`);
      }

      toast.style = Toast.Style.Success;
      toast.title = `${screen.name} is now ${rotationLabel(degrees)}`;
    } catch (rotationError) {
      await toast.hide();
      await showFailureToast(rotationError, { title: `Could not rotate ${screen.name}` });
    } finally {
      setPending(undefined);
      revalidate();
    }
  }

  const screens = externalScreens(data?.screens ?? []);

  return (
    <List isLoading={isLoading || pending !== undefined} searchBarPlaceholder="Search displays…">
      {screens.length === 0 ? (
        <List.EmptyView
          icon={Icon.Monitor}
          title={error ? "Could not run displayplacer" : "No external displays"}
          description={error ? error.message : "Only the built-in display is connected."}
        />
      ) : (
        screens.map((screen) => (
          <List.Item
            key={screen.persistentId}
            icon={Icon.Monitor}
            title={screen.name}
            subtitle={`${screen.resolution.width}×${screen.resolution.height}`}
            accessories={accessoriesFor(screen, pending)}
            actions={
              <ActionPanel>
                {screen.enabled && pending === undefined && (
                  <ActionPanel.Section title={screen.name}>
                    {rotationChoices(screen.rotation).map((degrees) => (
                      <Action
                        key={degrees}
                        icon={Icon.RotateClockwise}
                        title={`Rotate to ${rotationLabel(degrees)}`}
                        onAction={() => rotate(screen, degrees)}
                      />
                    ))}
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard
                    title="Copy Persistent ID"
                    content={screen.persistentId}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

/**
 * The rotation a screen is in — or, while displayplacer is working on it, the
 * rotation it is heading for.
 */
function accessoriesFor(screen: NamedDisplay, pending: PendingRotation | undefined): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (!screen.enabled) {
    accessories.push({ tag: { value: "Disabled", color: Color.SecondaryText } });
  }
  if (screen.origin.x === 0 && screen.origin.y === 0) {
    accessories.push({ tag: { value: "Main", color: Color.SecondaryText } });
  }

  if (pending?.persistentId === screen.persistentId) {
    accessories.push({
      icon: Icon.CircleProgress50,
      tag: { value: `Rotating to ${rotationLabel(pending.degrees)}…`, color: Color.Yellow },
    });
  } else {
    accessories.push({ tag: rotationLabel(screen.rotation) });
  }

  return accessories;
}

/** Everything the command knows about the desktop, all of it discovered. */
async function readDesktop(displayplacerPath: string): Promise<Desktop> {
  const [{ stdout }, names] = await Promise.all([
    run(displayplacerPath, ["list"]),
    runAppleScript(SCREEN_NAMES_SCRIPT),
  ]);

  return {
    screens: nameDisplays(parseDisplayList(stdout), parseScreenNames(names)),
    layout: parseLayoutCommand(stdout),
  };
}
