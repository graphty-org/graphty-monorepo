# Session: share the setup without the data -- Maren (genomics postdoc, Cytoscape user)

Task as given by the moderator: "Share your setup with a partner, without your data."

Screens seen, as the participant sees them (design notes hidden), at 1440 x 900:

- The project at rest with the Data panel open: `shots/record/r6-maren-share-export.png`
- The project-name menu: `shots/record/r6-maren-share-ways-in-menu.png`
- The Export dialog as it first opens (figure chosen): `shots/record/r6-maren-share-figure.png`
- The Export dialog with Recipe checked: `shots/tasks/share-without-data/01-export-dialog-recipe.png`
- After an export (the "Sent and saved" list): `shots/record/r6-maren-share-done.png`
- The storyboard of the recipe reaching a colleague: `shots/record/r6-maren-share-recipe-travels.png`

## Think-aloud

**1. The project at rest.** "OK, my stress-response network, 300 proteins, 1,262 interactions, coloured by fold change. 'Share without data'. In Cytoscape I'd... honestly I'd export the style as an XML and then write Tom an email with the STRING cutoff and the clustering settings, because the session file has everything in it, including our unpublished counts. So where's share? There's no share button up top. Good, actually -- I don't click 'Share' buttons, they always want an account. There's 'Export...' on the Data panel. I'll try that. I also see the menu under the project name has Export too, same shortcut. Fine, one of them."

**2. Export opens with the figure ticked.** "It's gone straight to the figure. That's the Friday thing, not this. Left side: Figures, Rows, Report, Graph data... Graph file 'for Gephi, Cytoscape' -- no, that's the network itself, that's the data. And at the very bottom, cut off: 'Share the setup, without data'. That is literally what I was asked. I had to scroll the left column to see the row under it, though. On my laptop that heading is sitting right on the bottom edge; if I'd been in a hurry I'd have assumed Graph file was the closest thing."

**3. I tick Recipe.** "Recipe, .graphty. 'Readable text (JSON) with styles, steps and layout. It never holds your data.' OK. I tick it. The figure unticks itself and everything else goes grey, and there's a line with a padlock: 'Figures, images, tables, the report, graph data and the project file are off: they would carry your data.' Good. That's the right answer to the question I'd have asked, which is 'did the figure sneak in with it?'

"Big box at the top: 'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' Right, that's the first thing I needed to read, and it's the first thing it says.

"Three columns. 'Not included' -- 300 proteins, 1,262 interactions; 300 fold-change values; 4 notes on genes. Those numbers match what I have, so I believe it's actually counting my stuff and not just saying 'no data' as a slogan. 'Knockdown hits (38, frozen)' -- I don't know what 'frozen' means. I'm guessing it's my list of 38 hit genes, which, yes, absolutely must not go to another lab before the paper. It's under Not included, so fine, but I had to guess.

"'Travels': 3 runs. Louvain resolution 1, seed 7 -- that's the clustering, I'd have called it MCODE but whatever, it has the seed, which is the thing I never remember to write down. Degree, exact. PageRank 'damping 0.85, weighted by confidence, used as similarity' -- used as similarity? I don't know what that means and I'd have to explain it if Tom asks. Filter: confidence 0.7 or more. And a note: 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' Oh, that's good. That is the sentence I always end up typing into the email myself, and half the time I forget the STRING version.

"'You supply': gene symbols, to join a table; a fold change, above and below 0; a confidence per interaction. OK... but my column is called log2FoldChange. Does Tom's have to be called the same thing? It doesn't say. That's exactly where it breaks in Cytoscape -- the column name or the key column -- and the thing that goes wrong is always silent. I'd want to see, here, what Tom will be told to bring, in his words, before I send it."

**4. The scope box at the top.** "Scope is greyed out, 'Whole project', and it says 'A recipe takes definitions, not a scope of data.' I don't know what that means. Skipping it."

**5. The name and the file.** "Name: Expression overlay. File: expression-overlay.graphty. Wait -- my project was 'Stress response study'. Why is it called Expression overlay? Did I pick the wrong project? (Moderator says the dialog was shown on a colleague's project.) OK, but if that happened for real I'd stop and check. 'Opens in graphty or any app with graphty-element.' I don't know what graphty-element is. Tom's lab uses Cytoscape. So he has to install -- or open -- this thing too? It doesn't say whether it's a website he just goes to or something he installs."

**6. The footer.** "'1 file goes to your Downloads folder. Nothing is uploaded.' Good. That is the line my PI will ask about. Then I email the file myself. Export 1 file. Done, I think."

**7. Afterwards.** "The Sent and saved list on the Data panel keeps what I exported and when. If that shows the recipe too, then I can tell Tom 'the one from the 26th'. Fine."

**8. The storyboard of Tom opening it.** "So Tom opens it and gets a card: 'Expects: a protein network with a module per protein and a confidence per interaction... your own table of genes: a gene id per row and a fold change named log2FC'. So it DOES say a column name to him -- log2FC. But my column is log2FoldChange. Which is it? And I didn't see that 'Expects' list in my own dialog, so I couldn't have caught it before sending. Also it says the network should bring 'a module per protein', but my dialog said Louvain travels as a run. So does Tom need his own clusters or does it make them? Those two screens don't agree.

"'Data stays on this computer. This recipe names no server.' Good, Tom's PI will want that too. And later it tells him '84 of 96 genes matched, 12 did not match' with the SEPT-date thing. OK -- that part I'd actually want on my side of every import, not just his."

## Single Ease Question

**5 out of 7.** Ticking one box and reading "No data inside" was easy, and the list of what stays home, with my own counts, made me believe it. What cost me: the row was below the fold on my laptop, "frozen" and "used as similarity" I had to guess at, the project name in the dialog was not my project, and I could not see from my side what Tom would be told to bring -- which turned out to be a column name that is not mine.

## Would I use this instead of what I do now?

"For this job, yes, over what I do now -- which is a Cytoscape style XML plus an email I write by hand and always forget the STRING version in. This carries the cutoff, the clustering seed and the STRING note in one file and nothing of ours. But it only works if Tom's lab uses this too, and they use Cytoscape. If he can't open it without installing something, I'm back to the email. And I'm not changing the lab protocol for sharing a style."

## Problems observed

1. The "Share the setup, without data" section sits at the bottom edge of the left column when the dialog opens at 1440 x 900; the Recipe row itself is below the fold. The nearest visible option, "Graph file ... for Cytoscape", is the one that carries data. (Severity 2)
2. The sender cannot see what the recipient will be asked to supply in the recipient's own words. The dialog's "You supply" gives no column names; the recipient's card names "log2FC" while her column is "log2FoldChange". (Severity 3)
3. The export dialog lists Louvain as a run that travels, but the recipient's card says the network must bring "a module per protein". She cannot tell whether the partner computes clusters or supplies them. (Severity 2)
4. "Opens in graphty or any app with graphty-element" does not tell her whether a Cytoscape-using partner can open the file, or whether it is a web page or an install. (Severity 3)
5. Jargon she had to guess at: "frozen" on the hit list, "used as similarity" on PageRank, and the Scope note "A recipe takes definitions, not a scope of data". (Severity 2)
6. The recipe state is shown on a different project ("Expression overlay", with a confidence filter) from the one she opened ("Stress response study", confidence "not used yet"); in real use a name mismatch would make her stop. (Severity 1, a mock consistency issue)

## What worked for her

- "No data inside" is the first line, and "Not included" counts her own 300 proteins, 300 fold-change values, 38 hits and 4 notes.
- Ticking Recipe turns off every data-carrying output, with one line saying why.
- The STRING note (combined score, version 12.0, 0.7 cut) travels with the recipe: the sentence she normally forgets to write.
- The Louvain seed travels.
- "Nothing is uploaded" in the footer, and "Data stays on this computer" on the recipient's side.
