# Pilot walk: T93 B, take the genes outside the big tangle out for good

Build 8fa33aa786, served from `.study-builds/tier6-r1-8fa33aa786`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T93B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml on every walk: 331 nodes and 361 edges
before Remove, 249 and 298 after (`data.json` of keyboard, detour-2 and detour-3).

Result: the task can be reached by pointer and by keyboard. The request the task exists to test is
on screen every time and its title is right: "Remove 82 nodes and 63 edges?", against the lab mate's
twenty. The chip under that title is the main problem: on most cards it says 361 edges and selects
every edge in the network.

Model calls: success 4, keyboard 5, detour-1 9, detour-2 11, detour-3 21.

## Success path, by pointer (success/)

1. Assistant on the rail. The panel opens with focus in the composer (02.png).
2. Typed the request with the lab mate's guess, Enter. Within 20 seconds the reply gave 249 and 82,
   and the section above the composer read "Remove 82 nodes and 63 edges?", "Undo can bring them
   back.", chips 82 and 361, Remove, Change this, Keep them. Remove was the one primary button and
   Send was quiet, as decided. Nothing had changed on the canvas (03.png).
3. Hovering 82 lit the drawing without selecting it (04.png). Hovering 361 gave the identical
   picture, byte for byte (05.png). Steps opened to Separate pieces and Edit data (06.png).
4. Remove. The chips and the Overview read 249 and 298, Components 1. The change line read "Removed
   82 nodes and 63 edges", with Open run and Undo (07.png). The Data place read the same (08.png).
5. Composer keys: Enter when empty does nothing (09.png); Tab goes to the model label (10.png);
   Escape keeps typed text (11.png). All as `decided.md` says.
6. Undo brought back 331 and 361 and the row read Undone (13.png). The 82 nodes came back selected
   (14.png; see the defects).

## Mismatches with the answer key

- The key's B row gives only the title. B also shows "Undo can bring them back."
  (success/03.png), which the key gives for A alone.
- The key says nothing about the card's chips. They disagree with its numbers: the chip reads 361
  where the title and the key read 63 (success/03.png).

The rest matched: 82 and 63 on the request, 249 and 298 if removed, 331 and 361 if kept, the three
buttons, and a path of four or five steps.

## Keyboard walk (keyboard/, started --keys --sr, reached the end)

Focus fell to the page body only at the start, where the setup leaves it by design.

Tab from the top: Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Graph.
ArrowDown to Assistant, Enter: textbox "Message the assistant". Typing and Enter kept focus there.
The polite region said "Working", then "Connected components finished: 10 groups", then "Waiting for
your approval: Remove 82 nodes and 63 edges?".

Shift+Tab from the composer, as decided: Keep them, Change this, Remove, "82 nodes, select", Undo,
Open run, "3 steps". Escape in the composer while the request waited kept focus and the request. On
the chip, ArrowRight reached "361 edges, select", and ArrowRight again came back. Enter on Remove:
focus moved to the composer, the region said "249 nodes, 298 edges", "Working", then "Computed
Separate pieces for 331 nodes. Removed 82 nodes and 63 edges. Answer ready". `data.json`: 249 and 298.

## Detours

**Detour 1, the count looks wrong: Change this, ask why, Keep them (detour-1/).** Change this took
focus to the composer and started a model turn with no field or hint (03.png). The reply was rewritten,
and the row read "Declined. Nothing changed." (04.png). "Why is it not about twenty?" gave the
breakdown 7, four of 5, four of 4, seven of 3, nine of 2, which adds to 82 in 25 pieces. It also
colored the drawing, with a key card of Group 1 to Group 8 and Other 47 (05.png). Asking to take them
out brought the request back (06.png). Keep them left 331 and 361, but the reply asked the reader to
confirm a prompt that had just gone (07.png).

**Detour 2, checking the count before answering (detour-2/).** This card had only the 82 chip.
Clicking it selected the 82; Selection 82 replaced Whole graph on the scope line, the inspector read
"Edges joining these nodes 63" and the drawing shifted (03, 04.png). The x on the scope line kept the
selection and offered Use selection (05.png); a click on empty canvas cleared it (07.png). Open run
showed Connected components on an empty Style tab (09.png). Values there read Groups 10, with sizes
249, 7, 5, 5, 5, 5, 4, 4, 4, 4 (12.png). Clicking the active rail button closed the panel: a dot on
Assistant and a lasting notice "Waiting: remove 82 nodes and 63 edges" with Open (10.png), as decided.
Open came back. Asking a question while the request waited cancelled the request, removed the earlier
reply, and left "Not run: you sent a new message." (14.png). Asked again; the card returned (15.png).
Undo on the first turn left the card standing with "Not in this graph" and a live Remove (16.png).
Remove there gave "Not run: the graph changed.", and the model ran the analysis again and asked
again (18.png). The second Remove gave 249 and 298.

**Detour 3, looking elsewhere, then a stray selection (detour-3/).** Find with "big tangle": no match,
with a rule offered as an example (02.png); Enter changes nothing; Escape clears it (03.png). Main menu
has no AI entry (04.png). A right-click hit an edge and selected it; the context menu has no AI entry
and no way to remove anything (05.png). Going to Assistant with that edge selected showed Selection 1
(06.png). The request then failed: the selection was cleared unasked, and the reply said nothing was
removed because of the active selection, under a scope line reading Whole graph, with "Edit data
failed. Nothing changed." and Send again (09.png). Send again failed the same way, and took away the
first reply's explanation (10, 11.png). A new message naming the whole network worked (12.png). On
that card, 361 selected "82 nodes, 361 edges" (13.png). After Remove, 298 edges stayed selected and
the scope line read Selection 298 (14.png).

## Defects

Severity 0 to 4, each from the walk named.

1. **Severity 3. The card's edge chip says 361 where the card says 63, and acts on every edge.**
   success/03.png, keyboard/22.png, detour-1/02.png, detour-1/06.png, detour-3/12.png. Clicking it
   selected all 361 edges, and the inspector said "82 nodes, 361 edges selected" (detour-3/13.png). This
   is the count the task is about, so a reader who checks the card sees the whole network's edges going.
   It appeared on five of the eight cards walked; the other three had the 82 chip alone (detour-2/02,
   15, 18.png). The chip shows a live count of the request's target (`useLiveCount`, Checks.tsx), not
   the measured `preview.removeEdges` the title uses. Why that target counts every edge on some cards
   was not traced.
2. **Severity 3. Hovering the card's chips peeks at the wrong edges.** success/04.png and 05.png are
   the same image: edges inside the big tangle are drawn dotted, though none of them would go. The
   peek tells the reader the removal reaches the tangle, which is false.
3. **Severity 3. The run's own numbers contradict the count.** detour-2/12.png: Groups 10 beside
   Overview Components 26, and the listed sizes add to 292 of 331, so groups 2 to 10 hold 43 where
   the card says 82. The screen reader hears the same "10 groups" (keyboard walk). Nothing says the
   list stops at ten. A reader checking the count through Open run gets a different answer. The key
   card has the same shape, Group 1 to Group 8 and Other 47 (detour-1/05.png).
4. **Severity 3. A stray selection fails the request and the offered way out cannot work.**
   detour-3/09.png to 11.png. One edge selected by a right-click scopes a request about nodes. The
   selection is cleared unasked, "Selected 0 nodes" appears twice as a change, the reply says to clear a
   selection that no longer exists under a scope line reading Whole graph, and Send again fails the
   same way. The same defect as T91 B's; it blocks here too.
5. **Severity 2. The reply and the card disagree on whether this can be undone.** keyboard/22.png:
   "an irreversible change" directly above "Undo can bring them back."; detour-1/06.png the same.
   Every other reply says "permanently", with Undo beside it after Remove (success/07.png).
6. **Severity 2. A question while a request waits cancels it and erases the reply.** detour-2/14.png.
   The prompt's own detour: a reader who doubts the count asks about it. The card goes with no
   warning, and "Not run: you sent a new message." does not say what was not run. The reply that
   held the numbers is gone, against "No turn folds" in `decided.md`.
7. **Severity 2. A turn's earlier words are replaced when it resumes.** success/06.png against
   07.png, detour-1/02.png against 04.png, detour-3/09.png against 10.png. The prose is rewritten or
   dropped without a sign. In detour-3 the only explanation of the failure goes.
8. **Severity 2. After Keep them the reply asks the reader to confirm a prompt that is gone.**
   detour-1/07.png: "Please confirm the action in the prompt on your screen to proceed", above
   "Declined. Nothing changed."
9. **Severity 2. The turn's Undo sits above a waiting request and breaks it.** detour-2/16.png. A
   reader who wants to say no finds Undo first. It undoes the analysis, the chip row becomes "Not in
   this graph", and Remove stays live; pressing it gives "Not run: the graph changed." (18.png). The
   model recovered by itself, at the cost of a second request.
10. **Severity 2. Undo of a removal brings the nodes back selected.** success/13.png, 14.png:
    the scope line moves to Selection 82, 63 unasked, so the next message is about them, and "abc" in
    the composer would have gone with that scope.
11. **Severity 2. Selecting from a chip changes the question and outlives the answer.** detour-2/03.png:
    a click to check the count moves Whole graph to Selection. detour-3/14.png: the 298 edges stay
    selected after Remove, so the next message is scoped to every remaining edge.
12. **Severity 2. The x on the scope line does not clear the selection.** detour-2/05.png: the
    inspector and the drawing still show the 82, and the card's scope reads Whole graph beside Use
    selection. That may be the intended unbinding; the name "Ask about the whole graph" says so, but
    the x reads as clear.
13. **Severity 2. Open run lands on an empty pane.** detour-2/09.png: the Style tab of Connected
    components is blank, and the reader must find Values.
14. **Severity 2. The undo notice appears with the panel open and is cut off.** success/13.png runs
    the full canvas width and is cut at both ends; detour-2/16.png is cut with "..". It stayed through
    two model turns over the drawing (detour-2/18.png). `decided.md` keeps a turn's notice for a
    closed panel. It quotes the reader's words with no marks, as on T91 B.
15. **Severity 2. The request's buttons carry no context for a screen reader.** keyboard walk: Shift+Tab
    arrives at "Keep them", then "Change this", then "Remove", with no group name or description, and
    the title is plain text, not a heading (`--read`, keyboard walk). Keep what, remove how many: only
    the status line said so, once.
16. **Severity 1. The second chip is reachable only by arrows, with no hint.** keyboard walk: Tab
    passes from "82 nodes, select" to Remove. The name gives no sign of the arrow keys.
17. **Severity 1. Two controls named "82 nodes, select" with steps open.** keyboard walk, keyboard/22.png:
    the step's chip and the card's, nothing to tell them apart.
18. **Severity 1. A step's chip changes after the removal.** keyboard/37.png: the Query data chips
    82 and 361 become one chip, 298, for a step that happened before the removal.
19. **Severity 1. Two names for one analysis.** success/07.png "Computed Separate pieces for 331
    nodes" and the step "Separate pieces", against detour-2/09.png "Connected components" and the
    model's "connected component". A stale 331 also stays in the line after the removal.
20. **Severity 1. Change this offers nothing to change.** detour-1/03.png: it declines, spends a model
    turn with the panel saying "Sending to Google", and the composer shows only its usual placeholder.
21. **Severity 1. The change line "Changed the graph" says nothing.** detour-1/05.png, for a turn that
    colored every node by group.
22. **Severity 1. Only Other has a count in the key card.** detour-1/05.png: Group 1 to Group 8 have
    none, and those are the numbers a reader doubting the total wants.
23. **Severity 1. Sending to Google stays for up to a minute beside a growing step count.**
    detour-3/07.png, 08.png, 10.png.
24. **Severity 1. The chips give no pointer cue or tooltip.** success/04.png: `cursor: default`,
    `tooltip: null` on a control that selects.
