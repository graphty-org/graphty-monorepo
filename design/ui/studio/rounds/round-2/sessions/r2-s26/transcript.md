# Session r2-s26 -- Sam (keyboard-only analyst), task T12, Prompt B (Florentine families)

Start: empty. Keyboard only: --key, --type, --upload. Build 4a7a1a7fbdba (graphty 0.8.53).

```
node tool/real.mjs --start rounds/round-2/sessions/r2-s26 empty
01.png
```

**Sam (01.png):** Start screen. No focus ring visible anywhere; focus is on the page itself, I assume. I can see "Florentine families" under Samples on the right, and a usage-data card at the bottom. I will press Tab once to find where focus starts.

**Sam:** Pressing Tab once to see where focus lands first.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/02.png
exit 0
```

**Sam (02.png):** Tab 1: focus is on the main menu button top left, blue ring visible, tooltip "Main menu: open, save, export, settings". Good. I want Florentine families on the right; Tab again.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/03.png
exit 0
```

**Sam (03.png):** Tab 2: focus jumped to "Local only" at the top right (tooltip "Nothing is sent. Opens Settings > Privacy"). Fine, header first. Tab again, expecting the Start column next.

**Sam:** (Tab 3)

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/04.png
exit 0
```

**Sam:** (04.png) Tab 3 landed on 'Open project or file...', clear ring. Samples are probably after New from data. Tab.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/05.png
exit 0
```

**Sam:** (05.png) Tab 4: 'New from data...' has focus. Tab again, hoping for Les Miserables next.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/06.png
exit 0
```

**Sam:** (06.png) Tab 5: Les Miserables card has focus. This looks like a list, so I try ArrowDown to move down it instead of Tab.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key ArrowDown
rounds/round-2/sessions/r2-s26/07.png
exit 0
```

**Sam:** (07.png) ArrowDown did nothing; focus still on Les Miserables. Not an arrow-key list, so plain Tab. Florentine is three cards down: Tab, Tab, Tab.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab --key Tab --key Tab
rounds/round-2/sessions/r2-s26/08.png
exit 0
```

**Sam:** (08.png) Florentine families has the ring. That was 8 Tabs plus one wasted ArrowDown. Enter to open it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Enter
rounds/round-2/sessions/r2-s26/09.png
exit 0
```

**Sam:** (09.png) The network opened: 15 nodes, 20 edges, no names on the dots. I cannot see any focus ring now; focus seems to have fallen to nowhere. There is a 'Find nodes, edges, values' box at the top left, which is how I would get to Medici without a pointer. I press Tab once to find out where focus is.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/10.png
exit 0
```

**Sam:** (10.png) Focus landed on the Analyze button in the bottom toolbar (tooltip 'Analyze Shift+A'), so focus had been sitting somewhere just before the toolbar. The magnifier at the right end of the toolbar is probably search; I Tab across to read its tooltip and any shortcut.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/11.png
exit 0
```

**Sam:** (11.png) Tab skipped the rest of the toolbar and went to the 'From Florentine families' link in the right column. So the toolbar is one stop with arrow keys inside, I guess. Shift+Tab back to it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Shift+Tab
rounds/round-2/sessions/r2-s26/12.png
exit 0
```

**Sam:** (12.png) Back on Analyze. ArrowRight three times should walk to the magnifier.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key ArrowRight --key ArrowRight --key ArrowRight
rounds/round-2/sessions/r2-s26/13.png
exit 0
```

**Sam:** (13.png) The magnifier is 'Quick actions Ctrl+K', not a node search. The box I want is 'Find nodes, edges, values' at the top left. It is before the toolbar in reading order, so Shift+Tab backwards toward it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Shift+Tab
rounds/round-2/sessions/r2-s26/14.png
exit 0
```

**Sam:** (14.png) Focus is somewhere I cannot see: no ring anywhere. Probably the drawing itself, which shows no focus indicator. That is a finding. Shift+Tab again.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Shift+Tab
rounds/round-2/sessions/r2-s26/15.png
exit 0
```

**Sam:** (15.png) A blue bar lit up on the edge of the left column: a resize handle, I think. Keep going back: Shift+Tab.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Shift+Tab
rounds/round-2/sessions/r2-s26/16.png
exit 0
```

**Sam:** (16.png) Focus on 'Selection' in the left list (it skipped Everything, so that list is one stop too). One more Shift+Tab should reach the find box.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Shift+Tab
rounds/round-2/sessions/r2-s26/17.png
exit 0
```

**Sam:** (17.png) Find box has the ring. Getting here after the network opened took 9 presses (Tab, Tab, Shift+Tab, 3 arrows, 4 Shift+Tab), mostly because focus started down at the toolbar and the box shows no shortcut. Type Medici.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --type Medici
rounds/round-2/sessions/r2-s26/18.png
exit 0
```

**Sam:** (18.png) Results appeared under the box: Elements 'Medici', Values 'Select where name is Medici (1)'. Nothing looks highlighted as the current option. ArrowDown to move into the results.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key ArrowDown
rounds/round-2/sessions/r2-s26/19.png
exit 0
```

**Sam:** (19.png) 'Medici' under Elements is now highlighted. Enter to go to it.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Enter
rounds/round-2/sessions/r2-s26/20.png
exit 0
```

**Sam:** (20.png) Enter worked: Medici is ringed in yellow on the drawing, and the right column now reads Medici, Node: id Medici, name Medici, Degree 6 with a '>' arrow. Focus moved there by itself; a white ring is around the whole Summary box. Parts 1 and 2 done (going to Medici: 9 presses after load plus typing, ArrowDown, Enter). The Degree row's arrow probably lists the 6 neighbors. ArrowDown to move inside the box.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key ArrowDown
rounds/round-2/sessions/r2-s26/21.png
exit 0
```

**Sam:** (21.png) ArrowDown changed nothing I can see. Maybe the white box is not focus at all, just a border. Tab to find out.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Tab
rounds/round-2/sessions/r2-s26/22.png
exit 0
```

**Sam:** (22.png) One Tab put a blue ring on the Degree 6 row. So the white box was the Summary area holding focus. Enter on Degree to open the list behind the arrow.

```
node tool/real.mjs --step rounds/round-2/sessions/r2-s26 --key Enter
rounds/round-2/sessions/r2-s26/23.png
exit 0
```

**Sam (23.png):** Enter opened "Medici, Neighborhood" in the right column: "Medici's 6 connections" -- Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The drawing rings Medici and six dots in yellow, and Selection on the left now says 7 (Medici plus six). Focus went into the new list by itself (white box around it), so I was not thrown back to the top. Part 3 done: 2 presses (Tab, Enter) plus one wasted ArrowDown. That is the answer, so I stop.

```
node tool/real.mjs --end rounds/round-2/sessions/r2-s26
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s26
```

## End of session, in Sam's words

**Did I finish?** Yes. The Medici family married into 6 families: Acciaiuoli, Albizzi, Barbadori,
Ridolfi, Salviati and Tornabuoni. What the program knows about Medici: id "Medici", name "Medici",
Degree 6. All read off the screen, all by keyboard; I never needed the trackball.

**Key presses:** opening the sample took 9 (8 Tabs, Enter) plus one ArrowDown that did nothing.
Getting to Medici took 9 presses to reach the find box, the typing, ArrowDown and Enter. Reading
him and his marriages took 3 more (one dead ArrowDown, Tab, Enter). About 23 presses in all, 3 of
them wasted.

**Rating:** 5 out of 7 (somewhat easy).

**What slowed or confused me:**

- After the network opened, I could not see focus anywhere. My first Tab landed on the Analyze
  button in the bottom toolbar, so focus had been parked somewhere invisible just before it. The
  find box I wanted was at the top left, and I walked back to it with four Shift+Tabs, one of
  which landed on the drawing with no ring at all (14.png). A visible ring on the drawing, or focus
  starting in the find box, would have saved most of those presses.
- The find box prints no shortcut. The toolbar's magnifier says "Quick actions Ctrl+K", which I
  first took for search; the node search itself has no key I could learn.
- The sample cards look like a list but do not answer the arrow keys; only Tab moves between them.
- After choosing Medici, a white box went around the whole Summary area. It turned out to be
  focus, but it looks like a border, and ArrowDown inside it did nothing; Tab was needed to reach
  the Degree row.
- Good: the find results take ArrowDown and Enter, focus follows the selection into the right
  column, the Degree row opens the neighbor list with Enter, and the list names the count
  ("Medici's 6 connections"). Toolbar tooltips print their shortcuts (Analyze Shift+A).
