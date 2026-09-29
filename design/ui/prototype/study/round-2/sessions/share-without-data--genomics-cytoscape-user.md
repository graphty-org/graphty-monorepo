# Session: send the lab the setup, not the data -- Maren (genomics postdoc, Cytoscape user)

Task as given by the moderator: "Send your lab your setup so they can use it on their own data, without sending yours."

Screen used: the export dialog mock, starting from its first state (the dialog as it opens, with figures ticked) and then the state where the setup is shared without data. Maren played on a 14-inch laptop view (1440 by 900). She skims paragraphs and reads headings, numbers, column headers and file names.

## Think-aloud

**The dialog as it opens.**

"OK, Export. Scope: 'Full graph: 300 nodes'. Figures, and 'Current view' is already ticked, 2x PNG. There's a picture of the network on the right. That's a figure. I don't want a figure. They have their own data. I want to send them how I did it."

"In Cytoscape I'd go File, Export, Styles, and save the style XML. Then I'd write an email saying: STRING 0.7, largest component, MCODE, colour by log2FC. The style file never carries the cutoff, so the email does that part."

"So, down the left side: Figures, Methods text, Graph data, Tables... There's a pink tag, 'waits on graphty-element: graph-file export'. Waits? Is it loading? Is that broken? I'll skip it. Graph data isn't what I want anyway."

"At the very bottom, cut off, 'Share the setup, without data'. That's literally what I was asked. I'll scroll." (She scrolls the left list.)

**Under 'Share the setup, without data'.**

"Two rows. 'Recipe: Definitions only, never the data.' 'Style file: Style layers and the Look only.' Hm. Style file I understand -- that's my Cytoscape style export. 'Recipe'... a recipe of what? Definitions of what? I'd click Style file first, because that's what I know." (Style file shows nothing new in this mock; she comes back.) "But that's only colours. It wouldn't have the 0.7 cutoff or the clustering. So I guess 'Recipe' is the bigger one. I'm ticking Recipe."

**After ticking Recipe.**

"Whoa, everything went grey. 'Figures and tables are off: they would show your data.' OK. That's fine actually, I'd rather it stopped me than let me send the figure by accident. Scope is greyed out too: 'A recipe takes definitions, not a scope of data'. Fine, whatever."

"There's a name box, 'Expression overlay'. I'd change that to something my lab would understand, like 'DEG network, STRING 0.7'."

"Right side, big box: 'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' Good. That's the first thing my PI would ask. Our knockdown hits are not published."

"'Left behind' column: 300 proteins, 1,262 interactions -- data. 300 fold-change values. 'Knockdown hits (38 fixed)' -- set. Positions, the camera. 4 notes on genes. Good. Oh -- it actually lists the knockdown hits by name as staying here. That I'd screenshot for my PI."

"'Travels': 3 runs, PageRank, Louvain seed 7, degree. Louvain, resolution 1, seed 7 -- OK, that's the clustering, it's not MCODE but fine, the seed is written down, which I'd never remember. PageRank damping 0.85 -- I didn't pick that, I'd have to trust it. Style layers: fold change, module, 2. Filter: confidence 0.7 or more. Good, the cutoff goes with it."

"'Overview readings, 6'. No idea what that is. 'View, without positions, 1'. So their layout will be different from mine. That's fine, their network is different anyway."

"The note: 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' Oh, that's nice. That's the exact sentence I'd put in the email. And it says STRING version. Yes."

"'Asked for when applied': gene symbols, to join a table -- text. A fold change, above and below 0 -- signed. A confidence per interaction -- number. OK, so they need a column of gene symbols. What if my lab mate's table is Ensembl IDs? Half our old data is Ensembl. It just says 'text'. That's exactly where Cytoscape breaks: key column has no matches, and nobody tells you. I can't see from here what happens on their side if their IDs don't match."

"And 'a fold change, above and below 0'. So log2, right? If someone gives it plain fold change, everything is above 0 and the centre is wrong. It doesn't say log2. I'd have to write that in an email anyway."

"And 'a confidence per interaction' -- so they need a STRING network already built? The recipe doesn't do the STRING query for them? Then they still have to go to STRING themselves, pick 12.0, pick 0.7, download. So half of the setup is still an email."

**The file line and the footer.**

"'expression-overlay.graphty -- Opens in graphty or any app with graphty-element'. Hm. My lab uses Cytoscape. What's graphty-element? Is that a plugin? Can they open this in Cytoscape? It doesn't say no, but I'm pretty sure it's no. So I'm sending a file to people who don't have the program. Our lab protocol says Cytoscape."

"Bottom: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. It's not on somebody's server. Then I'd attach it to an email myself. Export 1 file. Click."

"One thing: Style file is still clickable down there. Is the style inside the recipe or do I have to tick that too? 'Style layers: fold change, module' is in Travels, so I think it's in. But then why is Style file still there, unticked? I'd probably tick it too, to be safe, and send two files, and confuse my lab."

## After the task

Moderator: how easy or hard was that, from 1 (very hard) to 7 (very easy)?

"Five. I found it -- the heading said what I was asked, which, fine, that helps. Once I ticked it, the preview was the best part: it told me what's not going out, by name, with counts. What cost me was 'Recipe' versus 'Style file' -- I'd have picked the wrong one first -- and then not knowing what my lab sees when they open it with their own genes."

Moderator: would you use this instead of what you do now?

"For this job -- sending the setup -- the preview is better than what I do. In Cytoscape I send a style XML and an email and hope. Here the cutoff, the STRING version and the clustering seed go with it, and it tells me the hits stay home. But my lab has to have graphty to open it, and the STRING query still isn't in it, so I'd still write the email. And if one of them opens it with Ensembl IDs and it quietly colours nothing, that's the end of it for them. So: maybe, if the lab was already using it. I'm not going to be the one who moves the whole lab over for this."
