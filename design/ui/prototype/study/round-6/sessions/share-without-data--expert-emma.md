# Share the setup without the data -- Expert Emma

**Participant:** Expert Emma, network scientist and consultant (persona: study/personas/expert-emma.md).
**Task, as the moderator gave it:** "Share your setup with a partner, without your data."
**Mocks:** the Export dialog with Recipe checked (screens/export-dialog.html#recipe; render shots/tasks/share-without-data/01-export-dialog-recipe.png), the Data panel (screens/data-panel.html; renders shots/screens__data-panel.png and shots/screens__data-panel-s7.png), and the recipe's journey to the person who opens it (storyboards/recipe-travels.html; render shots/record/storyboards__recipe-travels--study.png).
**Outcome:** success, with difficulty. **Ease (1-7):** 5.

## Transcript

**Getting there.** "The project is the expression overlay on the 300-protein network. In the Data panel there is an Export... button right in the panel header. The Data panel also has 'Applied recipes' and 'Sent and saved from this project', so this is plainly where sharing lives. I would click Export... there. Fine, that is the obvious door."

**The dialog, with Recipe checked.** "Left column: figures, rows, report, graph data, then a heading 'Share the setup, without data' with Recipe (.graphty) under it. That is my task, written as a heading. Last time I had to scroll for it; now it is on screen at 1440 without scrolling. At 125 percent zoom on my laptop I suspect it is below the fold again, but I can live with that."

"Recipe is checked and everything else is grey and unticked. The strip across the top with a padlock: 'Figures, images, tables, the report, graph data and the project file are off: they would carry your data.' Good. It takes them away rather than warning me. I have seen someone send a client's network as a PNG 'by accident' because a box stayed ticked. This cannot happen here."

"Scope is disabled: 'A recipe takes definitions, not a scope of data.' Correct answer. The filter chip on the project says 1,059 of 1,262 edges; the filter goes as a rule, not as the 1,059 edges. Good."

"Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' That is the first thing I look for in any tool and it is where my eye lands. I believe it until I see a network request."

**The preview: what travels.** "'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' That is the claim. Now let me check it against the list."

"Three runs. PageRank, damping 0.85, weighted by confidence, used as similarity. Good, it tells me which way the weight is read -- that is the question I ask in every tool, and usually nobody answers it. Louvain, resolution 1, seed 7, weighted by confidence. Named algorithm, seed, weight. Still Louvain and not Leiden, and still no word on which resolution convention. At 1 it does not matter; the day someone in the partner lab sets 0.5 it will, and the recipe is exactly the thing that carries the number to them. Degree, 'exact, not normalized'. Better than last time; 'not normalized' is the half I actually needed."

"Style layers: fold change, module, two. Filter: confidence 0.7 or more. Layout: 'force-directed, its settings and seed'. Which force-directed? You named Louvain, you named PageRank, and then the layout is a family name. ForceAtlas2 and Fruchterman-Reingold do not give the same picture with the same seed. Say which. And while we are at it: is a seeded layout the same picture on their machine, or only on mine? If it is not reproducible across machines, do not imply it is by shipping the seed."

"View, its camera and its Look. Harmless."

"The note on the confidence filter travels, and I can read the whole thing: 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' That is the paragraph I would otherwise put in the email and they would not read. Here it goes with the filter it is about. Genuinely good."

**You supply.** "Gene symbols to join a table, text. A fold change above and below 0, signed. A confidence per interaction, number. Three things the partner needs. Wait -- where is the module? There is a module style layer, and there is a Louvain run in 'Travels'. So I read that as: Louvain is rerun on their network with seed 7 and the modules come from that. Fine. That is what I would want."

**Not included.** "300 proteins, 1,262 interactions. 300 fold-change values. Knockdown hits, 38, frozen -- a set, stays behind. Positions, drawn again. Four notes on genes. Good, the column no longer clips. Everything identifying stays home."

"But the view is 'Hits by module', and the Knockdown hits set does not travel. So what does their copy of that view show? Does a layer or the view select on that set? If it does, either the set is in the file -- in which case gene names are in the file -- or the view is silently broken on their side. The preview does not tell me which. I am going to find out by grepping."

**The file.** "expression-overlay.graphty, 'Readable text (JSON)'. 'Opens in graphty or any app with graphty-element.' That is new and it half answers my question from last time: if graphty-element reads it, I can presumably load it from a notebook widget. Half, because it does not say how -- one line with the call, or a link to the page in the API docs, and I would stop asking."

"What I still do not get is the file itself. The figure preview is the file. The table preview is the file's first lines. The recipe preview is a summary of the file, written by the people who wrote the file. For a privacy claim that is the wrong way round. Show me the JSON, or give me a 'view as text' toggle, and let me search it for TP53 before I click Export. As it is, I will export it, open it in an editor, grep for three gene symbols and the word 'Knockdown', and only then attach it. The file being readable is what saves this; I do not have to trust the summary."

"Also, still nothing about which version of graphty-element wrote it. The figure's methods footer names the version. The recipe carries three algorithm runs and does not say which implementation of PageRank they will get. That is the thing a reviewer asks."

**Checking where it is recorded.** "After export, the Data panel's 'Sent and saved from this project' lists things under 'Saved to this computer': a recipe reads 'Recipe: definitions, no data'. And the top line still reads 'Nothing has been sent from this project'. That is honest: graphty saved a file, I am the one who emails it. I like that it does not pretend it shared anything."

**The other end, the storyboard.** "I looked at how it arrives. The person opening it gets a card: 'Expects: a protein network with a module per protein and a confidence per interaction. It is not in this recipe.' And then in the Apply dialog, 'Module -- module -- found by name', read from the network."

"Hold on. So the module is a column in the network the partner loads, not a Louvain run on their data? Then what is 'Louvain, resolution 1, seed 7' doing under 'Travels'? Either Louvain is rerun and the module is computed, or the module is read from their file and Louvain is decoration. Those are different analyses. If they already have a 'module' column from some other method, their picture will be colored by that and labelled as mine. That is exactly the silent substitution I spend my life catching in other tools. I would not send this until I knew which one happens."

"And the export preview in the storyboard is not the export preview in the screen. The storyboard one has 'The person who opens it sees' with an 'Expects:' list and a 'Where each comes from' column with Their table / The network pickers, and its Travels list says 'overview readings 6, notes on definitions 1' instead of the three runs. The screen I actually used has no pickers and a different list. Which one is the product? If the pickers are real, I never saw them, which means I never decided where the fold change comes from, and the partner's network file happens to carry an old log2FoldChange column. The storyboard's Apply dialog says it will not use it. Good. But I only know that because I read the storyboard."

**One more thing in the Data panel.** "The empty Applied recipes section says 'A recipe is a file of styles, sets or runs'. Sets. A set is a list of node ids. The Export dialog tells me sets are not included. The Data panel tells me recipes carry sets. One of those is wrong, and if it is the dialog, the 'No data inside' banner is wrong. That is not a copy nit to me; that sentence is the whole promise."

**Export.** "Export 1 file. It lands in Downloads. I open it before it goes anywhere."

## After the task

**Single Ease Question:** 5 of 7. "Doing it was easy: one button, one checkbox, and the dialog took away everything that would carry data without me asking. It loses points on trust, not effort. The summary is not the file, the layout is not named, the version is missing, and three places disagree about what a recipe is: the dialog says sets stay home, the Data panel says recipes carry sets, and the storyboard says the module is read from the partner's network while the dialog says Louvain travels as a run. I finished; I am not sure what I sent."

**Would she use this instead of her current tool?** "For this job there is no current tool: I send a notebook and a paragraph of caveats and hope they read it. A file that carries the parameters, the seed and my note about the STRING release, with the data kept out, is better than that, and the fact it is readable JSON means I can verify it myself. So yes, I would use it -- and I would grep every file before it leaves my laptop, until the dialog shows me the file itself and the three descriptions of a recipe agree. And it only helps my lab if they can apply it from a notebook through graphty-element; the dialog now says that is possible, but not how."

## Problems observed

1. Where the module comes from contradicts itself: the export dialog lists a Louvain run (resolution 1, seed 7) under Travels and does not ask the partner for a module, while the recipe's journey shows the Apply dialog reading a "module" column from the partner's network by name. A partner whose network already has a "module" column from another method would get a picture colored by it and presented as the sender's analysis (severity 4).
2. The Data panel's Applied recipes line says "A recipe is a file of styles, sets or runs", while the export dialog says the set (Knockdown hits) is not included. A set is a list of node ids; if recipes can carry sets, the "No data inside" banner is not always true (severity 3).
3. The recipe preview is a summary written by the tool, not the file. Figure and table previews show the file itself; for the one output whose promise is "no data", there is no way to read the JSON before exporting (severity 3).
4. The saved view "Hits by module" travels but the Knockdown hits set does not; the preview does not say whether anything in the view or its layers selects on that set, or what the partner sees if it does (severity 3).
5. The export preview in the recipe's journey (with "The person who opens it sees", "Where each comes from" pickers, and a Travels list of overview readings and notes) is not the preview on the Export dialog screen (three runs, no pickers). The sender never sees or decides where the fold change comes from on the screen she actually uses (severity 3).
6. The layout is still "force-directed, its settings and seed" with no algorithm name, and nothing says whether the same seed gives the same picture on another machine (severity 2).
7. The recipe does not record which graphty-element version wrote it, though the figure's methods footer does (severity 2).
8. Louvain's resolution is given with no convention stated, and the algorithm is Louvain with no mention of its disconnected-community problem (severity 2).
9. "Opens in graphty or any app with graphty-element" says code can apply it but not how: no call, no link to the API page (severity 2).

## What worked

- Checking Recipe turned off and disabled every data-carrying output, with one line saying why; nothing left ticked by accident.
- Scope disabled with "A recipe takes definitions, not a scope of data"; the filter travels as a rule.
- Runs are named with their parameters, seed, and how the weight is read ("weighted by confidence, used as similarity"); Degree now says "not normalized".
- The note on the confidence filter travels in full next to the filter it explains.
- "Nothing is uploaded" in the footer, and the Data panel afterwards records the recipe as "Saved to this computer ... definitions, no data" while still saying nothing has been sent.
- The "Not included" column no longer clips, and the share section is visible without scrolling at 1440 wide.
