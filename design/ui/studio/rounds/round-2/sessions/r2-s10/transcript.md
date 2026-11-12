# Session r2-s10 -- Jordan (marketing network analyst), task T15 Prompt B (friends.csv)

Commands are run from design/ui/studio with T=tool, S=rounds/round-2/sessions/r2-s10.

## Step 1

Command: `node tool/real.mjs --start $S empty`
Saw (01.png): a dark start page. Left: "Open project or file...", "New from data...", "or drop a file anywhere". Middle: Recent projects (empty). Right: four samples. A usage-data consent box at the bottom.
Jordan: OK, there's a cookie-style question first. I'll say no thanks, then open my friends.csv with "Open project or file...".

## Step 2

Jordan: Dismiss the usage-data box with No thanks.

Command: `node tool/real.mjs --step $S --click No\ thanks`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/02.png
```

## Step 3

Jordan: Banner gone. Opening my CSV via Open project or file...

Command: `node tool/real.mjs --step $S --click Open\ project\ or\ file... --upload friends.csv`

```
a file chooser is open (answer it with --upload <file>)
chose the file friends.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/03.png
```

Saw (03.png): the network is drawn right away -- 20 blue dots, 41 arrows, no names on the dots. Right panel: Nodes 20, Edges 41, Directed, Components 1. Bottom-left hint: "Analyze (flask) in the toolbar (Shift+A) to add results here".
Jordan: Part 1 DONE -- it's on screen, and quickly. The numbers match what I'd expect (20 people). Now "who matters most": the hint points to the flask button in the bottom toolbar, so I'll try that.

## Step 4

Jordan: Click the flask (Analyze) button in the bottom toolbar.

Command: `node tool/real.mjs --step $S --click-at 680\,864`

```
at 680,864: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/04.png
```

Saw (04.png): a menu "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, ... each with a one-line description.
Jordan: Good list, plain-English descriptions. I'd normally reach for degree or betweenness, but it literally says "Start here" on PageRank and "matters most" is what PageRank is for. Picking PageRank.

## Step 5

Jordan: Pick PageRank.

Command: `node tool/real.mjs --step $S --click PageRank`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/05.png
```

Saw (05.png): PageRank settings: Damping factor 0.85, Weight None, Advanced, "Under a second", Run.
Jordan: Defaults are fine; I don't know what the weight column in my friend's sheet means so I'll leave it at None. Run.

## Step 6

Jordan: Run PageRank with defaults.

Command: `node tool/real.mjs --step $S --click Run`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/06.png
```

Saw (06.png): dots are now orange to dark brown. A key top-left of the drawing: "Color: Influence 0.04382 -> 0.06608" (light orange to dark brown). Left panel gained a row "Influence 20".
Jordan: Part 2 DONE -- it worked out an "Influence" score (PageRank, renamed) and colored everyone; darker brown = more influence. The range is narrow (0.044 to 0.066), so the colors barely differ -- in a greyscale printout this would be mush. Sizes are all the same still. I'll click the Influence row to see if it offers "size by".

## Step 7

Jordan: Click the Influence row in the left panel.

Command: `node tool/real.mjs --step $S --click Influence`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/07.png
```

Saw (07.png): right panel now "Influence", Style tab, Nodes: Fill (+), Color = Influence, Shape (+), Effects (+), Label (+), Tooltip (+).
Jordan: No "Size" row. Size is probably part of "Shape" -- I'll press the + beside Shape. (Hesitated: I scanned the list twice looking for the word "size".)

## Step 8

Jordan: Press + next to Shape, hoping size lives there.

Command: `node tool/real.mjs --step $S --click-at 1419\,234`

```
at 1419,234: button "Add to Shape"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/08.png
```

Saw (08.png): a small menu: Size, Shape.
Jordan: There it is. Size.

## Step 9

Jordan: Pick Size.

Command: `node tool/real.mjs --step $S --click Size`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/09.png
```

Saw (09.png): a new row "Size [1] (chain-link icon) (-)". Dots unchanged.
Jordan: A plain number box would make everyone the same size -- not what I want. The chain-link icon beside it probably means "link to a value". Hovering it to check.

## Step 10

Jordan: Hover the chain-link icon beside Size.

Command: `node tool/real.mjs --step $S --hover-at 1381\,264`

```
at 1381,264: button "Size by attribute"
tooltip: "Size by attribute"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/10.png
```

Saw: tooltip "Size by attribute".
Jordan: Yes, that's it. Clicking it.

## Step 11

Jordan: Click Size by attribute.

Command: `node tool/real.mjs --step $S --click Size\ by\ attribute`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/11.png
```

Saw (11.png): popover "Size by attribute": Influence, Influence rank, Influence percentile; "Cannot be used: Holds groups, not amounts -- id".
Jordan: Influence it is. (Percentile might spread sizes better given the tight range, but I'll start with the real score.)

## Step 12

Jordan: Choose Influence.

Command: `node tool/real.mjs --step $S --click Influence#2`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/12.png
```

Saw (12.png): dots now vary in size; two big dark ones near the bottom middle. Size row reads "1 to 3". The key top-left now has two lines: "Size: Influence 0.04382 -> 0.06608" (a grey wedge) and "Color: Influence 0.04382 -> 0.06608".
Jordan: Part 3 DONE -- bigger dot = more influence, and darker brown = more influence too (same score twice, which is fine for a greyscale printout). Now names. There's a "Label +" row right there; pressing it.

## Step 13

Jordan: Press + next to Label.

Command: `node tool/real.mjs --step $S --click-at 1419\,332`

```
at 1419,332: button "Add label line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/13.png
```

Saw (13.png): a "Label" picker: Attributes -> id; Influence -> Influence, Influence rank, Influence percentile.
Jordan: The spreadsheet only had source/target, so the names must be "id". Picking id.

## Step 14

Jordan: Choose id for the label.

Command: `node tool/real.mjs --step $S --click id`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/14.png
```

Saw (14.png): names on every dot (Omar, Pia, Quinn, Ravi, Sana, Theo, Ava, Gus, Ben, Eli, Dev, Chloe, Farah, Ivan, Hana, Jada, Kofi, Lena, Nora, Milo). Panel: "Label: Above, Abc id -- 20 labels, 0 hidden to avoid overlap". Ava is the biggest, darkest dot; Farah next.
Jordan: Part 4 DONE -- everyone's name is on. The text is small and "Chloe" sits on top of Farah's dot at the bottom, but readable enough. Ava and Farah are my top two. Last part: a picture with the key. I'll look in the main menu (three lines, top-left) for export.

## Step 15

Jordan: Open the main menu (top-left three lines) looking for export.

Command: `node tool/real.mjs --step $S --click-at 23\,20`

```
at 23,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/15.png
```

Saw (15.png): menu: Back to start, New project, Open project or file, Open sample, Save, Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help.
Jordan: "Export..." -- that's the one.

## Step 16

Jordan: Choose Export...

Command: `node tool/real.mjs --step $S --click Export...`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/16.png
```

Saw (16.png): Export dialog. Image: "To share -- PNG, 2x", View: Current view, Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background Canvas color/Transparent. A preview thumbnail shows the drawing with the little key box in its top-left corner. Buttons Cancel / Copy / Export.
Jordan: The preview seems to include the key (tiny box top-left). PNG at 2x is what I'd paste into a deck. Export.

## Step 17

Jordan: Press Export.

Command: `node tool/real.mjs --step $S --click Export`

```
ambiguous: "Export" matches 2 controls (button "Export", dialog "Export Image Data Image A picture of the"); took the first
a file was saved: friends_current-view.png, 1806 x 1720 (/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/downloads/friends_current-view.png)
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s10/17.png
```

Saw (17.png): toast "Exported friends_current-view.png". The saved file (downloads/friends_current-view.png, 1806 x 1720) has the key in its top-left corner -- "Size: Influence 0.04382 -> 0.06608" with a grey wedge, "Color: Influence 0.04382 -> 0.06608" with an orange-to-brown bar -- plus every dot with its name.
Jordan: Part 5 DONE -- a PNG with its key, ready to paste. Ending here.

## End

Command: `node tool/real.mjs --end $S`

## In character, at the end (Jordan)

**Did I finish?** Yes, all five parts, in 16 steps with no dead ends:

1. On screen: Open project or file -> friends.csv; drawn at once (20 people, 41 links).
2. Who matters most: flask button -> PageRank (marked "Start here") -> Run. The app calls the result "Influence".
3. Bigger dots: Style -> + beside Shape -> Size -> chain-link "Size by attribute" -> Influence. Sizes 1 to 3.
4. Names: + beside Label -> id. "20 labels, 0 hidden".
5. Picture with key: Main menu -> Export... -> PNG 2x -> Export. The key is in the picture.

**What the sizes and colors stand for:** both show each person's Influence score (PageRank): bigger and darker brown = more influence. The scores run from 0.044 (smallest, lightest) to 0.066 (biggest, darkest). Ava is clearly the most influential, then Farah, then Hana and Ivan.

**Rating: 6 out of 7 (easy).**

**What confused me or slowed me down:**

- Size is hidden under "Shape". I scanned the Style list twice looking for the word "Size" before guessing that the + beside Shape would have it.
- After adding Size I got a plain number box ("1"); I had to spot and hover the small chain-link icon to learn it means "Size by attribute". A first-timer could easily type a number there and make everyone the same size.
- The name "Influence" vs. "PageRank": I picked PageRank and the app relabeled it "Influence" everywhere, including the key. Fine for my VP, but if someone asks "influence how?" the picture does not say it is PageRank.
- The key shows raw scores (0.04382 to 0.06608). Those numbers mean nothing to a reader of my document; "low -> high" or ranks would read better. The range is also narrow, so the colors barely differ except for the top four.
- The label is called "id", not "name" -- I guessed right because the sheet only had names in it, but it was a guess.
- Names are small, and "Chloe" is printed over Farah's big dot at the bottom, hard to read in the export; Eli and Dev overlap too. "0 hidden to avoid overlap" is technically true but two names are still on top of things.
- The size key is a grey wedge with no dot shapes, so it is not obvious at a glance that the wedge means dot size.
