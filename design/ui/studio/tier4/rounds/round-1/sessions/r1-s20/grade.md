Grade: S
False done: 0
Wrong turns: 2
Steps: 11 (17 actions; path steps: 1, the inspector's "Set in Data"; success reached at step 1, the other 10 checked the place columns and the counts)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 27 calls checked over 1 transcript)
Opened Fields to check the place: no (checked it in the lat and lon header menus, Role)

# r1-s20 -- T63 B, Tom (returning user), build 79ed770292

## Result

The last screenshot (12.png) shows the joined gauges network with the `installed` header carrying
the "Time" chip, and the inspector's Overview no longer offering "Time: installed / Set in Data"
(it did at the start, 01.png). `data.json` agrees: `knownFields.nodeTimePath` is `installed` and the
`installed` column's roles are `["time"]`. Its kind stays text (`Aa`, type `string`), which T63 does
not ask to change. No column was changed to a wrong kind. No file was saved (no `downloads/`).

The report names `installed` for when and `lat` and `lon` for where, and says Latitude and Longitude
were already ticked in each column's Role menu (05.png, 08.png). That matches the key: the time
designated as `installed`, the place left as the program set it at load and named in the report: S.

`data.json` lists no role on `lat` or `lon` (`roles: []`), while their Role menus tick Latitude and
Longitude; the place the program set at load is not among the roles the end-state records. The
grade rests on the Role menus on screen and on the report, as the key allows ("leaving it is
right; only the report shows whether the participant knows it").

## Route against the success path

The path is the inspector's Overview "Set in Data" (one action). The participant took:

1. "Set in Data" (02.png: the Time chip on `installed`, the timeline button on the toolbar). Success
   state reached here.
2. Clicked the `lat` header, meaning to open it; it sorted the table by lat, highest first. Left in
   place, not wanted. **Wrong turn 1.**
3. "Options for lat" (04.png: Type, Role, Rename, Hide ...).
4. Role (05.png: Latitude ticked, the green highlight on None).
5. Latitude, already ticked (06.png: nothing changed, no notice).
6. Options for lat > Role again (07.png: still Latitude), to see whether step 5 undid it.
7. Escape twice, hover on lon (tooltip "92% filled 11 unique -73.24 to -73.13"), Options for lon >
   Role (08.png: Longitude ticked).
8. Escape twice, "With issues 11" (09.png: the chip on; two cells orange).
9. Scrolled the table (10.png: 11 rows, G01 to G11; "12 nodes" in the bar).
10. The Sources row's "1 issue in flows.csv" (11.png: "edges, 1 unknown end", Add nodes / Leave out /
    Ignore).
11. Close panel with nothing picked (12.png). **Wrong turn 2.**

Steps 3 to 7 check the place columns, which the task invites; they are not counted as wrong turns.
The "With issues" chip (step 8) was left on and fed the participant's wrong count in step 9 (problem
1 below). The participant said done only with the Time chip on screen and the Role ticks seen: no
false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 3 | build-defect | The table's "With issues 11" chip counts 11 rows while only two cells are flagged (Willow Run's leading spaces, Stone Weir's "-"), and turning it on narrows the Nodes table to G01-G11, dropping G12 -- the one row whose record has a real problem (the unknown end in flows.csv) -- while the bar still reads "12 nodes" and nothing says the table is narrowed. Tom counted the narrowed table and concluded "12 nodes but my gauge list has 11 rows", misreading why. Reproduced: with the chip off the table ends at an empty G12 row (repro 02.png); with it on it ends at G11 (repro 04.png). | Steps 8-9, 09.png, 10.png; repro `repro/r1-s20.sh`, `repro/r1-s20/02.png`, `04.png` |
| 2 | 2 | behavior | `lat` and `lon` carry Latitude and Longitude in their Role menus but no chip on their headers, unlike `installed`'s "Time" chip; the participant could not tell at a glance whether the place was set or guessed, and had to open two menus. Same as r1-s19 (T63 A) and its repro. | Steps 4-7, 05.png, 08.png, 12.png; `repro/r1-s19.sh` |
| 3 | 2 | behavior | Clicking the already-ticked Latitude does nothing and says nothing: no notice, no chip, the tick unchanged. The participant reopened the menu to learn whether he had just undone it. Reproduced. | Steps 5-6, 06.png, 07.png; `repro/r1-s20/05.png`, `06.png` |
| 4 | 2 | behavior | In the Role submenu the green highlight sits on "None" while the tick is on Latitude (and on Longitude for lon); for a moment the participant read the role as None. | Step 4, 05.png, 08.png; `repro/r1-s20/06.png` |
| 5 | 2 | behavior | "Set in Data" sets the time with no notice; the participant only noticed the small "Time" chip on the header afterwards. | Step 1, 02.png; end-of-session notes |
| 6 | 2 | wording | The issue panel says "edges, 1 unknown end" and offers Add nodes / Leave out / Ignore without naming the end (G12) or the edge (G09 to G12); the participant could not tell which gauge it was and pressed nothing. | Step 10, 11.png |
| 7 | 1 | opinion | Nothing showed the gauges on a map, so the participant trusted the Role ticks without seeing the place used. | End-of-session notes |

Problem 1 is a severity 3 candidate confirmed by one session plus a scripted repro. Problem 2 is
confirmed by two sessions on different task halves (r1-s19 and this one).
