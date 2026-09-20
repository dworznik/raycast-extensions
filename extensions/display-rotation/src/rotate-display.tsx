import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SCREEN_NAMES_SCRIPT } from "./lib/applescript";
import { parseDisplayList, parseLayoutCommand } from "./lib/displayplacer";
import { rotateLayout } from "./lib/layout";
import { rotationChoices, rotationLabel, type TargetRotation } from "./lib/rotation";
import { nameDisplays, parseScreenNames, type NamedDisplay } from "./lib/screens";

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

export default function Command() {
  const { displayplacerPath } = getPreferenceValues<Preferences>();
  const { data, error, isLoading, revalidate } = usePromise(() => readDesktop(displayplacerPath));

  async function rotate(screen: NamedDisplay, degrees: TargetRotation) {
    if (screen.isBuiltIn && !(await confirmBuiltInRotation(screen.name))) return;

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
      revalidate();
    }
  }

  const screens = data?.screens ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search displays…">
      {screens.length === 0 ? (
        <List.EmptyView
          icon={Icon.Monitor}
          title={error ? "Could not run displayplacer" : "No displays found"}
          description={error ? error.message : "displayplacer reported no screens."}
        />
      ) : (
        screens.map((screen) => (
          <List.Item
            key={screen.persistentId}
            icon={screen.isBuiltIn ? Icon.Desktop : Icon.Monitor}
            title={screen.name}
            subtitle={`${screen.resolution.width}×${screen.resolution.height}`}
            accessories={accessoriesFor(screen)}
            actions={
              <ActionPanel>
                {screen.enabled && (
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

function accessoriesFor(screen: NamedDisplay): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (!screen.enabled) {
    accessories.push({ tag: { value: "Disabled", color: Color.SecondaryText } });
  }
  if (screen.origin.x === 0 && screen.origin.y === 0) {
    accessories.push({ tag: { value: "Main", color: Color.SecondaryText } });
  }
  accessories.push({ tag: rotationLabel(screen.rotation) });
  return accessories;
}

/** displayplacer warns that rotating the internal screen can hang the Mac. */
function confirmBuiltInRotation(name: string): Promise<boolean> {
  return confirmAlert({
    icon: Icon.Warning,
    title: `Rotate ${name}?`,
    message:
      "displayplacer warns that rotating the built-in screen may crash the computer. It will be rotated after a reboot.",
    primaryAction: { title: "Rotate Anyway", style: Alert.ActionStyle.Destructive },
  });
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
