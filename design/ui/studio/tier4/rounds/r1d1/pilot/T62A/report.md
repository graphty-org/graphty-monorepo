# Pilot: T62 A (pantries.csv, "which site opened most recently") -- targeted re-walk

Build: ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing, the table open). All screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Each walk was started by replaying the newest earlier walk of the same route on this build, each in
its own session. All four matched every check point to the end (exit 0), so every screen below is
this build's own.

Result: reached by pointer and by keyboard. Answer on screen: **Bayview Clinic** (P12, Mar 8,
2023), with `opened`'s kind set to date (calendar glyph in the header).

## Route 1: success path by pointer (h1-path) -- Type > date

All 7 steps matched. Start: `opened` reads Aa with ISO text "2015-03-02"; the inspector shows
"Time: opened" with "Set in Data" (h1-path/01.png). Header "Options for opened" > Type > date turns
the glyph to a calendar and the cells to "Mar 2, 2015"; "Options for opened" > Sort descending
gives "Sorted by opened, newest first" with P12 Bayview Clinic, Mar 8, 2023 on top (h1-path/06.png).
Path steps: 5, as the answer key says.

## Route 2a: detour, the inspector's "Set in Data" (h2-inspector)

All 11 steps matched. "Set in Data" sets the node Time to `opened` at once: Fields gains a Time row,
the canvas toolbar gains a clock button, the header reads "Aa Time opened", the cells stay ISO text
and the kind stays text (h2-inspector/02.png) -- the decided behavior (a text-kind column reads as
text whatever its role, with the Time chip). Two header clicks sort "A to Z" then "Z to A" with
Bayview Clinic (2023-03-08) on top. Escape in the Time row's list keeps the value; Fields "+" > Kind
adds an empty Kind row, Escape takes it back. Header menu > Type > date then sets the kind: calendar
glyph, "Mar 8, 2023", "newest first" (h2-inspector/12.png).

## Route 2b: detour, Data > Fields "+" > Time > opened (h3-fields)

All 12 steps matched. Fields "+" > Time adds an empty Time row with its list open; Enter with the
pointer off the list takes nothing; choosing `opened` gives the same state as 2a (header
"Aa Time opened", ISO cells); the header menu's Type still checks text, with "12 will not convert"
beside number and yes/no (h3-fields/07.png); Role checks Time. Right-click on the header opens the
same header menu; right-click on the source row lists Replace with file..., Select nodes, Export...,
Rename, Remove -- nothing about a column's kind.

## Route 3: success path by keyboard only (h4-keys, keyboard-only and screen-reader mode)

All 73 steps matched, so the Tab order and findings of the earlier keyboard walk stand (focus never
fell to the page body). ArrowRight walks the headers to "text opened"; Shift+F10 opens the header
menu; Type > date; Shift+F10 > Sort descending; the cell "Bayview Clinic" is reached by arrows and
Enter selects P12 (h4-keys/60.png).

## Routes in the fix list

Of the fix list, the T62 success path (Type > date) is Route 1 and the T62 detours (Set in Data,
Fields) are Routes 2a and 2b. Every other route on the list belongs to another task (T60, T61,
T62 B, T63-T68) and was left to that task's pilot.

## Mismatches between the answer key and the screen

None on the success path. The answer key's note for the Set in Data and Fields routes (ISO text under
a "Time" chip, a header click sorting "A to Z" / "Z to A") matches this build.

## Defects (crash, block or a wrong result that spoils grading)

None on the pointer success path or the two detours.

Keyboard (carried, unchanged on this build): the header menu, the only place that sets a column's
kind, opens only with Shift+F10 (or the ContextMenu key); the "..." button is not a Tab or arrow stop
and nothing on screen names the key (h4-keys/48.png, 49.png). A keyboard participant who does not
know the menu key cannot reach Type.
