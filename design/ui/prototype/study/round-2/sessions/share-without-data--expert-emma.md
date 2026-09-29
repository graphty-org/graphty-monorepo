# Share the setup without the data -- Expert Emma

**Participant:** Expert Emma, network scientist and consultant (notebook first, Gephi for the final figure).
**Task as given by the moderator:** "Send your lab your setup so they can use it on their own data, without sending yours."
**Screen:** the Export dialog mock (screens/export-dialog.html). She starts on the dialog as it opens from Export files... in the header (the state where the current view is checked), then goes to the state where Recipe is ticked.
**Renders she looked at:** shots/emma-share-first.png (dialog as it opens), shots/emma-share-recipe.png and shots/emma-share-recipe-foot.png (Recipe ticked, footer visible).

## Transcript (think-aloud)

**Opening the dialog.**
"OK. Export files. That is where I would go, fine. It opened with Current view already ticked, a 2x PNG, and a huge preview of the picture. That is not what I want -- I specifically do not want the picture, the picture is the data. Let me look at the list on the left. Figures, Methods text, Graph data with a pink tag saying it waits on something, Tables... Nothing here says 'setup'. The list is cut off at the bottom. I scroll."

"There: 'Share the setup, without data'. Well, that is literally the sentence you gave me, so either you wrote the task off the screen or the screen is honest. I will take it. Two things under it: Recipe, 'Definitions only, never the data', and Style file, 'Style layers and the Look only'. What is 'the Look' with a capital L? Is that a product noun? I do not know what it is, and I do not want only the colours anyway. I want the analysis. Recipe."

**Ticking Recipe.**
"I tick Recipe. Everything above it went grey and unticked -- the figure, the methods text, the tables. And the line at the top says 'Figures and tables are off: they would show your data.' Good, it did the unticking for me; I did not have to hunt down Current view. Mildly annoying that I cannot also attach my own figure as 'this is what you should get', but I understand why, it is my data. They can ask me for the PDF."

"The banner says figures and tables. It also turned off the methods text and the project file. The methods text I actually might have wanted -- it is the thing I would paste into a methods section. It says 'Names the data file and its counts', so fine, it leaks the counts. But the banner should say all of what it turned off, not two of five."

"Scope is greyed: 'Whole project', 'A recipe takes definitions, not a scope of data.' Fine. Though my canvas says 'Filtered: 1,059 of 1,262 edges' -- does the filter go? I look right."

**Reading the preview.**
"'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' That is the first thing on the right, big, with a check mark. Good. This is the one sentence my lab manager will ask me about."

"Travels. '3 runs: PageRank, Louvain seed 7, degree.' PageRank 'damping 0.85, weighted by confidence'. OK, it says the weight column it used, which is the first thing I check in any tool. It does not say directed or undirected. My data here is undirected, but if my postdoc's graph is directed, does PageRank run directed on theirs? Not said."

"Louvain, 'resolution 1, seed 7, weighted by confidence'. Resolution 1 -- in whose convention? Multiplier on the null term, I assume, but I have been burned by exactly this. And it is Louvain, not Leiden. I would change that before I send it to anyone who will put it in a paper. Not this screen's problem, but I notice there is no algorithm version or tool version anywhere. If they apply this next year on a newer graphty and the modules come out different, how do we know whether it was the data or the software?"

"'Degree exact.' Fine. Style layers: fold change, module, 2. Filter: confidence 0.7 or more, 1 -- so the filter travels as a rule, not as my 1,059 edges. Good, that answers my scope question. 'Overview readings 6' -- what are readings? The six summary numbers? Which six? I cannot see them from here. 'View, without positions 1' -- OK, they get the camera and styling but their own layout, which is correct; my positions would be meaningless on their graph."

"One note travels, on the confidence filter, shown in full: 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut...' Good, I can read exactly what they will read. And 'Left behind' says 4 notes on genes stay. That is the check I would otherwise do by opening the file in a text editor. But there is no way to leave the one note out if I did not want it to go -- I see no checkbox on it."

"Asked for when applied: 'gene symbols, to join a table' text; 'a fold change, above and below 0' signed; 'a confidence per interaction' number. So when they open it, it asks them which of their columns is which. That is right. It does not show what my columns were called -- if my postdoc names it 'combined_score' does it guess, or ask? I cannot tell. I would want to see my column names next to these so they know what to map."

**The file line and the footer.**
"File: expression-overlay.graphty, 'Opens in graphty or any app with graphty-element'. Hm. What is a .graphty file? Is it JSON? Can I open it in a text editor, diff it, put it in the lab's git repo? Can I apply it from Python to a networkx graph? 'Any app with graphty-element' is a web component -- nobody in my lab has an app with a web component. If the only thing that reads it is this app, then this is a proprietary settings file, and I will also write the parameters in the README by hand anyway."

"Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. That is the second sentence my lab manager will ask about. Export 1 file. I click it. Done."

## After the task

**Single Ease Question (1-7):** 5.

"It was not hard. The only real hunt was scrolling past the picture and the tables to find the section, and the section name is exactly what I was asked to do, which helped. What costs it the 6 or 7 is not the clicking, it is what I cannot verify: what format the file is, whether I can read it without this app, which Louvain resolution convention, which version ran it."

**Would she use this instead of her current tool?**

"For this job my current tool is a Python script plus a README with the parameters in it, emailed. This is nicer to look at than a README, and the 'No data inside' plus 'Nothing is uploaded' plus 'Left behind' list is actually what I would have to check by hand, so it saves me that. I would use it to hand a setup to a biologist who will not run my script. For my own postdocs I would keep the script, unless the .graphty file is a documented, readable text format I can load from code. Tell me that on this screen -- one line -- and I would switch for the lab handoff too."

## Problems seen

1. The share section is below the fold of the kinds list, under figures, methods, graph data and tables; the dialog opens on a figure preview, which is the opposite of what she wants. She found it by scrolling. (Severity 2)
2. The .graphty file is described only as "Opens in graphty or any app with graphty-element": no statement of the format (readable text? documented schema?) or of a way to apply it from code. For her this decides whether it is a reproducible artifact or a proprietary settings blob. (Severity 3)
3. The runs list gives parameters but no tool or algorithm version and no resolution convention for Louvain, and PageRank does not say directed or undirected; applying it later on a newer release cannot be told apart from a data difference. (Severity 3)
4. "Asked for when applied" lists the roles the recipient must supply but not the sender's own column names, and does not say whether the recipient is asked or the app guesses. (Severity 2)
5. The lock banner says "Figures and tables are off" but the methods text, graph data, report and project file were also turned off. (Severity 1)
6. "Overview readings 6" is not explained: she cannot see which six numbers travel. (Severity 2)
7. "Style layers and the Look only" -- "the Look" reads as an unexplained product noun. (Severity 1)
8. The travelling note is shown but there is no control to leave it out. (Severity 1)

## What worked for her

- Ticking Recipe unticked and disabled every kind that carries data, with a reason, so she did not have to clear the figure herself.
- "No data inside" as the first line of the preview, with the list of what is left behind: the check she would otherwise do by opening the file.
- Each run listed with its parameters and the weight column it used.
- The filter travels as a rule (confidence 0.7 or more) and the view travels without positions.
- The note that travels is shown in full before it goes.
- Footer: "1 file goes to your Downloads folder. Nothing is uploaded."
