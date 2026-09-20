/**
 * displayplacer knows the geometry of every screen but not what they are
 * called, so the names come from `NSScreen` through AppleScriptObjC. The join
 * key is `NSScreenNumber`, the `CGDirectDisplayID`, which is exactly what
 * displayplacer prints as the contextual screen id.
 */
export const SCREEN_NAMES_SCRIPT = `use framework "AppKit"
use scripting additions

set out to ""
repeat with theScreen in (current application's NSScreen's screens())
	set theNumber to (theScreen's deviceDescription()'s objectForKey:"NSScreenNumber")
	set out to out & (theNumber as integer) & tab & ((theScreen's localizedName()) as text) & linefeed
end repeat
return out`;
