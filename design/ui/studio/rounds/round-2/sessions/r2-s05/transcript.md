# Session r2-s05 -- Nadia (level-1 alert reviewer), task T15 Prompt A (Les Miserables)

Start: `node tool/real.mjs --start rounds/round-2/sessions/r2-s05 empty` -> 01.png

## Steps

- 01.png: A dark start page. Left: "Open project or file...", "New from data...". Middle: Recent projects (empty). Right: Samples, Les Miserables first ("77 characters"). A usage-data banner at the bottom. Nadia: "Les Miserables is right there. I'll get rid of the banner first, then click it."

- Note: Decline usage data, then open the Les Miserables sample.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click" "No thanks" "--click" "Les Miserables"`
  Output:
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/02.png
  Saw (02.png): The network is drawn -- blue balls and gray lines, 77 nodes, 254 edges on the right. No names on it. Left panel says "Analyze (flask) in the toolbar (Shift+A) to add results here". Nadia: "OK, it's on screen. Part one done. 'Which characters matter most' -- that has to be Analyze. I'll click the flask at the bottom."

- Note: Part 1 done (graph on screen). Click the flask (Analyze) in the bottom toolbar.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "679,864"`
  Output:
      at 679,864: button "Analyze"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/03.png
  Saw (03.png): A list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS... Nadia: "Lots of words I don't use. It says 'Start here' on PageRank, so I'll trust it." (Hesitated: Degree, "how many edges each node has", also sounded like 'matters most'.)

- Note: Pick PageRank (marked Start here).
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "556,600"`
  Output:
      at 556,600: option "PageRank Start here Which nodes are connected to o"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/04.png
  Saw (04.png): A PageRank form: "Damping factor 0.85", "Weight: None", Advanced, "Under a second", a blue Run button. Nadia: "No idea what damping is. Leave the defaults. Run."

- Note: Leave defaults, press Run.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click" "Run"`
  Output:
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/05.png
  Saw (05.png): All dots turned orange; the hub ones look darker brown. A box top-left: "Color: Influence 0.003299 [orange bar] 0.07543". Left panel gained a row "Influence 77". Nadia: "So it ran, and it called it 'Influence'. Darker means more influence I guess -- but the shades are hard to tell apart. Part two done, I think. Now bigger dots. I'll click the Influence row on the left and see what it offers."

- Note: Part 2 done (PageRank ran, called Influence, colors nodes). Click the Influence row to look for a size option.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click" "Influence"`
  Output:
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/06.png
  Saw (06.png): Right panel now "Influence" with Style tab: Nodes/Edges, Fill +, Color = Influence, Shape +, Effects +, Label +, Tooltip +. No word "Size" anywhere. Nadia: "No 'size'. Size is closest to Shape, I guess. Try the plus next to Shape."

- Note: No Size row visible; try the + next to Shape.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1419,234"`
  Output:
      at 1419,234: button "Add to Shape"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/07.png
  Saw (07.png): A small menu: "Size", "Shape". Nadia: "There it is. Size."

- Note: Pick Size from the menu.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1307,270"`
  Output:
      at 1307,270: menuitem "Size"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/08.png
  Saw (08.png): A "Size" row with a box saying "1" and a chain-link icon next to it. Dots unchanged. Nadia: "A single number makes them all the same size, that's not what I want. Color says 'Influence'. Maybe the chain icon links it to Influence. I'll hover it first."

- Note: Hover the chain-link icon next to Size.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--hover-at" "1381,264"`
  Output:
      at 1381,264: button "Size by attribute"
      tooltip: "Size by attribute"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/09.png
  Saw (09.png): Tooltip "Size by attribute". Nadia: "'Attribute' -- I'll take that to mean a column. Click it."

- Note: Click Size by attribute.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1381,264"`
  Output:
      at 1381,264: button "Size by attribute"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/10.png
  Saw (10.png): A popup "Size by attribute": Influence, Influence rank, Influence percentile; greyed out id, name ("Cannot be used: Holds groups, not amounts"). Nadia: "Plain 'Influence', same as the color."

- Note: Choose Influence for size.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1193,372"`
  Output:
      at 1193,372: option "Influence"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/11.png
  Saw (11.png): The dots now vary in size -- one big dark one in the middle, one big one lower left (the hub of a fan). Size box says "1 to 3". The key top-left has two rows now: "Size: Influence 0.003299 - 0.07543" (a gray wedge) and "Color: Influence" (orange bar). Nadia: "Good, that's visible. Part three done: bigger and darker both mean more Influence. No names yet though. 'Label +' is right there."

- Note: Part 3 done (size by Influence). Click + next to Label.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1419,332"`
  Output:
      at 1419,332: button "Add label line"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/12.png
  Saw (12.png): A "Label" popup listing attributes: id, name, then Influence, Influence rank, Influence percentile. Nadia: "Names. 'name'."

- Note: Choose name for the label.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "1117,502"`
  Output:
      at 1117,502: option "name"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/13.png
  Saw (13.png): Names are written above the dots in small dark text (Myriel, Napoleon, Fantine, Valjean...). Panel says "77 labels, 6 hidden to avoid overlap". Text is tiny and the middle is crowded; the big center dot's label sits on top of the dot. Nadia: "Names are on. Small, but readable in the outskirts. Part four done -- though 6 are hidden, which QA might ask about. Now the picture file. The menu at top left is the usual place for export."

- Note: Part 4 done (names on, 6 hidden). Open the top-left menu to find export.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click-at" "23,20"`
  Output:
      at 23,20: button "Main menu"
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/14.png
  Saw (14.png): Main menu: Back to start, New project, Open..., Open sample, Save, Save as..., Save local copy..., Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help. Nadia: "Export."

- Note: Click Export...
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click" "Export..."`
  Output:
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/15.png
  Saw (15.png): Export dialog, Image tab: preset "To share -- PNG, 2x", view "Current view", size 1x/2x/4x/400x300, PNG/JPEG/WebP, background Canvas color/Transparent. A preview shows the drawing with a small key box at its top-left corner. Buttons Cancel, Copy, Export. Nadia: "Preview has the key in it -- tiny, but it's there. 'Copy' is handy for pasting into the alert file, but I was asked for a file. Export."

- Note: Defaults look fine; press Export.
  Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s05 "--click" "Export"`
  Output:
      ambiguous: "Export" matches 2 controls (button "Export", dialog "Export Image Data Image A picture of the"); took the first
      a file was saved: les-miserables_current-view.png, 1806 x 1720 (/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/downloads/les-miserables_current-view.png)
      /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s05/16.png
  Saw (16.png and downloads/les-miserables_current-view.png): A toast "Exported les-miserables_current-view.png". The file is 1806 x 1720. Its top-left has a white key box, readable: "Size: Influence 0.003299 -- 0.07543" with a gray wedge, and "Color: Influence 0.003299 -- 0.07543" with a light-to-dark orange bar. The names are in the picture but small and soft-edged; in the crowded middle several overlap, and the biggest dot's name (Valjean) is written across the dot itself and hard to read. Nadia: "Part five done. That's a file I could drop into a document. The key is the clearest thing on it."

End: `node tool/real.mjs --end rounds/round-2/sessions/r2-s05`

## Debrief (in character)

**Did I finish?** Yes, all five parts, in 15 steps, no dead ends:
1. On screen: clicked "Les Miserables" under Samples on the start page.
2. Who matters most: flask button (Analyze) at the bottom -> PageRank (it said "Start here") -> Run. The program called the result "Influence" and colored every dot by it straight away.
3. Bigger dots: clicked the "Influence" row on the left, then in the right panel the + next to "Shape" -> "Size" -> the chain icon ("Size by attribute") -> "Influence". Dots now go from small to big.
4. Names: + next to "Label" -> "name". 77 labels, 6 hidden to avoid overlap.
5. Picture with key: top-left menu -> Export... -> Export. A PNG with the key in its corner.

**What the sizes and colors stand for:** both stand for the same thing, the "Influence" score PageRank worked out -- a bigger dot and a darker brown both mean a more influential character. The biggest, darkest dot in the middle is Valjean; Myriel (bottom left, the hub of the fan) is the next most obvious. The key says the scores run from 0.003299 to 0.07543, but I couldn't tell you what those numbers mean in words; I'd write "relative influence, larger = more central" in the file and hope QA accepts that.

**Ease: 6 out of 7.** Faster than I expected; each step was in front of me.

**Where I hesitated / what confused me:**
- Picking the analysis: nine names I don't use (Degree, Betweenness, Closeness, PageRank, Eigenvector, Katz, HITS...). I only chose PageRank because of the "Start here" tag. Degree ("how many edges each node has") sounded just as right.
- PageRank asked about "Damping factor 0.85" and "Weight"; I left them alone without knowing what they do.
- The analysis is called PageRank in the list but "Influence" everywhere after it. I worked it out, but for a second I wasn't sure the "Influence" row was the thing I had just run.
- There's no "Size" on the style panel until you press + next to "Shape" -- I guessed. Then Size first shows a plain "1", and I had to find the small chain icon to tie it to Influence. A new user could easily stop at "1".
- After the color step the orange shades were too close to tell apart; the size step is what made the picture readable.
- The names are tiny and in the middle they pile up; the most important name (Valjean) is printed over its own big dot. In the exported file the names are soft and small -- fine on the outside, hard in the center. Six names are hidden and the picture doesn't say which.
- The key's numbers (0.003299, 0.07543) mean nothing to a reader of my document.
- Did coloring/sizing change the data or only the view? Nothing told me; I assumed only the view.
