# Session r3-s22 -- Sam (keyboard-only analyst), task T12 B (Florentine families)

Task: open the ready-made Florentine families network, go to the Medici family, read what the
program knows about them, and say which families they married into and how many. Start: empty app.
Keyboard only: --key and --type, no pointer.

## Step 1 -- start

    node design/ui/studio/tool/real.mjs --start design/ui/studio/rounds/round-3/sessions/r3-s22 empty

01.png: start page. Start column (Open project or file... with a Ctrl+O hint, New from data...),
Recent projects (empty), Samples (Les Miserables, Zachary's karate club, College football,
Florentine families -- 15 families). A usage-data banner at the bottom (Share usage data / No thanks).
No focus ring anywhere: focus is on the page itself. I will press Tab and see where it lands.

## Step 2 -- Tab (1 press)

    --step ... --key Tab

02.png: focus is on the hamburger button top left, with a clear blue ring and a tooltip "Main
menu: open, save, export, settings". Good ring. Florentine families is at the far right of the
Samples column, so I expect a walk. Tab again to learn the order.

## Step 3 -- Tab (2 presses so far)

03.png: focus moved to "Local only" top right, ring visible, tooltip "Nothing is sent. Opens
Settings > Privacy". Fine. Next I expect Open project, New from data, then the samples. Two more Tabs.

## Step 4 -- Tab Tab (4 presses so far)

04.png: focus is on "New from data..." with a clear ring (it passed Open project). Next Tab
should reach the samples. One Tab, then see whether the sample list is one stop with arrow keys
or one stop per sample.

## Step 5 -- Tab (5 presses so far)

05.png: focus ring around the Les Miserables sample card. Florentine is three cards down. Lists
usually take arrow keys; I will try ArrowDown first.

## Step 6 -- ArrowDown (6 presses so far)

06.png: nothing moved; focus still on Les Miserables. Arrows do nothing here, so each card is
its own Tab stop. Minor -- I tried the list key, it was a wasted press. Three Tabs to Florentine.

## Step 7 -- Tab x3 (9 presses so far)

07.png: ring on the Florentine families card. Nine presses to reach it (one wasted on the arrow).
Enter to open it.

## Step 8 -- Enter (10 presses so far; 10 presses to open the sample)

08.png: the graph opened. Title "Florentine families", left panel with a "Find nodes, edges,
values" box, Selection, Everything; right panel Graph > Values > Overview (15 nodes, 20 edges,
undirected, density, 1 component). The drawing has 15 balls and NO names on them, so I cannot
tell which one is Medici from the picture. Toolbar at the bottom (flask, chart, 3D, magnifier).
Bottom left hint: "Analyze in the toolbar (Shift+A)".
I cannot see any focus ring after the sample opened -- focus may be on the page. The find box
is what I want. I will Tab once to find out where focus is.

## Step 9 -- Tab (1 press in this part)

09.png: focus landed on the main menu button at the very top left. So after opening the sample,
focus had been dropped to the page: I start the Tab walk again from the top. Finding: opening a
sample does not put focus anywhere useful (I would have liked it in the find box or the drawing).
The find box is a few stops away (title, undo, redo, Local only, Graph, Data...). Three Tabs.

## Step 10 -- Tab x3 (4 presses in this part)

10.png: a tooltip "Nothing to redo" under the redo arrow, so focus is on the greyed-out redo
button. I cannot see a ring around it -- only the tooltip tells me where I am. A disabled button
that still takes a Tab stop costs me a press. Two more Tabs toward Local only / Graph.

## Step 11 -- Tab x2 (6 presses in this part)

11.png: ring on the "Graph" icon in the left rail. Next should be Data or the find box. One Tab.

## Step 12 -- Tab (7 presses in this part)

12.png: ring on the find box "Find nodes, edges, values" (rail was one stop, good). Seven
presses from the top to reach it. I will type "Medici".

## Step 13 -- type "Medici" (6 keystrokes of text)

13.png: a results list appeared under the box: Elements -> "Medici", Values -> "Select where
name is Medici (1)". Nothing in the list looks highlighted yet, focus stays in the box. I expect
ArrowDown to move into the list. ArrowDown once.

## Step 14 -- ArrowDown (8 key presses + typing in this part)

14.png: the "Medici" row under Elements is highlighted (filled bar). Focus ring stays on the box,
which is what I expect from a search box with suggestions. Enter to go to Medici.

## Step 15 -- Enter (9 key presses + typing in this part)

15.png: Medici is selected: a yellow-ringed node in the middle of the drawing, "Selection 1" on
the left, and the right panel now says "Medici / Node" with a Summary: id Medici, name Medici,
Degree 6 with a ">" at the end of the row. A white outline sits around the whole Summary box --
that looks like where focus went, which is good: focus followed my choice to the details.
Degree 6 probably means six marriage ties, but I need the names. The ">" on Degree suggests it
opens the list. I will try ArrowDown to move inside the Summary to the Degree row.

## Step 16 -- ArrowDown (10 in this part)

16.png: no visible change. The arrow did nothing I can see; the white outline is still around
the whole Summary box. I am no longer sure that outline is focus at all -- it may just be a
"you are here" frame. Tab once to find out where focus really is.

## Step 17 -- Tab (11 in this part)

17.png: one Tab put a blue ring on the Degree 6 row. So the white frame was focus on the Summary
group, and Tab moves into its one control. Good, short. Enter on Degree to open what is behind
the ">".

## Step 18 -- Enter (12 key presses + typing "Medici" in this part)

18.png: the right panel switched to "Medici / Neighborhood" with a heading "Medici's 6
connections" and a list: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The
drawing now rings seven nodes in yellow (Medici and its six), and the left panel says
"Selection 7". The white focus frame moved onto the new list, so focus followed me again.
That is my answer. I stop here.

    node design/ui/studio/tool/real.mjs --end design/ui/studio/rounds/round-3/sessions/r3-s22

## Wrap-up (in character)

**Answer.** The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
Salviati and Tornabuoni. What the program knows about the Medici themselves is thin: an id and a
name (both "Medici") and a Degree of 6. Nothing else is recorded for them in this sample.

**Did I finish?** Yes, keyboard only, no pointer at any point.

**Ease: 6 of 7.** About 22 key presses plus typing one word: 10 to open the sample, 7 to get
back down to the find box, then type, ArrowDown, Enter, Tab, Enter. Every control I needed took
a key, the find box worked the way a search box should (type, arrow, Enter), and after I chose
Medici focus went to the details panel instead of being thrown away.

**What cost me presses or confused me:**
- After opening the sample, focus fell to the page. My next Tab started at the main menu at the
  very top and I walked seven stops back down to the find box. Putting focus in the find box (or
  printing a shortcut for it) would save that walk. I saw no shortcut hint on the find box.
- The greyed-out redo button takes a Tab stop, and its focus ring is hard to see -- only the
  "Nothing to redo" tooltip told me where I was.
- The sample cards on the start page do not answer arrow keys; each is its own Tab stop. Minor.
- The white frame around the Summary box: I could not tell at first whether it was focus. Arrow
  keys did nothing inside it; Tab went to the Degree row. Once I knew, it was fine.
- "Degree 6" is the key fact but the word is jargon to me; the ">" at the end of the row was the
  only hint that it opens the list of families. It did, and the heading "Medici's 6 connections"
  says it plainly. I took "connections" to mean marriages because the sample said so on the start
  page; the panel itself never says "married".
- The drawing has no names on the balls, so the picture alone could never have told me which
  one is Medici. The search box was the only way in, and it worked.
