# Session: share the setup without the data -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, the lab's de facto bioinformatician, played from `study/personas/genomics-cytoscape-user.md`.
Screen: the Export dialog mock, `screens/export-dialog.html`, at 1440 by 900 (laptop).
Task as given: "Send your lab your setup so they can use it on their own data, without sending yours."
What she saw: the dialog as it opens (`shots/r3-maren-share-open.png`), then the dialog after ticking Recipe (`shots/r3-maren-share-recipe.png`).

Outcome: success, with difficulty. She wrote the file in about two minutes, but she was not confident her lab could actually use it at the other end.

## Transcript (think-aloud)

**Opening the dialog.**
"OK, so the export thing is open. Scope, full graph, 300 nodes. Big picture of the network in the middle, legend on the right with counts -- fine, that's a figure export. That's not what I want. I don't want to send them a picture, I want to send them the *setup*. In Cytoscape I'd do File, Export, Styles to File, and get the XML, and then half the time the mapping column doesn't exist in their table and it just colours everything grey."

"Left side: Figures, Methods text, Graph data, Tables... there, at the very bottom, cut off: 'Share the setup, without data'. That's literally what I was asked. I only saw it because I was reading down the headings. The actual row under it is off the bottom, I have to scroll this list."

*Scrolls the left list. Finds a row called Recipe with a checkbox.*

"'Recipe'. Hm. Not a word I'd have used -- I'd have said 'style' or 'session'. But the line under it says 'Readable text (JSON) with styles, steps and layout. It never holds your data.' OK, that's clear enough. Tick."

**After ticking Recipe.**
"Oh, it greyed everything else out. 'Figures, tables, graph data, the report and the project file are off: they would carry your data.' Good. That's actually reassuring -- I was going to worry the methods file would sneak my gene names in. Scope is greyed too, 'A recipe takes definitions, not a scope of data'. Don't know what that means, don't care."

"Big box: 'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' OK. That's the first thing it says, good, because my PI will ask exactly that. We have unpublished knockdown data in there."

"Three columns. Travels, Asked for when applied, Left behind."

"Travels: '3 runs: PageRank, Louvain seed 7, degree.' ... I don't know what PageRank is doing on my gene network, that's Google. Louvain -- is that the clustering? The modules? It says 'its groups are the modules the style colors'. So that's our MCODE step, basically. Seed 7 -- if someone in the lab asks me why seven, I have no idea. Degree, fine, that's the hub genes."

"Style layers: fold change, module -- 2. Filter: confidence 0.7 or more. Good, that's the STRING cutoff, that has to go. 'Statistics numbers, computed again on their data -- 6.' Six what? It doesn't say which six. Layout, view, the Look -- fine, whatever."

"And the note -- 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' I wrote that? OK, that's shown in full, good, I can see what's going out. But wait -- 'build your network from the same release'. So the STRING network doesn't come with it. They still have to go to STRING themselves, pull the network, and then... get it in here somehow. That's the part people in my lab get wrong."

"Asked for when applied: gene symbols, to join a table -- text. A fold change, above and below 0 -- signed. A confidence per interaction -- number. OK, so it's going to ask them for those three things. That's actually the helpful bit -- that's exactly where Cytoscape goes wrong, the key column. But I can't tell from here what happens if their symbols don't match. Does it tell them 'I found 250 of 300'? That's on their screen, not mine, so I just have to trust it."

"Does the colour scale come with it? It says fold change above and below 0, so presumably it centres on zero on their data. But my scale went from minus 2.5 to plus 3.15 -- do they get my limits or their own? Doesn't say. If their knockdown is stronger everything could clip."

"Left behind: '300 proteins, 1,262 interactions -- dat...' -- it's cut off on the right. 'Knockdown hits (38 fixed) -- se...', '300 positions ... layou...', '4 notes on genes -- note...'. The column runs off the edge of the dialog. I can read the left bit, which is what matters, but that looks broken. I'd scroll sideways if it let me."

"Knockdown hits left behind, good, that list is the unpublished part. Four notes on genes left behind, good."

"File: expression-overlay.graphty. Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good, no account, no server. Export 1 file."

*Clicks Export 1 file.*

"OK. So now I have a .graphty file in Downloads. And... I'd email it to the lab. And then what? If Jonas double-clicks that, what opens? Nobody in my lab has this. There's nothing here that tells me what to write in the email -- 'install this, open that, load your STRING network first, then apply this'. In Cytoscape at least everyone already has Cytoscape."

## Moderator follow-up

**Single Ease Question (1 very hard -- 7 very easy): 5.**
"Making the file was easy once I found the row at the bottom. The hard part is the half I can't see -- whether my lab can actually use it. It tells me very clearly what doesn't go, which I like. It doesn't tell me what they have to do with it."

**Would you use this instead of what you do now?**
"For this specifically -- sending the setup without the data -- it's better than Cytoscape's style XML, honestly. The XML is just the colours, it doesn't carry the confidence cutoff or the clustering, and it doesn't tell you the key column has to be gene symbols. This does, and it tells me what's left behind, with counts. That 'no data inside' box I'd screenshot for my PI."

"But it only works if my whole lab moves to this tool, and the lab protocol says Cytoscape. And they'd still have to go to STRING for the network. And I'd have to explain what PageRank and Louvain are doing in there, because I didn't choose those. So: nice, I'd use it if the lab were already on it. I'm not going to be the one who makes six people switch to share a style."

## Problems observed

1. The setup row is below the fold when the dialog opens: only the heading "Share the setup, without data" peeks out at the bottom of the left list, and the Recipe row needs a scroll. She found it by reading headings; a less literal reader could miss it. (Severity 2)
2. "Left behind" column is clipped at the dialog's right edge at 1440 wide: the type labels read "dat", "se", "layou", "note". Looks broken to her. (Severity 2)
3. No guidance for the receiving side: nothing tells her what her lab must have (graphty? a browser? an account?), what opening a .graphty file does, or what to say in the email. The task was "so they can use it", and she could not verify that. (Severity 3)
4. The network source does not travel: the note says to rebuild from the same STRING release, so recipients still leave the tool to get their network. Triggers her "then why not stay in Cytoscape" objection. (Severity 3)
5. Run names PageRank and Louvain (seed 7) are unexplained; she maps Louvain to "MCODE" only through the trailing clause and cannot answer "why seed 7". (Severity 2)
6. It is not clear whether the fold-change colour limits travel as fixed values or are recomputed on the recipient's data. (Severity 2)
7. "Statistics numbers, computed again on their data: 6" -- does not say which six. (Severity 1)
8. The word "Recipe" is unfamiliar; she thinks in "style" or "session". The line under it rescued it. (Severity 1)

## What worked

- Ticking Recipe greyed out every data-carrying kind with one line saying why -- she stopped worrying about the methods file leaking gene names.
- "No data inside" stated first, with what that means in her terms (genes, fold-change values, notes on genes).
- "Left behind" with counts, especially the knockdown hits set and the notes on genes.
- The traveling note shown in full before it goes.
- "Asked for when applied" naming gene symbols as the join column -- the step that breaks in Cytoscape.
- "Nothing is uploaded" in the footer.
