# Share the setup without the data -- Expert Emma

**Participant:** Expert Emma, network scientist and consultant (persona: study/personas/expert-emma.md).
**Task, as the moderator gave it:** "Send your lab your setup so they can use it on their own data, without sending yours."
**Mock:** the Export dialog (screens/export-dialog.html). Renders read: shots/r3-emma-share-start.png (the dialog as it opens) and shots/r3-emma-share-recipe.png (after ticking Recipe).
**Outcome:** success. **Ease (1-7):** 6.

## Transcript

**The dialog as it opens.** "OK, Export files... in the header, that is where I would go. It opens on a figure: current view, a saved figure, a methods file, three files ticked. Not what I want. The footer says '3 files go to your Downloads folder. Nothing is uploaded.' Good, that is the first thing I look for and it is right there at the bottom of every state. I will hold them to it."

"I am scanning the left list for something that is not a picture. Figures, Methods text, Graph data, Tables... and at the very bottom, half cut off, 'Share the setup, without data'. Well. That is my task written as a heading. Slightly suspicious that it is that easy, but fine. I had to scroll to see it; on my laptop at 125 percent zoom that is going to be well below the fold. I nearly went for 'Project file' first, then read 'Everything, with the data' underneath, which is exactly what I do not want. That label saved me."

**Ticks Recipe.** "Ticking Recipe. Everything else goes grey and unticked, and there is a line across the top with a padlock: 'Figures, tables, graph data, the report and the project file are off: they would carry your data.' I like that it removes them instead of warning me. I would have forgotten the current view was still ticked and sent a PNG of the client's network along with it. That has happened. Not to me. Mostly not to me."

"Scope is greyed out: 'A recipe takes definitions, not a scope of data.' Fine, that is the correct answer."

"The row says 'Readable text (JSON) with styles, steps and layout. It never holds your data.' Readable JSON I can check. I will open it in a text editor and grep it for a gene symbol before it goes anywhere, and I would tell them to expect me to do that."

**The preview.** "'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' Good. Positions left behind, drawn again from the layout's settings. Correct -- positions on someone else's graph are meaningless anyway."

"Travels: three runs. PageRank, damping 0.85, weighted by confidence. Louvain, resolution 1, seed 7, weighted by confidence. It names the algorithm, it names the seed, it says whether the weights are used. That is more than Gephi has ever told me. But: resolution 1 in which convention? Gamma multiplying the null model term, the usual one, or something inverted? At 1 the two agree, so today it does not bite, but the day someone sets 0.5 it will. Say it next to the number."

"And it is Louvain. Not Leiden. My lab will rerun this and some of them will get badly connected communities and not know why. That is not this dialog's fault, but the recipe is the thing that propagates the choice, so it is where I would want to see it."

"'Degree: exact.' Exact as opposed to what? Is there an approximate degree? That word makes me think something else in here is approximate and I have not been told which."

"'Statistics numbers, computed again on their data: 6.' Which six? Density, components, modularity? I cannot tell from a count. If I am sending a setup to be reproduced I want the list, the same way you listed the three runs. A number with no names is exactly what I complain about in other tools."

"'Layout: force-directed, its settings and seed.' Which force-directed? ForceAtlas2, Fruchterman-Reingold? Name it, like you named Louvain."

"'View, its camera and the Look.' A camera position on a different graph is pointless, but harmless. Whatever."

"The note on the confidence filter travels in full -- 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' That is actually useful; that is the sentence I would otherwise have to write in the email. And I can read it before it goes. The four notes on genes stay behind. Correct."

**Asked for when applied.** "Gene symbols, text. A fold change, signed. A confidence per interaction, number. So the recipient has to supply three columns. What if their column is called 'combined_score' and not 'confidence'? Does it ask them which column, or does it silently skip the filter? This screen does not say, and 'silently skips a filter' is the kind of thing that ends up in a paper. I would want one line: 'they choose the column when they open it'."

**Left behind column.** "The right-hand column is cut off: 'dat', 'layou', 'note'. I can guess the words, but the dialog is clipping its own text. Sloppy, not fatal."

**File.** "expression-overlay.graphty. It says JSON, but the extension is .graphty. Why not .json? And more to the point: what do my lab open it with? Nothing here says 'open it in graphty and pick Apply recipe', or tells me whether I can load it from Python. Half my lab will never open a GUI. If I cannot apply this from a notebook, it is a nice file for the one postdoc who likes the app."

"It also does not say which version of the software made it. The methods text on the figure said 'Drawn with graphty-element 2.6.2'. The recipe should carry the same, or I cannot tell a reader which PageRank ran."

**Export.** "Export 1 file. '1 file goes to your Downloads folder. Nothing is uploaded.' Clicking it. Done."

## After the task

**Single Ease Question:** 6 of 7. "Finding it took one scroll, choosing it did the right thing without me having to untick anything, and the preview tells me what is in the file before I send it. It loses a point because I still have questions I would have to answer myself in the email: which six statistics, which layout, which resolution convention, and how they open it."

**Would she use this instead of her current tool?** "For this job, yes -- there is no current tool. Today I send a notebook and a paragraph and hope. A file that carries the parameters, the seed and my note about the STRING release, and provably none of the client's data, is better than that. But only if it can be applied from code as well as from the app; otherwise it helps the people in my lab who need it least. And I am opening that JSON before it leaves my laptop, whatever the dialog says."

## Problems observed

1. Six statistics travel as a bare count with no names (severity 3).
2. The layout is "force-directed" with no algorithm name, while runs are named precisely (severity 2).
3. Louvain resolution is given with no convention stated; "Degree: exact" implies something else is approximate (severity 2).
4. "Asked for when applied" does not say how a column is matched or what happens when none matches (severity 3).
5. Nothing says what the recipient opens the file with, or whether it can be applied from code (severity 3).
6. The recipe does not record the software version that made it (severity 2).
7. The "Left behind" column clips its values on the right at 1440 wide (severity 1).
8. The share section sits at the bottom of the list, below the fold when the dialog opens (severity 1).
9. The file is JSON but named .graphty (severity 1).
