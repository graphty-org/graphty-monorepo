# Session: share the setup without the data -- Dr. Chen, computational biologist

Participant: Dr. Chen (persona: study/personas/bioinformatics-researcher.md). Runs a small group,
builds STRING-based interaction networks in R and Cytoscape, leans hard toward keeping unpublished
data on her own machine.

Task as given by the moderator: "Send your lab your setup so they can use it on their own data,
without sending yours."

Material: the Export dialog mock (screens/export-dialog.html), worked from its first state (a figure
export, opened from Export files... in the header) and then the state the prototype shows after
ticking Recipe. Rendered at 1440 by 900.

Outcome: success, with some hesitation. She found the right row after scrolling, read the preview
closely, and would press Export. She has two questions the screen does not answer: can her lab apply
the file from R, and is the file plain enough that she can open it and check for herself that no
data is inside.

---

## Think-aloud transcript

**Opening the dialog.**

"OK. Setup, not data. In Cytoscape I'd export the style as a .xml and then write the rest in an
email -- which layout, which cut-off, what MCL inflation. Nobody ever reproduces it. Let's see.
There's 'Export files...' top right, that's the obvious door, I'll take it."

(Dialog opens on the figure state: Current view checked, 2x PNG, big preview of the network on a
checkerboard, legend with module counts, Export 3 files.)

"Right, it thinks I want a figure. Two PNGs and a methods file already ticked. I don't want any of
that -- a PNG of my network *is* my data, as far as the lab's concerned it doesn't matter, but it's
not what I asked for. The methods text is nice, actually, let me read it... '300 proteins, 1,262
interactions, undirected, 3 components, 2 isolated, loaded from ppi-core-300.graphml... Okabe-Ito
palette... Modularity 0.663.' Good. That's what I want in a figure legend. Not what I want right now.
Where's the option for the setup?"

"Left column: Figures, Methods text, Graph data -- pink tag, 'waits on graphty-element: graph-file
export', so that's not built, fine, I'll ignore pink things -- Tables, nodes table, edges table.
Then there's something cut off at the bottom... 'Share the setup, without data'. Ha. That's
literally my task. It's below the fold, I had to scroll the list to find it. If I hadn't been told
what to look for I'd probably have closed this and looked for a File menu."

**Picking the row.**

"Two rows under it. 'Recipe -- Definitions only, never the data.' And 'Style file -- Style layers
and the Look only.' Recipe. Recipe? We're not baking. I'd have called it a template or a protocol,
or just 'analysis settings'. But 'definitions only, never the data' is clear enough, I'll take it on
trust for a second."

"And 'the Look' with a capital L -- what is the Look? Is that a thing in this tool? I don't know what
that is. Style layers I can guess, that's like a Cytoscape style. So which one do I want? The lab
wants the colours too, presumably. Does Recipe include the style? Or do I need to tick both? I'll
tick Recipe and see what the preview says."

(Ticks Recipe.)

**What happened when she ticked it.**

"Everything went grey. Figures, methods text, tables, all disabled. And a line with a padlock:
'Figures and tables are off: they would show your data.' OK -- that's actually the right instinct.
I like that it turns them off for me rather than letting me accidentally ship a PNG with the labels
on. Scope is greyed too: 'Whole project -- A recipe takes definitions, not a scope of data.' Fine, I
wasn't going to touch it."

"Wait, the project's name at the top changed -- it was 'Proteostasis screen', now it says 'Expression
overlay', and there's a name field on the Recipe row saying 'Expression overlay'. In a real tool I'd
assume that's just the default name it picked for the file. I'd rename it to something my postdocs
recognise. Fine."

"Style file is still enabled, unticked. So it didn't grey that one out. So is style inside the
recipe or not? I'll look at the preview."

**Reading the preview.**

"'What the recipe holds.' First line, big, with a tick: 'No data inside. No genes, interactions,
fold-change values, positions or notes on genes. Only how to build the analysis again on someone
else's data.' Good. That's the sentence I needed. That's the sentence I'd paste into an email to the
PI next door."

"Three columns. 'Travels', 'Asked for when applied', 'Left behind'. Let me read Travels properly."

"'3 runs: PageRank, Louvain seed 7, degree.' PageRank damping 0.85, weighted by confidence. Louvain
resolution 1, seed 7, weighted by confidence, and its groups are the modules the style colors. Degree
exact. Good. Seed recorded -- that's the thing nobody records. If my postdoc gets different modules on
the same data I want to know it's not the seed. Weighted by confidence, stated. This is better than
what I'd get out of Cytoscape, frankly -- clusterMaker doesn't put the inflation value anywhere you'll
ever see it again."

"'style layers: fold change, module -- 2.' OK so the style *is* in it. Then what is the separate
Style file row for? Just the style without the analysis? Probably. It's not obvious, I had to work
it out. 'filter: confidence 0.7 or more -- 1.' Good, the cut-off travels. 'overview readings -- 6.'
What's an overview reading? No idea. Six of them. Is that data? It's in the 'Travels' column so
presumably not, but I can't tell what it is, and 'reading' sounds like a measurement, which sounds
like data. I'd want to know before I send it."

"'view, without positions -- 1.' Fine, the camera or whatever, no coordinates. OK."

"And a note: '1 note, on the confidence filter: Confidence is STRING's combined score, version 12.0.
0.7 is STRING's high-confidence cut: build your network from the same release.' Yes. That's exactly
the caveat. I wrote that, presumably, and it travels in full and I can read it here before it goes.
That's good. I'd want to check nothing in a note mentions a gene name I haven't published -- and I
can, because it shows me the whole text. The other four notes, 'on genes', are listed under Left
behind. Good."

"Middle column: 'Asked for when applied.' Gene symbols, to join a table -- text. A fold change, above
and below 0 -- signed. A confidence per interaction -- number. So when my postdoc opens it on her
data it'll ask her which column is which. That's like the Cytoscape import mapping, OK. Two
worries. One: gene *symbols* -- half the lab works in Ensembl IDs. Can she give it Ensembl, or does
it insist on symbols? It says 'text', so I'd guess anything that matches, but it says symbols. Two:
what if her network isn't from STRING and has no confidence? Does the filter just drop everything,
or does it tell her? This screen can't answer that, it's the other end, but that's the first thing
she'll hit."

"'signed' -- I get it, it means the colour scale is diverging around zero. I'd have said 'diverging'.
Doesn't say which palette. I'd want the palette to travel so the lab's figures match ours."

"Right column: 'Left behind.' 300 proteins, 1,262 interactions -- data. 300 fold-change values --
data. Knockdown hits (38 fixed) -- set. Positions, the camera -- layout. 4 notes on genes -- notes.
Good. The knockdown hits are the thing I really don't want to leave the building before the paper,
and they're explicitly listed as staying. That is reassuring. I'd still open the file in a text
editor before sending it, because a list on a screen is the tool telling me what it thinks it did."

**The file line and the footer.**

"'File: expression-overlay.graphty -- Opens in graphty or any app with graphty-element.' Hm. What's
graphty-element? Is that a plug-in? My lab doesn't have 'any app with graphty-element'. They have R.
Can they read a .graphty file from R? Is it JSON? If it's JSON I can check it myself and they can
parse it. If it's a binary blob, I'm not sending it, because I can't verify the 'no data inside'
claim. The screen doesn't say what kind of file it is."

"Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. That's the other thing I
needed. No share link, no server. I'd email the file myself."

"Export 1 file. I'd press it."

(Moderator confirms the task is complete.)

---

## Single Ease Question

**5 of 7.** "Finding it took a scroll, and the word 'recipe' made me hesitate, but once I'd ticked it
the preview told me exactly what goes and what stays, which is the whole question. I lost points on
the two things I couldn't tell: whether Style file is part of it or separate, and what an 'overview
reading' is."

## Would she use this instead of her current tool?

"For this job, yes -- there *is* no current tool for this job. In Cytoscape I'd send a style XML and
an email with the parameters, and half the parameters would be wrong. This writes down the seed, the
weighting, the STRING version and the cut-off, and it tells me it's leaving the knockdown hits
behind. That's better than what I do now. But whether it replaces anything depends on the other end:
if my postdoc can't load the recipe from R -- or at least read it as a plain file and see the
parameters -- then it only works for people who use this app, and my lab doesn't live in a web app.
Show me the file is readable and that there's a way to apply it from a script, and I'd use it for
every analysis we hand to the partner lab."

---

## Problems observed

1. **The row is below the fold of a list that opens on figures.** The dialog opened with two figures
   and a methods file ticked; "Share the setup, without data" was cut off at the bottom of the list
   and had to be scrolled to. She found it only because she was looking for it. (Severity 2)
2. **"Recipe" is not her word.** She would have said template, protocol or analysis settings; the
   one-line note "Definitions only, never the data" rescued it. (Severity 1)
3. **Recipe versus Style file is unclear.** The preview lists style layers inside the recipe, yet a
   separate Style file row stays enabled beside it, described as "Style layers and the Look only".
   She could not tell whether to tick both, and did not know what "the Look" is. (Severity 2)
4. **"overview readings -- 6" is unexplained.** It sits in the column of things that travel, and
   "reading" sounds like a measurement, so to her it might be data. She would not send the file
   without knowing. (Severity 3)
5. **Nothing says what kind of file .graphty is, or how to use it outside the app.** "Opens in
   graphty or any app with graphty-element" means nothing to a lab working in R. She wants to know
   whether it is plain text she can open to check the "no data inside" claim, and whether it can be
   applied from a script. (Severity 3)
6. **What gets bound on the other end is loosely specified.** "Gene symbols" worries her because
   half her lab uses Ensembl IDs. "Signed" names no palette. And it does not say what happens when
   the recipient's data has no confidence column for the 0.7 filter. (Severity 2)
7. **No methods text without data.** Methods text is disabled because it names the data file and
   its counts. She would have liked a plain-text copy of the parameters, with no counts, to paste
   into the email. (Severity 1)

## What worked for her

- "No data inside" as the first line, followed by an explicit "Left behind" list that names the
  knockdown hits.
- The seed, the weighting and the resolution are recorded for each run.
- The STRING version and the cut-off travel as a note, shown in full before it goes.
- "Nothing is uploaded" in the footer.
- Ticking Recipe disables and explains every row that would carry data, instead of trusting her to
  untick them.
