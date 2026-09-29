# Share the setup without the data -- Dr. Chen, computational biologist

Task as given by the moderator: "Share your setup with a partner, without your data."

Screens seen (renders in shots/):
- the project-name menu with Export... (r6-chen-swd-export-ways-in-menu.png)
- the Export dialog with Recipe checked, as a participant sees it (tasks/share-without-data/01-export-dialog-recipe.png)
- the recipe as the other lab meets it: the recipe card, the Apply dialog, the result
  (r6-chen-swd-recipe-travels.png; cut into pieces in tmp/swd-chen-r6/)
- the Data panel (r6-chen-swd-data-panel.png)

## Think-aloud

**1. Where do I start.**
"Share with a partner. No Share button top right, which suits me -- I don't press Share with
unpublished data. The project name has a menu: Open, Update with new data, Export..., Download
project file, Version history. Export is where I'd look, same as File > Export in Cytoscape. 'Download
project file' I'd avoid; that sounds like the whole session with my data in it, which is exactly what
I don't want to send."

**2. The dialog, Recipe checked.**
"Grey bar with a padlock: 'Figures, images, tables, the report, graph data and the project file are
off: they would carry your data.' Clear, and it tells me why. Scope greyed out, 'A recipe takes
definitions, not a scope of data.' Fine.

Left column is grouped now -- Figures, Rows, Report, Graph data, then 'Share the setup, without data'
with Recipe (.graphty). That heading is literally my task. I didn't have to guess. 'Readable text
(JSON) with styles, steps and layout. It never holds your data.' Readable JSON is the part I care
about: I can open it with jsonlite and check it myself instead of trusting the promise."

**3. 'No data inside' and what travels.**
"'No genes, interactions, fold-change values, positions or notes on genes.' Right list. Now I read
the Travels column, because the claim is only as good as the list.

3 runs. PageRank damping 0.85, weighted by confidence, 'used as similarity' -- I read that as higher
confidence is a stronger edge. It's what I'd want for STRING scores, but it's not how anyone in my
field says it. Louvain resolution 1, seed 7, weighted by confidence -- good, a seed and the weight
stated. Degree exact, not normalized. Fine.

Style layers: fold change, module. Filter: confidence 0.7 or more. Layout: 'force-directed, its
settings and seed'. Same as last time -- which force-directed, which settings? If my partner is going
to write a figure legend from this, I want the algorithm named and the numbers in front of me before I
send it. I'm the one responsible for it. 'Its settings' is not a methods sentence.

The note on the filter travels in full: 'Confidence is STRING's combined score, version 12.0. 0.7 is
STRING's high-confidence cut: build your network from the same release.' That is the sentence I would
have typed into the email. And I can see the whole text, so I can check it doesn't name a target."

**4. 'You supply' and 'Not included'.**
"You supply: gene symbols, text; a fold change above and below 0, signed; a confidence per
interaction, number. Not included: 300 proteins, 1,262 interactions; 300 fold-change values;
Knockdown hits (38, frozen); positions; 4 notes on genes. The knockdown hits staying behind is correct,
those are the bench's unpublished results.

But one of my two style layers is 'module'. Where does my partner's module come from? It isn't in
'You supply'. Either Louvain re-runs on their network with seed 7 and the colours come from that --
which would be fine, and then say so -- or it expects a module column that only exists in my network.
I can't tell from this screen. I asked this last time too."

**5. 'Files'.**
"expression-overlay.graphty. 'Opens in graphty or any app with graphty-element.' What's
graphty-element? I suppose that's the library under it. That's not an answer to 'can my postdoc read
it in R'. Nothing here about a script. I looked -- the Graph file row mentions 'a script', but that's
for data, which I'm not sending."

**6. Checking what my partner will see.** (the recipe-travels storyboard)
"I want to see the other end before I send anything. The storyboard is a different lab -- Maren
sending to Tom -- but it's the same recipe name, so it's the nearest thing.

First thing I notice: Maren's Export dialog is not the one I had. Hers has a box 'The person who opens
it sees', with 'Expects:' and a 'Where each comes from' list with a dropdown per input: gene id --
Their table, fold change -- Their table, module per protein -- The network, confidence -- The network.
That is precisely the control I wanted at step 4. My dialog had a flat 'You supply' list with three
items and no module, and no way to say where anything comes from. So which dialog is the real one? If
it's hers, I'd set module to... what? I don't want it to come from 'the network', because my partner's
STRING download has no module column. I'd want 'computed by the Louvain run in this recipe', and that
isn't one of the two choices.

The recipient's card: 'Expects: a protein network with a module per protein and a confidence per
interaction. It is not in this recipe; it was made on ppi-core-300.graphml.' So the file name of my
network goes with it. It's listed on his side, not under 'Travels' on mine. If I'd named the file
after an unpublished target, it would leak. I want it listed on my side.

'Data stays on this computer. This recipe names no server, so graphty contacts none. Files you add are
read in this browser and are not uploaded.' Good. That's the paragraph my partner's IT person would ask
for.

The Apply dialog: 'From the network, found by name: Module -- module -- found by name.' So yes, the
recipe expects a column called 'module' in the network file. My partner won't have it. The storyboard
has a case for that -- 'An older network file with protein names only: module and confidence have
nothing to read ... the other 216 proteins stay in the Base style ... 2 parts off'. So it wouldn't
crash, it would just quietly not colour modules. Well, not quietly -- it says '2 parts off' in the
notice. That's honest. But then half my figure setup doesn't travel, and I only find that out from the
other side.

The matching screen is still the best thing here. '84 of 96 genes matched', the 12 listed by name,
'Mdm2 differs only in letter case from MDM2 -- Use MDM2', '2 ids look like spreadsheet dates (SEPT2 ->
2-Sep)', 'Copy the 12 symbols'. Someone here has worked with Excel gene lists. '36 up, 48 down, -2.41
to 2.98, blue below 0, red above' -- I can check that against my data frame. The fold change is
'never taken from the network' -- correct, I don't want my logFC leaking into theirs or theirs being
overwritten by mine.

Does anything check that the partner's STRING release is v12? 'keeps 1,059 of 1,262' on the
confidence filter is a count, which helps -- if they built from 11.5 they'd get a different number --
but they don't know my number to compare against unless they read my note. Nothing at apply time says
'the sender's network was STRING 12.0, yours doesn't say'."

**7. Data panel.**
"Still a bank-transfer network in this mock, so I'm reading around it. 'Applied recipes -- None yet.
A recipe is a file of styles, sets or runs, from a colleague or another project; a file of colors and
sizes is a recipe too.' OK, so there's one kind of file now, not recipes and style files side by side.
That answers my confusion from before. 'Nothing has been sent from this project' under the project
name -- I like that; after I export, I'd expect it to list what went out and where. That's an audit
trail I'd actually use."

**8. Pressing Export.**
"'1 file goes to your Downloads folder. Nothing is uploaded.' The sentence I look for first. Export 1
file. I'd attach it to an email with the STRING version in the body anyway, because I don't trust my
partner to read the note."

## Single Ease Question

**5 of 7.** Getting the file out is easy: the menu has Export, the dialog has a section named for
exactly this job, one checkbox, and it tells me what stays behind and that nothing is uploaded. It
loses two points because I cannot control or even see where my partner's 'module' comes from -- my
dialog leaves it out of 'You supply', while the other lab's version of the same dialog has a
per-input 'where it comes from' choice that mine does not -- and because the layout is described to me
as 'its settings' while I'm the one vouching for it.

## Would I use this instead of my current tool?

"Instead of Cytoscape for this job: yes. Today I'd send a .cys session, which carries all my data, or
a styles XML plus an email with the filter, the clustering parameters and the STRING version typed by
hand. This carries the runs with their seeds, the filter, and my note, keeps the knockdown hits back,
and tells the partner which of their genes didn't match, by name.

Instead of my R script: no. It says readable JSON, but nothing tells me how to apply it from R or
Python, and 'opens in any app with graphty-element' means nothing to a postdoc with an RStudio
session. Until my partner lab can rerun it from their pipeline it's a convenient way to hand over a
figure setup, not the method of record. And I would not send it until I know my module colouring
survives on their side -- right now the answer seems to be 'only if their network already has my
modules in it', which defeats the point."

## Problems, in her words

1. "My dialog lists three things to supply and no module, yet one of the two style layers it sends is
   'module'. The recipient's side then looks for a 'module' column in their network, which a partner
   building from STRING will not have." (severity 4)
2. "The other lab's Export dialog has 'The person who opens it sees' with a 'where each comes from'
   choice per input; mine has a flat 'You supply' list with no choice. Two different dialogs for the
   same job." (severity 3)
3. "There's no option for 'module comes from the Louvain run in this recipe' -- only 'Their table' or
   'The network'. A computed column should be recomputed, not expected." (severity 3)
4. "'layout: force-directed, its settings and seed' -- the sender, who is responsible for it, still
   isn't shown the algorithm name or its numbers." (severity 3)
5. "The network file name (ppi-core-300.graphml) travels in the recipe but is not listed under
   Travels on my side; I only see it on the recipient's card." (severity 2)
6. "Nothing at apply time compares the partner's network to STRING 12.0; only my free-text note
   guards it." (severity 2)
7. "No scripting path: 'opens in graphty or any app with graphty-element' does not tell me how to
   read or apply it from R or Python." (severity 3)
8. "'used as similarity' for PageRank's weight is decodable but not how a biologist would say
   'higher confidence is a stronger edge'." (severity 1)
9. The storyboard has an empty bordered box between the Statistics frame and the After-Undo frame.
   (severity 1)
