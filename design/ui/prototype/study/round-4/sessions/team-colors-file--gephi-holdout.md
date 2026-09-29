# Team colors from a file -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science, Gephi user since 0.8, teaches it every year. Skeptical of new tools; translates every
term back to Gephi's ("partition", "ranking", "Data Lab", "Preview").

**Task as given by the moderator:** "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like the
team's."

**Screens seen:** the rebuilt navigation (project at rest, the project-name menu, the Data panel),
the Data panel page (first load, and a month on), the replace-and-recipe screens (main menu,
Apply recipe picker, a style file dropped on the canvas, its binding step, the result), the
recipe-apply screens, and the styles list (the stack in the right panel, the color picker's
Libraries tab). All at 1440 x 900.

Renders the participant looked at:
- `../../../shots/r4-mara-teamcolors-nav-new.png`, `../../../shots/r4-mara-teamcolors-nav-new-menu.png`,
  `../../../shots/r4-mara-teamcolors-nav-new-data.png`
- `../../../shots/r4-mara-teamcolors-data-panel.png`, `../../../shots/r4-mara-teamcolors-data-panel-s6.png`
- `../../../shots/r4-mara-teamcolors-replace-and-recipe-full.png` (menu, Apply recipe, dropped file,
  binding, applied)
- `../../../shots/r4-mara-teamcolors-recipe-apply-full.png`
- `../../../shots/r4-mara-teamcolors-styles-list-full.png`, `../../../shots/r4-mara-teamcolors-styles-libraries.png`

## Think-aloud

**First look, the project at rest.** "Right. Before anything: what did my colleague send? In my
world 'the file with the colors and sizes' is a .gephi project, or a GEXF with viz:color and
viz:size on every node. Nobody sends a palette file. So I'm going to look for Import."

"Left rail: Graph, Data, Notes. There's a hamburger at the top. That's my File menu, presumably."

**The project-name menu.** "Click the name, Les Miserables. Export, Update with new data, Download
project file, Version history, Project info, Rename, Duplicate, Close. No Open. No Import. Export
is here but its twin isn't. That's odd -- in Gephi File has Open and Import right at the top."

**The main menu (hamburger), File.** "Open, Add data, Add as another graph, Join, Replace data,
Connect to data source, Load set collection, Export. Nothing says style, nothing says appearance,
nothing says palette. 'Load set collection' -- what's a set collection? Not this, I think. If I
had a GEXF with colors I'd use Open... but then I'd get the colleague's DATA, not my data with
their colors. That's exactly the Gephi problem: colors ride along on the nodes, not as a rule."

"There's a Recipes submenu. Recipe. Hm. Is a list of colors a recipe? In cooking maybe."

**Recipes, Apply recipe.** "A picker. 'In graphty: Overview', 'Recently opened: Mule ring
triage, Card-testing sweep', 'Open a recipe file...'. The right side is decent -- 'What it
carries: 3 sets, 2 runs, 3 style layers, 1 note', each with a checkbox. So I could untick
everything except the style layers. That's close to what I want. But the file I was sent -- is
it a recipe? I don't know. If it isn't, 'Open a recipe file' will presumably refuse it. I'm not
going to guess; I'll look somewhere that says style."

**The right panel, Style stack.** "Style stack, 'Top wins. Drag to reorder.' Size: degree, Group
color, Bridges off, Base style. OK, so a style layer is a partition or a ranking, stacked. Fine,
I can translate that. There's a plus. From the styles-list page, plus makes a new layer for the
selection and opens a color picker. The picker has a Libraries tab -- 'Palettes: Okabe-Ito,
Viridis...' and 'Style layers, From stress-response.graphty-style'. So a .graphty-style file
exists. But that list only shows files already IN the project. There's no 'add a library from a
file' there. Dead end two."

**The Data rail.** "Data. Sources, Versions, and -- 'Recipes and style files', with a plus. There
it is. Why is the team's LOOK under Data? It isn't data. I'd never have looked here first. The
plus's label says 'Apply a recipe or style file'. What it opens isn't drawn, so I don't know if
it's a file dialog or the recipe picker again."

"And the other Data panel page splits it into two sections, 'Recipes applied' and 'Style files',
each with its own plus. Two versions of the same panel. Which one is the product?"

**What I actually do: drag it in.** "Fine. When I can't find Import I drag the file onto the
canvas. That always works in Gephi for a GEXF."

**The dropped-file dialog.** "Oh, good, it caught it. 'fraud-team-colors: style file. 4 layers,
bound by attribute name.' Two choices: 'Apply style file on top... Adds 4 style layers above the
9 already here; those stay.' Or 'Replace style stack with style file... The 9 style layers here
are removed; the file's 4 remain.'"

"Nine? I count four in the stack on the right: Risk color, Size by PageRank, Mule ring, Base
style. Where are the other five? If the first number you show me doesn't match what I can count,
I stop trusting the second one."

"And what ARE the four layers? 'Cleared accounts, Merchant hubs, Amount width' -- names. Names
somebody typed. I want to see the rule: partition on which column, ranking on which column, which
colors, what size range. You show me that for a recipe -- 'what it carries' -- but not for the
style file. I'm applying my team's palette blind."

"'Bound by attribute name' -- OK, that I like, actually. If the team's file says 'partition by
modularity_class' and my column is modularity_class, it just works. That's the thing Gephi can't
do: the colors come over as a rule, not as fixed hex on each node. If it's true."

"Which do I want? 'Make it look like the team's.' That means the team's look, not the team's look
glued on top of whatever's here. So Replace. But Enter goes to 'on top', and the dialog nudges
there. I'll do what most people will do and press Enter, and see."

**Binding step.** "'1 layer to bind. 3 layers matched by name.' Chargeback heat wants
chargeback_rate, I don't have it, 'Leave unbound'. It stays in the stack switched off and marked.
That's honest. I'd rather that than a layer that silently paints nothing. 'One undo step.' Good.
Apply."

**The result.** "The toast says 'fraud-team-colors applied: style; 1 missing attribute. Undo.'
The stack now has Cleared accounts, Merchant hubs, Amount width, Chargeback heat with a warning,
all marked new, then Watchlist ring and Risk ramp, and '6 more'."

"Now the picture. ... It's the same picture. Same grey hexagons, same orange dots on the ring.
The legend still says 'Flagged: yes 14, no 3,079'. Where are the green cleared accounts? Where
are the amber merchant hubs? Where's the edge width? The page says the team's colors are on this
graph. I'm looking at the graph and they're not."

"And while I'm at it -- what is this, a hexbin? Three thousand accounts drawn as a heat map of
hexagons? I can't see a node. I can't read a partition on hexagons. Maybe that's why the colors
don't show. Either way I can't check the result, so as far as I'm concerned it didn't happen."

"Cmd+Z. The toast has Undo, so I trust it's one step. Then I'd drop the file again and choose
Replace. There's no picture of what Replace gives me, so I can't tell you whether that looks like
the team's either. And Replace throws away the Mule ring layer, which is the one thing on this
graph somebody cared about. So 'on top' keeps junk I don't want, 'replace' throws away work I do
want. In Gephi I'd just re-do the partition by hand and be done in two minutes."

**A month later, the Data panel.** "This one's got a legend -- 'Community color, Louvain
community, Community 1 to 7, Other 58 communities' -- and the right panel says 'Style stack' with
NOTHING under it. The canvas is obviously styled. So which do I believe, the picture or the
panel? And 'Community 1, Community 2' -- Louvain ids are random. If the team file colors
'Community 1' orange, and my rerun reshuffles the ids, the team's orange lands on a different
community. Does a style file know that? Nothing here tells me."

**Legend.** "One more thing -- there's a legend drawn on the canvas, automatically. If that
exports with the SVG, that's Inkscape gone from my week. I'll believe it when I see the SVG."

## Single Ease Question

**3 of 7.** "Finding where to put the file took four tries and I got there by dragging, which is
my trick for tools that hide Import. Once it was in, the dialog was clear and honest about the
missing column. But I couldn't see the result, the layer count was wrong, and 'on top versus
replace' is the wrong question for 'make it look like the team's'."

## Would she use this instead of her current tool?

"No. I'd stay on Gephi. Not because of this task alone -- the idea is actually the thing I've
wanted for ten years, a look that travels as rules and binds to column names. But nobody I work
with has a .graphty-style file; they have .gephi files and GEXF with viz colors, and nothing here
says it reads either. And I applied the team's colors and the picture didn't change. I can't put
a figure in a paper when I can't see that the style landed. Show me the partition on real nodes,
the rule behind each layer before I apply it, and the SVG with the legend, and I'll give it a
second session."

## Problems observed

1. **The canvas does not change after the style file is applied** (replace-and-recipe, "The style
   file applied on top"). The stack shows four new layers and the page text says the team's colors
   are on the graph, but the canvas is the same grey hexbin with the same orange ring and the
   legend still reads "Flagged". She concludes nothing happened. Severity 4.
   Quote: "It's the same picture. ... I can't check the result, so as far as I'm concerned it
   didn't happen."
2. **Layer count does not match the visible stack** (replace-and-recipe, dropped-file dialog).
   "Adds 4 style layers above the 9 already here" while the right panel lists 4 layers. She stops
   trusting the dialog's other numbers. Severity 3.
   Quote: "Nine? I count four."
3. **No route to a style file from the obvious places** (navigation: project-name menu, main menu
   File, Style stack "+", color picker Libraries). Import of a style file lives only under the Data
   rail's "Recipes and style files +" and in drag and drop; File has Open but no Import, the
   project-name menu has Export but no Open. She found it by dragging, as a fallback. Severity 3.
   Quote: "Why is the team's LOOK under Data? It isn't data."
4. **The style file's contents are not shown before applying** (replace-and-recipe, dropped-file
   dialog). Layer names only; no column, rule type, palette or size range. The recipe picker does
   show "what it carries"; the style file choice does not. Severity 3.
   Quote: "I'm applying my team's palette blind."
5. **"On top" or "Replace" is the wrong choice for "make it look like the team's"** (dropped-file
   dialog). On top keeps layers she does not want and the new ones only win where they set a
   property; Replace discards the analyst's own highlight layer. No option to replace only what the
   file sets, and no preview of either outcome. Enter defaults to On top. Severity 3.
   Quote: "'on top' keeps junk I don't want, 'replace' throws away work I do want."
6. **The file format is foreign to her field** (all screens). Nothing says whether a .gephi file or
   a GEXF with viz:color / viz:size can serve as the team's look. Severity 3 for this persona.
   Quote: "nobody I work with has a .graphty-style file."
7. **Right panel's Style stack is empty while the canvas is clearly styled** (data-panel, "A month
   on"). The legend shows Community color and Size by degree; the Style stack section has no rows.
   Severity 3.
   Quote: "which do I believe, the picture or the panel?"
8. **Two different Data panels** (navigation's Data panel frame vs the data-panel page): one
   section "Recipes and style files" versus two, "Recipes applied" and "Style files". Severity 2.
9. **Hexbin drawing hides nodes** (replace-and-recipe, all frames). A 3,000-node graph is drawn as
   shaded hexagons; categorical colors cannot be read, and she cannot tell a partition was applied.
   Severity 3.
   Quote: "I can't read a partition on hexagons."
10. **Community ids in a style rule** (data-panel, "A month on"): a team palette keyed to "Community
    1..7" would land on different communities after a Louvain rerun; nothing says how a style file
    handles unstable ids. Severity 2.
11. **After the apply, the new stack collapses to "6 more"** (replace-and-recipe, applied). She
    cannot see the whole stack to check what now wins. Severity 2.

## What worked for her

- Dropping the file on the canvas was caught and explained, not silently applied.
- The binding step names the missing column and keeps the layer switched off and marked, instead
  of skipping it: "That's honest."
- "Bound by attribute name": the look travels as rules, not as fixed per-node colors, which is the
  round-trip Gephi cannot do.
- One undo step for the whole apply, with Undo in the toast.
- The Apply recipe picker lists what a recipe carries, with a checkbox per part.
- A legend drawn automatically on the canvas (if it exports with the SVG).
