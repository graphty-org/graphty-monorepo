# Session r2-s33 -- Nadia (level-1 alert reviewer), T9 Prompt B (Florentine families)

Task: open the ready-made Florentine families network; make the families the network depends on most have the biggest dots; then say what sizes and colors stand for.

## Step 1
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s33 empty`

Saw: a start page. Open project, New from data, Recent projects (empty), and a Samples list on the right with "Florentine families -- 15 families". A usage-data box at the bottom.

## Step 2
Before: Usage data box is in the way; I'll say No thanks, like any pop-up at work.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click No thanks`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/02.png
```

## Step 3
Before: Box gone (assumed). The task says the ready-made Florentine families network, so I'll click that sample.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click Florentine families`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/03.png
```

Saw: 15 blue dots, all about the same size, no names on them. Right panel says 15 nodes, 20 edges. Bottom left: 'Analyze (flask) in the toolbar (Shift+A) to add results here'. Hesitated: 'depends on most' -- there is no button with that wording.

## Step 4
Before: Dots are all the same, no names. The hint says Analyze is the flask button at the bottom, so I'll click it.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --hover-icon 1`

```
icon 1 of 7, at 24,20
tooltip: "Main menu: open, save, export, settings"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/04.png
```

## Step 5
Before: That hover was the main menu, not it. I'll just click the flask icon at the bottom of the drawing.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click-at 679,864`

```
at 679,864: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/05.png
```

Saw: a list titled 'Rank nodes and edges': Degree, Betweenness, Edge betweenness, Closeness, PageRank (tagged 'Start here'), Eigenvector, Katz, HITS, All-pairs distance... Hesitated: none of these say 'depends on'. Betweenness ('sit on the most shortest paths between others') sounds close, but I don't know these words. PageRank says Start here, and I'm new.

## Step 6
Before: A list of math names. PageRank is marked 'Start here' and I've never done this, so I take the hint and click PageRank.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click PageRank`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/06.png
```

Saw: PageRank settings: Damping factor 0.85, Weight None, Advanced, 'Under a second', Run button. I don't know what damping is; leaving defaults.

## Step 7
Before: Settings I don't understand. Leave them and press Run.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click Run`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/07.png
```

Saw: dots turned orange to dark brown. A legend top-left: 'Color: Influence 0.03066 ... 0.1458'. Left panel has a new row 'Influence 15'. Dots are still all the same size -- the task wants size, not just color. The name says Influence, not PageRank; I assume that's the same thing. Part 1 (work it out) done; part 2 (sizes) not yet.

## Step 8
Before: Colors changed but sizes did not. I'll click the new 'Influence' row on the left to see if it offers size.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click Influence`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/08.png
```

Saw: right panel now 'Influence -- Measure from Influence, Oct 7', Style tab, Nodes/Edges. Rows: Fill +, Color = Influence, Shape +, Effects +, Label +, Tooltip +. No row says Size. Hesitated: size of a dot -- is that Shape? Probably.

## Step 9
Before: No 'Size' anywhere. Shape is my best guess for how big a dot is, so I click the + next to Shape.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click-at 1419,234`

```
at 1419,234: button "Add to Shape"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/09.png
```

Saw: a small menu: Size, Shape. Good guess.

## Step 10
Before: There it is: Size. Clicking it.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click Size`

```
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/10.png
```

Saw: a Size row with a number box '1' and a chain-link icon. A fixed number would make every dot the same. The Color row shows 'Influence' instead of a number, so the link icon probably ties it to the result.

## Step 11
Before: A '1' is the same for every dot. I'll hover the chain icon next to it to see what it does.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --hover-at 1380,264`

```
at 1380,264: button "Size by attribute"
tooltip: "Size by attribute"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/11.png
```

## Step 12
Before: Tooltip says 'Size by attribute'. Not my word, but it sounds like 'size by a value'. Clicking it.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click-at 1380,264`

```
at 1380,264: button "Size by attribute"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/12.png
```

Saw: 'Size by attribute' list: Influence, Influence rank, Influence percentile; greyed out id and name ('Holds groups, not amounts'). Hesitated briefly between Influence and rank -- rank 1 might be the biggest number for the least important, so plain Influence is safer.

## Step 13
Before: Pick plain 'Influence' -- same thing the colors already use. Rank might run backwards.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click-at 1193,372`

```
at 1193,372: option "Influence"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/13.png
```

Saw: dots now different sizes. One big dark dot in the middle, a few medium, small ones on the edges. Legend now shows two rows: 'Size: Influence 0.03066 ... 0.1458' and 'Color: Influence 0.03066 ... 0.1458'. Size row on the right says '1 to 3'. Sizing part done. Still no names on the dots -- for an alert file I'd want to know which family the big one is.

## Step 14
Before: Sizes done. Before I say what it means, I want to know who the big dot is. Hovering it.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --hover-at 700,378`

```
at 700,378: node with id "Medici"
tooltip: null
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/14.png
```

Saw: nothing changed on screen when I held the mouse over the big dot -- no name popped up. (The tool says it is 'Medici', but nothing on the screen told me.)

## Step 15
Before: Hovering shows nothing. I'll click the big dot instead.

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s33 --click-at 700,378`

```
at 700,378: node with id "Medici"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33/15.png
```

Saw: the big dot got a yellow ring. Right panel: 'Medici -- Node', id Medici, name Medici, Results: Influence 0.1458, #1 of 15; Degree 6. Left panel: Selection 1. So the biggest, darkest dot is Medici, number one of fifteen. That's enough for me.

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s33`
```
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s33
```

## Debrief (in character, Nadia)

**Did I finish?** Yes. Every dot is now sized by what the program calls "Influence" (the PageRank analysis), from about 1 to 3 times the normal size. The biggest dot is Medici, number 1 of 15.

**What the sizes and colors stand for now:** Both show the same thing, "Influence". The bigger the dot, the more influence the program gives that family, and the darker the color (light orange to dark brown), the more influence too. The legend at the top left says both run from 0.03066 (smallest, lightest) to 0.1458 (biggest, darkest). Clicking a dot tells you its family and its place, e.g. Medici 0.1458, #1 of 15. I can't tell you in plain words what one "influence" point means. The list only said "connected to other well-connected nodes".

**How easy was it?** 5 out of 7. It took about ten clicks and a few minutes, which is fine for a first time. Two steps cost me time:
- Picking the analysis. Nothing in the list says "depends on". I took PageRank because it said "Start here", not because I knew it was right. Betweenness ("sit on the most shortest paths between others") might be the better answer to "depends on". I'd want someone to tell me which one QA would accept.
- Finding size. Running the analysis colored the dots but left them all the same size. Size was hidden under "Shape +", and then I had to know that a chain icon called "Size by attribute" meant "size by the result". "Attribute" isn't a word I use.

**What confused me:**
- I clicked "PageRank" but everywhere afterwards it's called "Influence". I assumed they're the same thing.
- Holding the mouse over a dot shows nothing, and there are no names on the dots. I only found out the big one was Medici by clicking it. For an alert file I'd need the names on the picture.
- Color and size now say the same thing twice. Fine, but I didn't choose the color, it just happened.
- "Influence rank" vs "Influence" vs "Influence percentile": I didn't know whether rank 1 would be drawn small or big, so I avoided it.
