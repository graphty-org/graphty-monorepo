# Session: share the setup without the data -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md), group leader, Cytoscape and R user.
Task as given by the moderator: "Send your lab your setup so they can use it on their own data, without sending yours."
Screens seen: the Export dialog as it opens (shots/record/r3-chen-share-first.png), then the same dialog with Recipe ticked
(shots/record/r3-chen-share-recipe.png). Both rendered from screens/export-dialog.html in the study view.

## Transcript (thinking aloud)

**1. The dialog opens.** "Right, I clicked Export files... in the top right because that's the only thing that
looks like it sends anything out. It opened on my figure -- fine, that's the default. Current view checked,
2x PNG, the legend, the methods text. That's actually nice, the methods text says STRING-derived, 300
proteins, 1,262 interactions, modularity 0.663. I'll come back to that for a paper.

But that is not what I want. Everything on the left is my data: figures, methods, graph file, tables. I'm
scanning down the list for something like 'session without network' or 'style'. In Cytoscape I'd export the
style as a .xml and send the students a script. ... Down at the bottom, cut off, there's a heading 'Share the
setup, without data'. OK. That is literally my task. I have to scroll the list to see what's under it."

**2. Scrolling the list.** "Under it there's one row, 'Recipe'. Recipe. I would not have gone looking for the
word recipe -- to me that's a cooking word or a Snakemake rule. But the line under it says 'Readable text
(JSON) with styles, steps and layout. It never holds your data.' That sentence I believe, provided it's true.
JSON I can open in a text editor and check. I tick it."

**3. After ticking Recipe.** "Everything else went grey and there's a bar at the top: 'Figures, tables, graph
data, the report and the project file are off: they would carry your data.' Good. That's the right
paranoia. I wouldn't have trusted it if it let me tick the figure too.

Hang on, the project name at the top changed -- it was Proteostasis screen, now it says Expression overlay.
Did I switch projects? I'll assume it's the demo. Moving on.

The preview says 'No data inside. No genes, interactions, fold-change values, positions or notes on genes.'
Then three columns. Travels: '3 runs: PageRank, Louvain seed 7, degree'. PageRank damping 0.85 weighted by
confidence, Louvain resolution 1 seed 7 weighted by confidence. That is exactly what I'd want written down.
A seed! Thank you. Filter confidence 0.7 or more. Layout force-directed, its settings and seed.

And the note: 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut:
build your network from the same release.' That's my note, I suppose, and it's travelling. Good -- that is the
first thing a postdoc gets wrong, pulling from a newer STRING release. I'm glad I can read it before it goes.

Middle column, 'Asked for when applied': gene symbols to join a table, text; a fold change above and below 0,
signed; a confidence per interaction, number. So when my student opens it, it'll ask them which column is the
symbol, which is logFC, which is the combined score. That's the column mapping. Fine. I'd want to know what
happens if they have Ensembl IDs instead of symbols -- does it refuse, does it map, does it silently drop?
Nothing here tells me.

Right column, 'Left behind': 300 proteins, 1,262 interactions; 300 fold-change values; Knockdown hits (38
fixed); 300 positions; 4 notes on genes. The right edge is cut off -- I'm seeing 'dat', 'layou', 'note' -- I'd
have to zoom or widen. Mildly annoying but I can read the left part. 'Knockdown hits (38 fixed)' -- fixed
meaning what? A fixed list of 38 genes, not a rule? I guess that's why it's left behind -- it's a list of my
genes. That's correct, those are unpublished. But if my student's recipe had a module colour that depended on
that set, what does it do? It doesn't say."

**4. Checking what they receive.** "File: expression-overlay.graphty. '.graphty'. Hmm. It said JSON. Why not
.json? My students will double-click it and the OS won't know what it is. More importantly: how do they use
it? They open graphty and ... drag it in? Is there a 'Apply recipe' somewhere? This dialog tells me what goes
out, not what happens at the other end. I'd have to write them an email explaining that, which is what I
always end up doing with Cytoscape styles.

And can they apply it from R? If my postdoc runs this in a notebook on the cluster, is there a function that
takes this JSON plus a TSV and gives back the node table with PageRank and Louvain module? Because that is
what 'use it on their own data' actually means in my lab. Nothing in the dialog mentions scripting. I'd look
for docs."

**5. Export.** "Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good, that is the sentence
I was going to ask for. 'Export 1 file'. I click it. Then I'd attach it to Slack myself. That's fine, I don't
want a share link anyway with unpublished screens."

## After the task

**Single Ease Question: 6 / 7.** Finding it took a moment -- the section was at the bottom of a long list and
called 'Recipe' -- but once ticked, it told me exactly what leaves and what stays, which is more than any tool
I use does.

**Would I use this instead of what I do now?** "For this, yes, probably. Right now I send a Cytoscape style
XML plus an R script plus an email with the STRING version and cut-offs, and one of those three is always
out of date. This puts the runs with their parameters and seed, the filter, and my note about the STRING
release in one file I can read before it goes. That's better. What would stop me: if my lab can only apply
it by clicking in the app, it's a nice-to-have, not part of the pipeline. Show me the R or Python side, and
tell me what happens when their identifiers are Ensembl and not symbols."

## Problems noted

1. The "Share the setup, without data" section sits below the fold of the export list, under figures, methods,
   graph data and tables; the whole task depends on finding it. (severity 2)
2. "Recipe" is not a word she maps to "shareable analysis template"; she found it only because the section
   heading and the one-line description explained it. (severity 1)
3. The "Left behind" column is clipped at the dialog's right edge ("dat", "layou", "note"), so the type of each
   left-behind item is unreadable without zooming. (severity 2)
4. Nothing says how the recipient applies the file: where to open it, what they are asked, what happens when
   their identifiers are not gene symbols or a column is missing. She would write a covering email. (severity 3)
5. No sign that the recipe can be applied from R or Python; for her that is what "use it on their own data"
   means. (severity 3)
6. "Knockdown hits (38 fixed)" -- "fixed" is unclear, and nothing says what happens to style or steps that
   depended on the left-behind set. (severity 2)
7. File extension ".graphty" while the text says JSON; recipients will not know what opens it. (severity 1)
8. The project name in the header changed between the dialog opening and ticking Recipe (Proteostasis screen
   to Expression overlay); she wondered whether she had switched projects. (severity 1; a continuity slip in the
   mock, not the design)
