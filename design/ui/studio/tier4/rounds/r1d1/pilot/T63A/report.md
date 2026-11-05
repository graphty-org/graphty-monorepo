# Pilot: T63 A (pantries + deliveries), where and when -- targeted re-pilot

Build: 037e96e9bb (`.study-builds/tier4-r1d1-037e96e9bb`). Start: `pantries-joined.txt` (13 nodes, 18
edges, two sources). Walked by clicks and keys only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T63A/

## Routes walked

Of the routes the fixes touched, only "T63A/T63B success path" belongs to this task, so this pass
walked the success path by pointer and the same path by keyboard (the earlier keyboard walk
replayed up to its first changed screen, then carried on by hand). The detours walk was not
repeated (see "Skipped").

## Result

Reached on both walks. The time ends designated as `opened`; latitude `lat` and longitude `lon` are
designated at load and read in Data > Fields > pantries.csv. The data stayed the pantries data the
whole way (13 nodes, 18 edges, P01 to P12 in the table, 13 nodes in the overview).

## 1. Success path, pointer (`success/`)

- 01: the start (the tool printed "the drawing is still moving" right after the setup).
- 02: hover "Set in Data" (inspector Values, "Time: opened") gives no tooltip.
- 03: click. The `opened` header gains a "Time" chip and keeps its text glyph and its text cells
  ("2015-03-02"), as decided ("a text-kind column reads as text whatever its role"). The clock
  button joins the canvas toolbar and the "Time: opened" row leaves the inspector. Fields does not
  open: pantries.csv stays collapsed, nothing is announced.
- 04: Expand pantries.csv: Time = opened, Latitude = lat, Longitude = lon.
- 05-09: the Time list ("Node time"): Escape closes it and keeps opened (06); Enter reopens it (07);
  Tab with nothing typed leaves the list open (08); Escape closes it, opened kept (09).

## 2. Keyboard only (`keys/`, started --keys with screen-reader output)

- Steps 1-42 replayed the earlier walk unchanged (Tab order from Main menu through the inspector).
- 43: Enter on "Set in Data" sets the time; focus moves to "About Direction"; nothing is announced.
- 44-46: F6 x4 to "Resize left panel", Shift+Tab x2 to "Expand pantries.csv", Enter.
- 47-48: Tab reads combobox "Rows are" "nodes", "Add to node fields", "Id" "id", "Node time"
  "opened", "Remove node time", "Node latitude column" "lat", "Remove node latitude",
  "Node longitude column" "lon", "Remove node longitude", "Add filter"; Shift+Tab walks back.
- 49-53: Enter opens the Time list (highlighted opened); ArrowDown then Escape keeps opened; Enter
  reopens it with "lat" the highlighted option for a screen reader while the screen marks opened
  (51); Tab leaves the list open (52); Escape closes it, Tab goes to "Remove node time" (53).
- Focus never fell to the page body.

## Mismatch with the answer key

- None that changes grading. The answer key's path note ("sets Time = opened in place: Fields does
  not open, nothing is announced") matches the screen. Against decided R10 ("Set in Data opens
  Fields with the Time row added and its column chosen"), Fields still does not open
  (success/03.png).

## Defects (none blocks the task or spoils its grading)

1. "Set in Data" still acts in place: Fields does not open, no tooltip, no notice, no live
   announcement, and the inspector's only confirmation row disappears (decided R10)
   (success/02.png, success/03.png, keys/43.png).
2. Keyboard focus after Enter on "Set in Data" lands on "About Direction", a control unrelated to
   the act (keys/43.png).
3. Tab in an open Time list with nothing typed leaves the list open and focus in it (decided: Tab
   closes the list and takes nothing) (success/08.png, keys/52.png).
4. After Escape and Enter the Time list reopens with "lat" as the screen reader's highlighted option
   while the screen marks "opened" (keys/51.png).
5. The session starts with "the drawing is still moving" after the setup (success/01.png).

## Skipped

- The detours walk (Map layout first, the table's column menu Role > Time, Fields "+" > Time): not in
  the targeted list for this pass; none of the routes the fixes touched is a T63 A detour.
- The other tasks' routes in the targeted list (T60 to T68 other than T63): they belong to other
  tasks' pilots.
