# Session: change the layout, then stop it moving -- Expert Emma (network scientist)

Task as given by the moderator: "The drawing of the characters is hard to read. Try a different
way of arranging it, and once it looks better, stop it moving so you can study it. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter."

Start screen: shots/tasks/t08/01.png. All commands were run from design/ui/prototype; renders are
in tmp/round-7-sessions/t08--expert-emma/. Each run replays from the start screen.

## Think-aloud, step by step

**Start screen.** Force-directed hairball, 77 nodes, colored by PageRank, sized by degree.
"Local only" chip at the top, fine, I will check that later. I want the layout settings. There is
no word "Layout" anywhere on screen. The floating toolbar at the bottom has five unlabeled icons.
A play triangle is the obvious candidate for "the thing that moves".

1. `timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--expert-emma/01.png task:t08 --click "Layout"`
   The play button turned into a pause button. So I just started a simulation. That is not what I
   asked for; I want a different algorithm, not more iterations of this one.

2. `... --try .../02.png task:t08 --hover "Layout"`
   Tooltip: "Resume layout". So on the start screen the layout was already paused. Then what is
   "stop it moving" going to mean? Noted.

3. `... --try .../03.png task:t08 --hover "Graph"`
   Nothing. The rail icon has no tooltip beyond its label.

4. `... --try .../04.png task:t08 --click "Co-appearances"`
   A graph switcher (Co-appearances, Compare graphs...). The right panel briefly shows the graph
   itself: 77 nodes, 254 edges, undirected, weight = value, density 0.0868, 1 component, mean
   degree 6.6, and a log-log degree CCDF. Fine, that is the first thing I would compute anyway.
   Credit where due. But no layout in here.

5. `... --try .../05.png task:t08 --click "Co-appearances" --key Escape --click "Style"`
   Escape closed the menu and the inspector snapped back to PageRank. The graph's own panel only
   exists while that menu is open. Annoying.

6. `... --try .../06.png task:t08 --hover "3D"` -- "nothing on screen is called 3D".

7. `... --try .../07.png task:t08 --click "Everything"`
   The base style row: fill color, shape "Faceted sphere". Faceted sphere. On a flat screen. No
   layout here either.

8. `... --try .../08.png task:t08 --click "More"`
   That opened the PageRank row's menu (rename, select top N, lock, delete). Not it.

9. `... --try .../09.png task:t08 --click "Menu"`
   Main menu: New project, Open, Select where..., Settings, Keyboard shortcuts, Help. No Layout,
   no View menu.

10. `... --try .../10.png task:t08 --click "Menu" --click "Keyboard shortcuts"`
    Long, decent shortcut sheet: Ctrl+K quick actions, "/" find, 0 fit, 5 switch 2D/3D. Nothing
    for layout. Fine, Ctrl+K then.

11. `... --try .../11.png task:t08 --key "Control+k"`
    Command palette. First recent item: "Re-run layout -- Canvas menu > Re-run layout". So there
    is a canvas menu. I would type "layout" here; in this session I can only pick what is listed.

12. `... --try .../12.png task:t08 --click "Canvas menu"` -- nothing called that.

13. `... --try .../13.png task:t08 --hover "View"` -- the cube icon is "View".

14. `... --try .../14.png task:t08 --click "View"`
    Camera menu: Fit, Front/Side/Top/Isometric, saved views, Switch to 2D, VR, AR. Camera, not
    arrangement. Also: it opened in 3D. Why is this 3D.

15. `... --try .../15.png task:t08 --click "Analyze"`
    Algorithm list: Louvain, PageRank, shortest path, betweenness, closeness... Descriptions are
    plain English ("Which nodes form densely connected groups"). Layout is not an analysis, so no.

16. `... --try .../16.png task:t08 --click "Co-appearances" --click "Style"` -- menu is modal,
    "nothing called Style".

17. `... --try .../17.png task:t08 --click "Co-appearances" --click "Co-appearances" --click "Style"`
    Picking the graph in its own menu does not keep it in the inspector. Back to PageRank.

18. `... --try .../18.png task:t08 --click "Menu" --click "Settings..."`
    Settings: General, Privacy, Performance... The Theme help text says "The canvas background is
    a graph setting, in the graph's Canvas section." So the GRAPH has settings. Where is the graph?

19. `... --try .../19.png task:t08 --click "Graph"` -- nothing changes.

20. `... --try .../20.png task:t08 --key Escape` -- Escape does not deselect PageRank either.

21. `... --try .../21.png task:t08 --key "Control+k" --click "Re-run layout"`
    That opened the canvas menu: Select all, Fit, Re-run layout, Reshuffle layout seed, Unpin all,
    Compute the overview, Add node, Clear graph data. The seed is exposed, good. But no "change
    method". At this point in real life I would be closing the tab.

22. `... --try .../22.png task:t08 --click "Data"`
    Data rail: sources, filters, attributes. And the right panel now shows the graph,
    Co-appearances, with a Style tab I can actually reach.

23. `... --try .../23.png task:t08 --click "Data" --click "Style"`
    There it is. Graph > Style > Canvas (background, print-safe colors, label overlap) and
    **Layout: Method "Spread Out", Seed 7**. The layout is a property of the graph's style, found
    through the Data rail. I would never have looked here on purpose.

24. `... --try .../24.png task:t08 --click "Data" --click "Style" --click "Spread Out"`
    A proper picker, finally. Method table with Size and Weights columns: Spread Out
    (Recommended, "By engine"), Spread Out Flat, Ring, Rings from a Node, Grid, Concentric Rings,
    Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by Group, Keep
    Positions. Right side: Engine "NGraph Force", "Ignores edge weights", and every parameter
    (spring length, gravity, theta, drag, time step, pacing). I like that the parameters are all
    there. I do not like that the names are marketing words and the engine only shows once you
    pick one. "Recommended" by whom, for what? And this graph HAS a weight column ("value") and the
    recommended engine ignores it.

25. `... --try .../25.png task:t08 --click "Data" --click "Style" --click "Spread Out" --click "Natural Grouping"`
    Engine: Spectral, "the only engine for Natural Grouping. Ignores edge weights." A toast:
    "Laid out again: Natural Grouping" with Undo. Spectral is deterministic, which I want for
    studying it. But it still lists "Pacing: pre-steps, steps per frame, stop threshold..." for
    a spectral embedding, which is a one-shot eigen decomposition. Those knobs mean nothing there.

26. `... --try .../26.png task:t08 --click "Data" --click "Style" --click "Spread Out" --click "Natural Grouping" --key Escape`
    Dialog closed. The picture is identical to the start screen. Same node positions, same
    hairball. Did anything happen? The toast said it did.

27. `... --try .../27.png ... --click "Natural Grouping" --click "Close"` -- same, unchanged
    drawing.

28. `... --try .../28.png ... --click "Close" --click "Data" --click "Style" --hover "Resume layout"`
    The Method field now says "Natural Grouping", so the choice stuck. The run button still says
    "Resume layout", i.e. stopped. So is the spectral result already static, or is it waiting?

29. `... --try .../29.png ... --click "Close" --click "Resume layout" --hover "Pause layout"`
    Started it; button now says "Pause layout".

30. `... --try .../30.png ... --click "Close" --click "Resume layout" --click "Pause layout" --hover "Resume layout"`
    Paused. Layout stopped. Drawing still looks like the original force layout to me.

## Verdict

Did I succeed? Mostly. The method is set to Natural Grouping (spectral) and the layout is paused.
But I cannot honestly say "it looks better", because the drawing never changed in front of me,
and the stop control was already in the stopped state when I arrived, so I do not know whether
pressing pause did anything that was not already true.

Single Ease Question: **3 / 7.** The layout settings themselves are good once found. Finding them
took about twenty tries: they are under the graph's Style tab, the graph's inspector is reachable
in a stable way only from the Data rail, and neither the canvas menu, the command palette (from
what it listed), the View menu nor the shortcut sheet offers "change layout method". The
play/pause control is the obvious handle for "the thing that moves", and it has no way to choose
what moves.

Would I use this instead of what I use now? For analysis, no, the notebook wins. For the client
figure, possibly: an explicit engine name, every parameter, a seed, and Undo is more than Gephi's
Layout panel tells me. But only if "change the layout" lives next to the run/pause control or in
the canvas right-click menu, the method names say which algorithm they are before I pick one, and
a weighted graph does not default to an engine that ignores the weights without saying so up
front.
