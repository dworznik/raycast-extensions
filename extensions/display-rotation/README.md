# Display Rotation

A Raycast command that lists the connected displays and rotates the one you pick, using [`displayplacer`](https://github.com/jakehilborn/displayplacer). Nothing is configured: the screens, their names, their current rotation and the layout to apply are all discovered each time the command runs.

```
┌──────────────────────────────────────────────────┐
│ Search displays...                               │
├──────────────────────────────────────────────────┤
│ 🖥  ASUS MB16AH          1920×1080        Natural │
│ 🖥  DELL U2720Q          2560×1440   Main    180° │
└──────────────────────────────────────────────────┘
```

Pick a display and the action panel offers the rotations it is not already in, with the toggle — natural ↔ 90° — first, so Enter flips it. Nothing happens until you choose an action. `⌘R` re-reads the displays, `⌘⇧C` copies a persistent id.

While displayplacer is working, that display's rotation is replaced by where it is heading — `Rotating to 90°…` — and no further rotation can be started until it finishes.

The built-in display is not listed: displayplacer warns that rotating the internal screen may crash the machine. A disabled external screen is listed, but offers no rotations.

## Requirements

- macOS with [Raycast](https://raycast.com)
- `brew install displayplacer`

## Install

From the repository root:

```sh
pnpm install
pnpm --filter display-rotation dev
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
