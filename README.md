# Screen Tools

Two Raycast commands for a laptop that spends its day next to an external display:

- **Display Rotation** — a menu bar item that flips one display between its natural and 90° layout with `displayplacer`.
- **Switch iTerm Profile for Current Screen** — switches the frontmost iTerm2 session to the profile that belongs to the screen its window is on.

Nothing machine specific is committed: display ids, layouts and profile names all live in Raycast preferences.

## Requirements

- macOS with [Raycast](https://raycast.com)
- Node.js 22.22.2 or newer (the version `@raycast/api` requires)
- [`displayplacer`](https://github.com/jakehilborn/displayplacer) for the rotation command: `brew install displayplacer`
- [iTerm2](https://iterm2.com) for the profile command

## Install

```sh
git clone https://github.com/dworznik/raycast-extensions.git
cd raycast-extensions
npm install
npm run dev
```

`npm run dev` builds the extension and imports it into Raycast, where both commands appear under **Screen Tools**. Leave it running while you work on the code; Raycast reloads on every save. Stop it with `Ctrl-C` — the commands stay installed until you remove the extension from Raycast.

Open **Raycast → Extensions → Screen Tools** to fill in the preferences below before running either command.

## macOS permissions

| Command              | Permission                 | When                                             |
| -------------------- | -------------------------- | ------------------------------------------------ |
| Display Rotation     | none                       | `displayplacer` needs no special permission      |
| Switch iTerm Profile | Automation → System Events | first run, to read which app is frontmost        |
| Switch iTerm Profile | Automation → iTerm2        | first run, to read the window bounds and session |
| Switch iTerm Profile | Accessibility              | only for the fallback path described below       |

macOS prompts for the Automation permissions the first time the command runs. Grant them to **Raycast** (System Settings → Privacy & Security → Automation). If you ever need the fallback path, add Raycast under Privacy & Security → Accessibility as well.

## Display Rotation

A menu bar 🖥️ item with two entries, **Natural** and **Rotate 90°**, a checkmark on whichever rotation is active, and a single disabled **Display not connected** entry when the configured display is not attached. Selecting a rotation runs `displayplacer` with the layout you configured, waits for macOS to settle, and re-reads the state so the checkmark follows.

| Preference               | Required | Description                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------------- |
| Display Persistent ID    | yes      | The `Persistent screen id` of the display to rotate                         |
| Natural Layout Arguments | yes      | Full `displayplacer` argument string for the natural (degree 0) arrangement |
| Rotated Layout Arguments | yes      | Full `displayplacer` argument string for the 90° arrangement                |
| displayplacer Path       | no       | Defaults to `/opt/homebrew/bin/displayplacer`                               |

Both layouts are full argument strings because the resolution and the origin of _every_ screen change when one of them rotates. To capture them:

1. Arrange your screens in their natural layout, run `displayplacer list`, and copy everything after `displayplacer` on the last line into **Natural Layout Arguments**.
2. Rotate the display 90° in System Settings → Displays, run `displayplacer list` again, and copy the last line the same way into **Rotated Layout Arguments**.
3. Copy the `Persistent screen id` of the rotated display into **Display Persistent ID**.

A layout string looks like this (one quoted block per screen):

```
"id:11111111-1111-4111-8111-111111111111 res:1440x900 hz:60 color_depth:8 enabled:true scaling:on origin:(0,0) degree:0" "id:22222222-2222-4222-8222-222222222222 res:1080x1920 hz:60 color_depth:8 enabled:true scaling:off origin:(1440,-1020) degree:90"
```

The command runs `displayplacer` through `execFile` with the string split into arguments, so no shell is involved.

## Switch iTerm Profile for Current Screen

Run it while iTerm2 is frontmost. It works out which screen holds the frontmost window and switches that session's profile. If iTerm2 is not frontmost it shows a failure toast and stops without launching anything.

| Preference                  | Required | Description                                                        |
| --------------------------- | -------- | ------------------------------------------------------------------ |
| External Screen Name Prefix | yes      | Case-insensitive prefix of the external screen's name, e.g. `ASUS` |
| External Screen Profile     | yes      | Profile to use on that screen                                      |
| Default Profile             | yes      | Profile to use on every other screen                               |

The screen name is the one macOS reports (`NSScreen.localizedName`), the same string System Settings → Displays shows, for example `ASUS MB16AH` or `Built-in Retina Display`.

### How it works

One `osascript` run collects everything: the frontmost app's bundle id from System Events, the iTerm2 window bounds plus the session's tty and profile, and the list of screens with their names and frames from `NSScreen` via AppleScriptObjC. `NSScreen` frames are bottom-left based while AppleScript window bounds are top-left based, so `src/lib/screens.ts` converts the frames and then picks the screen containing the window's center (falling back to the largest overlap for a window dragged off the desktop).

The switch itself writes iTerm2's [`SetProfile` control sequence](https://iterm2.com/documentation-escape-codes.html) to the session's tty, rather than UI-scripting the _Edit Session_ panel like the original Hammerspoon function did. That needs no Accessibility permission, does not move focus, and has no `delay`s to get wrong. The command then reads iTerm2's `profileName` session variable back to confirm the switch; only if that still disagrees does it fall back to the _Edit Session_ panel script, which is where the Accessibility permission comes in.

## Development

| Script                              | What it does                                      |
| ----------------------------------- | ------------------------------------------------- |
| `npm run dev`                       | `ray develop` — build, import into Raycast, watch |
| `npm run build`                     | `ray build`                                       |
| `npm run lint` / `npm run fix-lint` | `ray lint` (ESLint + Prettier + manifest checks)  |
| `npm run typecheck`                 | `tsc --noEmit`                                    |
| `npm test` / `npm run test:watch`   | Vitest                                            |

`@raycast/api` cannot be imported from tests, so the layout is:

- `src/lib/*.ts` — every piece of logic, as pure functions with no Raycast imports, each with a Vitest spec next to it.
- `src/*.tsx` — thin command shells: read preferences, call into `src/lib`, render or toast.

`src/lib/__fixtures__/` holds real `displayplacer list` output (with the screen ids replaced by synthetic ones) plus variants for a laptop on its own, two external displays, a disabled display, and rotations of 0/90/180/270. The parser specs run against those files.

## License

MIT
