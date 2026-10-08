# Session: Ruth (reporter), names on every dot, College football

Participant: Ruth, a reporter who is fast in spreadsheets and new to network tools.
Task prompt: "Get every team's name written next to its dot." Start: empty app.

Note on the run: the start waited about 35 minutes for a free browser slot before the first
screenshot appeared. All four slots were held by other study sessions.

All commands run from `design/ui/studio`, with `S=rounds/round-1/sessions/r1-s15b`.

## Steps

1. `node tool/real.mjs --start $S empty` -- 01.png.
   Saw: a start page with Open, New from data, Recent projects (empty) and four samples, including
   "College football, 115 teams". A "Your data is yours, but please help us" box at the bottom.
   Think-aloud: "Say no to the data question first. Then College football is right there."

2. `--step $S --click "No thanks" --click "College football"` -- 02.png.
   Saw: a drawing of blue balls and gray lines, no names on it. On the right, a "Graph" panel with
   Style and Values tabs; Values showed 115 nodes, 613 edges.
   Think-aloud: "No names, as promised. Names on a drawing sound like styling. Try Style."

3. `--step $S --click "Style"` -- 03.png.
   Saw: only Canvas background, layout Method and Seed.
   Think-aloud: "Nothing about the dots here. Maybe I have to pick the dots first. 'Everything' on
   the left sounds like all of them." Hesitated here: it was not obvious that the graph-level Style
   tab does not cover the dots.

4. `--step $S --click "Everything"` -- 04.png.
   Saw: the right panel became "Everything" with Nodes/Edges, Fill, Shape, Effects, Label (+),
   Tooltip (+).
   Think-aloud: "Label with a plus. That's what I want."

5. `--step $S --click-at 1419,342` -- button "Add label line". 05.png.
   Saw: a list "Find an attribute" with id, label, value.
   Think-aloud: "'label' should be the team's name. 'id' could be a number."

6. `--step $S --click-at 1115,472` -- option "label". 06.png.
   Saw: team names written above the dots (Georgia, Florida, Arizona, Stanford...). Under the label
   line: "115 labels, 14 hidden to avoid overlap".
   Think-aloud: "Good, names. But I was asked for every team, and it tells me 14 are hidden. Which
   ones? I can't tell from the picture."

7. `--step $S --click-at 1220,372` -- button "Label position". 07.png.
   Saw: a 3 x 3 grid of position choices. Nothing about hidden labels.
   Think-aloud: "Just where the name sits. Not what I need."

8. `--step $S --key Escape --hover-at 1290,397` -- tooltip: null. 08.png.
   Think-aloud: "The '14 hidden' note doesn't explain itself or offer a way to show them."

9. `--step $S --wheel 750,450,-400` -- 09.png. The drawing did not change.
   Think-aloud: "Maybe zooming in spreads them out and the hidden names appear. Nothing happened."

10. `--step $S --click-at 1100,800 --wheel 750,450,-1500` -- at 1100,800: empty canvas. 10.png.
    The drawing still did not change size.
    Think-aloud: "The wheel doesn't zoom at all. I've got names on nearly every dot. I'll stop."

11. `--end $S`.

## In character, at the end

- **Did I finish?** Mostly. Names are on 101 of 115 dots. The app says 14 are hidden "to avoid
  overlap" and I found no way to show them, so strictly I did not get every team's name.
- **How hard (1-7):** 3. Adding the names was quick once I found "Everything"; the last 14 were a
  dead end.
- **What confused me:**
    - The Style tab I saw first (on the whole graph) had only background and layout. I had to guess
      that "Everything" on the left was where the dots' style lives.
    - "14 hidden to avoid overlap" tells me something is missing but not which teams, and offers no
      switch to show them anyway. For a fact-checked picture I need to know who is missing.
    - The attribute list offered "id", "label" and "value" with no hint of what each holds; I guessed
      "label".
    - The mouse wheel did not zoom the drawing, so I could not try to make room for the hidden names.
