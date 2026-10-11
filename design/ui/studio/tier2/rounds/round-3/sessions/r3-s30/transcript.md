# Session r3-s30 -- Dev, returning

Task: the Florentine marriage network is open. The Strozzi want a message carried to the Pazzi, passed only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

Every command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <command> <session>`, where `<session>` is the session folder the briefing names.

## Step 01 -- start

    --start <session> setup:florentine-ranked.txt

(Waited several minutes for a free browser slot.) 01.png: the Florentine families network, colored and sized by PageRank, PageRank layer selected on the left, its Style panel on the right. No names on the dots. Toolbar at the bottom: a flask icon, a chart icon, 3D, a magnifier.

Dev: "Okay, so this is the families one, with the ranking still on. No names though -- wait, I need to know which dot is Strozzi. The task is like a route, 'how do I get from Strozzi to Pazzi'. Last time the analysis was the flask in the toolbar, so I'll try that first."

## Step 02

    --step <session> --click-at 679,864

Prints: button "Analyze". 02.png: a list of analyses with a "Filter analyses" box. Recent: PageRank, then "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness ... All-pairs distance.

Dev: "Okay, the analysis list. These are all rankings. I want a route, 'shortest path' like in the lab slides. There's a filter box with the cursor in it, so I'll just type 'path'."

## Step 03

    --step <session> --type "path"

03.png: the list narrowed. Under "Find paths and edge sets": "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." and a grayed "Guided route -- Select 2 nodes first".

Dev: "Oh nice, 'Shortest path', 'the fewest steps'. That's literally the task -- as few families as possible. It says start here. Clicking it."

## Step 04

    --step <session> --click "Shortest path"

04.png: a "Shortest path" form: From "Where the path starts", To "Where the path ends", each with a pick-on-canvas icon; Weight: None; Advanced (folded); "Find path" button.

Dev: "Okay, From and To. Weight None is right, I think -- a marriage is a marriage, no numbers here. I'll click into From and type Strozzi."

## Step 05

    --step <session> --click "Where the path starts" --type "Strozzi"

05.png: a suggestion "Strozzi" appears under the From box.

Dev: "It found Strozzi. Picking it from the list."

## Step 06

    --step <session> --click-at 557,679

Prints: option "Strozzi". 06.png: From now holds Strozzi; the To box is highlighted, so the cursor jumped there by itself.

Dev: "Nice, it moved me to To already. Typing Pazzi."

## Step 07

    --step <session> --type "Pazzi"

07.png: suggestion "Pazzi" under the To box.

Dev: "Pazzi's there. Pick it."

## Step 08

    --step <session> --click-at 553,733

Prints: option "Pazzi". 08.png: From Strozzi, To Pazzi, Weight None; focus is on "Find path".

Dev: "From Strozzi, To Pazzi, no weight because the ties are just marriages. Find path."

## Step 09

    --step <session> --click "Find path"

09.png: the path is drawn in black, five dots joined by thick black lines. The left list has a new "Shortest path -- 4 hops" layer above PageRank. The right panel (Values tab): Summary -- Path: 5 nodes, 4 edges. Nodes in order: 1 Strozzi, 2 Ridolfi, 3 Medici, 4 Salviati, 5 Pazzi. Made with: Analysis Shortest path, Ran Oct 10 5:51:43 PM, From Strozzi, To Pazzi, Weight None, "Each edge counts as 1."

Dev: "Oh nice, that's it! It lists them in order: Strozzi, Ridolfi, Medici, Salviati, Pazzi. And down here it shows what it used -- From Strozzi, To Pazzi, Weight None, 'each edge counts as 1'. That's what I meant: every marriage is one step, fewest families. Good, that's my proof for the instructor. The dots still have no names, though -- I want to be sure the black line actually starts at Strozzi. I'll hover the end dot at the top."

## Step 10

    --step <session> --hover-at 569,157

Prints: node with id "Pazzi", cursor: pointer, tooltip: null. 10.png: nothing changed on screen -- no tooltip or name appeared on hover.

Dev: "Hm, wait -- hovering shows nothing, no name bubble. The pointer turns into a hand, so it's clickable, but it doesn't tell me who it is. (The tool says that top dot is Pazzi, so the line runs from Strozzi at the bottom left up to Pazzi at the top -- that matches the list.) The list on the right gives me the order with numbers, so I'm done. I'm not going to put labels on now; that wasn't the question."

Essay sentence: "Passing only between families joined by marriage, the fewest-step route from the Strozzi to the Pazzi goes Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi: five families and four marriages (shortest path, no weight, each tie counted as 1)."

## First --end

    --end <session>

Answered (exit 3) with a further request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

Dev: "Oh, another one. Same thing, Peruzzi to Ginori. I'll open the analysis list again -- Shortest path should be up top under Recent now."

## Step 11

    --step <session> --click "Analyze"

11.png: the analysis list again, with "Shortest path" first under Recent.

Dev: "There it is, first under Recent. Clicking it."

## Step 12

    --step <session> --click-at 565,448

Prints: option "Shortest path The fewest steps, ...". 12.png: a fresh empty Shortest path form (From and To blank, Weight None). The first path's results still show on the right.

Dev: "Empty form, good. Peruzzi in From."

## Step 13

    --step <session> --click "Where the path starts" --type "Peruzzi"

13.png: suggestion "Peruzzi" under From.

Dev: "Pick Peruzzi; last time it jumped to To by itself, so I'll type Ginori right after."

## Step 14

    --step <session> --click-at 558,679 --type "Ginori"

Prints: option "Peruzzi". 14.png: From Peruzzi; To shows "Ginori" with a suggestion "Ginori".

Dev: "Pick Ginori, then Find path."

## Step 15

    --step <session> --click-at 555,733 --click "Find path"

Prints: option "Ginori". 15.png: a new black path from the bottom dot up the right side. Right panel: Path 5 nodes, 4 edges. Nodes in order: 1 Peruzzi, 2 Bischeri, 3 Guadagni, 4 Albizzi, 5 Ginori. Made with: Shortest path, Ran 5:52:58 PM, From Peruzzi, To Ginori, Weight None, "Each edge counts as 1." The left list still shows just one "Shortest path -- 4 hops" layer, and the Strozzi-to-Pazzi line is no longer drawn.

Dev: "Got it: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. Again four marriages, weight None, each counts as 1 -- matches what I meant. Wait, though -- my first route is gone. There's still only one 'Shortest path' in the list on the left and the Strozzi line isn't black anymore. Did it overwrite the first one? Nothing told me it would. I wrote that answer down already so it's okay, but if the instructor asks me to show both I'd have to run the first one again. Anyway, both answers are done."

Essay sentence: "The Peruzzi reach the Ginori through Bischeri, Guadagni and Albizzi: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori, four marriages."

## Second --end

    --end <session>

Session ended (exit 0).

## In character, at the end

- **Did I finish?** Yes, both. Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi; and Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.
- **Ease: 6 of 7.** Typing "path" into the analysis filter found "Shortest path" right away, the From/To boxes suggested the family names, and the result listed the families in order with a "Made with" section (From, To, Weight None, "Each edge counts as 1") that I can show my instructor as proof.
- **What confused me:**
  1. The dots have no names, and hovering one shows nothing, so I could not check on the picture which end of the black line was Strozzi. I had to trust the list on the right.
  2. Running the second route replaced the first one: the list on the left kept a single "Shortest path" and the first black line disappeared, with no message saying it would. I'd want to keep both, or at least be told.
  3. Small thing: "PageRank" appears twice in the full list (once under Recent, once under "Rank nodes and edges" with "Start here"), and "Guided route -- Select 2 nodes first" sat right under Shortest path and I wasn't sure if I needed it. I didn't.
