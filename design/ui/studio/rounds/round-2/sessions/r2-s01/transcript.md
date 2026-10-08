# Session r2-s01 -- Sam (keyboard only), T10 Prompt B (College football)

Task as given: "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Keyboard only: --key, --type, --upload. No clicks, no points, no hovers.

## Step 1 -- start

Command: `node real.mjs --start r2-s01 empty` -> 01.png

Sam: A start page. Left: "Open project or file..." with a Ctrl+O hint, "New from data...". Right:
Samples, and College football (115 teams) is the third one. A usage-data banner at the bottom with
"Share usage data" / "No thanks". I cannot see any focus ring yet; focus is presumably on the page
itself. I will press Tab once to find out where it lands.

## Step 2 -- Tab (1 key)

Command: `--step --key Tab` -> 02.png

Sam: Focus landed on the hamburger menu, top left, with a clear blue ring and a tooltip "Main
menu: open, save, export, settings". Good, visible. The College football sample is on the far
right; I will keep pressing Tab and see the order. Next: Tab.

## Step 3 -- Tab (2 keys so far)

Command: `--step --key Tab` -> 03.png

Sam: Focus jumped to "Local only" top right, ring visible, tooltip about privacy. Header first,
then presumably the page body. Next: Tab again, hoping for "Open project or file...".

## Step 4 -- Tab (3 keys)

Command: `--step --key Tab` -> 04.png

Sam: "Open project or file..." has a clear ring. Next will likely be "New from data...", then the
samples. I will press Tab twice in a row (one past "New from data...") and look.

## Step 5 -- Tab, Tab (5 keys)

Command: `--step --key Tab --key Tab` -> 05.png

Sam: Focus on the Les Miserables sample card, ring clear. It looks like a list, so I will try
ArrowDown twice to reach College football rather than Tab.

## Step 6 -- ArrowDown, ArrowDown (7 keys)

Command: `--step --key ArrowDown --key ArrowDown` -> 06.png

Sam: Nothing moved; focus is still on Les Miserables. The samples look like a list but arrows do
nothing -- two wasted presses. Minor. Back to Tab: two more to reach College football.

## Step 7 -- Tab, Tab (9 keys)

Command: `--step --key Tab --key Tab` -> 07.png

Sam: College football has the ring. Nine presses to get here, two of them wasted on arrows. I will
press Enter to open it.

## Step 8 -- Enter (10 keys). Part 1, open the sample: DONE in 10 presses.

Command: `--step --key Enter` -> 08.png

Sam: The College football graph is open: 115 blue dots, no names, as the task says. Left panel with
a search box, "Selection", "Everything". Right panel "Graph -- From College football" with tabs
"Style" and "Values" (Values chosen), overview numbers. Toolbar at the bottom: a flask, a chart
icon, "3D", a magnifier. The usage banner is gone. I cannot see a focus ring anywhere -- I do not
know where focus went after Enter. Names on dots sounds like a Style thing, so the "Style" tab on
the right is my target. First I need to find focus: Tab once.

## Step 9 -- Tab (part 2 count: 1)

Command: `--step --key Tab` -> 09.png

Sam: Focus is on the flask button in the bottom toolbar: "Analyze Shift+A", ring visible. So
after Enter, focus was somewhere invisible (the drawing?) before this. Good that the tooltip
gives a shortcut. Analyze is not what I want. The Style tab is on the right; I will Tab through
the toolbar (chart, 3D, magnifier) -- four presses -- and see if it reaches the right panel.

## Step 10 -- Tab x4 (part 2 count: 5)

Command: `--step --key Tab --key Tab --key Tab --key Tab` -> 10.png

Sam: Focus is now on the "Overview" heading in the right panel -- I went one past the Style/Values
tabs, or the tabs came earlier in the order. I will Shift+Tab once, expecting the Values tab, then
ArrowLeft to Style.

## Step 11 -- Shift+Tab (part 2 count: 6)

Command: `--step --key Shift+Tab` -> 11.png

Sam: Ring on "Values". It looks like a segmented control / tab pair. ArrowLeft to Style.

## Step 12 -- ArrowLeft (part 2 count: 7)

Command: `--step --key ArrowLeft` -> 12.png

Sam: Arrow worked; the Style tab is chosen and focused. But this Style is for the whole Graph:
Canvas background, layout Method "Force - Recommended", Shape 3D/2D, Spring length, Gravity,
Advanced. Nothing about labels or names. The panel header says "Graph", so I think it shows
whatever is chosen on the left, and "Everything" on the left might be the node styling. I need to
get to "Everything" in the left panel. That is back the other way: Shift+Tab. I will press it six
times and see where I land (counting).

## Step 13 -- Shift+Tab x6 (part 2 count: 13)

Command: `--step --key Shift+Tab x6` -> 13.png

Sam: Ring on "Selection" in the left panel, so six back from Style landed here, skipping straight
past "Everything" -- this is probably a list with one tab stop. ArrowDown to "Everything", then
Enter.

## Step 14 -- ArrowDown (part 2 count: 14)

Command: `--step --key ArrowDown` -> 14.png

Sam: Ring moved to "Everything". The right panel still says "Graph", so focus alone does not pick
it. Enter to choose it.

## Step 15 -- Enter (part 2 count: 15)

Command: `--step --key Enter` -> 15.png

Sam: That is it. "Everything" is highlighted and the right panel now reads "Everything", Style
tab, Nodes/Edges switch, Fill, Shape, Effects, and a "Label" row with a "+" beside it. That "+" is
my target. Focus is still on "Everything" on the left, so I have to Tab all the way across the
toolbar into the right panel again. Tab x5 and look.

## Step 16 -- Tab x5 (part 2 count: 20)

Command: `--step --key Tab x5` -> 16.png

Sam: Ring on "Nodes" in the right panel. Between here and Label's "+" I count roughly ten
controls (Fill +, color, opacity, link, size, link, shape, Effects +, then Label +). Tab x5 and
look.

## Step 17 -- Tab x5 (part 2 count: 25)

Command: `--step --key Tab x5` -> 17.png

Sam: Ring on the link icon beside Color, tooltip "Color by attribute". Remaining before Label +:
size, size link, shape, Effects +. So five more Tabs should land on Label's "+".

## Step 18 -- Tab x5 (part 2 count: 30)

Command: `--step --key Tab x5` -> 18.png

Sam: Ring is on the word "Label" itself, which is a control of its own (the "+" is next). I will
press Enter on "Label" and see whether it opens the label settings.

## Step 19 -- Enter (part 2 count: 31)

Command: `--step --key Enter` -> 19.png

Sam: Enter on "Label" opened a "Label" picker: a "Find an attribute" box (looks focused) and a list
"id", "label", "value", with "id" highlighted. A row "Pick an attribute" appeared under Label in
the panel too. For team names I want "label" (id might be a number). ArrowDown once, then Enter.

## Step 20 -- ArrowDown (part 2 count: 32)

Command: `--step --key ArrowDown` -> 20.png

Sam: Highlight moved to "label". The arrow keys work in this list, as they should. Enter.

## Step 21 -- Enter (part 2 count: 33)

Command: `--step --key Enter` -> 21.png

Sam: Names appeared on the drawing: Georgia Tech, Maryland, Florida, Arizona, and so on, small but
readable. The picker closed and focus came back to a sensible place: a ring on an "Aa" button in
the new Label row ("Aa Above Abc label -"). Good focus handling. But there is a note under it:
"115 labels, 14 hidden to avoid overlap". The task says every team's name, so 14 missing is not
done. The "Aa" button with focus on it looks like text options; Enter to open it.

## Step 22 -- Enter (part 2 count: 34)

Command: `--step --key Enter` -> 22.png

Sam: "Aa" opened a "Label position" popover: a 3x3 grid of dots with the top-middle chosen. That
is position, not overlap. Not what I need. I cannot see clearly where focus is inside the
popover. Escape to close it, and I expect focus back on "Aa".

## Step 23 -- Escape (part 3 count: 1; part 2 "names written" done at 33)

Command: `--step --key Escape` -> 23.png

Sam: Popover closed and focus went back to "Aa" (tooltip "Label position"). Good. Names are on the
drawing, but the panel says 14 are hidden to avoid overlap. Part two -- getting names on at all --
took 33 presses after the graph opened. Now part three: the hidden 14. I will Tab forward through
the label row and see if the "14 hidden" note or something after it is a control. Tab x3.

## Step 24 -- Tab x3 (part 3 count: 4)

Command: `--step --key Tab x3` -> 24.png

Sam: Three Tabs went "Abc label", the "-" remove button, and now "Add Tooltip" (+). The
"14 hidden to avoid overlap" note is plain text, not a control -- nothing to press on it. The "+"
beside the Label heading looks dimmed now. My remaining guess in this row is the "Abc label"
field; maybe it has more options. Shift+Tab twice to it, then Enter.

## Step 25 -- Shift+Tab x2, Enter (part 3 count: 7)

Command: `--step --key Shift+Tab --key Shift+Tab --key Enter` -> 25.png

Sam: That just reopened the attribute picker ("In use: label", then id, value). Nothing about
overlap or showing all. Escape out, then try the "Label" heading itself -- it was a control
before; maybe now that a label exists it opens label settings.

## Step 26 -- Escape (part 3 count: 8)

Command: `--step --key Escape` -> 26.png

Sam: Back on "Abc label", ring visible. Shift+Tab twice should pass "Aa" and reach the "Label"
heading. Then Enter.

## Step 27 -- Shift+Tab x2 (part 3 count: 10)

Command: `--step --key Shift+Tab x2` -> 27.png

Sam: Hmm. Order was not what I thought: the second Shift+Tab put focus on the dimmed "+" beside
Label -- I only know because of its tooltip "One label line per row for now"; I cannot see a
ring on it. So that "+" is off. One more Shift+Tab, expecting the "Label" heading, then Enter.

## Step 28 -- Shift+Tab (part 3 count: 11)

Command: `--step --key Shift+Tab` -> 28.png

Sam: Ring on "Label". Enter.

## Step 29 -- Enter (part 3 count: 12)

Command: `--step --key Enter` -> 29.png

Sam: Nothing happened. Enter on "Label" does nothing now that a label exists. Nothing in this
panel offers "show all labels". The note says hidden "to avoid overlap", so maybe zooming in, or a
flat 2D view, lets them fit. Before another long Tab walk I will look for a shortcut list: "?" is
the usual key. Focus is on a button, so typing "?" should be safe.

## Step 30 -- ? (part 3 count: 13)

Commands: `--step --key Shift+Slash` (the tool refused the key name; not an app issue), then
`--step --key "?"` -> 30.png

Sam: "?" opened a "Keyboard shortcuts" dialog. Very welcome. Focus is on the close X (ring
visible). Categories on the left: All, Project, Selection, Settings and help, View, Analyze, Graph
tree, Data. Under View I see Legend L, Fit 0, Frame selection F, and the list goes on below. Also
"Quick actions Ctrl+K" -- a command palette, which might let me type "label". I want the rest of
View first: Tab into the category list and arrow down to View.

## Step 31 -- Tab (part 3 count: 14)

Command: `--step --key Tab` -> 31.png

Sam: Ring on "All". ArrowDown four times to "View" (and Enter if arrows only move focus).

## Step 32 -- ArrowDown x4 (part 3 count: 18)

Command: `--step --key ArrowDown x4` -> 32.png

Sam: Focus ring on "View" but the right side still shows All. Arrows move focus without choosing.
Enter.

## Step 33 -- Enter (part 3 count: 19)

Command: `--step --key Enter` -> 33.png

Sam: View shortcuts: Legend L, Fit 0, Frame selection F, Front 1, Side 3, Top 7, Switch between 2D
and 3D 5. No zoom in/out key and nothing about labels. A flat 2D drawing might spread the dots so
the labels fit. Escape to close, then press 5.

## Step 34 -- Escape (part 3 count: 20)

Command: `--step --key Escape` -> 34.png

Sam: Dialog closed, focus returned to "Label" exactly where I left it. Good. Now 5 for 2D.

## Step 35 -- 5 (part 3 count: 21). Part 3, every name showing: DONE.

Command: `--step --key 5` -> 35.png

Sam: The drawing went flat (toolbar now says "2D"), the dots spread out, and every dot has a name
next to it -- Vanderbilt, Kentucky, Wake Forest, Duke ... down to Colorado at the bottom, which
sits just above the toolbar. The panel note now reads "115 labels, 0 hidden to avoid overlap".
That is the task: every team's name next to its dot. The names are tiny at this size, but they
are all there. Done.

Command: `node real.mjs --end r2-s01`

## Wrap-up (in character)

**Finished?** Yes. All 115 team names are on the drawing, and the app itself confirms "0 hidden".

**Key presses.** About 64 in all: 10 to open the sample (two wasted on arrows in the sample list),
33 from the open graph to the first names appearing, 21 to get the last 14 names to show.

**Rating: 4 out of 7.** Every step worked from the keyboard, I never needed the trackball, focus
was almost always visible, and the app handed focus back properly after every popover and dialog.
That is better than most tools. What cost me was the route, not the keys.

**What confused me or cost me:**

1. **Names live under "Everything", not under the graph.** I opened the Style tab on the right
   first, and it was the Graph's style: canvas and layout only. Nothing told me that node styling
   (and Label) lives behind "Everything" in the left panel. I guessed it from the panel heading.
2. **Long Tab walks across the screen.** From "Everything" on the left to the Label control on the
   right was 15 Tabs, passing the whole bottom toolbar and every Fill and Shape control on the way.
   Choosing "Everything" did not move focus toward the panel it changed. There is no shortcut that
   jumps to the Style panel or to Label.
3. **"14 hidden to avoid overlap" with no way out from there.** The note told me exactly what was
   wrong, but it is plain text: not a control, and nothing near it offers "show all". I tried
   "Aa" (label position only), the attribute picker, and the Label heading (does nothing once a
   label exists). I found the fix only by guessing that a flat 2D view would make room, from the
   shortcut list. A reader with fewer hunches would stop at 14 missing and think they were done or
   stuck. If the note is going to say "hidden", it should offer the way to un-hide them.
4. **No zoom from the keyboard.** The shortcut list has Fit, Front, Side, Top and 2D/3D but no zoom
   in or out, so "zoom in until the labels fit" was not open to me.
5. **Small focus issues.** After opening the sample, focus was somewhere invisible (the drawing,
   I assume) until the first Tab landed on Analyze. The dimmed "+" beside Label takes focus but I
   could not see its ring; only its tooltip ("One label line per row for now") told me where I was.
   Arrow keys do nothing in the Samples list even though it looks like a list.
6. **Good things.** "?" opens a clear keyboard-shortcuts dialog with categories; tooltips show
   shortcuts (Analyze Shift+A); the attribute list works with arrows and Enter; Escape always
   returned focus to the control that opened the popover or dialog.
