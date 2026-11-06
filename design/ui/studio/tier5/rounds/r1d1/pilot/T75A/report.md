# T75 A pilot: a big network made readable (graph researchers)

Build 797a4f6b47 (served from `.study-builds/tier5-r1d1-797a4f6b47`), setup `researchers.txt`
(the Graph researchers sample open, 549 people, 2,084 ties). Targeted re-walk after a fix pass:
the pointer success path, and the one route the fixes touched that belongs to this task (the
Largest component card, then Done). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75A/.

Result: reached. Both walks end at "105 of 549 nodes, 869 of 2,084 edges", the answer key's
success count; the network still holds all 549 (nothing deleted). Nothing crashed, no script
error or failed request was printed, and nothing blocks the task.

## Success path, by pointer (success/)

Data; Add filter; type "degree"; Enter; type 10; Enter (02.png, 03.png: "112 of 549");
Condition...; type "component" (04.png); Connected components: Piece size (05.png); Advanced
(06.png); So far (07.png); click the "from" box, type 100, Enter (08.png: "105 of 549"); Done
(09.png). 14 steps, as the key says.

After Done the node table reads "105 of 549 nodes", Shown, matching the picture (09.png): the
earlier mismatch, where the table kept the card's "Matches only" list of 549, is gone.

Mismatches with the answer key: none in counts or steps. The key's notes still hold on screen:
the step row is cut to "Connect... m... So far" (08.png, 09.png) and the table's "Connected
components" column reads "Group 1", not the piece size (05.png to 09.png).

## Touched route: a second card with Largest component, then Done (touched-8/)

Replayed from the earlier pass's detour walk; it diverged at its first step only because the
table now shows "112 of 549 nodes, Shown" instead of the old "Matches only" rows (02.png), which is
the fix. Carried on by hand:

- Add filter; type "largest"; Enter (03.png): the new card reads the whole graph, "549 of 549";
  the top bar stays "112 of 549".
- Done (04.png): two cards; the top bar, the Values tab ("Nodes showing 112 of 549") and the table
  ("112 of 549 nodes, Shown") all agree. The picture still shows the two small separate bunches at
  the right. A participant who stops here reports 112, graded P by the key.
- Click on the "Degree min 10" card: opens nothing, swaps the card's count for Edit (05.png); the
  Largest card now shows "549 of 549", which at least says it removed no one. Edit opens it.
- Condition...; "component"; Largest component inside the same card (08.png): still 112, and the
  step has no Advanced, so it cannot be computed on what is left (known; key grades P).
- The value box changed to Connected components: Piece size; Advanced; So far (10.png); type 100,
  Tab (11.png: moves to the "to" box, count 105); Escape (12.png: closes Advanced and keeps the
  value); Done (13.png): "105 of 549", table 105 Shown. The card list keeps the useless Largest
  component card at "549 of 549".

Fields: Enter in the Degree and Piece size boxes applies the number; Tab applies and moves to
"to"; Escape closes the Advanced section and keeps the typed value.

## Defects seen (none spoil the grade)

- Largest component offers no So far, and nothing on screen says why it keeps all 112 (touched-8
  08.png). Known, and P in the key; a participant who takes it reports 112.
- The value picker flips up over the workspace header and covers Done while a search narrows it
  (success 04.png, touched-8 06.png). Known.
- After Done, a card the pointer is not on shows Edit in place of its count (touched-8 04.png, the
  Largest card), so its count cannot be read until another card is clicked.
- The picker lists both "Connected components: Piece" and "Connected components: Piece size"
  (touched-8 09.png); the first is easy to take by mistake with Enter, since it is highlighted.
- The key over the canvas reads "Draw order: graphty.style.json.node.el.drawOrder" from the start
  (success 01.png). Known (backlog).
- The open card repeats its own name as its first step ("Degree min 10" over "Degree min 10",
  success 04.png to 08.png).
