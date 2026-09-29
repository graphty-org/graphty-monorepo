# Session: send the lab my setup, not my data -- computational biologist

**Participant:** a computational biologist who leads a small drug-target group at a research institute
with a pharma partner. Works in R and igraph, uses Cytoscape for figures, reproduces everything from
scripts, and leans hard towards keeping unpublished data on her own machine.

**Task as the moderator gave it:** "Send your lab your setup so they can use it on their own data,
without sending yours."

**Screens used:** the Export dialog as it opens from Export... in the header (the proteostasis screen:
300 proteins, figures pre-checked), then the same dialog with the Recipe row checked and its preview
("What the recipe holds").

**Outcome:** done, with a detour. She found the right row after scrolling past five sections and
hesitating between "Style file" and "Recipe". The preview's "No data inside" and the three columns
convinced her nothing private travels. She is less sure the lab can actually rebuild the analysis
from it: nothing in the preview says the module detection or the centrality runs travel with their
parameters, and nothing says how a postdoc applies the file.

---

## Step 1: finding where "share my setup" lives

**Main window, proteostasis screen.**

> "My setup. In Cytoscape that's a session file, except a session file has the data in it, which is
> exactly what I don't want. Or I'd export the style as a styles.xml and write the rest in an email:
> 'STRING 0.7, MCL inflation 2.5, colour by logFC'. So I'm looking for something like 'save as
> template' or 'export style'. Top right there's 'Export...'. That's the only thing that sounds like
> it sends something out. I'll try that."

**Clicks Export... The dialog opens with "Current view" and "Figure 3: modules" already ticked and a
big picture of my network on the right.**

> "Hm. It's assumed I want a figure. That's my data -- a picture of 300 of my proteins with the gene
> labels on it is my data. If I'm careless and just hit the blue button I've sent TP53 and BRCA1 in a
> PNG. 'Export 3 files.' No.
>
> Left column: Figures, Methods text, Graph data, Tables... none of those is 'my setup'. Methods text
> is closest in spirit -- that box at the bottom actually reads well, 'Okabe-Ito palette, degree,
> exact, full graph, modularity 0.663'. That's a caption I'd use. But it names my file,
> ppi-core-300.graphml, and it's text, the lab can't apply it."

**Scrolls the left list. "Starting point" is half cut off at the bottom edge.**

> "'Starting point.' What does that mean -- starting point of what? I nearly skipped it. Below it:
> 'Recipe -- definitions only, never the data', and 'Style file -- style layers and the Look only'.
> And under Project, 'Project file -- everything, with the data'. OK, that last one is the Cytoscape
> session, good that it says 'with the data' so I don't pick it.
>
> Style file is what I'd have reached for in Cytoscape. But my setup isn't only colours, it's the
> confidence filter and the modules. 'Recipe' is a cooking word, I would have called it a template or
> a workflow. 'Definitions only, never the data' -- that is literally the task. I'll tick Recipe."

**Ticks Recipe. (The figure rows stay ticked from before; she unticks Current view and Figure 3
herself.)**

> "Let me take the figures off, I don't want those going. Now the scope box at the top is greyed out
> and says 'A recipe takes definitions, not a scope of data.' Fine, that makes sense, and I like that
> it tells me why it's grey instead of just being grey."

Moderator note: in the mock the Recipe preview is shown with the figure rows already unticked (the
dialog opened from Recipes, Export recipe...). From the header route nothing unticks the figures for
her; had she not noticed them, the export would have been "Export 3 files" including two PNGs of her
network. The footer count ("1 file goes to your Downloads folder") is the only place that would tell
her.

## Step 2: reading what the recipe holds

**Preview: "What the recipe holds".**

> "'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' Good.
> First line, before anything else. That's what I need to be able to say to our pharma partner's
> lawyers, frankly.
>
> Three columns. Left behind: 300 proteins, 1,262 interactions; 300 fold-change values; Knockdown
> hits, 38; positions; 4 notes on genes. Those numbers match what I have. That's reassuring -- it's
> telling me specifically what it's not sending, with counts, not 'your data is safe'.
>
> Travels: style layers fold change and module, 2. Filter: confidence 0.7 or more, 1. 'Overview
> readings, 6' -- I don't know what an overview reading is. Six of what? Are those my degree and
> betweenness? The summary statistics panel? If it's the measures, it should say the measures by
> name. 'View, without positions' -- OK, a camera without coordinates, sure. 'Notes on definitions,
> 1' -- I'd want to read that note before it goes. If one of my notes says 'KRAS up in patient 14'
> I've leaked something. Can I click it? Doesn't look like it."

> "Middle column, 'Asked for when applied': gene symbols, to join a table -- text. A fold change,
> above and below 0 -- signed. A module per protein -- categories. A confidence per interaction --
> number.
>
> Right. So this is the part I care about. Gene symbols -- half my lab works in Ensembl IDs and the
> single-cell people have whatever Cell Ranger gave them. Does it only take symbols? It says 'gene
> symbols', so I assume yes, and that's already a problem for one postdoc.
>
> And 'a module per protein' is *asked for*. So the recipient has to bring their own modules? That's
> not my setup then. My setup is: filter at 0.7, run MCL at inflation 2.5, colour by module, size by
> degree. If the recipe doesn't carry 'run this clustering with these parameters', it's carrying a
> colour scheme for modules they have to compute somewhere else. That's a style file with a filter on
> it. I can't see from this whether the algorithm runs travel at all. Maybe 'overview readings' is
> that. I'd have to try it on a second machine to find out."

> "And nothing about the database. The whole reason I'd send a setup is so their network is built the
> same way -- STRING version, which evidence channels. The filter says 0.7, which is only meaningful if
> they know it's STRING's combined score and which release. Not here."

## Step 3: exporting

**Footer: "1 file goes to your Downloads folder. Nothing is uploaded." File:
expression-overlay.graphty.**

> "'Nothing is uploaded.' Good, that's what I wanted -- a file I email, not a link to your server.
> Name field says 'Expression overlay', I'd rename it 'Chen lab PPI setup v1' and it'd be fine.
>
> '.graphty'. So what does my postdoc do with a .graphty file? Double-click it? Open graphty and drag
> it in? Does it open in R? Can she read it -- is it JSON, can I diff version 1 and version 2 of it?
> None of that is on this screen. I'd be writing the instructions in the email anyway."

**Clicks Export 1 file.**

> "OK. Done, I think. I'm fairly confident nothing of mine went. I'm not confident they get my
> analysis."

## After the task

**Single Ease Question: 5 of 7.**

> "Finding it was a bit of a hunt -- 'Starting point' isn't where I'd look, and it opened with my
> figures ticked, which is the wrong default for this job. Once I found it, the preview is honestly
> the best 'what am I sending' screen I've seen in a network tool. The 'left behind' column with the
> counts is exactly right.

> Would I use it instead of what I do now? For sending the look -- colours, filter, the view --
> yes, it beats a styles.xml plus an email paragraph. For sending the *analysis*, not yet. What I do
> now is send an R script: it pulls STRING at a pinned version, filters at 0.7, runs cluster_louvain or
> MCL with a seed, computes degree and betweenness, writes the TSV. That's reproducible and they can
> read it. If this file said, in plain words, 'runs MCL, inflation 2.5, on the confidence column; runs
> degree and betweenness', and if I could open it in a text editor or load it from R, it would replace
> the script for the visual half. Right now I can't tell whether it does that, and 'overview readings'
> doesn't help."
