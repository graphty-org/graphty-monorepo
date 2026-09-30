# Session: make this project look like the team's -- the Gephi holdout

Participant: Dr. Mara Lindqvist (associate professor, computational social science; Gephi user
since 0.8, teaches it every year; skeptical of new tools, fast with the ones she knows).

Task as given: "Your team always draws its networks the same way, and a colleague just mailed you
the file with those colors and sizes. Make this project look like the team's."

Screens seen, as a participant sees them (design notes hidden), rendered at 1440 x 900:

- The style stack with a layer open: `shots/record/r6-mara-teamcolors-styles-list.png`
- The stack's add button, Libraries tab: `shots/record/r6-mara-teamcolors-styles-list--libraries.png`
- The main menu, File open: `shots/record/r6-mara-teamcolors-replace-and-recipe.png`
- The Data panel, no recipe applied yet: `shots/record/r6-mara-teamcolors-data-panel.png`; a month
  later: `shots/record/r6-mara-teamcolors-data-panel-s6.png`
- Apply recipe picker (from the menu): `shots/record/r6-mara-teamcolors-rr-s-recipe-pick.png`
- The team's file dropped on the canvas: `shots/record/r6-mara-teamcolors-rr-s-style-drop.png`
- Its binding step: `shots/record/r6-mara-teamcolors-rr-s-bind-style.png`
- The team's styles in use: `shots/record/r6-mara-teamcolors-rr-s-style-applied.png`
- A second recipe's binding and result, for comparison:
  `shots/record/r6-mara-teamcolors-recipe-apply--binding.png`,
  `shots/record/r6-mara-teamcolors-recipe-apply--applied.png`,
  `shots/record/r6-mara-teamcolors-recipe-apply--undone.png`

## Think-aloud

**Before touching anything.**

"The team's look. In our group that is: spatialize with ForceAtlas2, partition color on
modularity class with the lab palette, ranking size on in-degree, 10 to 60. In Gephi I do that by
hand in the Appearance panel every single time, because Gephi cannot save it. The GEXF keeps the
colors as fixed `viz:color` values, not the rule. So if this thing can take a colleague's file and
reapply the RULE, that's something Gephi has never done. I'll believe it when I see it.

The file my colleague sent is `fraud-team-colors.graphty`. Fine, it's not a `.gephi`, so apparently
somebody on the team uses this tool. Not my data either -- transfers between accounts -- but a
network is a network."

**Step 1: the style stack.** (`styles-list`)

"The right panel says 'Style stack', 'Top wins each property it sets'. OK, so this is my
Appearance panel, but in layers. Betweenness color, Hub labels, Size: degree, Base style. That's
readable. Colors are on a log scale and it tells me the divisor. Good, I like it when a tool says
the number.

Where do I load a style from a file? There's a plus next to 'Style stack'. Clicking.

Custom and Libraries. Libraries: palettes -- Okabe-Ito, Viridis, Blue to red. Good palettes, I use
Okabe-Ito with students. Then 'Style layers, from the recipe Stress response', 'from the recipe
Protein triage'. So there's a thing called a recipe and its layers show up here. But these are
recipes the tool already knows about. There is no 'from file' in here. I have a file in my mail.
Dead end."

**Step 2: the menu.** (`replace-and-recipe`, File menu)

"Main menu. File: Open, Add data, Add as another graph, Join, Update with new data, Connect to data
source, Load set collection, Export. No 'Import appearance', no 'Import style'. If I hit 'Open...'
with this file, does it replace my project with an empty one? I don't know, and I'm not clicking it
to find out on a project I care about.

Below File there's a top-level 'Recipes'. I didn't come here thinking 'recipe' -- that's not a word
I have for this. In my head it's an appearance preset. But the Libraries popover said recipe, so I
guess that's the noun. Recipes, Apply recipe... it opens a picker: 'In graphty: Overview',
'Recently opened' -- three recipe files that aren't mine -- and at the bottom, 'Open a recipe
file...'. That's it, it's the last line of the list. Two dead ends before I found the word. In
Gephi I'd already be halfway through doing it by hand."

**Step 2b: the Data panel.** (`data-panel`)

"I went back and looked at the Data panel, because I'd look there for anything file-related. At the
bottom: 'Applied recipes. None yet. A recipe is a file of styles, sets or runs, from a colleague or
another project; a file of colors and sizes is a recipe too.' OK -- that sentence is exactly my
task. If I'd seen it first I'd have gotten here in one click. It's at the very bottom of the Data
panel, under Versions, where I wasn't looking for colors.

One question it doesn't answer: my co-authors send me GEXF files with `viz:color` and `viz:size`
in them. Is THAT 'a file of colors and sizes'? Can I take the look off a GEXF? Nothing says. I'd
guess no."

**Step 3: I drag the file onto the canvas instead.** (`s-style-drop`)

"Honestly, this is what I'd really do: drag the attachment from mail onto the window. Canvas gets a
blue border, a dialog: 'Apply recipe fraud-team-colors. A recipe that holds only styles: 4 layers,
bound by attribute name.'

'Bound by attribute name.' Good. That means rules, not frozen colors -- that's the thing Gephi
Lite couldn't even export. If it means what I think.

Two choices. 'Use these styles... Its 4 layers take the place of these 3 of yours, which write the
same thing: Risk ramp, Risk color, Mule ring -- node color.' And 'Add these styles on top... 4
layers above your 8; all 8 stay.'

The team's look should BE the look, so 'Use these styles'. What I want and don't get: WHAT are the
four layers? It lists the three of mine that go, by name. It does not list the four that come in,
or what they're computed from. Partition on what? Ranking on what, what range, what palette? I'd
approve a reviewer's figure faster than this -- I'm being asked to accept four unnamed layers. I
learn the names only on the next screen.

Also: 'Your other 5 stay: Community color (from an algorithm, never replaced)'. Never replaced --
but the team's layers also write node color. So which color does a node end up with? I think the
answer is 'top wins', which the stack header said, but this dialog makes it sound like my
community color survives. I'd have to try it.

Behind the dialog, the stack on the right already shows 'Watchlist ring -- recipe', 'Pass-through
edges -- recipe', 'Risk ramp -- recipe'. Are those already applied? From an earlier recipe? I
can't tell whether I'm looking at before or after."

**Step 4: the binding step.** (`s-bind-style`)

"'Use these styles: Risk ramp, Risk color and Mule ring go.' '3 layers matched by name: Cleared
accounts, Merchant hubs, Amount width.' There are the names. Still no rule shown -- 'Amount width'
I can guess, the other two I can't.

'Chargeback heat reads chargeback_rate, numbers. This graph has no such attribute. Ask the sender
which one they meant.' Fair. It tells me plainly it's missing and doesn't silently drop it. 'Left
unbound, Chargeback heat is kept and switched off, marked missing attribute.' That I respect -- it
says what it does not do instead of pretending.

'One undo step.' We'll see."

**Step 5: applied.** (`s-style-applied`)

"Toast: 'fraud-team-colors in use: 3 of your layers replaced; 1 missing attribute. Undo.' Stack:
Cleared accounts (green swatch, new), Merchant hubs (orange, new), Amount width (new), Chargeback
heat (warning, off), then Watchlist ring, Pass-through edges, Size by PageRank, Community color,
Base style.

Now the canvas. It's grey. All of it. Every hexagon is a shade of grey. Before I applied this there
were fourteen orange mule-ring accounts; they're gone, because 'Mule ring' was one of the layers
replaced. The stack says green for cleared accounts and orange for merchant hubs -- I cannot find
a single green or orange node on the canvas. So I applied 'the team's colors' and the map got LESS
colored. Either the team's layers match nothing here, or they're drawn somewhere I can't see, or
the preview is wrong. Nothing tells me 'Cleared accounts: 0 nodes' or 'paints 412 of 3,093'. The
open layer in the first screen had 'paints 300 of 300 proteins' -- that's the number I need on
every new layer, right here, the moment it's applied.

And Community color is still in the stack, from an algorithm, but I don't see community colors
either. So what did win? This is exactly the 'what did it actually compute on' feeling, applied to
paint.

I'd hit Undo -- Ctrl+Z first, of course. The other recipe I looked at shows the undone state
clearly: back to waiting, 'files on disk were not changed'. Good. Undo that covers appearance is
the one thing I've wanted from Gephi for a decade."

**Comparison: the other recipe.** (`recipe-apply`)

"The Expression overlay recipe is a better experience, and I think it's because it says what it
reads: 'Fold change, for color -- two columns could be the fold change', with the range of each,
'-2.52 to 3.15' vs '-2.41 to 2.98'. That's the kind of screen I trust. After applying, the legend
and the table agree on the numbers. Small thing: the module colors in the canvas legend are
washed-out -- Proteasome pale yellow -- and the table shows Proteasome as a saturated orange chip.
Which one is the color? If I'm printing a legend for a reviewer, they have to be the same.

It also applied a filter: 'Filtered: 1,059 of 1,262 edges', and the statistics card says
'Filtered'. At least it says so. In Gephi that'd be silent."

## Single Ease Question

**4 out of 7.**

"I got there, and the part that makes this worth anything -- the rule survives as a file and
reapplies by attribute name, with one undo -- is real and Gephi can't do it. But I found it on the
third try, under a word I don't use; the dialog asked me to accept four layers without showing me
what they do; and the result was a grey map with nothing telling me how many nodes each new layer
painted. A 'make it look like the team's' task that ends with me unsure whether it looks like the
team's is not done."

## Would I use this instead of my current tool?

"No. I'd stay on Gephi for papers. For this one job -- carry the team's appearance from one network
to the next without redoing the Appearance panel -- this is genuinely better than anything I have,
and I'd give it a second session. It would need to show me each incoming layer's rule and how many
nodes it paints before I click, and it would need to take the look off a GEXF my co-authors send,
because nobody on my team is going to mail me a .graphty file."

## Observations for the designers (moderator's notes, not the participant's words)

1. **The canvas shows no color after the team's styles are applied.** In the "team's styles in
   use" state every node is grey, while the stack lists green (Cleared accounts) and orange
   (Merchant hubs) layers on top, and the fourteen orange mule-ring nodes she had before are gone.
   A pixel count over the canvas area finds no saturated color at all. She read it as "applying
   the team's colors made the map less colored". Severity high: the result of the task contradicts
   the task.
2. **No "paints N of M" on newly applied layers.** The open-layer card elsewhere shows "paints 300
   of 300 proteins"; the applied state and the binding step show none, so a layer that matches
   nothing is indistinguishable from one that matches everything.
3. **The drop dialog names what leaves, not what arrives.** "Use these styles" lists her 3 layers
   that go but not the recipe's 4 layers or what each is computed from (attribute, palette,
   range). She had to approve blind and learned the names one screen later, still without rules.
4. **"From an algorithm, never replaced" reads as "keeps its color".** Community color stays in
   the stack but loses node color to the team's layers above it; the dialog's wording suggests it
   survives visibly.
5. **The stack behind the drop dialog already shows recipe layers** (Watchlist ring, Pass-through
   edges, Risk ramp, marked "recipe"), so she could not tell the before state from the after.
6. **The entry points are hard to find without the word "recipe".** No style import under File or
   under the stack's add button (Libraries lists only recipes the tool already knows). The Data
   panel's sentence "a file of colors and sizes is a recipe too" answers the task exactly but sits
   at the bottom of the Data panel. Drag and drop onto the canvas worked first time.
7. **Unanswered: can a GEXF's `viz:color` / `viz:size` be taken as a look?** For this participant
   the colleague's file would be a GEXF or a `.gephi`, not a `.graphty`.
8. **Muted legend colors disagree with the table's module chips** in the Expression overlay result
   (canvas legend pale yellow for Proteasome, table chip saturated orange).
9. **What earned credit:** the rule survives as a file and rebinds by attribute name; a missing
   attribute is named, kept and switched off rather than dropped; one undo step covers the whole
   apply; the Expression overlay binding shows each candidate column's range.
