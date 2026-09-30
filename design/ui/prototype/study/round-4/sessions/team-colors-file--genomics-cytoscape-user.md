# Team colors from a mailed file -- Maren, genomics postdoc (Cytoscape user)

**Participant:** Maren, fourth-year cancer genomics postdoc, the lab's de facto bioinformatician.
DESeq2 in R, STRING and Cytoscape for network figures, follows the lab's written protocol closely.
Plays on a 14-inch laptop, Chrome.

**Task as given by the moderator:** "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like the
team's."

**Screens seen:** the navigation before/after page (glanced), a project with a style file dropped on
the canvas, the style file's binding step and result, the Apply recipe picker and its result, the
Data panel (Recipes applied, Style files), the "recipe waiting for data" start, the recipe's gene
matching step and result, and the color picker's Libraries tab.

Renders the participant looked at (all 1440 x 900, study view):
- `../../../shots/screens__navigation.png`, `../../../shots/screens__data-panel.png`,
  `../../../shots/screens__data-panel-s6.png`
- `../../../shots/record/r4-maren-teamcolors-replace-and-recipe--s-style-drop.png`
- `../../../shots/record/r4-maren-teamcolors-replace-and-recipe--s-bind-style.png`
- `../../../shots/record/r4-maren-teamcolors-replace-and-recipe--s-style-applied.png`
- `../../../shots/record/r4-maren-teamcolors-replace-and-recipe--s-recipe-pick.png`
- `../../../shots/record/r4-maren-teamcolors-replace-and-recipe--s-recipe-applied.png`
- `../../../shots/record/r4-maren-teamcolors-recipe-apply--start.png`,
  `../../../shots/record/r4-maren-teamcolors-recipe-apply--binding.png`,
  `../../../shots/record/r4-maren-teamcolors-recipe-apply--confirmed.png`,
  `../../../shots/record/r4-maren-teamcolors-recipe-apply--applied.png`,
  `../../../shots/record/r4-maren-teamcolors-recipe-apply--unbound.png`
- `../../../shots/record/r4-maren-teamcolors-styles-list--libraries.png`,
  `../../../shots/record/r4-maren-teamcolors-styles-list--result.png`

## Think-aloud

**Before anything.** "OK. In Cytoscape this is File, Import, Styles from File, you pick the .xml,
and then it's in the Style dropdown and you choose it. Two minutes. The lab has one, 'Lab_DE_v3',
and honestly half the time it breaks something on a new network anyway because the column names
changed. So let's see."

"The attachment -- I don't even know what kind of file it is. My colleague just said 'here's the
style'. Let me look for something called Style first."

**Navigation page, glancing at the app.** "Left side: Graph, Data, Notes, Assistant 'Off. Nothing
is sent.' Fine. No 'Style' anywhere on the left. Right side has 'Style stack' with a plus." *Reads
the plus in the HTML: "Add a style layer".* "A layer. I don't know what a layer is here. I want to
load a style, not add a layer. I'm not clicking that, it sounds like it'll make me build one by
hand."

"What I actually do with any file is drag it in. Let me just drop it on the network."

**File dropped on the canvas (Dropped file dialog).** "OK, it recognized it. 'fraud-team-colors:
style file. 4 layers, bound by attribute name.' Fine -- so it's a style file. Good that it says
what it is before it does anything."

"Two choices. 'Apply style file on top. Adds 4 style layers above the 9 already here; those stay.'
And 'Replace style stack with style file. The 9 style layers here are removed; the file's 4
remain.'"

"Nine? I'm looking at the right side and I count four: Risk color, Size by PageRank, Mule ring,
Base style. Where are the other five? That's the kind of number that makes me stop. If it's
counting things I can't see, what is it going to remove?"

"What I want, literally, is 'make it look like the team's'. That's Replace. In Cytoscape you switch
the style, the old one is still in the list. Here 'removed'... removed where? Is my fold-change
coloring gone forever or can I get it back? It says 'Either is one undo step' at the bottom, OK, so
undo. I still don't love a button that deletes nine things when I can see four."

"I'll do 'on top' -- it's highlighted, it says Enter, and 'those stay' is the safer word. If it
looks wrong I'll figure out Replace later."

**Binding step, Chargeback heat.** "'1 layer to bind. 3 layers matched by name: Cleared accounts,
Merchant hubs, Amount width.' Good -- it tells me which matched. That's the thing Cytoscape never
tells you. 'Chargeback heat reads chargeback_rate, numbers. Leave unbound. No attribute fits.'"

"Fine, my network doesn't have that column, so leave it off. At least it says it's kept and
switched off instead of just silently doing nothing. That's the right behaviour. Apply."

*Moderator note: the project in these frames is a payments network; she noticed.* "These are bank
transfers, by the way, not genes. I'll pretend."

**Style file applied.** "Toast: 'fraud-team-colors applied: style; 1 missing attribute. Undo.'
Right side now: Cleared accounts, Merchant hubs, Amount width, all 'new', Chargeback greyed with a
warning, then Watchlist ring and Risk ramp from a recipe, '6 more'."

"Now look at the network. Grey hexagons and the same orange dots as before. The new layer at the
top is green, the next is yellow. I don't see green or yellow anywhere. The legend down in the
corner still just says 'Flagged, yes 14, no 3,079' -- same as before I applied it."

"So did it do anything? The list says it did. The picture says it didn't. If this were my figure I
would not know if I was looking at the team's colors or mine. In Cytoscape at least the whole
network visibly changes when you switch the style, and the legend -- well, there's no legend in
Cytoscape, but that's a different complaint."

"And six more layers hidden under 'more'. Four plus 'six more' is ten, the dialog said nine plus
four is thirteen. I've stopped trying to make these add up."

**Looking for where the file lives now -- Data panel.** "Maybe there's a list of what I loaded.
Data... 'Sources', 'Versions', then 'Recipes applied' with a plus and 'Style files' with a plus.
So a style file is a thing it keeps. Good, I can see what was loaded."

"But now there are two kinds of file. Recipe and style file. My colleague said 'the style'. How am
I supposed to know which one she sent? If she'd sent a recipe, would dropping it do the same
thing? Would the Style files plus refuse it?" *Looks at the "Community overview, Applied Apr 2"
row.* "That's a recipe. What's the difference from a style file? I'd have to ask her, and she won't
know either."

**The recipe path -- Recipes, Apply recipe.** "There's a Recipes menu. 'Apply recipe' shows 'Mule
ring triage: 3 sets, 2 runs, 3 style layers, 1 note.' Runs? Sets? That's not a style, that's
somebody's whole analysis. If I wanted the team's colors I would not tick 'Personalized PageRank'.
I'd untick everything except the style layers -- at least the checkboxes let me."

"Recipe applied: now there are 'new' sets on the left, Watchlist with a warning, and the right side
is a layer called Pass-through edges asking me to bind counterparty_bank. Network still looks the
same. OK."

**Recipe opened on its own -- the gene version.** *Moderator shows the "recipe waiting for data"
start page.* "Oh, this one I understand. 'Expression overlay. Colors your genes by log2 fold
change, red for up and blue for down, draws the other proteins in muted module colors, and hides
interactions with confidence under 0.7. It carries no data.' That's exactly the lab style, in one
sentence. Red-blue, not red-green -- good, my PI can read that."

"'Saved by Maren on Sep 26.' ...Me? I didn't save this, my colleague did. Unless it just puts
whoever opens it. Odd."

"'Data stays on this computer.' Good, I'm not uploading unpublished data anywhere."

"Wait, though: 'hides interactions with confidence under 0.7'. That's not a color. That changes the
network. The team style in Cytoscape doesn't filter my edges -- the cutoff is something I pick in
STRING and write in the methods. If this quietly takes my 0.4 network and makes it 0.7, my methods
paragraph is wrong. At least it says it in the description. I'd want that to be a separate
checkbox."

"And the task said colors and sizes. This says colors. No sizes anywhere. Is node size in here or
not?"

**Apply recipe: gene matching step.** "Now THIS. '84 of 96 genes matched. 12 did not match. They
stay in the table and are not colored.' And the list. That's the number I always want and
Cytoscape never gives me."

"'7-Sep: not in this network; looks like a spreadsheet date.' Ha. Yes. That's SEPT7, Excel ate it,
it's SEPTIN7 now. It noticed! ... But it doesn't offer to fix it. Mdm2 gets a 'Use MDM2' button,
the dates get nothing. The dates are the ones I actually lose. So I still have to go back to the
CSV, fix it, and reload. Better than not knowing, but it stops one step short."

"'Copy the 12 ids.' Useful, for the supplementary table."

"'Fold change, for color: Choose a column. Two columns could be the fold change.' log2FoldChange in
the network file, log2FC in my table. I'd take the table -- that's my DESeq2 output, the network
one is whatever STRING put there. 'Then: how should it be read? Below 0 is down, above 0 is up' --
yes, obviously. '36 up, 48 down, -2.41 to 2.98.' 36 plus 48 is 84. Good, that adds up."

"Apply is greyed until I pick. Fine. That's the right way round."

**Recipe applied, gene version.** "There it is. Red and blue on the genes, the rest in pale module
colors. Legend on the canvas: 'Fold change color, log2FC, 84 genes, -2.41 down, 0, 2.98 up.' There's
a zero in the middle of the legend. Is the white actually at zero or is it just a label under the
middle? The scale isn't symmetric, -2.41 to 2.98, so the middle of the bar isn't zero... the 0 is
drawn a bit left of centre. OK, I think it's centred on zero. I'd check one node near zero before
trusting it."

"Filtered: 1,059 of 1,262 edges -- there's my 0.7. It's in the chip at the top-left, at least, so
it's not hidden."

"Toast: '84 of 96 genes matched. Show the 12.' Good. That's twice it's told me."

"Style stack: Fold change color, recipe; Module color, recipe; Base style. Three rows, and I can see
all three in the picture. This one I believe."

**Branch where the network has no module column.** "'Module color: Not bound. No category per
protein. Left unbound, kept and switched off.' Fine, same as the style file. Consistent."

**Color picker, Libraries tab.** *Moderator shows the styles list with a protein selected.* "Where
did the file's layers go afterwards? Under the color picker, 'Libraries': palettes, then 'Style
layers from stress-response.graphty-style' and 'from the recipe Protein triage'. So the file's
pieces are in here too."

"I would never have looked there. I click a color picker to pick a color. I wouldn't expect my
colleague's attachment to be hiding inside it. And 'Okabe-Ito'? Is that a person?"

## Where she ended

She got the team's look onto the gene network through the recipe path and was satisfied with that
result. On the style-file path she applied the file but could not tell from the picture or the
legend that anything had changed, and never resolved whether "on top" or "Replace" was the right
choice. She never found out whether her colleague's file was a recipe or a style file, and would
have to ask.

## Single Ease Question

**4 out of 7.** "The gene one, the Expression overlay, I'd give a 6 -- it counted my genes, told me
about the dates, made me pick the fold-change column instead of guessing. The style file one is a 2:
it said 'applied' and my network looked exactly the same, and it counted nine layers when I could
see four. And I had to figure out which of two kinds of file I had. Average it out, 4."

## Would she use this instead of Cytoscape?

"For this job -- putting the lab's colors on a new network -- the gene matching alone is better than
what I have. In Cytoscape the style applies and then you find out a week later half the nodes are
grey because the key column didn't match. Here it tells me 84 of 96 before it does anything. That's
real."

"But no, I wouldn't switch. The lab protocol says Cytoscape, the style file we share is a Cytoscape
.xml, and everybody in the lab has that one. If I make a graphty style, nobody else can open it
unless they switch too. And the figure still has to look like what reviewers recognise. Maybe I'd
use it to check which genes matched and then go do the figure in Cytoscape. Which is a bit silly,
but that's honestly what I'd do."

"And fix the thing where it quietly filters my edges when I only asked for colors. A 'style' that
changes the confidence cutoff is going to end up in someone's methods section wrong."

## Observations (moderator)

Numbered by severity, highest first.

1. **The style file applied and the picture did not visibly change** (style-file result frame). Three
   new layers sit at the top of the style stack, but no green or yellow appears on the canvas and the
   canvas legend still shows only "Flagged". The participant concluded "the list says it did, the
   picture says it didn't" and could not tell whose colors she was looking at. Severity: high.
2. **The layer count in the drop dialog does not match the visible stack.** The dialog says "the 9
   already here" and "The 9 style layers here are removed"; the stack beside it shows 4 rows. After
   applying, 6 rows plus "6 more" does not equal 9 + 4. She stopped trusting the counts and hesitated
   over Replace because it would remove things she could not see. Severity: high (her rule: one
   number she cannot reconcile ends trust).
3. **Recipe versus style file is not explained where she has to choose.** Data has "Recipes applied"
   and "Style files" as two sections; the mailed file could be either; nothing tells her which one "the
   team's colors" is, or whether dropping a recipe works the same way. Severity: medium.
4. **A recipe described as a look also filters the network** ("hides interactions with confidence
   under 0.7"). She reads the confidence cutoff as a methods decision, not a style, and wanted it as a
   separate choice at apply time. The Apply recipe dialog for the gene recipe has no checkbox for it,
   although the fraud recipe picker does have per-part checkboxes. Severity: medium.
5. **Spreadsheet-date gene names are diagnosed but not fixed.** "7-Sep ... looks like a spreadsheet
   date" has no fix button, while "Mdm2" gets "Use MDM2". The Excel-damaged names are the ones she
   actually loses. Severity: medium.
6. **"Sizes" in the task, none in the gene recipe.** The Expression overlay description names colors
   and a filter but no size; she could not tell whether sizes were part of it. Severity: low.
7. **The file's layers turn up under the color picker's Libraries tab**, where she would never look
   for an attachment. She found it only when shown. Severity: low for this task.
8. **The recipe says "Saved by Maren"** while she was told a colleague sent it; she found her own name
   there confusing. Severity: low (an artefact of the mock's cast, but the author line is the only
   place that says whose file it is).
9. **"Add a style layer" on the style stack's "+"** read to her as "build one by hand", so the stack
   was not where she looked for "load a style". Dropping the file was her first instinct and it
   worked. Severity: low.

Things that worked for her: dropping the file was recognised and named before anything changed; the
binding step named which layers matched and which did not; an unbound layer is kept, off and flagged
rather than silently ignored; "84 of 96 genes matched" with the 12 listed and reasons; choosing
between two fold-change columns instead of a guess; the red-blue scale with 0 on the legend; the
filtered-edges chip at the top left; one Undo for the whole apply.
