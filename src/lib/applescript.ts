/**
 * AppleScript sources used by the iTerm2 command, kept out of the `.tsx` shell
 * so the string building (and its escaping) can be unit tested.
 */

import { ITERM_BUNDLE_ID } from "./screens";

/** Escapes a value for interpolation into an AppleScript double-quoted string. */
export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Collects everything the command needs in a single osascript run: the
 * frontmost app, the frontmost iTerm2 window's bounds, its session, and the
 * list of screens with their names and frames.
 *
 * `NSScreen` is reached through AppleScriptObjC because AppleScript has no
 * vocabulary for displays, and iTerm2 is only addressed once the frontmost
 * check passes so the script never launches it.
 */
export const PROBE_SCRIPT = `use framework "AppKit"
use scripting additions

set LF to linefeed
set out to ""

tell application "System Events"
	set frontId to bundle identifier of (first application process whose frontmost is true)
end tell
set out to out & "frontmost" & tab & frontId & LF

if frontId is not "${ITERM_BUNDLE_ID}" then return out

try
	tell application "iTerm2"
		set theBounds to bounds of current window
		set theSession to current session of current window
		set theTty to tty of theSession
		set theProfile to (variable theSession named "profileName")
	end tell
	set out to out & "window" & tab & (item 1 of theBounds) & tab & (item 2 of theBounds) & tab & (item 3 of theBounds) & tab & (item 4 of theBounds) & LF
	set out to out & "session" & tab & theTty & tab & theProfile & LF
on error errorMessage
	return out & "error" & tab & errorMessage & LF
end try

repeat with theScreen in (current application's NSScreen's screens())
	set theFrame to theScreen's frame()
	set out to out & "screen" & tab & ((theScreen's localizedName()) as text) & tab & ((item 1 of item 1 of theFrame) as integer) & tab & ((item 2 of item 1 of theFrame) as integer) & tab & ((item 1 of item 2 of theFrame) as integer) & tab & ((item 2 of item 2 of theFrame) as integer) & LF
end repeat

return out`;

/** Reads back the live profile of the session on `tty`, used to confirm a switch took. */
export function buildReadProfileScript(tty: string): string {
  return `tell application "iTerm2"
	repeat with theWindow in windows
		repeat with theTab in tabs of theWindow
			repeat with theSession in sessions of theTab
				if tty of theSession is "${escapeAppleScriptString(tty)}" then
					return (variable theSession named "profileName")
				end if
			end repeat
		end repeat
	end repeat
end tell
return ""`;
}

/**
 * The original Hammerspoon approach: drive the "Edit Session" panel through
 * System Events. Only used as a fallback when the escape sequence did not take,
 * and it needs Accessibility permission for Raycast.
 */
export function buildEditSessionScript(profileName: string): string {
  return `tell application "System Events"
	tell process "iTerm2"
		click menu item "Edit Session..." of menu "Session" of menu bar 1
		delay 0.2
		set value of combo box 1 of tab group 1 of group 1 of window 1 to "${escapeAppleScriptString(profileName)}"
		key code 36
		delay 0.1
		key code 53
	end tell
end tell`;
}
