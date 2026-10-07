# Session r3-s04 -- Grace (nonprofit operations analyst), task T15 prompt A (Les Miserables)

Tool: `T=design/ui/studio/tool; S=design/ui/studio/rounds/round-3/sessions/r3-s04` (commands run from the worktree root).

## Step 1 -- start
Command: `node $T/real.mjs --start $S empty` -> 01.png

Saw: a dark start page. "Start" with "Open project or file...", "New from data...", a line "Files are read on this computer and never uploaded" (good -- that is the privacy sentence I look for). "Samples" on the right lists "Les Miserables -- 77 characters". A usage-data banner at the bottom.

Thinking (Grace): The banner first -- I don't share data from a work laptop, so "No thanks". Then the Les Miserables sample is right there.

## Step 2 -- decline usage data, open the sample
Command: `node $T/real.mjs --step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the drawing with blue dots and gray lines. Right panel "Overview": Nodes 77, Edges 254, Density, Components 1. 77 matches the "77 characters" on the start page -- every character arrived. No names on the dots. Bottom left says "Analyze (flask icon) in the toolbar (Shift+A) to add results here". Bottom toolbar has a flask, a chart icon, "3D", and a magnifier.

Said aloud: "Part one is done -- it's on screen, 77 characters, same as the sample said."

Thinking (Grace): "Which characters matter most" -- the hint points at the flask. I'll click it.

## Step 3 -- open Analyze
Command: `node $T/real.mjs --step $S --click-at 679,864` (the flask; tool said: button "Analyze") -> 03.png

Saw: a list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS... Each has a one-line explanation under it.

Hesitated: most of these names are jargon to me (Eigenvector? Katz? HITS?). The little explanations help. "Degree -- how many edges each node has" is the plainest "most connected", but I don't know if "edges" means connections. The "Start here" tag on PageRank is the program telling me what to pick, and its line ("connected to other well-connected nodes") sounds like "matters most".

Thinking (Grace): I'll take the one marked "Start here".

## Step 4 -- PageRank settings
Command: `node $T/real.mjs --step $S --click-at 556,600` (tool: option "PageRank Start here ...") -> 04.png

Saw: a small form: "Damping factor 0.85", "Weight None", "Advanced", "Under a second", a blue "Run" button.

Hesitated: "Damping factor" means nothing to me. I'll leave the defaults alone -- if they matter, the program should have picked sensible ones.

Thinking (Grace): Press Run.

## Step 5 -- Run PageRank
Command: `node $T/real.mjs --step $S --click "Run"` -> 05.png

Saw: every dot turned orange, a few darker brown (one in the middle, one at the bottom hub). A key appeared top left: "Color: PageRank" with a bar from 0.003299 to 0.07543. The left list now has a "PageRank 77" row with an orange swatch.

Said aloud: "Part two is done, I think -- the program worked out a score for each character and colored the dots by it. The darker ones look like they're the bigger numbers, but the color difference is small; I'm guessing dark = matters more." The numbers 0.003 to 0.075 mean nothing to me as a person, but it's a range.

Hesitated: the dots are still all the same size. The task says make the dots bigger for those who matter more.

Thinking (Grace): The new "PageRank" row in the left list is the most obvious thing to click -- maybe it offers "size by this".

## Step 6 -- select the PageRank row
Command: `node $T/real.mjs --step $S --click-at 155,156` (tool: treeitem "PageRank") -> 06.png

Saw: the right panel changed to "PageRank -- Measure from PageRank, Oct 7", tabs Style / Values, Nodes / Edges. Under Nodes: "Fill +", "Color: PageRank -", "Shape +", "Effects +", "Label +", "Tooltip +".

Hesitated: no word "Size" anywhere. Size of a dot... is that "Shape"? It's the closest. "Label" is probably the names, for later.

Thinking (Grace): Try the + next to Shape.

## Step 7 -- the Shape + menu
Command: `node $T/real.mjs --step $S --click-at 1419,234` (tool: button "Add to Shape") -> 07.png

Saw: a little menu with "Size" and "Shape". Relief -- Size is hiding under Shape.

Thinking (Grace): Click "Size".

## Step 8 -- Size by attribute
Command: `node $T/real.mjs --step $S --click-at 1340,270` (tool: menuitem "Size") -> 08.png

Saw: a popup "Size by attribute": "Fixed size", then under "PageRank": "PageRank", "PageRank rank", "PageRank percentile". Grayed out: "Cannot be used: Holds groups, not amounts -- id, name".

Hesitated briefly: three PageRank choices. "PageRank" itself is the score that colors the dots, so I'll size by the same thing so color and size tell one story.

Thinking (Grace): Click "PageRank".

## Step 9 -- sized by PageRank
Command: `node $T/real.mjs --step $S --click-at 1195,416` (tool: option "PageRank") -> 09.png

Saw: the popup closed and the dots now differ in size: one big dark dot in the middle, a big one at the bottom hub, a few medium ones. The panel shows "Size 1 to 3". The key top left now has two rows: "Size: PageRank" with a gray wedge 0.003299 to 0.07543, and "Color: PageRank" with the orange bar.

Said aloud: "Part three is done -- bigger dots are the characters that matter more. Size and color both mean the same score, PageRank: bigger and darker = more important."

Thinking (Grace): Names next. "Label +" looks like the place.

## Step 10 -- Label +
Command: `node $T/real.mjs --step $S --click-at 1419,332` (tool: button "Add label line") -> 10.png

Saw: a "Label" popup with "Attributes: id, name" and the three PageRank choices. A row "Pick an attribute" appeared under Label.

Thinking (Grace): "name" is what I want -- the characters' names.

## Step 11 -- labels by name
Command: `node $T/real.mjs --step $S --click-at 1117,502` (tool: option "name") -> 11.png

Saw: names appear above the dots: Myriel, Napoleon, Cravatte, Fantine, Javert... The panel says "Label: Aa Above, Abc name" and below "77 labels, 6 hidden" with a checkbox "Show all labels".

Hesitated: the names are very small, serif text -- fine on my screen if I lean in, but small for a slide. And the big dark middle dot (presumably the main character) -- I can barely make out its name ("Valjean"?), it seems crowded. "6 hidden" -- I want every name, the task says the characters' names.

Said aloud: "Names are on the drawing -- mostly. Six are hidden."

Thinking (Grace): Tick "Show all labels".

## Step 12 -- show all labels
Command: `node $T/real.mjs --step $S --click "Show all labels"` -> 12.png

Saw: checkbox ticked, it now says "77 labels" (no hidden). A few more names appeared (Mother Innocent, Mlle Gillenormand, Mme Pontmercy). In the crowded middle the names sit on top of each other and the biggest dot's name is covered by its own lines -- I cannot read who the most important character is from the picture.

Said aloud: "Part four done -- all 77 names are on the drawing, though the middle is a jumble and the text is tiny."

Thinking (Grace): I won't fiddle with label size on a first sitting. Now the picture file. No "Export" button in sight; the three-line menu at top left is where programs usually keep File things.

## Step 13 -- main menu
Command: `node $T/real.mjs --step $S --click-at 23,20` (tool: button "Main menu") -> 13.png

Saw: Back to start, New project, Open project or file, Open sample, Save, Save as, Save local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help.

Thinking (Grace): "Export..." -- that's the picture.

## Step 14 -- Export dialog
Command: `node $T/real.mjs --step $S --click "Export..."` -> 14.png

Saw: an "Export" dialog, Image tab: "A picture of the drawing, 2x, PNG", Preset "To share -- PNG, 2x", View "Current view", sizes 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background canvas color/transparent. A preview thumbnail -- I can see a little dark box in its top-left corner, which I take to be the key. Footer: "Saved to this computer only; nothing is uploaded." Buttons Cancel, Copy, Export.

Hesitated: nothing says "include the key" -- I have to squint at the preview to believe it is there. A checkbox "Include key" would reassure me. PNG is what pastes into Word/PowerPoint, so the defaults suit me.

Thinking (Grace): Press Export.

## Step 15 -- Export
Command: `node $T/real.mjs --step $S --click-at 1057,746` (tool: button "Export"; a file was saved: les-miserables_current-view.png, 1806 x 1720, in downloads/) -> 15.png

Saw: the dialog closed and a message "Exported les-miserables_current-view.png". I opened the file: the drawing with a white key box in the top-left corner: "Size: PageRank" (gray wedge, 0.003299 to 0.07543) and "Color: PageRank" (light orange to dark brown, 0.003299 to 0.07543). The key is nice and readable. The names in the picture are tiny and a bit blurry; around the big dark dot in the middle they pile on top of each other and its own name is lost under the lines.

Said aloud: "Part five done -- I have a PNG with the key in it that I can paste into a document."

Thinking (Grace): Before I tell anyone what the picture shows, I want to know who that giant dot is -- it is the most important character and I can't read its name. I'll click on it.

## Step 16 -- click the biggest dot
Command: `node $T/real.mjs --step $S --click-at 768,448` (tool: node "Valjean") -> 16.png

Saw: the dot turned yellow (selected). The right panel: "Valjean -- Node", Summary: id Valjean, name Valjean, Results: PageRank 0.07543, #1 of 77, Degree 36. "#1 of 77" is the plain-language answer I wanted.

Said aloud: "The biggest, darkest dot is Valjean -- number one of 77. The second big one at the bottom is Myriel."

## End
Command: `node $T/real.mjs --end $S`

## Wrap-up (in character, Grace)

**Did I finish?** Yes, all five parts:
1. On screen -- Les Miserables from Samples; 77 nodes matched the "77 characters" on the start page.
2. Which characters matter most -- Analyze (flask), picked the "Start here" choice, PageRank, pressed Run.
3. Bigger dots for those who matter more -- selected the PageRank row, Shape +, Size, PageRank.
4. Names on the drawing -- Label +, name, then "Show all labels" (6 were hidden at first).
5. Picture with its key -- main menu, Export..., Export: a PNG with a Size and Color key in the corner.

**What the sizes and colors stand for:** both stand for the same thing, the PageRank score -- the program's measure of how connected a character is to other well-connected characters. Bigger and darker brown = matters more; small light orange = matters less. Valjean is the biggest (#1 of 77), then Myriel.

**Rating: 5 of 7** (fairly easy). Every step had one obvious place to click, and the dialogs kept telling me nothing is uploaded.

**What confused me or slowed me down:**
- The Analyze list is mostly jargon (Eigenvector, Katz, HITS, Damping factor). The "Start here" tag saved me; without it I'd have guessed.
- "Size" is hidden under "Shape". I only found it by trying the closest word.
- The key shows raw numbers (0.003299 to 0.07543). I can't tell a board what 0.075 means; "#1 of 77" or "most to least important" would be clearer.
- The labels are tiny and blurry in the exported picture, and they pile up in the middle. The most important character's name is unreadable on the drawing itself -- I had to click the dot to learn it was Valjean. I wouldn't put this picture on a slide as it is.
- The Export dialog never says the key is included. I only knew from squinting at the preview and then opening the file.
- The orange-to-brown color difference is subtle; the size difference does most of the work.
