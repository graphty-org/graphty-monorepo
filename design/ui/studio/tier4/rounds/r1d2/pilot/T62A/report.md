# Pilot: T62 A (pantries.csv, "which site opened most recently") -- targeted re-walk

Build: bccf8fe47f (frozen, served from .study-builds/tier4-r1d2-bccf8fe47f). Start: setup
`pantries.txt` (pantries.csv open on its own, Data place showing, the table open). All screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T62A/.
The data stayed the task's own on every walk: 12 sites, P01-P12, no edges.

Every walk was started by replaying the walk of the same route on the previous frozen build
(ff17391bb1), each in its own session. All four matched every check point to the end (exit 0),
so every screen below is this build's own.

Result: reached by pointer and by keyboard. Answer on screen: **Bayview Clinic** (P12, Mar 8,
2023), with `opened`'s kind set to date (calendar glyph in the header).

## Route 1: success path by pointer (b1-path)

All 7 steps matched. Start: `opened` reads Aa with ISO text "2015-03-02"; the inspector shows
"Time: opened" with "Set in Data" (b1-path/01.png). Header "Options for opened" > Type > date turns
the glyph to a calendar and the cells to "Mar 2, 2015"; "Options for opened" > Sort descending
gives "Sorted by opened, newest first" with P12 Bayview Clinic, Mar 8, 2023 on top
(b1-path/06.png). Path steps: 5, as the answer key says.

## Route 2a: detour, the inspector's "Set in Data" (b2-detour-inspector)

All 11 steps matched. "Set in Data" sets the node Time to `opened`: Fields gains a Time row, the
canvas toolbar gains a clock button, the header reads "Aa Time opened" and the cells stay ISO text
(the decided behavior: a text-kind column reads as text whatever its role). Header clicks sort
"A to Z" / "Z to A" and put Bayview Clinic on top. Escape in the Time row's list keeps the value;
Fields "+" > Kind adds an empty row that Escape takes back. Header menu > Type > date then sets the
kind: calendar glyph, "Mar 8, 2023", "Sorted by opened, newest first"
(b2-detour-inspector/12.png).

## Route 2b: detour, Data > Fields "+" > Time > opened (b3-detour-fields)

All 12 steps matched. Fields "+" > Time adds an empty Time row with its list open; choosing
`opened` gives the same state as 2a: header "Aa Time opened", ISO cells, the header menu's Type
still checks text, with number and yes/no marked "12 will not convert" (b3-detour-fields/07.png).
Right-click on the header opens the same header menu; right-click on the source row offers nothing
about a column's kind; Escape closes each menu (b3-detour-fields/13.png).

## Route 3: success path by keyboard only (b4-keys, --keys --sr)

All 73 steps matched, so the Tab order and findings of the earlier walks stand. Focus fell to the
page body only at the start, before the first key (nothing focused on load); never during the walk.
ArrowRight walks the grid headers to "text opened"; Shift+F10 opens the header menu at Type;
ArrowRight, ArrowDown to "date", Enter sets the kind; Shift+F10 > Sort descending gives
"Sorted by opened, newest first"; arrows reach the cell "Bayview Clinic" and Enter selects P12
(b4-keys/60.png; the inspector shows P12, site Bayview Clinic).

## Routes in the fix list

None of the listed routes (T61A/B, T65A/B, T66A/B, T67A/B, T68A/B) belongs to T62 A: they use
other files and other places of the app (the second-file flow, condition cards, the Data source
card, data issues, export). Each is walked on this same build in its own task's pilot, so they were
not walked again here.

## Mismatches between the answer key and the screen

None on the success path.

## Defects (crash, block or a wrong result that spoils grading)

None on the pointer success path or the two detours.

Keyboard (carried, unchanged on this build): the header menu, the only place that sets a column's
kind, opens only with Shift+F10; the "..." button is not a Tab or arrow stop and nothing on screen
names the key (b4-keys/49.png, 50.png). A keyboard participant who does not know Shift+F10 cannot
reach Type.
