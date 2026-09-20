# Display Rotation

A Raycast menu bar item that flips one display between its natural and 90° layout with [`displayplacer`](https://github.com/jakehilborn/displayplacer).

The 🖥️ menu holds two entries, **Natural** and **Rotate 90°**, with a checkmark on whichever rotation is active, and a single disabled **Display not connected** entry when the configured display is not attached. Selecting a rotation runs `displayplacer` with the layout you configured, waits for macOS to settle, and re-reads the state so the checkmark follows.

## Requirements

- macOS with [Raycast](https://raycast.com)
- `brew install displayplacer`

## Install

From the repository root:

```sh
npm install
npm run dev -w extensions/display-rotation
```

The extension stays installed in Raycast after you stop the process. No special macOS permission is needed.

## Preferences

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

## How it works

`src/lib/displayplacer.ts` parses `displayplacer list`: blank-line separated blocks, each with the geometry of one screen followed by its available modes under `Resolutions for rotation N:`, and a trailing footer holding the command that recreates the arrangement. Only blocks carrying a `Persistent screen id:` line and a complete set of geometry fields count as displays.

`src/lib/__fixtures__/` holds real `displayplacer list` output (with the screen ids replaced by synthetic ones) plus variants for a laptop on its own, two external displays, a disabled display, and rotations of 0/90/180/270. The parser specs run against those files.
