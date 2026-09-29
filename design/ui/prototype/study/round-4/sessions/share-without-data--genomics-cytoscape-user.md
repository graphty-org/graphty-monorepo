# Session: share your setup with a partner, without your data -- Maren, genomics postdoc

Participant: Maren, fourth-year cancer biology postdoc, her lab's de facto bioinformatician. DESeq2 in R,
STRING and Cytoscape two or three times a month, follows the Cytoscape protocols step by step. Played on a
14-inch laptop (1440 x 900).

Task as given by the moderator: "Share your setup with a partner, without your data."

Screens used, as she saw them: the project at rest with the Data panel open, the menu under the project
name, the Export dialog with Recipe checked, the "what your recipient sees" and "Apply recipe" window, the
state after an export, and a Data panel from a different project.

Renders: shots/r4-maren-swd-export-ways-in.png, shots/r4-maren-swd-export-ways-in-menu.png,
shots/r4-maren-swd-export-recipe.png, shots/r4-maren-swd-export-done.png,
shots/r4-maren-swd-binding-full.png, shots/r4-maren-swd-data-panel.png.

## Think-aloud

### 1. The project at rest -- looking for "share"

"OK, 'Stress response study'. My network's there, 300 proteins, 1,262 interactions, fold change on the
nodes. The partner lab -- they have their own knockdown data, they want to see it the way we drew ours. They
do NOT get our fold changes before the paper's out. My PI would kill me."

"Where's Share? ... There's no Share anywhere. Top right is just a zoom, 100 percent. Left panel: Data,
'Export...'. Down in the table, 'Export table...'. Nothing says share."

"In Cytoscape I'd do File, Export, Styles to File, and send the styles XML, and then write them an email
with the cutoff and the clustering settings. So I guess it's going to be under Export here too. Let me try
the menu under the project name first, that's where 'File' would be."

"Rename, Duplicate, Project info, Update with new data, Version history, Export... Ctrl+Shift+E, Close
project. Still no Share. Fine. Export."

"Wait -- before I go. The legend. 'Fold change color, log2FoldChange, -2.52 to 3.15, 0 is white.' The bar
is dark red on the left and blue on the right. So the left end is -2.52. So red is DOWN here? Every
volcano plot I've ever made, red is up. Let me just remember that. I'm not sure I read it right."

### 2. The Export dialog -- Recipe

"Big list on the left. Figures, svg, png. Rows, csv. Report. Graph data -- 'for Gephi, Cytoscape or a
script' -- no, that's my data. And then there's a heading: 'Share the setup, without data.' Oh. That's
literally what he asked me. Good, I don't have to guess the word. 'Recipe.' I would never have searched for
'recipe', but I don't have to, the heading says it."

"I tick it. Everything else went gray. And the gray bar across the top says figures, images, tables, the
report, graph data and the project file are off because they would carry my data. OK. That I like -- it
doesn't let me accidentally tick the figure and send my fold changes as colours."

"Scope, grayed out, 'A recipe takes definitions, not a scope of data.' Don't know what that means. Skip."

"Right side. 'No data inside.' First thing, big. Then: no genes, interactions, fold-change values, positions
or notes on genes. Only how to build the analysis again on someone else's data. OK. That's the sentence I
need to forward to my PI."

"Travels. 3 runs. PageRank, damping 0.85, weighted by confidence, 'used as similarity' -- no idea, skip.
Louvain, resolution 1, seed 7. Degree, exact. Style layers: fold change, module. Filter: confidence 0.7 or
more -- good, the cutoff goes with it, that's the one thing they'd get wrong otherwise. Layout,
force-directed, with its seed. And a note: 'Confidence is STRING's combined score, version 12.0. 0.7 is
STRING's high-confidence cut: build your network from the same release.' Huh. That's the email I always end
up writing. Somebody wrote it into the file. I'd still double-check that's what I typed."

"Not included. 300 proteins, 1,262 interactions -- data. 300 fold-change values. Knockdown hits, 38, frozen.
Positions. 4 notes on genes. Oh good -- the notes on genes don't go. One of those says which knockdown
worked. That's unpublished. The list of 38 doesn't go either. Good."

"You supply: gene symbols to join a table, a fold change above and below 0, a confidence per interaction.
So they need their own STRING network and their own DE table. Fine, that's what I'd expect."

"But -- style layers: fold change AND module. Where does the module come from on their side? It isn't in
'You supply'. Is it the Louvain run? Louvain makes the modules? Then fine. I think. It doesn't say."

"File: expression-overlay.graphty. 'Readable text (JSON).' OK, but what does my partner open it WITH? Their
lab is a Cytoscape lab. Do they need to install something? Make an account? Is it a website? Nothing here
tells me what to write in the email. If they need an account I'm not sending it."

"Bottom: '1 file goes to your Downloads folder. Nothing is uploaded.' Good, then I email it. Export 1 file."

"Hm -- one file. When I export a table it says 'and its methods file'. Here there's no methods file. I
suppose the recipe IS the methods, sort of. But JSON isn't something I paste into a methods section."

### 3. What my partner sees

"This is the window from the other side, apparently. 'Expression overlay, saved by Maren Holt.' Fine."

"'What your recipient does: add a table with a gene id and a fold change column, then Apply. They open the
network themselves; graphty tells them which one this recipe was built on.' OK."

"Now it says 'Asked for when applied', and there are FOUR things: gene ids, fold change, 'a module per
protein, from the network', and a confidence per interaction, from the network. The dialog I just exported
from said three. So the module comes from the network, not from Louvain? My module column is MY clustering.
Their STRING download won't have a column called module."

"And the partner's window already has 'Sender's network: STRING v12, ppi-core-300.graphml, 300 proteins,
1,262 interactions' loaded. That's my file. That's my name for my file. How do they have it? I didn't send
it -- the whole point is I don't send it. If they rebuild it from STRING they get a different network, from
their genes, not 300 proteins. So either I have to send them my network -- and then what was 'without your
data' for -- or this window is showing something I don't understand. This is exactly where I'd stop and
email them 'did it work?' and wait three days."

"OK, the matching part. '84 of 96 genes matched. 12 did not match.' And it names them. 'Mdm2 differs only
in letter case from MDM2, Use MDM2.' And -- '7-Sep, date?' '2 ids look like spreadsheet dates (SEPT2 ->
2-Sep).' ... Yes. That is exactly what happens. Every time. OK, that's genuinely good. If my partner sees
that, they'll trust it more than Cytoscape, which just gives you an empty column."

"'Fold change: 36 up, 48 down. Blue below 0, red above, as the recipe draws it.' Red ABOVE. But my legend
back on my own screen had dark red on the -2.52 end. So on my screen red is down and on theirs red is up?
Same recipe? Then our two figures would be colour-flipped side by side at the joint lab meeting. That I
need somebody to explain to me before I send anything."

"Module: 9 modules. Weight: 10 communities. Nine and ten -- are those the same thing or not? I don't know.
'For confidence, a higher number means: a closer or stronger link, similarity.' Of course higher is more
confident, it's a STRING score. Why is it asking?"

"'Apply is one step. One Undo takes all of it back.' Fine, that I'd tell my partner."

"The 'None of the 96 genes matched' one -- Ensembl ids against protein names, 'Match through a mapping
table'. At least it says why. Cytoscape would just say key columns don't match."

### 4. After exporting

"The state after an export -- this one's a figure, not my recipe, but the Data panel's 'Sent and saved'
list got a new line at the top with the file name and the time. So I suppose my recipe would show up there
too. I'd want that -- 'what did I send to whom, when' -- when the partner asks in March which version they
got."

"The last Data panel is a different project -- 'Payments network review', transfers, accounts. Not mine.
It has 'Recipes applied' with a plus, and 'Sent and saved from this project: Sent: nothing.' So there's a
place where received recipes are listed. I can't tell from this one whether a recipe I SENT is listed
under Sent and saved. I'd assume yes. I don't like assuming."

## Did she complete the task?

Yes, with difficulty. She found Export by guessing that "share" lives under it, found the "Share the setup,
without data" heading straight away, ticked Recipe and exported one file. She is confident her fold changes,
her knockdown list and her gene notes stay behind. She is not confident her partner can use the file: the
partner's window appears to need her own network file, and she cannot tell what program the partner opens
the file with.

## Single Ease Question

5 out of 7. "The exporting was easy, two clicks once I found it. What was hard was knowing whether the
thing I sent actually works on their end without my network. And the red-blue thing."

## Instead of my current tool?

"For this job -- sending the setup -- maybe, if my partner already used it. The 'no data inside' page is
better than what I do now, which is a styles XML and an email I write from memory. And the date-mangled
gene warning on their side is the best thing I've seen today."

"But my partner lab is a Cytoscape lab. A .graphty file is useless to them unless they switch too, and I
can't make them. In Cytoscape I send the style and they load it into what they already have. And if the
recipe needs my network anyway, then I'm sending data after all and I'd rather just send the session file
under a data agreement. So: not yet. I'd use it with people who already use it."

## Moments the designers should look at (in her words, paraphrased by the note-taker)

- "Red is down on my legend, red is up in the recipe. Which one is my figure?"
- "The partner's window has MY network file already loaded. How? I didn't send it."
- "The dialog said they supply three things. The other window says four, and the fourth is my module
  column."
- "What does my partner open a .graphty file with? Do they need an account? I need one sentence for the
  email."
- "There's no Share. I guessed Export. The heading inside was right, though."
- "Every other export gives me a methods file. The recipe doesn't."
- "9 modules, 10 communities. Same thing?"
- "'Used as similarity' -- skip. 'A recipe takes definitions, not a scope of data' -- skip."
- Liked: "No data inside" first; the gene notes and the knockdown list listed as not included; the STRING
  version note travelling with the cutoff; the SEPT2 -> 2-Sep warning on the partner's side.
