# Share the setup without the data -- Dr. Chen, computational biologist

Task as given by the moderator: "Share your setup with a partner, without your data."

Screens seen: the Export dialog with Recipe checked (shots/tasks/share-without-data/01-export-dialog-recipe.png),
the Export dialog's ways in (shots/screens__export-dialog.png), the recipe as the partner meets it
when applying it (shots/record/r4-chen-swd-binding-full.png) and the Data panel (shots/record/r4-chen-swd-data-panel-full.png).

## Think-aloud

**1. Finding where to start.**
"Share with a partner. First thing I look for is a Share button top right, because that is where
every web tool puts it. There isn't one. Good, frankly -- I don't press Share on unpublished data
anyway. So this is an export. There's an Export... button in the Data panel header, next to 'Data'.
Fine. Cytoscape would make me do File > Export > Styles to File, and then separately explain the
filter and the clustering parameters in an email."

**2. The dialog opens with Recipe checked.**
"Grey banner with a padlock: 'Figures, images, tables, the report, graph data and the project file
are off: they would carry your data.' OK, that's clear, and it tells me why, which I like. Scope is
greyed out, 'A recipe takes definitions, not a scope of data'. Fine, I'll accept that.

'Share the setup, without data' -- Recipe -- 'Readable text (JSON) with styles, steps and layout.
It never holds your data.' Readable JSON. So I can open it in R with jsonlite and see what's in it
myself. That matters more to me than the promise. The file is expression-overlay.graphty -- odd
extension for JSON, but whatever, I'll rename it if I have to."

**3. Reading the preview -- 'No data inside.'**
"'No genes, interactions, fold-change values, positions or notes on genes.' That's the right list.
Now I read what travels, because the claim is only as good as the list.

3 runs: PageRank damping 0.85, weighted by confidence, 'used as similarity' -- I think that means a
higher confidence is a stronger edge, which is what I'd want for STRING scores. 'Used as similarity'
is not how I'd say it, but I can decode it. Louvain resolution 1, seed 7 -- good, a seed. Degree
exact, not normalized. Style layers: fold change, module. Filter: confidence 0.7 or more.

Layout: 'force-directed, its settings and seed'. Which force-directed? Which settings? If I'm
sending this to someone who'll put it in a figure legend, I want the algorithm named and the
numbers here, not 'its settings'. I found later that the partner's side names it -- ForceAtlas2,
gravity 1, scaling ratio 2, 100 iterations, seed 7 -- so why does the sender, the person
responsible for it, get the vaguer version?

The note on the filter travels in full: 'Confidence is STRING's combined score, version 12.0. 0.7 is
STRING's high-confidence cut: build your network from the same release.' Yes. That's exactly the
sentence I'd have typed into the email. And I can see the whole text, so I can check it doesn't
name a gene I haven't published. Good."

**4. 'You supply' and 'Not included'.**
"You supply: gene symbols, a fold change signed around 0, a confidence per interaction. Not
included: 300 proteins, 1,262 interactions; 300 fold-change values; Knockdown hits (38, frozen);
positions; 4 notes on genes. That matches what I'd expect to keep back. The knockdown hits being
left out is correct -- those are the bench's unpublished results."

**5. Checking what my partner will see.** (the partner's Apply recipe screens)
"I want to see the other end before I send anything. 'What your recipient does: add a table with a
gene id and a fold change column, then Apply.' Clear.

But here the partner is asked for FOUR things, not three: there's also 'a module per protein, from
the network', category. My dialog said three. Where does my partner's 'module' column come from?
If they download STRING v12 themselves, there is no module column in it. Module is something I
computed. So either my network with my modules is going with this -- which contradicts 'no data
inside' -- or the partner's module colouring silently does nothing.

And then the numbers: 'Module: 9 modules', 'Weight: confidence, 10 communities, PageRank, Louvain'.
9 modules and 10 communities on the same network. Which is my partition? Is 'module' the Louvain
result or some older column? That's a count I can't reconcile, and if I can't, my partner certainly
can't. In a paper that would be a reviewer question."

**6. The 'Sender's network' label.**
"On the partner's screen the network row says 'Sender's network: STRING v12 -- ppi-core-300.graphml,
300 proteins, 1,262 interactions'. Sender's network? I thought the network wasn't carried. My own
dialog says 'ppi-core-300.graphml, STRING v12: named, not carried'. So the file name goes, and the
partner's app calls their own copy 'the sender's network'. If I were the partner I'd think I'd
been sent her network. And the file name is metadata -- if I'd named it after the unpublished
target it would be in the recipe. I want to see the file name listed under Travels, not only on
the other side.

Does it check the STRING version when my partner applies it, or is 'v12' just a label and the only
real guard is my note? If they build from 11.5, a third of the scored edges are different. I'd want
it to say so at apply time."

**7. The partner's matching screens.**
"84 of 96 genes matched, and it lists the 12. 'Mdm2 differs only in letter case from MDM2 -- Use
MDM2'. And '2 ids look like spreadsheet dates (SEPT2 -> 2-Sep)'. Somebody here has actually worked
with Excel gene lists. With Ensembl IDs it says none matched and offers a mapping table instead of
'null'. That's the stringApp complaint answered. 'Copy the 12 symbols' -- yes. '36 up, 48 down,
-2.41 to 2.98, blue below 0, red above' -- I can check that against my data frame."

**8. The Data panel.**
"The Data panel mock is a payments network -- bank transfers -- so I'm guessing. There's 'Recipes
applied' with a plus, which I suppose is where my partner ends up, and then separately 'Style
files' with a plus. What is a style file if a recipe already has styles? Is that Cytoscape's
styles.xml? I don't know which one to send, and the dialog I used only offered Recipe."

**9. Pressing Export.**
"'1 file goes to your Downloads folder. Nothing is uploaded.' That is the sentence I look for
before anything else. Export 1 file. I'd email it. Done."

## Single Ease Question

**6 of 7.** Getting the file out was quick: one checkbox, and the dialog told me what it left out
and why. It loses a point because I cannot tell from my own screen what 'module' my partner gets,
the 9 modules versus 10 communities does not add up, and the layout is described less precisely to
me than to the person receiving it.

## Would I use this instead of my current tool?

"For this job, instead of Cytoscape: yes, probably. Today I'd send a Cytoscape session, which
carries all my data, or export a style XML and write the filter, the MCL parameters and the STRING
version into an email by hand. This carries the filter, the runs with their seeds and my note, keeps
the knockdown hits back, and says nothing is uploaded.

Instead of my R script: no, not yet. My postdoc and the partner lab rebuild things from scripts.
If the JSON can be read and applied from R or Python, it goes into the pipeline; if it only opens
in this app, it's a nice way to hand a figure setup to a collaborator, not the method of record.
And I would not send it until someone explains where 'module' comes from on the partner's side."

## Problems, in her words

1. Recipient screen asks for "a module per protein, from the network"; the sender's dialog lists only
   three things to supply. Module is computed data the partner will not have. (high)
2. "9 modules" and "10 communities" on the same network with no explanation of which is the
   partition being shared. (high)
3. The partner's own file is labelled "Sender's network", and the sender's file name travels but is
   not listed under Travels. (medium)
4. Sender preview says "layout: force-directed, its settings and seed"; the algorithm and its
   numbers are only shown on the recipient's side. (medium)
5. No visible check that the partner's STRING release matches v12; only the free-text note guards
   it. (medium)
6. No sign of a scripting path to read or apply the recipe from R or Python. (medium)
7. "Recipes applied" and "Style files" sit side by side in the Data panel with no hint of the
   difference. (low)
8. "Used as similarity" for PageRank's weight is decodable but not a biologist's phrasing. (low)
