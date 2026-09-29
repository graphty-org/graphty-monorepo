# Session: send the lab your setup, without your data -- Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated; persona in `../../personas/gephi-holdout.md`).
**Task as given by the moderator:** "Send your lab your setup so they can use it on their own data,
without sending yours."
**Screen:** the Export dialog mock (`screens/export-dialog.html`), starting at its first state and
moving to "Share the setup, without data". 1440 x 900.
**Result:** finished, with difficulty. Single Ease Question: 5 of 7.

## Transcript (think-aloud)

**The main window, Export dialog closed behind it.**

> "My setup. In Gephi that would be... there isn't one, honestly. I send the .gephi project and
> tell them to delete my nodes, or I send the handout with the ForceAtlas2 numbers written down.
> So what am I looking for here -- a template, a workspace without data? I don't see a File menu.
> There's a blue 'Export files...' button top right. Export is the closest thing. Fine."

Clicks **Export files...**.

**First state of the dialog: the figure export.**

> "Scope, full graph, 300 nodes. Figures, current view checked, 2x PNG. Big preview with a legend
> -- all right, a legend, that I will come back to another day. But I don't want a figure. I want
> the setup. Methods text, graph data, tables... nothing says template. Let me scroll this list."

Scrolls the left column. "Share the setup, without data" is below the fold at this size; the
heading only appears after scrolling.

> "There. 'Share the setup, without data.' That's literally my task, good. Two rows: Recipe,
> 'definitions only, never the data', and Style file, 'style layers and the Look only'. The Look
> with a capital L? What is the Look? I'll ignore it. Recipe is the one that sounds like the whole
> thing. Recipe is a cooking word, but fine."

Ticks **Recipe**.

**The recipe state.**

> "Oh -- it unticked my figure. And there's a grey bar: 'Figures and tables are off: they would
> show your data.' Okay, that's actually right, I would have forgotten the PNG was still checked
> and emailed a figure of an IRB dataset. Good. Scope went grey, 'Whole project', 'a recipe takes
> definitions, not a scope of data'. Fine, I don't need to think about it.
>
> A name field appeared next to Recipe, 'Expression overlay'. So that's what the file will be
> called. I would call mine 'Retweet lab setup'. Okay.
>
> Right side: 'No data inside.' Big, first. Good. That's the sentence I'd need to show the ethics
> office. Then three columns. Travels, Asked for when applied, Left behind."

Reads **Travels** slowly.

> "'3 runs: PageRank, Louvain seed 7, degree.' Seed 7! It tells me the seed. PageRank damping
> 0.85, weighted by confidence. Louvain resolution 1, seed 7, weighted. Degree exact. That is
> exactly what I'd want written in the handout. I can check these against NetworkX -- damping,
> resolution, seed, weights, those are the parameters that matter. Style layers, two. Filter,
> confidence 0.7 or more. Overview readings, six -- no idea what an overview reading is. 'View,
> without positions.'
>
> Wait. Where is the layout? My setup IS the spatialization. ForceAtlas2, LinLog on, scaling
> down, gravity, prevent overlap at the end. That's the method. It lists the statistics with their
> parameters, and then the layout is nowhere in Travels. And in Left behind: 'positions, the
> camera -- layout'. So the positions stay behind, fine, obviously, they're my nodes. But the
> layout algorithm and its settings -- do those travel or not? 'View, without positions' -- does
> that mean the view carries the layout settings and just not the coordinates? Or that my
> students open it and get whatever default layout this thing runs? I can't tell from this. If
> they get a different layout than mine, it's not my setup, it's my colour scheme."

Looks at **Asked for when applied**.

> "'Gene symbols, to join a table -- text. A fold change, above and below 0 -- signed. A
> confidence per interaction -- number.' So this is what their data has to have. For me that would
> be an Id, a Label, maybe a weight. Does it match by column name, or does it ask them? It says
> 'asked for', so I suppose it asks them. My students would need to know to have a weight column.
> Okay, that's usable -- I'd actually put this list straight in the lab sheet."

**Left behind** and the note.

> "Three hundred proteins, interactions, fold-change values, knockdown hits, positions, four notes
> on genes. And one note travels, on the confidence filter, shown in full so I can read it
> before it goes. Good -- I've had comments in files I did not mean to send. That's a careful
> touch."

Looks back at the left column.

> "Methods text is greyed out: 'One methods file for this export -- names the data file and its
> counts.' I read that as a description and wondered why it was disabled. Oh -- because it names
> the data. Should have said so. I'd want a methods text for the recipe, though -- the parameters
> are all there, that IS a methods paragraph. Why can't I have the one without the file name?
>
> And Style file -- if the recipe already carries 'style layers: 2', what is the separate Style
> file for? Is it the recipe minus the statistics? I'd tick both to be safe, and then my lab gets
> two files and asks me which one to open."

Looks at the file line and the footer.

> "'expression-overlay.graphty -- opens in graphty or any app with graphty-element.' So my lab
> has to use this tool. Half my lab is in Gephi, one of them is in R. For them this file is
> nothing. I can't send them a Gephi-shaped version of this. Not that Gephi could read a rule
> anyway -- Gephi can't carry a rule, which is exactly the thing I complain about. So in a way
> this is the thing Gephi doesn't do. But only if everyone moves.
>
> '1 file goes to your Downloads folder. Nothing is uploaded.' Good. Say that everywhere.
> Export 1 file."

Clicks **Export 1 file**. Task ends.

## After the task

**Single Ease Question:** 5.

> "Finding it took a scroll and a guess that 'Export' was the right door, and I still don't know
> whether my ForceAtlas2 settings are in that file. Everything else was clear, clearer than
> anything in Gephi. It turned off my figure by itself, told me the seed, and said nothing is
> uploaded. The layout is the one thing I would actually be sending, and it's the one thing it
> doesn't show me."

**Would she use it instead of Gephi?**

> "For this job -- handing twenty-five students the same setup to run on their own crawl --
> maybe, yes. Gephi can't do it at all; I do it with a handout and screenshots. If the recipe
> carries the layout with its parameters, I'd try it for the lab in September. For my own papers,
> no, I'd stay on Gephi: my coauthors send me .gephi files, and a .graphty file only opens here.
> Show me the layout line in that list and I'll give it a second session."

## Problems observed

1. **The layout is missing from what travels** (severity 3). The recipe preview lists every
   statistic with its parameters but no layout run; "positions, the camera -- layout" under Left
   behind and "view, without positions" under Travels leave her unable to tell whether the layout
   algorithm and its settings go with the recipe. For a force-layout user the spatialization is
   the method.
2. **The "Share the setup" section is below the fold** of the output list in the dialog's opening
   state (severity 2). She found it only by scrolling, after deciding that "Export" was the right
   door at all; there is no "Save setup" or "recipe" wording in the header.
3. **Recipe vs Style file is unclear** (severity 2). The recipe already lists style layers, so she
   cannot tell what the separate Style file adds, and "the Look" is an unexplained term. She would
   tick both to be safe.
4. **Methods text is disabled with a reason she read as a description** (severity 2). "Names the
   data file and its counts" did not read as "off because it would show your data"; and she wants
   a methods paragraph for the recipe itself, since the parameters are already listed.
5. **"Overview readings, 6"** meant nothing to her (severity 1).
6. **The recipe only opens in graphty** (severity 2, adoption rather than usability). Recipients
   on Gephi or R cannot use it; the dialog is honest about this, which she credited.

## What worked for her

- Ticking Recipe turned off every output that would carry data, with a one-line reason.
- "No data inside." stated first; "Nothing is uploaded." in the footer.
- Each run listed with its parameters, including the Louvain seed and edge weighting.
- "Asked for when applied" as a ready-made list of columns her lab must have.
- The note that travels shown in full before it leaves.
