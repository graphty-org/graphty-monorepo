# Grade: session r3-s41 -- Ruth (tier 1 graduate, returning), running club (T24 A), one tie on the drawing

**Grade: SD** (success with difficulty). Ruth's answer, "Gus and Ivan ran together once (1)",
matches the key (1), and at the end exactly Gus and Ivan are selected. She got there only after
four wrong turns: she tried to select the two people one at a time and could not, and reached
"Select endpoints" on her fifth try. The key grades SD when the two ends are reached "right after a
detour".

Last screenshot (`09.png`): the inspector reads "2 nodes selected" (subtitle "Selection"), Summary
Nodes 2, "Edges joining these nodes 1"; the left panel's Selection row reads 2; Gus and Ivan carry
yellow halos and no other node does (Hana, under Ivan, has none); the blue band on the Gus-Ivan
line is gone. `work.json`: start and end identical (the PageRank run, its four layers, friends.csv,
no notes or steps); nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `friends-ranked-names.txt` (`01.png`). No leaks
(`leaks.json`: 0 calls).

## The answer against the key

- **The number (right).** 1, read from the screen twice: first in Gus's neighbor table ("Gus and 4
  connections", Neighbor / weight: Dev 1, Farah 5, Hana 4, Ivan 1, `03.png`), then on the tie's own
  inspector ("Gus -> Ivan", Edge, From Gus, To Ivan, weight 1, `07.png`). Not guessed from the
  line's look.
- **The two ends (right).** "Edge actions" -> "Select endpoints" (`08.png`, `09.png`): exactly Gus
  and Ivan, Selection 2.
- **Gus to Hana misread.** Not met. She clicked the line at 755,586 on the first try and the tool
  printed `edge with id "13"`; the inspector named Ivan.
- **Name-click after Select endpoints.** Not met: she ended right after it.

## Measures

- **Steps:** 8 after the start (`02.png` to `09.png`). The key's success path is 3 (click the line,
  Edge actions, Select endpoints); she clicked the line on her first try at it (1 try).
- **Wrong turns: 4.**
  1. Opening Gus's Degree row (`03.png`): the neighbor view put Gus and his 4 neighbors in the
     selection (Selection 5, five halos). It gave her the number but selected more than asked.
  2. `--click "Gus" --shift-click "Ivan"` by name (`04.png`): ended with Ivan alone (Selection 1),
     Gus dropped.
  3. Shift-click on Gus on the canvas (`05.png`): Selection stays 1, Gus replaces Ivan.
  4. Ctrl-click on Ivan on the canvas (`06.png`): Selection stays 1, Ivan replaces Gus.
  She then clicked the line itself, which the key's path starts with.
- **Broken habit:** her history names a person's list of connections; that place (the Degree row)
  did give the number, so it was not a dead end for the first half, but it selected five people for
  the second half.
- **How she got from "the two on this tie" to "Select endpoints":** she opened the tie's "..."
  menu hoping for "select both ends" and read "Select endpoints" as "exactly the words for what I
  want". She reached the tie only because adding a second person by click failed.
- **False "done":** none. Her final claims hold on screen: 1 run (`03.png`, `07.png`), "Gus and Ivan,
  and only them, ringed" (`09.png`). truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Recovery:** a session with wrong turns that still succeeded.

## Problems

1. **Shift-click (and Ctrl-click) on a node replaces the selection instead of adding to it.
   Severity 3.** Evidence: `04.png` to `06.png`, Selection stays 1 and the halo moves from one
   person to the other on every modifier click. The tool holds the key around a canvas click
   (`real.mjs`, `act`: `keyboard.down(m)` before `mouse.click`), so this is the build, not the
   tool. On build 26f3bb968, `graphty-element/src/NodeBehavior.ts` `handleClick` always calls
   `selectionManager.select(this.node)` (replace), while a click on a line reads `shiftKey` and adds
   (`graphty-element/src/Graph.ts`, the edge pick branch): Shift adds lines but not nodes. Nothing on
   screen says how to add a second person. The answer key's other route, "Selecting Gus and then
   Ivan with Shift held", does not work on this build. Ruth: "If the two people were not tied, I
   would not know how to point out both." A build defect; confirmed at one participant once a
   scripted repro on the build shows it (source read above, repro not yet run). The fix belongs in
   graphty-element (node click honoring Shift as the line click does).
2. **Opening a person's connections selects the person and all neighbors. Severity 2.** Evidence:
   `03.png`, Selection 5 and five halos after clicking "Degree". A returning user who opens the list
   to read a value ends with an unasked-for selection on the drawing; here it pushed her into the
   selection detours. Single participant on this task; behavior, not confirmed.
3. **"2 nodes selected" does not name the two. Severity 1.** Evidence: `09.png`, the inspector shows
   only counts; she read the names off the labels by the halos, with Ivan's label half covered by
   Hana's sphere. Opinion-level, single participant.
4. **Hana's label covers Ivan's sphere and the end of the Gus-Ivan line. Severity 1.** Evidence:
   `01.png`, `07.png`, `09.png` (known on this build per the key). She noticed it but did not misread
   the tie.
5. **The neighbor table's value column is the file's column name ("weight"), never "runs".
   Severity 0.** Evidence: `03.png`, `07.png`. She knew it from her own sheet; recorded, not a
   problem for her.

## For the round

- Compare with round 2 on grade and number only: number right; grade SD (detour before the ends
  command).
- Record the key's Shift route as failing on 26f3bb968e43 so graders do not credit or expect it.
