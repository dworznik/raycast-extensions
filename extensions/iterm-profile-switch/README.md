# iTerm Profile Switch

A Raycast command that switches the frontmost iTerm2 session to the profile that belongs to the screen its window is on — a port of the Hammerspoon function that did the same thing, without the UI scripting.

Run it while iTerm2 is frontmost. If iTerm2 is not frontmost it shows a failure toast and stops without launching anything.

## Requirements

- macOS with [Raycast](https://raycast.com)
- [iTerm2](https://iterm2.com)

## Install

From the repository root:

```sh
npm install
npm run dev -w extensions/iterm-profile-switch
```

The extension stays installed in Raycast after you stop the process.

## macOS permissions

| Permission                 | When                                             |
| -------------------------- | ------------------------------------------------ |
| Automation → System Events | first run, to read which app is frontmost        |
| Automation → iTerm2        | first run, to read the window bounds and session |
| Accessibility              | only for the fallback path described below       |

macOS prompts for the Automation permissions the first time the command runs. Grant them to **Raycast** (System Settings → Privacy & Security → Automation). If you ever need the fallback path, add Raycast under Privacy & Security → Accessibility as well.

## Preferences

| Preference                  | Required | Description                                                        |
| --------------------------- | -------- | ------------------------------------------------------------------ |
| External Screen Name Prefix | yes      | Case-insensitive prefix of the external screen's name, e.g. `ASUS` |
| External Screen Profile     | yes      | Profile to use on that screen                                      |
| Default Profile             | yes      | Profile to use on every other screen                               |

The screen name is the one macOS reports (`NSScreen.localizedName`), the same string System Settings → Displays shows, for example `ASUS MB16AH` or `Built-in Retina Display`.

## How it works

One `osascript` run collects everything: the frontmost app's bundle id from System Events, the iTerm2 window bounds plus the session's tty and profile, and the list of screens with their names and frames from `NSScreen` via AppleScriptObjC. `NSScreen` frames are bottom-left based while AppleScript window bounds are top-left based, so `src/lib/screens.ts` converts the frames and then picks the screen containing the window's center (falling back to the largest overlap for a window dragged off the desktop).

The switch itself writes iTerm2's [`SetProfile` control sequence](https://iterm2.com/documentation-escape-codes.html) to the session's tty, rather than UI-scripting the _Edit Session_ panel. That needs no Accessibility permission, does not move focus, and has no `delay`s to get wrong. The command then reads iTerm2's `profileName` session variable back to confirm the switch; only if that still disagrees does it fall back to the _Edit Session_ panel script, which is where the Accessibility permission comes in.
