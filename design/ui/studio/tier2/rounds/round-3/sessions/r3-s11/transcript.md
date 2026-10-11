# Session r3-s11 -- Jordan (returning user)

Task: on the open bus-stops.csv map, without taking any stop or link off the drawing, point out every link that takes 10 minutes or more, and say how many there are.

Every command runs from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and T=design/ui/studio/tool, S=<this session folder>.

## Step 1 -- start
`node $T/real.mjs --start $S setup:bus-stops-ranked.txt` -> 01.png

Jordan: OK, the bus file is open, someone already ran PageRank on it -- the dots are sized and colored by it, there's a little key top left. Ten stops, arrows between them, no numbers on the links. I need the slow links, 10 minutes or more. I know the find box from looking up customers -- maybe I can just type the condition in there.

## Step 2
`node $T/real.mjs --step $S --click "Find nodes, edges, values" --type "minutes"` -> 02.png

Jordan: Huh, it says "Start with = to select by a value" and offers "=minutes, Select its matches". So it knows the column. I'll try writing the condition the way I'd write it in a spreadsheet filter: =minutes >= 10.

## Step 3
`node $T/real.mjs --step $S --key "Control+a" --type "=minutes >= 10"` -> 03.png

Jordan: Red text, "Put numbers in backticks". Backticks? That's a coder thing, I'd never have guessed that. But it already rewrote it for me underneath -- "=minutes >= `10`, Select its matches". Fine, I'll just click the fixed one.

## Step 4
`node $T/real.mjs --step $S --click-at 170,155` (the option "=minutes >= `10` Select its matches") -> 04.png

Jordan: OK, that's actually nice. "3 edges selected", three links glow blue on the map, and the right panel lists them with their minutes: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14. Every stop and link is still on the drawing. Before I trust "3" though, I want to see the whole list of links with their minutes -- I always check a number against the raw data. Let me look at the Data tab.

## Step 5
`node $T/real.mjs --step $S --click "Data"` -> 05.png

Jordan: Data tab: bus-stops.csv, 10 nodes, 17 edges, and under Edges there's a "minutes" attribute. The selection is still there on the map, good. No table of links though. I'll click "minutes" and see if it shows me the spread of values.

## Step 6
`node $T/real.mjs --step $S --click "minutes"` -> 06.png

Jordan: The minutes summary: edges table, "Amount", 100% filled, 10 distinct values, range 2 to 15. The top of the range is 15, which matches Depot -> Station in my selected list, so the three I got are at least plausible. It's not a sortable table of all 17 links, which is what I'd really want to double-check against, but it's enough for me. The three slow links are still lit up blue on the map and nothing was removed. I'm done.

## Step 7 -- end
`node $T/real.mjs --end $S`

Result: the session ended normally ("session ended"), with no further request.

## Debrief (Jordan, in character)

- **Did I finish?** Yes. There are 3 links of 10 minutes or more: School -> Harbor (12), Depot -> Station (15) and Station -> Harbor (14). They are lit up blue on the map, and all 10 stops and 17 links are still on the drawing.
- **Ease: 6 of 7.** It took four clicks. I already knew the find box from looking up customers, and the hint "Start with = to select by a value" told me what to do next. The list of selected links with their minutes was exactly what I'd paste into a note for my colleague.
- **What confused me:**
  - "Put numbers in backticks." Nobody outside a dev team knows what a backtick is, or why 10 needs them. Since the box already knew minutes was a number and rewrote it for me, why not just accept 10? I clicked the corrected version, so it didn't cost me much, but if I'd had to type it myself I'd have been stuck.
  - The blue highlight is only a selection. One stray click on the canvas and it's gone. If my colleague wants to keep this view or put it on a slide, I'm not sure a selection survives. I'd want a "color these" or "keep this highlight" button right there in the results panel.
  - I wanted a sortable table of all 17 links to check the count against. The Data tab only gave me a summary (range 2 to 15, 10 distinct values). That fits the result, but it isn't a check.
  - Off topic: this is the third time this quarter someone's sent me a "quick CSV" from a system I've never seen. At least this one opened.
