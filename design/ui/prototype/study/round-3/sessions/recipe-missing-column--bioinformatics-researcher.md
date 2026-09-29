# Session: a colleague's recipe on my data, one column short -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational research institute with a pharma partner
(persona: study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Task as given by the moderator, and nothing more:
"A colleague sent you their analysis recipe. Apply it to your own data; your table does not have
one of the columns it needs."

Screens used, in order: the "Replace data, apply a recipe" mock (a fraud team's transfers project,
states with the main menu, the Apply recipe dialog and its binding step, and the recipe applied),
then the "Apply a recipe: what matched" mock (a protein network with a qPCR table: everything
matched, 12 genes did not match, the column chosen, nothing matched, the confidence question).
Both seen as the study view renders them (design notes hidden):
- shots/screens__replace-and-recipe--study.png
- shots/screens__binding-step--study.png

Her own data for this session, as she described it at the start: a DE table from limma with
columns `symbol`, `logFC`, `AveExpr`, `t`, `P.Value`, `adj.P.Val`. The colleague's recipe wants
`log2FoldChange` (DESeq2's name), so the column is "missing" by name.

---

## Part 1: the first mock -- somebody else's project

**[Main menu open, File submenu: Open, Add data, Add as another graph, Join, Replace data, ...]**

"OK, this is... transfers? Mule rings? This is not my world. Fine, I'll treat it as a stand-in.
I'm looking for where a recipe goes in. File has Open, Add data, Join, Replace data... no 'Apply
recipe' under File. There's a Recipes item in the top menu, one level up. I'd hover that. I can't
see what's in it from here, so I'll assume 'Apply recipe' is in there.

Side note -- 'Replace data, 1 slow result will wait for Re-run' on a menu item. I like that it
tells me before I click. Cytoscape would just go and do it."

**[Apply recipe dialog: recipe list on the left, 'Mule ring triage' selected, What it carries, It
needs, a warning line, Continue to binding.]**

"Right, this is the dialog. Left side is a list -- 'In graphty: Overview', 'Recently opened', and
'Open a recipe file...'. My colleague emailed me a file, so it's 'Open a recipe file...'. Good,
that's where I'd expect it.

What it carries: sets, runs, style layers, a note. Checkboxes, so I can leave bits out. Fine.

'It needs: amount (numbers, weight: flow); timestamp (date and time); riskScore (numbers);
counterparty_bank (categories).' Then: '2 of the 4 are not in this graph by name: riskScore,
counterparty_bank. The next step asks how to read them.'

That's the right thing to say up front. It told me which two, by name, before anything changed.
That is exactly the stringApp 'null' complaint answered. 

The footer: '1 run of a few minutes arrives Not run; the rest run at once.' I had to read that
three times. I think it means one of the runs is slow and won't be started for me. Say that.
'arrives Not run' is not English.

'Continue to binding.' Binding. Hm. I'd have said 'map columns'. I'll click it anyway, it's the
only blue button."

**[Binding step: '2 attributes to bind'. riskScore -> risk_score, 'matched by hand';
counterparty_bank -> 'Leave unbound', 'no attribute fits'.]**

"'Attributes'. OK, columns. riskScore is pointed at risk_score and it says 'matched by hand'. By
whose hand? I didn't do anything -- or in this story the analyst did. If the tool guessed that, it
should say 'suggested', not 'by hand'. I'd want to know that a human decided it.

counterparty_bank: 'Leave unbound', 'no attribute fits'. And underneath: 'Left unbound, Pass-through
edges (style layer) is kept and switched off, marked missing attribute.' So the piece of the recipe
that needs the missing column stays in, switched off, flagged. Not silently dropped. That's the
behaviour I want. What I'd do in my case is open that dropdown and look for my logFC. I can't tell
from this picture what's in the list -- are those only the columns in the graph, or can I point it
at a column in a table I haven't loaded yet? If my column is in a second file, where do I add it?
There's no 'add a table' on this screen.

The watchlist bit, '7 of 9 accounts found', listing the two not found. Good. That's the same thing
I want for genes."

**[Recipe applied: toast 'Mule ring triage applied: recipe; 1 missing attribute', Undo. Styles
list shows 'Pass-through ... recipe new' with an eye-off icon; right panel shows 'missing
attribute' with 'Bind...' and 'From the recipe Mule ring triage, applied today 09:31'.]**

"Undo in the toast, one step. Good. The switched-off layer is in the list with a crossed-out eye
and on the right it says 'missing attribute -- Bind...'. So I can fix it later, from the layer
itself. And it records where it came from and when. That's provenance. I'd want the recipe
version in there too, not just the name.

The colour field outlined in red with 'counterparty_bank' in it. Fine, that's the broken bit."

## Part 2: the second mock -- this one is my world

**[Apply recipe, state 1: 'Expression overlay', version 1. Brings 2 styles, 1 filter, 1 run. You
supply a network with a gene column. What it adds: Fold change colors (blue below 0, red above),
Module colors, Confidence filter (0.7 and above), Communities run (Louvain, weighted by
confidence). What it reads: a table of Need / Your column / On your data / Used by.]**

"Now we're talking. Blue below zero, red above. Thank you for not doing red-green.

'Confidence filter: interactions at 0.7 and above.' 0.7 of what? STRING combined score is 0-1000 in
the TSV and 0-1 in the app. And which STRING version? If the recipe doesn't carry that, my
colleague's 0.7 and my 0.7 might not be the same network. I'd want the recipe to say 'STRING v12,
combined score >= 0.7' or at least 'as a fraction of 1'.

'Louvain, weighted by confidence.' Resolution? Seed? Louvain gives you a different partition every
time without a seed. If my colleague's module 3 is interferon and mine comes out as module 7, we
can't compare. I'd need that in the recipe.

And Module: '9 modules'. Weight: '10 communities'. So the file already has a module column with 9,
and the Louvain run gives 10. Which one gets coloured? 'Module colors' reads 'module', so the 9. Then
what's the Louvain run for? I'd ask my colleague. That's probably fine, but it's the sort of thing
that ends up in a figure legend wrong.

The weight row: 'For confidence, a higher number means [a closer or stronger link, similarity],
the recipe's answer.' Yes. That's a real question and it's asked once. Most tools just assume.

Now the thing that bothers me. 'Reads from ppi-core-300.graphml, opened by this recipe.' The
recipe opened my colleague's network. I don't want my colleague's network, I want MY network. My
task is apply it to my data. Where do I swap the network? There's 'Add a table...' but nothing on
the network line. In the next state there's a 'Change...' next to the table, but not next to the
graphml. So if I already have my STRING network open, does the recipe replace it with hers, or
land on mine? I genuinely can't tell."

**[State 2: 'Data files: ppi-core-300.graphml; qpcr-hits-2026-09.csv, 96 rows: symbol, log2FC,
padj'. '84 of 96 genes matched'. 12 did not match: Mdm2 differs only in letter case -> 'Use MDM2';
11 not in network, 7-Sep and 2-Mar flagged 'date?'; a callout about spreadsheet dates; 'Copy the
12 symbols'. 'Needs a choice (1): Fold change -- Choose a column -- 2 columns fit: log2FC, in the
table: 84 matched values, -2.41 to 2.98; log2FoldChange, in the network file: 300 values, -2.52 to
3.15'. Apply greyed; footer 'Choose the fold-change column to apply.']**

"OK. This is my case. The recipe wanted log2FoldChange, my table calls it log2FC -- in my real one
it's logFC -- so it didn't match by name, and it's asking me. 'Choose a column. 2 columns fit.' And
it shows the range of each. -2.41 to 2.98, 84 values, in the table -- that's mine. The other one
is from the network file, 300 values. So I'd pick log2FC. Apply is greyed out until I pick, and the
footer tells me why. Good. No silent default.

One thing: it only offered columns that 'fit'. What if my column is there but it doesn't think it
fits -- say it's text because of an 'NA' string in row 40? I'd want to see all the columns, with
the reason the others don't fit. Otherwise I'll be staring at 'no attribute fits' like in the other
mock, and I'll know perfectly well my logFC is in there.

Now the gene list. 84 of 96. Twelve not matched, and it names every one. 'Copy the 12 symbols' --
yes, straight into R. 

'7-Sep date?' Ha. SEPT7. Excel. The gene-name-to-date thing is a whole published paper, and
the tool caught it. That is the first time a network tool has done that for me. But: 'Correct them
in your table and add it again.' Two things. First, SEPT7 isn't SEPT7 any more, HGNC renamed the
septins to SEPTIN7 a few years ago, so even if I fix the date, it might still not match the
network if the network uses current symbols. I'd like it to suggest 'SEPTIN7?' the way it suggests
MDM2. Second, why can't I fix it here, like I fix Mdm2?

Mdm2. 'Differs only in letter case from MDM2 -- Use MDM2'. Careful. Mdm2 is how you write the
MOUSE gene. If that row came from a mouse qPCR panel, then mapping it to human MDM2 is an orthology
call, not a typo fix. In this table it's probably a typo, one row out of 96. But if half my table
was in that case I'd want the tool to say 'these look like mouse symbols', not offer to uppercase
them one by one.

TP53BP1, GAPDH, ACTB not in the network -- sure, GAPDH and ACTB are the qPCR housekeeping genes,
they shouldn't be. Fine. 'They stay in the table and are not colored.' Good, stated."

**[State 3: '85 of 96 genes matched, 1 by hand'; Mdm2 'matched by hand to MDM2, Undo match';
Fold change 'log2FC, 36 up, 49 down; Blue below 0, red above, as the recipe draws it; -2.41 to
2.98'; Apply enabled; 'Apply is one step. One Undo takes all of it back.']**

"'1 by hand' -- here that's true, I clicked it. And there's an undo on that one match. 36 up, 49
down, that adds up to 85. I checked. Apply. One undo takes it back. I'd press Apply.

What I don't see: the padj column. The recipe colours by fold change only. Half of those 85 are
probably not significant. My colleague's recipe might be fine with that, I'm not. That's a recipe
choice, not the tool's fault -- but after applying I'd want to add a filter on padj < 0.05 and
save it as MY version of the recipe. I don't see where I'd save it back out. Probably somewhere
else."

**[State 4: table qpcr-hits-2026-09-ensembl.csv, 'None of the 96 genes matched', callout: values
look like a different kind of ID, ENSG00000170312 in the table vs CDK1 in the network. 'Match
through a mapping table...', 'Change table...'. Genes, to join: ensembl_id, 0 of 96 matched; Fold
change: Leave unbound, kept, switched off. Apply enabled: 'Apply adds the module colors, the filter
and the communities run now.']**

"This one is the real world. Half my collaborators send Ensembl. 'The table's values look like a
different kind of ID' -- and it shows me an example of each side. ENSG00000170312 against CDK1.
That's CDK1's Ensembl ID, as it happens, so yes, they would map. Good diagnosis.

'Match through a mapping table...' -- a mapping table I have to bring? I'd rather it offered to
map Ensembl to symbol itself, and told me which release it used. If I have to go to biomaRt, make
the table and come back, I'm doing it in R and then I don't need this dialog. At least it's
offered and it's not 'null'.

And Apply is blue. 'Apply adds the module colors, the filter and the communities run now.' So I
can apply the recipe with the fold-change part switched off. The footer says so honestly. I would
not do that -- the whole point of an 'Expression overlay' is the expression -- but I understand it's
the same 'kept, switched off' as the fraud one and I can bind it later. I'd prefer the footer to
say 'Fold change colors will be off until you bind a column' in plain words, not just list what
gets added."

**[Confidence question, standalone: 'For confidence, a higher number means...' menu: a closer or
stronger link (similarity; the recipe's answer), a longer or costlier step (distance; your answer
on this network), more can pass through (capacity), Don't use confidence. Then 'Don't use
confidence' chosen: 'confidence: numbers, not used', footer 'the communities run waits for an
answer.']**

"'a longer or costlier step -- your answer on this network'. So my network already says higher
confidence is a distance? That would be wrong for STRING; higher score is a stronger interaction.
If a postdoc set that wrong six months ago, this is where I'd catch it, because it shows both
answers side by side. That's useful. I'd pick the recipe's answer.

'Matching 96 genes against 300 proteins...' with a progress bar. For 96 genes that should be
instant. For 15,000 I'd want to know how long."

## Part 3: after the task

**Moderator: Single Ease Question, 1 to 7?**

"Five. The part that's actually about my missing column -- 'choose a column, here are the two that
fit, with their ranges', Apply greyed until I choose -- that's a four-second job and I'd have done
it without thinking. The gene matching report is better than anything Cytoscape gives me. What
cost me the points: the network being opened by the recipe with no visible way to put it on my
own network, 'binding' and 'attributes' as words, the footer sentence I couldn't parse, and not
knowing what the 'Leave unbound' list contains when my column doesn't 'fit'."

**Moderator: would you use this instead of your current tool?**

"For this step -- taking someone's styling and analysis and putting it on my data -- yes, over
Cytoscape, where the equivalent is importing a style XML and then re-doing every mapping by hand
because the column names differ. The unmatched-gene list with the Excel-date catch alone would save
my students an afternoon a month.

Instead of R? No. Not until the recipe says the STRING version, the confidence scale and the
Louvain seed and resolution, and not until I can run the same recipe from a script and get the
node table back as a TSV. Right now it's a very good way to make my colleague's figure out of my
data. It isn't yet a way to reproduce my colleague's analysis. Those are different things, and a
reviewer will know the difference."
