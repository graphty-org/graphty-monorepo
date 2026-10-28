# Session transcript: Ruth, the reporter -- Les Miserables, Javert and who he shares chapters with

Participant: Ruth, a reporter on an investigations desk who is new to graph tools. She types a
name into the first search box she sees and wants a list she can check line by line.

Task as given: open the Les Miserables sample, go to the police inspector Javert, read what the
program knows about him, and say which characters he shares chapters with: who they are and how
many.

Start: empty app. All commands were run from `design/ui/studio` with
`S=rounds/round-1/sessions/r1-s19b`.

## Steps

1. `--start $S empty` -> 01.png. A start page with "Open project or file...", "New from
   data...", a Samples list (Les Miserables, 77 characters) and a usage-data banner at the bottom.
   Ruth: "Unpublished names must not leave my computer. I'll say no to the data sharing first."

2. `--step $S --click "No thanks" --click "Les Miserables"` -> 02.png. The graph opens: 77 blue
   dots, no names on them. The right panel says Nodes 77, Edges 254. There is a search box at the
   top left, "Find nodes, edges, values".
   Ruth: "No names on anything. I'll type Javert into the search box."

3. `--step $S --click "Find nodes, edges, values" --type "Javert"` -> 03.png. Failed: the tool
   found nothing by that name (it is placeholder text), so nothing was typed. (A tool miss, not
   something Ruth would see.)

4. `--step $S --click-at 180,90 --type "Javert"` -> 04.png. The search lists "Elements: Javert"
   and "Values: Select where name is Javert (1)".

5. `--step $S --click-at 114,153` (the Javert result) -> 05.png. One dot turns yellow. The right
   panel now shows "Javert, Node", with id Javert, name Javert and **Degree 17**. A round
   target-shaped button appears above the bottom toolbar.
   Ruth: "Degree 17 -- I think that means 17 ties. But who are they?"

6. `--step $S --hover-at 748,812` -> 06.png. Its tooltip reads "Neighborhood G".

7. `--step $S --click-at 748,812` (Neighborhood) -> 07.png. 18 dots turn yellow. The panel says
   "18 nodes, 0 edges", Nodes 18, Edges 0, Edges among them 61, id "Babet (1)", name "Babet (1)".
   Ruth: "18 is Javert plus 17, which matches the degree. But 'Edges 0' next to 'Edges among them
   61' -- which one is it? And the only name it shows me is Babet. I need all of them."
   (Hesitation: she could not explain "Edges 0" to an editor.)

8. `--step $S --click-at 28,130` (the Data tab) -> 08.png. It shows the sources (77 rows, 254
   rows) and the attribute names (id, name, shared_chapters). There is no list of the selected
   characters.

9. `--step $S --click-at 1320,276` (the "name Babet (1)" row) -> 09.png. Nothing happens.

10. `--step $S --click-at 160,168` (the "Node table" row) -> 10.png. An "Add to Les Miserables"
    screen asks for a file to load.
    Ruth: "I wanted to look at the table, not add a file to it." (Dead end.)

11. `--step $S --click "Cancel"` -> 11.png. Back to the graph; the selection is still there.

12. `--step $S --click-at 1419,74` (the "Selection actions" menu) -> 12.png. The only item is
    "Frame selection". (Dead end.)

13. `--step $S --key Escape --click-at 28,75 --click-at 121,124` (the Graph tab, then the
    "Selection 18" row) -> 13.png. The selection is **cleared**: no yellow dots, and the panel just
    says "Selection".
    Ruth: "I lost what I had just found."

14. `--step $S --click-at 180,90 --type "Javert" --click "Javert" --click "Neighborhood"` ->
    14.png. The 18 are selected again.

15. `--step $S --hover-at 1392,276` (the name value) -> 15.png. The tooltip is a stale
    "Neighborhood G". No list appears.

16-18. Hovered the bottom toolbar buttons. The tool reported a button's name and its tooltip,
but the tooltip printed was the one from the previous hover: "Analyze" had "Analyze Shift+A",
"Legend" had "Analyze Shift+A", and "Quick actions" had "Legend L". A tooltip that lags one
step is misleading.

19. `--step $S --click-at 838,864 --type "label"` (Quick actions) -> 19.png. A command palette
    shows "Add label line" in gray.

20. `--step $S --click-at 658,546` -> 20.png. Nothing happens. The command is disabled, and the
    palette gives no reason.

21. `--step $S --key Escape --hover-at 820,471` (a yellow dot) -> 21.png. Nothing appears on
    screen for the dot: hovering shows no name.

22. `--step $S --click-at 125,156` ("Everything") -> 22.png. A Style panel opens with Fill,
    Shape, Effects, **Label +** and Tooltip +. The selection was kept this time.

23. `--step $S --click-at 1419,342` (Label +) -> 23.png. An attribute picker lists id and name.

24. `--step $S --click-at 1117,472` (name) -> 24.png. Names appear above every dot, very small.
    The panel says "77 labels, 7 hidden to avoid overlap".
    Ruth: "Finally names. But they're tiny, and 7 are hidden. Are any of the hidden ones mine?"

25-26. Turned the mouse wheel over the yellow cluster, once and then four more times -> 25.png,
26.png. The view did not zoom at all.

27. `--step $S --click-at 709,864` (the four-arrows button, which Ruth expected to mean move or
    zoom) -> 27.png. It is "Layout": a popup with Method "Force - Recommended" and Seed 1. That is
    not zoom.

28. `--step $S --key Escape` -> 28.png. Ruth leaned in to read the yellow labels off the screen.

29. `--end $S`.

## Answer Ruth gave

Javert shares chapters with 17 characters. She is fairly sure of 16 of them: Fantine, Mme
Thenardier, Babet, Simplice, Gueulemer, Thenardier, Woman 2, Woman 1, Fauchelevent, Claquesous
(hard to read), Montparnasse, Gavroche, Toussaint, Bamatabois, Valjean and Cosette. One more, at
the lower left, she could barely read ("Bossuet"? she was unsure). The count of 17 comes from
"Degree 17" and from 18 selected nodes, Javert included.

## In character, at the end

- **Did I finish?** Partly. I have the number, 17, and I trust it because two places agree. I do
  not have a list of names I could hand to a fact-checker. I read them off tiny labels, and I am
  unsure of one or two.
- **How hard was it (1-7)?** 6.
- **What confused me:**
    - After I selected Javert's neighbors, the panel showed only "Babet (1)". There was no list of
      the 18 names anywhere, and clicking or hovering it did nothing.
    - "Edges 0" and "Edges among them 61" side by side. I could not tell which to believe.
    - "Node table" in the Data tab opened an "add a file" screen instead of showing the table.
    - Clicking "Selection" in the left list threw my selection away.
    - In Quick actions, "Add label line" was grayed out with no reason given. The working Label
      control was hidden under "Everything", which I opened only because I was out of ideas.
    - Labels came out tiny, with "7 hidden to avoid overlap", and the scroll wheel would not zoom
      in so I could read them.
    - Hovering a dot showed nothing, so I could not check who a single dot was.
