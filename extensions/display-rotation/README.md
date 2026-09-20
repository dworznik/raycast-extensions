# Display Rotation

A Raycast command that rotates any connected display with [`displayplacer`](https://github.com/jakehilborn/displayplacer). Nothing is configured: the screens, their names, their current rotation and the layout to apply are all discovered each time the command runs.

Run **Rotate Display** and it toggles the external screen — natural becomes 90°, anything else goes back to natural. Two optional arguments narrow that down:

| Argument     | Empty means             | Otherwise                                                                                     |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| **Screen**   | the one external screen | a screen name or prefix, e.g. `asus`, matched case-insensitively (a persistent id also works) |
| **Rotation** | toggle                  | the rotation you pick: Natural, 90°, 180° or 270°                                             |

Assign a Raycast hotkey or alias to flip the display without opening the launcher. Success shows a HUD naming the screen; failures — no such screen, an ambiguous name, a rotation that did not take — come back as a toast listing the connected screens.

The built-in screen is never picked implicitly, because displayplacer warns that rotating it can hang the machine. Name it explicitly if you want it rotated anyway.

## Requirements

- macOS with [Raycast](https://raycast.com)
- `brew install displayplacer`

## Install

From the repository root:

```sh
npm install
npm run dev -w extensions/display-rotation
```

The extension stays installed in Raycast after you stop the process. No macOS permission prompt is involved: reading the screen names uses AppKit inside `osascript` rather than scripting another application.

## Preferences

| Preference         | Required | Description                                   |
| ------------------ | -------- | --------------------------------------------- |
| displayplacer Path | no       | Defaults to `/opt/homebrew/bin/displayplacer` |

That is the only setting — no display ids, no layout strings.

## How it works

Three pieces of discovery, none of them stored:

1. **The screens.** `displayplacer list` gives the geometry, the rotation and the ids of everything connected, and `Type: MacBook built in screen` marks the built-in one.
2. **Their names.** displayplacer does not report names, so `src/lib/applescript.ts` reads `NSScreen.localizedName` through AppleScriptObjC. The join key is `NSScreenNumber` — the `CGDirectDisplayID` — which is exactly what displayplacer prints as the contextual screen id.
3. **The layout to apply.** `displayplacer list` ends with a command that recreates the current arrangement. Rotating a screen is that arrangement with one segment changed: the degree set, and the resolution swapped when the orientation changes. Every other screen keeps the configuration it already had, so nothing else on the desktop moves.

`src/lib/rotation.ts` decides where a run should end up — an explicit rotation wins, otherwise natural toggles to 90° and every other rotation goes back to natural. After applying a layout the command re-reads the display and only reports success once displayplacer confirms the new rotation.

`src/lib/__fixtures__/` holds real `displayplacer list` output (with the screen ids replaced by synthetic ones) plus variants for a laptop on its own, two external displays, a disabled display, and rotations of 0/90/180/270. The parser and layout specs run against those files.
