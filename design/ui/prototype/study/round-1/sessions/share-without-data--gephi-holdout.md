# Session: send the setup to the lab, without the data -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite persona: associate professor, Gephi user
since 2012, teaches it every year).
**Task, as the moderator gave it:** "Send your lab your setup so they can use it on their own data,
without sending yours."
**Screen:** the Export dialog mock (`screens/export-dialog.html`), 1440 by 900. She started on the
dialog's first state (a figure export) and moved to the recipe state when she ticked the Recipe row.
The mock's data is a protein network from a biology lab, not her own.

## Transcript (think-aloud)

**On the first state (a figure export already set up).**

> "OK, Export. This is my Preview, basically. Scope 'Full graph: 300 nodes', figures ticked, a
> PNG at 2x. That's not what I want. I don't want a picture, I want the setup. In Gephi there is
> no such thing -- I'd send them the .gephi file and tell them to delete the nodes, which is
> absurd, or I'd send the Python script. So what am I looking for here... 'template'? 'Save
> settings'?"

She reads the left column top to bottom: Figures, Methods text, Graph data, Tables.

> "Graph data -- 'Nodes, edges and attributes, for Gephi, Cytoscape or a script'. Good, that's
> the GEXF. But that's the data, and there's a pink tag, 'waits on graphty-element' -- so it
> doesn't exist yet. I'll remember that. Tables, no. Keep scrolling."

She scrolls the list and reaches **Starting point**.

> "'Starting point'. Odd heading. 'Recipe -- Definitions only, never the data.' Recipe. Fine,
> that's the word for it, apparently. 'Style file -- style layers and the Look only.' Hmm. What's
> the difference? My setup is the partition, the ranking, and the Force Atlas parameters. Is
> that a style file or a recipe? The Look with a capital L -- I don't know what the Look is. I'll
> take Recipe, since it says 'never the data', which is literally the task."

She ticks **Recipe**. (Moves to the recipe state.)

> "Scope went grey -- 'A recipe takes definitions, not a scope of data'. Fine, that's honest,
> I like that it says why. And a name field, 'Expression overlay', pre-filled. OK."

She reads the right side.

> "'No data inside. No genes, interactions, fold-change values, positions or notes on genes.
> Only how to build the analysis again on someone else's data.' Good. That's the first thing I'd
> want to know, and it's the first thing it says. My IRB people would want exactly this
> sentence."

She reads **Travels**.

> "'style layers: fold change, module -- 2'. So colour by fold change, partition by module. OK.
> 'filter: confidence 0.7 or more -- 1'. Good, the filter goes. 'overview readings -- 6'. What
> is an overview reading? Six of what? Are those my statistics? If that's degree, betweenness,
> modularity -- say so. 'view, without positions'. Fine, positions are the data, I agree.
> 'notes on definitions'. OK."
>
> "Where's the layout? I don't see the layout anywhere. If my student opens this on her data,
> does it spatialize with my settings -- LinLog on, gravity down, prevent overlap -- or does she
> get whatever the default is? That's half of what 'my setup' means. It's not in Travels, it's
> not in Left behind. 'view, without positions' might mean it, might not. I'd have to try it on
> the other end to find out."

She reads **Asked for when applied**.

> "'gene symbols, to join a table -- text'. 'a fold change, above and below 0 -- signed'. 'a
> module per protein -- categories'. Wait. So the module is something they bring? They have to
> have the communities already? In my setup the modularity is computed -- I run it, then
> partition by it. If the recipe asks them for 'a module per protein', either it recomputes it
> and this is just telling me the column name, or it doesn't and they need to run Louvain
> themselves somewhere else. I can't tell which. And if it does recompute it -- with what
> resolution? Randomized or not? Which seed? This doesn't say."

She reads **Left behind** and the file line.

> "300 proteins, 1,262 interactions, fold-change values, knockdown hits, positions, 4 notes.
> Good, that's a clear list, I can check it against what I think is in the project. File:
> 'expression-overlay.graphty'. .graphty. So my lab needs graphty to open it. Fine, it's a
> browser, no Java -- for the students that's actually a point in its favour. But nobody in my
> lab can open a .graphty in anything else, and my coauthors certainly can't. And I can't look
> inside it: is it JSON? Can I read it? Can I put it in a supplementary file?"

She looks at the footer.

> "'1 file goes to your Downloads folder. Nothing is uploaded.' Good. That's the second most
> important sentence on this screen. Export 1 file. OK, I'd click it."

She clicks **Export 1 file**.

> "Done, I suppose. It's a file in Downloads. I email it. Now: what does my student see when she
> opens it with her crawl? That's the actual test, and this screen can't show me that. I'd want
> to try it on my own retweet network before I send it to anyone. Which is a round trip I'd do
> on the first day anyway."

**Moderator: "Anything else?"**

> "The word 'recipe' is cute. I'd have called it a template. And 'Starting point' as a heading
> -- I scrolled past Figures and Tables looking for it. If I opened Export from a menu called
> 'Export recipe...' I'd be fine. From the plain Export button, it's near the bottom and I
> nearly didn't see it. At the projector size I'd have to scroll further."

## Single Ease Question

**5 of 7.** Finding it took a scroll and a guess between two rows. Once there, the screen was
clear about what leaves and what stays, which is more than Gephi has ever told me. What I could
not tell is whether my layout and my modularity settings go with it.

## Would she use this instead of her current tool?

> "For this job -- yes, probably, because Gephi can't do this job at all. The rule not surviving a
> round trip is exactly my complaint about GEXF: the colours survive, the partition doesn't. If
> this actually carries the partition and the ranking and the filter, that's new. But I'm not
> switching anything because of one dialog. I'd try it once with a student on real data, and if
> the layout comes out different on her end, or the communities come out different with no word
> about the seed, it's back to sending the Python script."

## Problems observed

1. **Layout settings are not listed.** Travels names style layers, filter, "overview readings",
   the view and notes. Nothing says whether the layout algorithm and its parameters (her
   ForceAtlas2 settings) go with the recipe. For a network scientist the layout is half the
   setup. Severity 3.
2. **"Asked for when applied" is ambiguous about computed values.** "A module per protein" reads
   as if the recipient must bring the communities. She could not tell whether the recipe re-runs
   community detection (and with what resolution and seed) or needs a precomputed column.
   Severity 3.
3. **"Overview readings -- 6" means nothing to her.** She guessed it might be her statistics but
   could not confirm. Name them. Severity 2.
4. **Recipe row is hard to find from the plain Export button.** It sits under "Starting point",
   below Figures, Methods text, Graph data and Tables; she scrolled past most of the list looking
   for "template" or "settings". Severity 2.
5. **Recipe vs Style file is unclear.** "Style layers and the Look only" versus "Definitions
   only" did not tell her which one holds partition + ranking + layout; "the Look" is unexplained.
   Severity 2.
6. **The .graphty file is opaque.** She cannot tell whether it is readable (JSON?) or whether it
   can go into a paper's supplementary material; no one outside graphty can open it. Severity 2.
7. **No way to see what the recipient will get.** The preview lists contents but cannot show the
   result on other data; she would do a round trip herself before trusting it. Severity 1.

## What worked

- "No data inside" as the first line of the preview, with a plain list of what is left behind.
- "Nothing is uploaded" at the button.
- The disabled scope field says why it is disabled.
