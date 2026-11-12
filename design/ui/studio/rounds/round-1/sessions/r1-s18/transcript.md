# Session r1-s18 -- Nadia (level-1 alert reviewer), Les Miserables

Task given: practice on the ready-made Les Miserables network; go to the police inspector Javert,
read what the program knows about him, and see which characters he shares chapters with. Report
who they are and how many. Start: empty app.

All commands were run from `design/ui/studio` with `node tool/real.mjs`.

## Think-aloud and steps

1. `--start rounds/round-1/sessions/r1-s18 empty` -> 01.png. (Waited several minutes for a
   free browser slot first.)
   Saw: a start page with Open project or file, New from data, Recent projects (empty), and a
   Samples list on the right with Les Miserables, "77 characters". A usage-data banner at the
   bottom.
   Nadia: "Data popup. No thanks. Then Les Miserables on the right, that's the practice set."

2. `--step --click "No thanks"` -> 02.png. Banner gone.

3. `--step --click "Les Miserables"` -> 03.png.
   Saw: a drawing of blue dots and gray lines, no names on any dot. Left: a "Find nodes, edges,
   values" box, Selection, Everything. Right: Graph overview -- Nodes 77, Edges 254, Density,
   Components 1.
   Nadia: "No names on the dots. There's a find box. That's my search box. Type Javert."

4. `--step --click "Find nodes, edges, values" --type "Javert"` -> 04.png. FAILED: "nothing on
   screen is called ..." and nothing typed. (The text in the box is only a placeholder.)
   Hesitation: Nadia would just click into the box; she pointed at it instead.

5. `--step --click-at 180,90 --type "Javert"` -> 05.png. Clicked the combobox "Find".
   Saw: results under "Elements": Javert; under "Values": "Select where name is Javert (1)".
   Nadia: "There he is. Click Javert, not the filter thing."

6. `--step --click-at 114,153` -> 06.png. Option "Javert".
   Saw: one dot turned yellow; right panel now "Javert, Node", Summary: id Javert, name Javert,
   Degree 17. A new round button appeared above the bottom toolbar.
   Nadia: "That's all it knows about him: id, name, Degree 17. Degree -- is that how many people
   he's linked to? Probably. But I need the names, not a number."

7. `--step --hover-at 749,812` -> 07.png. Tooltip "Neighborhood" (with a G after it, a
   shortcut key run into the word).
   Nadia: "Neighborhood. Sounds like who's around him."

8. `--step --click "Neighborhood"` -> 08.png.
   Saw: 18 dots yellow. Left: Selection 18. Right: "18 nodes, 0 edges", Nodes 18, Edges 0,
   Edges among them 61, id "Babet (1)", name "Babet (1)".
   Nadia: "18. Degree was 17, so 17 plus Javert himself? I think. But it says 0 edges and then 61
   edges among them -- which is it? And it shows one name, Babet. Where are the other 17?"

9. `--step --click-at 121,124` -> 09.png. Treeitem "Selection".
   Saw: right panel emptied to just "Selection" with nothing under it. Still 18 yellow.
   Nadia: "That made it worse. The panel's blank."

10. `--step --click-at 28,130` -> 10.png. Button "Data".
    Saw: Sources (Les Mis... 77 nodes, 254 edges; Node t... 77 rows; Ed... 254 rows), Attributes
    (Nodes: id, name; Edges: shared_chapters).
    Nadia: "shared_chapters -- that's the chapter thing. 'Node t... 77 rows' means a table.
    Click it."

11. `--step --click-at 158,168` -> 11.png. Treeitem "Node table".
    Saw: a full-screen "Add to Les Miserables" page: Tables, "Drop a file here, or choose a
    file", Direction "As the file says", Cancel, Load (disabled).
    Nadia: "What? I didn't want to add anything. Did I just change the data? Cancel, now."
    (Biggest surprise of the session: clicking a table opened an import page instead of the
    rows.)

12. `--step --click "Cancel"` -> 12.png. Back to the Data view; 18 still yellow.
    Nadia: "Okay, nothing changed, I think."

13. `--step --click-at 152,349` -> 13.png. Treeitem "name, node attribute".
    Saw: right panel "name, Attribute": Table Nodes, Has a value 100%, Distinct values 77.
    Nadia: "Stats about the column. Not the names. Second dead end."

14. `--step --click-at 28,75` -> 14.png. Back to Graph. Right panel still showed the "name"
    attribute, not the 18-node selection.

15. `--step --hover-at 789,864` -> 15.png. Tooltip "Legend" (again with the shortcut letter run
    in: "LegendL").
    Nadia: "Legend. Not it."

16. `--step --rclick-at 748,469` -> 16.png. Node "Javert".
    Saw: no context menu; the selection dropped back to Javert alone (Selection 1).
    Nadia: "No menu, and my 18 are gone. Great."

17. `--step --click-at 1420,73` -> 17.png. "Node actions" menu: Neighborhood, Frame selection.

18. `--step --click-at 1355,110` -> 18.png. Neighborhood again; same 18-node panel with
    "Babet (1)".

19. `--step --click-at 1390,276` -> 19.png. Clicked "name Babet (1)". Nothing happened.
    Nadia: "One Babet, and the other 17 are hidden somewhere I can't open."

20. `--step --click-at 1420,73` -> 20.png. "Selection actions" menu: only Frame selection.

21. `--step --click "Frame selection"` -> 21.png. Zoomed in on the yellow dots. Still no names
    drawn.
    Nadia: "Bigger. Still no names."

22. `--step --hover-at 641,220` -> 22.png. The tool reported the dot is "Fantine", but nothing
    appeared on screen; tooltip null.
    Nadia: "Nothing on hover. I'm not clicking 17 dots one at a time and writing them down."

23. `--end rounds/round-1/sessions/r1-s18`. Gave up.

## Debrief, in character

**Did I finish?** No. I found Javert and what it knows about him (id, name, a "Degree" of 17),
and I got it to light up his neighborhood -- 18 dots, which I think is Javert plus 17 others.
So my answer on how many is "17, probably". I could not get the names. The only name it ever
showed me was Babet.

**How hard (1 = easy, 7 = impossible):** 6.

**What confused me:**

- The search box worked once I clicked into it, and finding Javert was fast. That part was fine.
- "Degree 17" -- I guessed it means 17 people. Nothing on screen said that.
- The neighborhood panel said "18 nodes, 0 edges" and also "Edges among them 61". Which is it?
  And is 18 him plus 17, or 18 others? I had to guess.
- The panel lists "name: Babet (1)" for 18 people. I wanted the list of 18 names; I got one, and
  clicking it did nothing.
- Clicking "Selection" on the left blanked the right panel instead of showing what was selected.
- Clicking the node table under Data opened an "Add to Les Miserables" import page. That scared
  me -- I thought I was about to change the data.
- Right-clicking a dot did nothing except throw away my 18-dot selection.
- No names on the drawing, and hovering a dot shows nothing, even zoomed in.
- Tooltips read "NeighborhoodG" and "LegendL" -- the shortcut letter is glued onto the word.
- I never found where "shares chapters" lives except an edge column called shared_chapters that I
  could not open.

**Export test:** I couldn't get a list of names to paste into a file, so this would not go into an
alert file. In the case system I'd have had the counterparties listed in a table in a minute.
