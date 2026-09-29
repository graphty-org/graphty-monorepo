# Use a colleague's file -- Analyst Alex

**Participant:** Alex, an operations data analyst at a logistics company. Python and NetworkX for
the numbers, Gephi for the picture, Excel for anything a stakeholder touches. Knows degree,
betweenness and Louvain well enough to run them; has been burned by communities that change on
rerun and by projects that reopen without their colours. Mild red-green colour weakness. No
biology at all: for this session he was handed someone else's gene list and treated the gene
symbols as ids, the way he would treat depot codes.

**Task as given by the moderator:** "A colleague sent you their analysis to use on your own gene
list. Get your genes into it and tell me when it is ready."

He was given a CSV of 96 genes (columns `symbol`, `log2FC`, `padj`) that had been through Excel
once, and the colleague's email with its attachment, "Expression overlay".

**Screens seen:** the email with the attachment; the start screen with the recipe waiting for
data (both versions of the card); the Apply recipe dialog before a table is added, after the
table is added (84 of 96 matched), after the one-click case fix, the version that asks which
column is the fold change, the version with an older network, the version where nothing matched,
and the "a higher number means" question; the graph after Apply with its table; the project after
one Undo; the "What the recipe holds" panel. The "Replace data and apply a recipe" page was
skimmed for the Recipes menu and the recipe picker; the rest is about bank transfers.

Renders the participant looked at (participant view, design notes hidden):
- `../../../shots/r4-alex-ucf-start-screen.png`
- `../../../shots/r4-alex-ucf-recipe-apply.png`
- `../../../shots/r4-alex-ucf-binding-step.png`
- `../../../shots/r4-alex-ucf-replace-and-recipe.png`
- `../../../shots/r4-alex-ucf-recipe-travels.png`

## Think-aloud

**The email.** "OK, 'Expression overlay', recipe. So it's not a project file, it's -- the steps?
Fine. That's actually the thing I've wanted from Gephi for years. Before I open it: is my list
going anywhere? It's not my data, it's somebody's lab data, which is worse."

**Start screen, before anything.** "'Files stay on this computer. graphty reads them in this
browser and uploads nothing.' Good, it's on the first screen, not on a privacy page. 'Projects are
kept in this browser.' Fine. There's no 'Import', there's 'Open...'. I'll just drop the thing on
it." (Drags the attachment; the Open row reads "Drop to open".) "OK, it knows."

**Start screen, recipe waiting for your table.** "'Recipe waiting for your table.' 'Colors your
genes by log2 fold change, red for up and blue for down, draws the other proteins in muted module
colors, and hides interactions with confidence under 0.7.' Red and blue, not red and green,
thank you. Hides under 0.7 -- that's a filter, OK, that's a decision someone made, I want to be
able to see it later."

"'Sender's network: STRING v12, 300 proteins, 1,262 interactions.' Hang on. So the network came
with it? I only got one file. And then 'Your table: not added yet. It needs a gene id and a
fold-change column. The sender's fold change is not used.' OK, so it wants my table, and it's not
going to quietly use theirs. Good, that's exactly the mistake I'd make at 5 pm."

"'This recipe names no server, so graphty contacts none.' Then where did the 300 proteins come
from? If it's not carried and it didn't download it..." (Scrolls to the other version of the card,
on the recipe page.) "This one says 'It carries no data. To use it, add a protein network and a
table of your genes.' So which is it? One card says the network is there with a Replace button,
the other one says I have to bring a network. I don't have a protein network. If I have to bring
it, I'm stuck right here and I email the colleague."

"And this one has 'Or try it on a sample' with three samples, and the first card had no samples
at all. Same recipe. That doesn't fill me with confidence that I'm looking at the same thing."

(Moderator does not answer. He goes with the first card, because it has the button that matches
what he wants to do.)

"'Add your table...' is the blue one, 'Apply' is grey and it says 'Waiting for your table'
right next to it. Good, I don't have to hover to find out why it's off. Add your table."

**Apply dialog, before the table.** "'Brings: 2 styles, 1 filter, 3 runs. You supply: a table
with a gene id and a fold change column.' That's a nice summary line. '3 runs: PageRank, Louvain,
degree, on the filtered graph; they add results, not styles.' OK, so it runs algorithms too. I
want to see those numbers after."

"Down here, 'From the sender's network, found by name.' Module, 9 modules. Confidence, keeps
1,059 of 1,262. Weight, confidence, '10 communities'. Wait -- 10 communities? Louvain already
ran? I haven't pressed anything. And it's 9 modules one line up and 10 communities one line down.
I know those can be different things, modules are theirs and communities are Louvain's, but the
row says 'Weight' and then gives me a community count. I'd have to explain that to someone and
I can't."

"'For confidence, a higher number means: a closer or stronger link, similarity.' Uh. It's a
confidence score. Higher is more confident. I'm not touching that; the recipe picked it and it
says 'the recipe's answer', so I'll leave it."

**Adding the table.** (Picks `qpcr-hits-2026-09.csv`.) "'Matching 96 genes against 300
proteins' with a bar. Fine, it's doing something."

**84 of 96 matched.** "84 of 96. 96 is my row count, good, that's the first thing I check. '12
did not match. They stay in your table and are not colored.' OK, nothing thrown away."

"'7-Sep, date?' '2-Mar, date?' Ha. Excel. '2 ids look like spreadsheet dates (SEPT2 -> 2-Sep).'
I have lost an afternoon to exactly that with depot codes. That line alone would have saved me.
It tells me to fix it in my table and add it again, which is right, I don't want the tool
silently rewriting my ids."

"'Mdm2 differs only in letter case from MDM2 -- Use MDM2.' Obviously a typo. Click." (Clicks Use
MDM2 without hesitating. '85 of 96 genes matched, 1 by hand.') "Good, and it says 'by hand', so if
anyone asks why 85 I can say one was me."

(Facilitator note: he did not stop to ask whether a lower-case symbol could mean a different
organism's gene. To him it was a spelling fix.)

"The other nine, TP53BP1, GAPDH, ACTB, IL6, whatever -- 'Not in this network.' I have no idea if
that's normal for genes. It doesn't say whether they're wrong or just not in the colleague's
network. I'd have to ask. At least there's 'Copy the 11 symbols', so I can paste them in the
email."

"Now, adding up. 'Fold change: log2FC, 36 up, 49 down.' 36 plus 49 is 85. Matches. Before the
click it was 36 up, 48 down, 84. Also matches. OK, I trust the count."

"'Blue below 0, red above, as the recipe draws it; -2.41 to 2.98 on the matched genes.' Fine."

"Footer: '11 genes stay uncolored. Apply is one step; one Undo takes all of it back.' Good, I
like that it says one Undo. Apply."

**Graph after Apply.** "'Expression overlay applied: 84 of 96 genes matched.' Hm. It was 85 in
the dialog after I fixed Mdm2. This says 84." (Looks at the Statistics column.) "'Expression
overlay, 84 of 96 genes matched; 12 did not.' Also 84. So either my MDM2 fix didn't take, or
these screens are from a run without it. That's the kind of thing that ends up in a report wrong.
I'd click 'Show the 12' to see whether Mdm2 is still in there."

"Statistics: 300 nodes, 1,059 of 1,262 edges, 12 components, 11 isolated. That's the filtered
graph; 'Filtered: 1,059 of 1,262 edges' is up at the top too. Good, it doesn't hide that it
dropped edges."

"The picture. Legend: 'Fold change color log2FC, 84 genes' blue to red. 'Module color, 216
others, muted': Ribosome light blue, Proteasome yellow-orange, DNA repair salmon, 6 more." (Leans
in.) "So which dots are mine? The light blue ribosome ones and the light blue down-regulated ones
are the same kind of blue to me. And the salmon DNA repair ones and the pale red 'a bit up' ones
-- honestly that's muddy. The dark red ones with labels, PSMA2, SNRPD3, those I can see. The rest
I can't sort into 'my gene' versus 'their module' without clicking each one."

"The table underneath: id, module, log2FC, 'Sorted by log2FC'. PSMA2 2.98, SNRPD3 2.62. OK, the
table is where I'd actually read it. That's what I'd paste into Excel."

"But where are the runs? The recipe said PageRank, Louvain and degree. The table has module and
log2FC. No PageRank column, no Louvain community. The legend doesn't mention them. The Style stack
says 'Fold change color, recipe', 'Module color, recipe', 'Base style'. Did the runs happen? If
they happened, where's the number? This is the Bloom thing again -- computed somewhere, and I
can't see it."

"And Louvain, 'seed 7' -- I saw that in the 'What the recipe holds' panel, 'resolution 1, seed
7'. Good. If it's seeded I get the same groups as my colleague on the same network. That I can
say to my manager. But I only know that because I went digging in a panel that was for the
sender."

**Undo.** (Looks at the after-Undo frame.) "'Expression overlay is waiting for data. Files on
disk were not changed.' OK, so Undo throws my table out of the project, but the file's fine. I'd
rather it kept my table and just took the colours off, honestly. Now I have to add it again."

**The other branches.** "The one where my table has two fold change columns and it makes me pick,
and says 'Your table has no log2FC column. Ask the sender which column they meant.' That's right.
Don't guess for me."

"'None of the 96 genes matched' because the ids are Ensembl -- 'Match through a mapping table...'.
Fine, I'd know what a lookup table is, that's a VLOOKUP."

"The older network one, 'Module: Not bound', 'Confidence: Not bound'. 'Bound'. That's developer
talk. I'd read it as 'missing'. And 'Apply is one step; 2 parts stay off until you bind them' --
bind them how? Oh, the dropdown. OK."

**The Recipes menu, other page.** "File, Recipes -- there's an Apply recipe window with 'Recently
opened' and 'Open a recipe file...'. So next month I don't need the email, it's in the list.
Good. But this dialog says '2 attributes to bind, riskScore needs numbers' and the gene one said
'What the recipe reads from the data'. Two different ways of asking the same thing."

**The storyboard page.** "Why does this page tell me what I'm expected to say? 'What we expect
him to say: Thirty-six and forty-eight, that's eighty-four.' Well, it's eighty-five if you click
Use MDM2."

**Is it ready?** "It's ready, in the sense that my 84 -- or 85, I'm not sure -- genes are coloured
on their network, the 12 that didn't make it are listed, and I can undo it. I would tell you it's
ready with two asterisks: I don't know if the MDM2 fix stuck, and I don't know where the PageRank
and Louvain results went. If my colleague's point was the colours, done. If the point was the
analysis, I can't see the analysis."

## Single Ease Question

**5 out of 7.**

"Getting the file in was easy -- drop, add table, Apply, four clicks and I got the count before
anything changed. What took longest was working out whether I had to bring the network myself,
because the two versions of the start card disagree, and then hunting for the three runs the
recipe promised. And the 84 versus 85. If the count after Apply had matched what I clicked, it's a
6."

## Would he use this instead of his current tool?

"For this job -- someone hands me their method and I run it on my data -- yes, over what I do now,
which is get their notebook, fix their paths, run it, then redo the Gephi colours by hand. The
count check and the Excel-date catch are better than anything I've got. For my own weekly work,
not yet: I need the PageRank and community numbers in the table so I can check them against
NetworkX and export them, and I need to be able to tell my genes from their module colours
without squinting. Show me the run results in the table after Apply and I'd try it on next
month's supplier refresh."

## What the facilitator saw (not said by the participant)

- He decided to trust the flow at "96 rows" and "84 of 96", and kept adding the up and down
  counts at every screen. The count agreeing across dialog, notice and Statistics is what he is
  actually leaning on; the one mismatch (85 in the dialog after Use MDM2, 84 in the notice and
  Statistics) was the moment trust dropped.
- He took Use MDM2 as a typo fix without a pause. The case-mismatch row gave him no reason to
  think twice.
- He never opened Replace... on the sender's network, and never changed the "a higher number
  means" choice. He treated both as the colleague's business.
- He read "Weight: confidence, 10 communities" as a result that already existed, and set it
  against "9 modules" on the line above.
- He looked for the three runs in the table, the legend and the Style stack, in that order, and
  found them in none of them.
- He skimmed every paragraph on the storyboard and read only the quoted "expect him to say"
  lines, because they are in large italic.
