# Session r1-s04 -- Nadia (L1 alert reviewer), first-time user

Task: open the ready-made network of college football teams; make every team orange.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Waited for a free browser slot.
Result: 01.png -- a landing page, "Analyze any network". Big green "Open a file", "Open network data", "Samples", "New project". A colored demo graph on the right.

## Step 2
Nadia: "Ready-made network -- that's 'Samples', I guess. I'll click the Samples button in the box."
Command: `--step <session> --click "Samples"`
Result: tool said ambiguous (a button and a top link both "Samples"); nothing happened (02.png). Pointing at the button in the box instead.
Command: `--step <session> --click "role=button:Samples"`
Result: 03.png -- "Sample library" with cards. Third card: "Conferences fall out of who played whom -- College football, 115 nodes, 613 edges". Found it fast.

## Step 3
Nadia: "There, college football. Clicking the card."
Command: `--step <session> --click-at 712,410`
Result: 04.png -- the graph opened: "College football", 115 blue/purple nodes, 613 edges. Left panel "Style layers": Hovered 0, Selected 0, Everything 115. Right panel "Graph" with Style / Values tabs (Values open). A notice at the bottom about saving a copy.
Part 1 done (network open).

## Step 4
Nadia: "'Everything, 115' -- that's every team. I'll click that row and hope it lets me pick a color."
Command: `--step <session> --click "Everything"`
Result: 05.png -- the right panel switched to "Everything -- Node and edge layer", Style tab, with "Fill -- Color 6366F1" and a blue swatch. Text says Everything styles all 115 nodes. That's the knob.

## Step 5
Nadia: "Fill color, 6366F1. I'll click the code box and type an orange code over it."
Command: `--step <session> --click-at 1320,483`
Result: 06.png -- the code is highlighted, ready to type over. No color picker popped up, fine by me.

## Step 6
Nadia: "Orange is FFA500, I think. Typing it and pressing Enter."
Command: `--step <session> --type "FFA500" --key Enter`
Result: 07.png -- all 115 nodes are orange now, field shows FFA500 with an orange swatch, "Autosave: saved" at the top. Done. Stopping here (facilitator ends the session).

## Wrap-up (in character)
- Finished: yes. College football network open, every team orange.
- Ease: 6 of 7 (easy). Six clicks, under the length of one alert.
- What went well: "Samples" on the first page was obviously the ready-made networks, and the College football card said its real name under the catchy title. The "Everything 115" layer was the right guess, and the panel even said in plain words that it styles all 115 nodes. Typing a color code over the box worked like a spreadsheet cell.
- What confused me / small gripes:
  - The cards lead with a catchy headline ("Conferences fall out of who played whom"); I scan for the dataset name, which is the small grey line underneath. Fine here, but slower if I were in a hurry.
  - "Samples" appears twice on the first page (top link and the button); not a problem for me, I just clicked the one in the box.
  - I had to know that "Everything" was the place to change all the nodes. A first-timer who skipped the left panel would probably click a node or hunt in the right panel's "Style" tab, which before I clicked the layer was showing graph numbers, not colors.
  - I had to know a hex code for orange. There was a swatch next to the code but I did not try it; a named-color list would help someone who doesn't know "FFA500".
  - I wasn't sure at first whether changing the color changed the data or only the picture. The words "Style layers" suggest only the picture, which is what I'd want, but it isn't said outright.
