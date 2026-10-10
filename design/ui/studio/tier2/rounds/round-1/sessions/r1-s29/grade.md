# Grade: session r1-s29 -- Tom, back again, puts the running club's updated list in place of the old one (friends.csv to friends-v2.csv)

**Grade: G** (gave up). Tom read the first half of the answer correctly: before the update, Farah
was first (0.06394, from the Values' Top 10, `02.png`), which matches the answer key. He never
replaced the old list, never reran PageRank, and never named who is first now (the key: Ava,
0.0801). He stopped with "I'll ask her to just send me the new ranking." The last screen (`09.png`)
still shows the old file and the old run, exactly as at the start. He made no false claim, so the
grade is G and not F.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build the criteria name. Setup `friends-ranked.txt` reached its end state (the
graph ranked, colored and sized by PageRank, `01.png`).

**Not void, with one tool caveat.** Every click, key and upload did what was asked. The last step,
`--drop`, sends synthetic drag events to the element under the middle of the window, which here is
the graph canvas. The app has no drop handler there, so it ignored the drop, and the screen did not
change. A person dropping a real file there would get the same response from the app: nothing. But
the browser would then do its own default for a file dropped on a page that does not take it: open
or download the file, which a synthetic event never triggers. So the tool showed silence where a
person would have seen the browser act. That does not change the grade: Tom had already decided the
app offered no "instead of" path (step 4: "There is no button that says 'instead of'") and the drop
was his last try, not the cause of his stopping. It is recorded under "Tool note" below.

## What the last screen shows (`09.png`)

- Data place: Sources "friends.csv, 20 nodes, 41 edges"; right panel "friends.csv, Source, Added:
  Nodes 20, Edges 41".
- The drawing still has the old PageRank colors and sizes; the key reads 0.03779 to 0.06394, the
  setup's range.
- The edges table shows the old file's weights (Ava to Chloe 5, Ava to Dev 2), not friends-v2's
  (Ava to Chloe 1, Ava to Dev 4, `05.png`).
- No Replace page, no out-of-date mark, no rerun. Nothing of friends-v2.csv was loaded.

## Measures

- **Steps:** 8 after the start (`02.png` to `09.png`). The key's path has 6 (Values, Data,
  right-click the source row, Replace with file..., Load, Rerun).
- **Wrong turns: 3.**
  1. Main menu, "Open project or file..." (`03.png`, `04.png`), which went straight to the file
     chooser and then to "Add to friends" (`05.png`). He cancelled there, so nothing was added.
  2. A left click on the "friends.csv" source row (`08.png`), expecting a way to swap the file. A
     left click shows only the source's facts; Replace is on the row's right-click menu or its "..."
     button, which is not drawn until the pointer hovers on the row.
  3. Dropping friends-v2.csv on the graph canvas (`09.png`), which the app ignores.
- **Traps the key names:** not reached. He did not read the old drawing as the new result, did not
  press "Edit source...", and did not load the file as an addition.
- **False "done": none.** His debrief says plainly that he did not finish and does not know who is
  first now. His "first before, Farah" matches `02.png`. truth-on-screen: no wrong claim.
- **Self-rating** (2 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). Each was seen in this session only unless noted.

1. **Severity 4 -- the only way to replace a source's file is hidden from a reader who looks for
   it.** Tom went to the right place, the Data place's Sources row, and clicked the file's name.
   The panel that opened lists facts about the file and offers no action. "Replace with file..." is
   reachable only by right-clicking the row or by hovering it until its "..." appears; at rest the
   row shows neither (the key notes this, `rounds/r1d4/pilot/T21A/03.png`). He said "I'm not
   right-clicking around for hidden things" and left without finishing. A task that a returning user
   cannot find the door to, and leaves over, is a 4. Evidence: `07.png`, `08.png`, transcript steps
   6 and 7.
2. **Severity 3 -- "Open project or file..." in a loaded project offers only "Add to <project>",
   and its count reads as the new file's own.** The menu item opened the file chooser with no
   question first, and the page that followed is titled "Add to friends" with no "instead of" choice.
   Its summary line reads "friends-v2: 20 nodes, 82 edges" and the footer "41 edge rows read; the
   load makes 20 nodes and 82 edges". 82 is the old 41 ties plus the new 41 as parallel ties, so the
   total is right for an addition, but the summary line puts it under the new file's name, where the
   file alone has 41. Tom read it correctly as "both lists on top of each other" and cancelled, which
   saved his work but ended this route. Evidence: `04.png`, `05.png`, transcript step 4.
3. **Severity 2 -- a file dropped on the graph canvas is ignored, with no message.** On the Data
   place the canvas takes no drop, while the Start screen and the data page do take one. Tom could
   not tell whether the file was refused or ignored. (See the tool note for what a real browser
   would add.) Evidence: `09.png` against `08.png`, transcript step 8.
4. **Severity 1 -- "Higher means: Not set / Closer / Farther / Capacity" on the Add page asks a
   question he could not answer.** He did not know what his friend's numbers meant and said nobody
   asked him that last time. It did not stop him; he cancelled for the count. Opinion, held one level
   down from 2. Evidence: `05.png`, debrief.

What worked: "Values" next to Style led him straight to a Top 10 with names, and he read "first
before" correctly in one step (`02.png`). Cancel on the Add page left everything exactly as it was
(`06.png`), so his exploring cost him nothing. The Data place's Sources row with its counts ("20
nodes, 41 edges") was where he expected the list to live (`07.png`).

## Tool note

`real.mjs --drop` dispatches `dragenter`, `dragover` and `drop` as synthetic events on the element
under the middle of the window. When the app does not handle the drop there, a real browser falls
back to its own default for a dropped file (open or download it); a synthetic event cannot trigger
that, so the screenshot shows nothing at all. The app-side result -- the drop is ignored -- is the
same either way. A drop that the app does not take should be reported by the tool as such, so a
session does not show a silence a person would not see.

## What this says about the round

This session hit design problems, not an implementation fault. Every control did what the answer
key says it does on this build: the Add page counted correctly, Cancel undid nothing because
nothing had been done, and the source row's left click shows facts as designed. What stopped Tom is
that the Replace action exists but is not where a returning user looks without right-clicking, and
the visible file route offers only "Add". The one part that touches implementation is the tool's
drop, noted above, which did not decide the outcome.
