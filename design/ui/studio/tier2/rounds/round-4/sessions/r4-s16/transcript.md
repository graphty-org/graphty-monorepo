# Session r4-s16 -- Dana Okafor (returning user)

Task: the Florentine marriage network is open. Find the chain of families a message passes through from the Strozzi to the Pazzi, through as few families as possible, in order.

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s16 in the studio worktree (the tool writes sessions there).

## Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:florentine-ranked.txt`

01.png: The network is open, colored and sized by PageRank (that is the ranking I usually run). The balls have no names on them. Left panel: search box "Find nodes, edges, values", Selection, PageRank (15), Everything. Toolbar at the bottom with icons. I need a route from Strozzi to Pazzi. No idea where either is on the picture since nothing is labelled.

## Step 1 -- `--step <session> --click-at 615,863` (button "Analyze")
02.png: A list of analyses with a "Filter analyses" box: Recent PageRank, then "Rank nodes and edges": Degree, Betweenness, Closeness... Each has a one-line explanation, good. I want a route, so I will filter for "path".

## Step 2 -- `--step <session> --type "path"`
03.png: Filtered list: "Find paths and edge sets": Shortest path (Start here) "The fewest steps, or the shortest path by weight, between two nodes"; Guided route (greyed, "Select 2 nodes first"). Shortest path is what I want. Clicking it.

## Step 3 -- `--step <session> --click-at 500,630` (option "Shortest path")
04.png: A small form: From "Where the path starts" (focused), To "Where the path ends", Weight None, Advanced, "Find path". Plain enough. Typing Strozzi in From.

## Step 4 -- `--step <session> --type "Strozzi"`
05.png: A suggestion "Strozzi" drops down under the box. Picking it.

## Step 5 -- `--step <session> --click-at 492,679` (option "Strozzi")
06.png: From says Strozzi, focus moved to To on its own. Nice. Typing Pazzi.

## Step 6 -- `--step <session> --type "Pazzi"`
07.png: Suggestion "Pazzi" under To. Picking it.

## Step 7 -- `--step <session> --click-at 488,733` (option "Pazzi")
08.png: From Strozzi, To Pazzi, Weight None (fewest hops is what I want), focus now on Find path. Clicking Find path.

## Step 8 -- `--step <session> --click "Find path"`
09.png: The route is drawn in black on the picture, a new "Shortest path -- 4 hops" row sits above my PageRank ranking (which is still there), and the right panel shows "Nodes in order": Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. Summary: 5 nodes, 4 edges. "Made with" says From Strozzi, To Pazzi, Weight None, "Each edge counts as 1." That is the answer, as a numbered list I can read. Ending the session.

## --end (first) -- further request
The tool answered with a follow-up: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?" Carrying on in the same session.

## Step 9 -- `--step <session> --click "Analyze"`
Going back to the analysis button; I expect Shortest path under Recent.
10.png: Yes, Shortest path is at the top under Recent. The first route is still on the picture and in the panel. Clicking Shortest path.

## Step 10 -- `--step <session> --click-at 500,448` (Recent: Shortest path)
11.png: Fresh empty form, From focused. Typing Peruzzi.

## Step 11 -- `--step <session> --type "Peruzzi"`
12.png: Suggestion "Peruzzi". Picking it.

## Step 12 -- `--step <session> --click-at 494,679` (option "Peruzzi")
Also typed "Ginori" in To in the same step (`--type "Ginori"`).
13.png: From Peruzzi, To shows "Ginori" with the suggestion under it. Picking Ginori, then Find path.

## Step 13 -- `--step <session> --click-at 490,733 --click "Find path"`
14.png: New route drawn in black. Panel, "Nodes in order": Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5 (4 hops; From Peruzzi, To Ginori, Weight None). Answer: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.
Note: there is still only one "Shortest path" row on the left; the Strozzi-to-Pazzi route is no longer drawn or listed. The new run took its place. I had already written the first answer down, so it did not cost me anything here, but if I wanted both routes side by side for a slide I would not know how to keep the first one.

## --end (second)
Session ended.

## In character, at the end (Dana)

**Did I finish?** Yes, both.
- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (4 hops).
- Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (4 hops).

**Ease: 6 out of 7.** I had never run a route before, and it took me under ten clicks. Typing "path" in the analysis filter found "Shortest path" with a plain one-line explanation, the From and To boxes suggested the names as I typed, and the answer came back as a numbered list, which is what I would paste into a slide. The second time, Shortest path was waiting under Recent with an empty form.

**What confused me or bothered me:**
- The circles have no names on them, so the drawing alone is no use to me; I relied entirely on the list on the right. I could not tell which black circle was the Strozzi without reading the list.
- Running the second route replaced the first one. The left panel still says just "Shortest path, 4 hops", and the Strozzi-Pazzi route is gone from the picture and the panel. Nothing told me it would be replaced. For a "compare two routes" slide I would want both kept.
- "Weight: None" -- I left it alone and the panel then said "Each edge counts as 1", which reassured me, but I would not have known what "edge" meant if that line had not been right next to it.
- Small grey labels in the right panel ("Path", "ran Oct 11...") are hard to read without my glasses.
- So-what for my job: on my supplier data a route like this only works where I have the Tier 2 links, which is maybe 15 percent of spend. Where do I get the rest?
