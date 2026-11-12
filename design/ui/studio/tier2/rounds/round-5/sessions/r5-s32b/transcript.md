# Session r5-s32b -- Dana Okafor (returning user)

Task: bring trails.csv in so every calculation treats more kilometers as a longer walk, find the shortest walk Trailhead to Summit (junctions in order, total km), and show where the program says it used the kilometers.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s32b

## Step 01 (already started)
Start screen. Usage-data notice at the bottom. I'll say no thanks, then open the file like I always do.

Command: `real.mjs --step $S --click "No thanks"` -> 02.png
Notice gone. Start screen with "Open project or file..." and "New from data...". I always use Open, so that's what I'll do with trails.csv.

## Step 02
Command: `real.mjs --step $S --click "Open project or file" --upload trails.csv` -> 03.png
"Open as a new graph" screen with a preview table: from, to, km. The km column is set to "Attribute", and a line says "Weight: none (each edge counts 1)". That's exactly the thing -- I've never touched these dropdowns before, but the task says kilometers must count as a longer walk. I'll open the km dropdown and see what it can be.

## Step 03
Command: `real.mjs --step $S --click "km"` -> 04.png (ambiguous, nothing happened: a "km" button and the "Role of km" dropdown)
I meant the dropdown under km.

## Step 04
Command: `real.mjs --step $S --click "Role of km"` -> 05.png
List: From, To, Weight, Date or time, Edge id, Attribute. "Weight" is the only one that sounds like "this number matters". I'll pick Weight and see whether it asks me if bigger means longer.

## Step 05
Command: `real.mjs --step $S --click "role=option:Weight"` -> 06.png
Now it says "Weight: km" and asks "Higher means: Not set / Closer / Farther / Capacity", with one line saying until I choose, a path counts every edge as one step. Good, that's the question I needed asked. More km is farther. Picking Farther.

## Step 06
Command: `real.mjs --step $S --click "Farther"` -> 07.png
"Weight: km (farther)" -- "a higher weight means farther apart, such as a longer distance... a path takes the smallest total." That's what I want. Direction says "As the file says"; trails go both ways but every row already runs uphill toward the Summit, so I'll leave it. Load.

## Step 07
Command: `real.mjs --step $S --click "Load"` -> 08.png
Loaded. The right panel says "Loaded weight: km (farther)" -- one place it says it took the kilometers. No names on the dots though, so I can't tell which is the Summit. The left panel says "Analyze in the toolbar (Shift+A)". That's the flask button I use for ranking. Opening it.

## Step 08
Command: `real.mjs --step $S --click-at 615,864` (the Analyze button) -> 09.png
A long list of rankings I mostly don't know. There's a "Filter analyses" box at the top with the cursor in it. I'll type "shortest".

## Step 09
Command: `real.mjs --step $S --type "shortest"` -> 10.png
"Shortest path -- the fewest steps, or the shortest path by weight, between two nodes." That's it. Clicking it.

## Step 10
Command: `real.mjs --step $S --click-at 501,668` -> 11.png
Shortest path form: From, To, Follow (Out / All -- All is on, fine, trails go both ways), and Weight already shows "km (farther, loaded)". Good, it carried my choice over. The From box has the cursor; typing Trailhead.

## Step 11
Command: `real.mjs --step $S --type "Trailhead"` -> 12.png
It suggests "Trailhead". Clicking the suggestion.

## Step 12
Command: `real.mjs --step $S --click-at 498,627` -> 13.png
From = Trailhead, and the cursor jumped to To on its own. Nice. Typing Summit.

## Step 13
Command: `real.mjs --step $S --type "Summit"` -> 14.png
Suggests "Summit". Clicking it.

## Step 14
Command: `real.mjs --step $S --click-at 494,681` -> 15.png
From Trailhead, To Summit, Weight km (farther, loaded). Find path.

## Step 15
Command: `real.mjs --step $S --click "Find path"` -> 16.png
Result panel: Path 5 nodes, 4 edges; "Total km 7.5"; Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. Under "Made with" it says Weight: km (farther). The left list also has "Shortest path  km 7.5". I checked it against the table I saw on import: 1.5 + 2 + 2.5 + 1.5 = 7.5, and the other ways (via Pine Fork 3+1+2.5+1.5 = 8, or 3+6 = 9) are longer. It's right. I'm done.

## End
Command: `real.mjs --end $S` -> session ended.

## Debrief (Dana, in character)

- **Did I finish?** Yes. Shortest walk Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all.
- **Where it says it used the kilometers:** three places. Right after loading, the Graph panel's "Loaded weight: km (farther)". In the Shortest path form, the Weight box already read "km (farther, loaded)". And on the result, "Total km 7.5" plus "Made with ... Weight: km (farther)", and the left list entry "Shortest path km 7.5".
- **Ease:** 6 of 7.
- **What worked:** the import preview asked me what a bigger number means (Closer / Farther / Capacity) with one plain sentence each, and "Farther" said "a path takes the smallest total" -- that's the question I'd want asked about lead times too. It carried my choice into the analysis without asking again. Typing "shortest" in the analysis filter found it at once.
- **What confused me / nitpicks:**
  - Before I changed anything, the km column was just "Attribute" with "Weight: none (each edge counts 1)" in small text. If I hadn't been told to look for it I'd have clicked Load straight away, like I always do, and every path would have counted stops, not kilometers. That line is easy to skim past.
  - "Weight" is a word I had to guess at; I picked it because nothing else sounded like "this number matters".
  - The dots have no names on the picture, so I couldn't tell which one was the Summit until the result table listed them. The table is what I trusted.
  - The Direction box said "As the file says" and the summary said "Directed". Trails go both ways; I only got a both-ways answer because Follow defaulted to "All". I'm not sure what would have happened with Out.
  - Labels in the right panel are small and gray; on my laptop screen I'd be leaning in.
