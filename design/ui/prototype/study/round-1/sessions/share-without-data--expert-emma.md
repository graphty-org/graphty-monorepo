# Session: send the lab your setup without your data -- Expert Emma

- **Participant:** Expert Emma, network scientist and consultant; notebooks first, Gephi for the final figure.
- **Task as given by the moderator:** "Send your lab your setup so they can use it on their own data, without sending yours."
- **Screen:** the Export dialog (screens/export-dialog.html), starting from the dialog as it opens from Export... in the header, with a protein interaction project loaded (300 proteins, 1,262 interactions).
- **Outcome:** success with difficulty. She found the Recipe row and trusted the "No data inside" summary, but only after scrolling past five other kinds of output, and she could not confirm the recipe carries the algorithm parameters she would need a colleague to reuse.
- **Single Ease Question:** 5 of 7.

## Think-aloud transcript

**Opening the dialog.**
"OK, Export... top right. That is where I would look. It opened a big modal. Scope, 'Full graph: 300 nodes'. Figures, with 'Current view' ticked and a picture of my network on the right. That is the opposite of what I want -- the picture IS my data. Every one of those dots is a protein from the client set."

"Footer: '3 files go to your Downloads folder. Nothing is uploaded.' Good. That is the first thing I look for and it is right there at the button. I will hold you to it."

**Looking for 'setup'.**
"I want the setup, not the output. What would that be called... Methods text? No, that is a paragraph for a paper. Let me read it -- '300 proteins, 1,262 interactions ... from ppi-core-300.graphml ... Modularity of module: 0.663'. That has my file name and my counts in it. Useful for me, but it is exactly what I must not send. Also 'modularity of module' -- which partition, from which algorithm? That line would not survive a reviewer. Anyway, not this."

"Graph data, 'Graph file' -- no, that is the data. Pink tag says it is not there yet anyway. Tables -- data. Scrolling. 'Starting point'. Starting point of what? That is an odd heading. Under it: 'Recipe -- Definitions only, never the data' and 'Style file -- Style layers and the Look only'. Right, 'never the data' is the phrase I was looking for. I would not have guessed the word 'recipe', and I nearly went to 'Project file' at the bottom, but that says 'Everything, with the data', so good, it warns me off."

"Recipe or Style file? Style file sounds like the colours only. My 'setup' is the filter, the colouring, what I computed. Recipe, then."

**Ticking Recipe.**
"Ticked it. Name field says 'Expression overlay', the project name. Fine. The scope went grey: 'A recipe takes definitions, not a scope of data'. Makes sense."

"Hold on -- did Current view and the methods file untick themselves? In the version where I got here from Recipes, Export recipe..., they are off and the footer says '1 file'. But I came in through Export..., where they were ticked. If they are still ticked I am about to send a 2x PNG of the client's network along with the 'no data' file. The footer count is the only thing that would tell me. I would read the file list before I pressed anything. A student would not."

**Reading the preview.**
"'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' That is the sentence I want, stated plainly, first. Thank you."

"Three columns. 'Travels': two style layers, a filter 'confidence 0.7 or more', 'overview readings 6', a view without positions, notes on definitions. 'Overview readings' -- six of what? Degree, density, components? I do not know what that means. And where are the analyses? If my setup is 'Leiden, resolution 1.0, seed 42, weighted, then colour by community', I need to see Leiden and its parameters listed under Travels. I see colours and a filter. If the algorithm runs are not in there, my lab gets the paint without the thing it was painting. That is the whole point of sending a setup."

"'Asked for when applied': gene symbols to join a table, a signed fold change, a module per protein, a confidence per interaction. Good, that is the contract -- what columns their data must have. I would like the type to be precise ('number' is fine), and I would like to know what happens if their column is called 'score' instead of 'confidence'. Presumably it asks. I would want to see that screen before I trust it."

"'Left behind': 300 proteins, 1,262 interactions, fold-change values, the fixed set of 38 hits, positions, 4 notes on genes. That column is actually the most reassuring thing on the page. I can check it against what I know is sensitive. Knockdown hits being left behind is correct -- that is a list of genes."

"But: '4 notes on genes' left behind and '1 note on definitions' travels. If one of my 'definition' notes says 'excluding TP53 because of the client's assay problem', a gene name just left the building inside a note. I would want to see the note text, not a count."

**The file.**
"File: 'expression-overlay.graphty'. What is a .graphty file? Is that the same extension as the project file, the one with everything in it? If both are .graphty, somebody on my team will send the wrong one within a month. And can I open it -- is it JSON, can I diff it, can I load it from Python? If I cannot read it I cannot verify the 'no data' claim myself; I am taking the dialog's word for it."

**Exporting.**
"'Export 1 file'. Clicking it. It goes to Downloads, nothing uploaded. OK. I would open the file in a text editor before emailing it. Habit."

## After the task

**SEQ: 5.** "Once I found it, it was clear. Finding it was the hard part: I scrolled past figures, methods, graph data and tables, and the heading was 'Starting point', which means nothing to me. And the Current view being ticked by default while I am trying not to send data is a trap."

**Would she use this instead of her current tool?** "For this job there is no current tool -- I send people a notebook and a README and hope. So yes, if the recipe actually carries the algorithm and its parameters, this beats a README. If it only carries colours and a filter, it is a style sheet with good manners and I will keep sending the notebook. Show me the algorithm runs in 'Travels' and let me open the file as text, and I would use it."

## Problems observed

1. **The figure rows stay ticked when the goal is to send no data** (severity 3). Opened from Export..., the current view and a saved view open ticked; ticking Recipe does not untick them, so the export would include pictures of her data next to the "no data" file. Only the footer count and file list reveal it.
2. **"Travels" does not list the algorithm runs and their parameters** (severity 3). The recipe shows style layers, a filter and "overview readings 6", but not which algorithms ran with which resolution, weights and seed -- which is what "setup" means to her.
3. **"Starting point" heading and the word "recipe" do not match her word "setup"** (severity 2). She reached it by elimination after scrolling past five sections; she nearly chose Project file.
4. **The .graphty file is opaque** (severity 2). No sign whether it shares an extension with the full project file, or whether it can be read as text to verify that no data is inside.
5. **"overview readings 6" and "notes on definitions 1" are counts, not contents** (severity 2). She cannot check that a note does not name a gene; she wants the note text and the six readings named.
6. **The methods text names "modularity of module" without the algorithm** (severity 1, seen in passing).

## What she liked

- "Nothing is uploaded" at the button.
- "No data inside" as the first line of the preview.
- The "Left behind" column, which she used as a checklist against what is sensitive.
- "Asked for when applied" as a plain statement of the columns her lab's data must have.
