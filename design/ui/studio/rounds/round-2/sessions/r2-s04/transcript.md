# Session r2-s04 -- Tom (recipe recipient), task T15 Prompt A (Les Miserables)

Participant: Tom, 52, cell-biology lab manager. Never built a network; reads what the postdoc sends. 13-inch laptop, reading glasses, mild red-green color weakness, no time.

Task as I understood it: open the Les Miserables sample, have the program work out which characters matter most, make the dots bigger for the ones that matter more, get names written on the drawing, and save a picture file with its key. Say what sizes and colors mean.

## Step 01 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s04 empty`

Saw: a dark start page. Left: "Open project or file...", "New from data...". Middle: Recent projects (empty). Right: Samples -- Les Miserables (77 characters) is first. A box at the bottom asks me to share usage data. Top right says "Local only" with a lock, which I like -- nothing leaves the building.

Next: get rid of the usage-data box ("No thanks" -- I don't share lab stuff), then click Les Miserables.

## Step 02 -- open the sample

Command: `--step --click "No thanks" --click "Les Miserables"`

Saw: the network is on screen. Purple-blue balls all the same size, grey lines, on a light background. Right panel says 77 nodes, 254 edges. No names on anything. Bottom left there's a hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here". There's a small toolbar at the bottom of the picture with a flask.

PART 1 DONE: it's on screen. Didn't have to install anything. Good.

Next: the hint says the flask is Analyze. "Which characters matter most" sounds like analyze. Click the flask.

## Step 03 -- open Analyze

Command: `--step --click-at 679,864` (printed: button "Analyze")

Saw: a list of analyses under "Rank nodes and edges": Degree, Betweenness, Closeness, PageRank, Eigenvector, Katz, HITS... Most of these words mean nothing to me. But PageRank has a little blue "Start here" tag, and its line says "Which nodes are connected to other well-connected nodes". That's as close to "who matters" as I'm going to get. Hesitated a moment -- Degree "how many edges each node has" is the one I actually understand -- but the program says start here, so I'll trust it.

Next: click PageRank.

## Step 04 -- PageRank settings

Command: `--step --click "PageRank"`

Saw: a small box with "Damping factor 0.85" and "Weight: None", an "Advanced" fold, "Under a second" and a blue Run button. "Damping factor" is exactly the kind of question I can't answer -- but it's already filled in, so I'll leave it alone. Glad it says it takes under a second.

Next: click Run.

## Step 05 -- Run PageRank

Command: `--step --click "Run"`

Saw: all the balls turned orange. A little key at the top left of the picture: "Color: Influence 0.003299 -- 0.07543" with a light-to-dark orange bar. On the left a new row "Influence 77". So "PageRank" became "Influence" -- fine, that word I understand. Honestly the oranges all look about the same to me; I can just about see a couple of darker ones (one in the middle, one at the bottom where the fan of lines meets). The numbers 0.003 to 0.075 mean nothing to me, but darker = more influence, I suppose.

PART 2 DONE (I think): the program worked out who matters, and it called it "Influence".

Next: make the dots bigger for the ones that matter more. The sizes are all the same. I'll click the "Influence" row on the left and hope it shows me what I can do with it.

## Step 06 -- click the Influence row

Command: `--step --click "Influence"`

Saw: the right panel changed to "Influence" with a Style tab. Nodes / Edges. Fill: Color = Influence. Then Shape +, Effects +, Label +, Tooltip +. I'm looking for the word "Size" and I don't see it anywhere. Hesitated here. Size of a ball... is that "Shape"? Probably the closest. "Label" is likely the names, which I'll need later.

Next: click the + next to Shape and see if size is in there.

## Step 07 -- Shape +

Command: `--step --click-at 1419,234` (printed: button "Add to Shape")

Saw: a little menu with "Size" and "Shape". Size was hiding under Shape. OK.

Next: click Size.

## Step 08 -- Size added

Command: `--step --click "Size"`

Saw: a new row "Size" with a box that says 1 and a little chain-link icon beside it. Nothing changed in the picture. A plain number would make every ball the same size -- that's not what I want. The Color row above shows "Influence" in a chip, so somehow color is tied to Influence. The chain icon might be how you tie it. Not sure. I'll hover it before I click anything.

Next: hover the chain-link icon.

## Step 09 -- hover the chain icon

Command: `--step --hover-at 1381,264` (tooltip: "Size by attribute")

Saw: tooltip "Size by attribute". "Attribute" is a computer word, but "size by" is what I want. Size by Influence, hopefully.

Next: click it.

## Step 10 -- Size by attribute list

Command: `--step --click-at 1381,264`

Saw: a pop-up list "Size by attribute": Influence, Influence rank, Influence percentile. Below, greyed out: id, name ("Cannot be used: holds groups, not amounts" -- fair enough). I'll pick plain "Influence", same as the color, so the two agree.

Next: click Influence in this list.

## Step 11 -- size by Influence

Command: `--step --click-at 1193,372` (option "Influence")

Saw: now it's a picture. A big dark ball in the middle and another big one at the bottom where the fan of lines meets; a few medium ones; most stay small. The Size box now says "1 to 3". The key at the top left now has two rows: "Size: Influence" (a grey wedge, 0.003299 to 0.07543) and "Color: Influence" (the orange bar, same numbers). So size and color both mean influence. The size difference I can actually see, unlike the oranges.

PART 3 DONE: dots are bigger for the characters that matter more.

Next: names. "Label" is right there under Effects. Click its +.

## Step 12 -- Label +

Command: `--step --click-at 1419,332` (button "Add label line")

Saw: a "Label" list: id, name, then Influence, Influence rank, Influence percentile. "name" is obviously what I want -- the character names.

Next: click "name".

## Step 13 -- names on

Command: `--step --click-at 1117,502` (option "name")

Saw: names are on the drawing. The big one in the middle is Valjean, the big one at the bottom is Myriel. The text is very small and in a thin typewriter-ish font -- I had to lean in, and some names in the dense middle run into each other. Under the Label row it says "77 labels, 6 hidden to avoid overlap", so it's being honest about the ones it hid. Good enough for me.

PART 4 DONE: names written on the drawing.

Next: a picture file with the key. I don't see a "Save picture" or "Export" button. The menu with three lines at the top left is where "File" things usually live. Try that.

## Step 14 -- main menu

Command: `--step --click-at 23,20` (button "Main menu")

Saw: a menu: Back to start, New project, Open project or file, Open sample, Save, Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help. "Save" would save the project, not a picture. "Export..." is the one -- that's what PowerPoint calls it too.

Next: click Export...

## Step 15 -- Export dialog

Command: `--step --click "Export..."`

Saw: an Export box. Image is picked: "A picture of the drawing, 2x, PNG". Preset "To share -- PNG, 2x", View "Current view", size 1x/2x/4x, PNG/JPEG/WebP, background. A preview of the picture -- I can see a tiny box in its top-left corner that looks like the key, which is what I need. Bottom says "Saved to this computer only; nothing is uploaded." Good -- that's the sentence I'd want for lab data. There's no checkbox for "include the key", so I'll trust the preview. Defaults look fine; PNG pastes into PowerPoint.

Next: click Export.

## Step 16 -- Export

Command: `--step --click "Export"` (tool note: "Export" matched the button and the dialog; it took the button)

Printed: a file was saved: les-miserables_current-view.png, 1806 x 1720 (downloads/les-miserables_current-view.png)

Saw: the box closed and a message at the bottom: "Exported les-miserables_current-view.png". Opened the file: the drawing with the key in a white box at the top left, in big clear black type: "Size: Influence" with a grey wedge, "Color: Influence" with a light-to-dark orange bar, both running 0.003299 to 0.07543. The key is easy to read. The names on the balls, though, are blurry and smudged in the file -- fuzzy grey-black, like a photocopy of a photocopy. I can read Myriel, Napoleon, Old Man, Fantine; the crowded middle ones (and Valjean's own name, under his big ball) I can't make out. If I pasted this in a slide the PI would ask what the small print says.

PART 5 DONE: a picture file, with its key, that I could paste into a document.

Command: `--end`

## In character, at the end

**Did I finish?** Yes, all five parts:
1. On screen: clicked Les Miserables under Samples.
2. Who matters most: Analyze (the flask), PageRank (it said "Start here"), Run. The program calls the result "Influence".
3. Bigger dots: clicked the Influence row, then + next to Shape, Size, the chain icon ("Size by attribute"), Influence.
4. Names: + next to Label, "name".
5. Picture with key: menu, Export..., Export.

**What the sizes and colors stand for:** both stand for the same thing, "Influence" -- the PageRank score, which the program describes as being connected to other well-connected characters. Bigger and darker orange means more influential. Valjean in the middle is the biggest and darkest; Myriel at the bottom (the one everyone in the fan connects through) is second. The numbers on the key (0.003 to 0.075) I couldn't explain to anyone -- they're not counts of anything I recognize.

**How easy, 1 (very difficult) to 7 (very easy): 5.**

What made it easy: the hint at the bottom left pointing at the flask; "Start here" on PageRank so I didn't have to choose among words like Katz and HITS; the color came on by itself with a key; "Local only" and "nothing is uploaded" on the export; the export key is large and clear.

What confused me or slowed me down:
- Size is hidden under "Shape". I scanned the panel for the word "Size" and didn't find it; I guessed Shape and got lucky. A ball's size isn't its shape.
- After adding Size it just showed "1" -- a fixed number -- and the way to tie it to Influence is a small chain icon with no words. I only found it by hovering. "Size by attribute" is computer talk.
- The oranges are hard to tell apart for me (light orange to dark brown-orange). Size did the real work; color mostly just doubled it.
- The key's numbers (0.003299 to 0.07543) mean nothing to a reader. A rank or "low / high" would be something I could say out loud in lab meeting.
- Names on screen are tiny and thin; in the exported picture they're blurry, and the crowded middle names (including Valjean, the most important one) can't be read. That's the part I'd be embarrassed by.
- I wasn't sure if the "Influence" row on the left was the result or a setting; clicking it is what opened the place to change size and labels, which I found by luck.
- PageRank vs. Degree: I went with the program's suggestion, but I couldn't tell the PI why PageRank and not "how many connections", which is the one I understand.
