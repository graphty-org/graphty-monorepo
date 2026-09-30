# Session: "A black-and-white figure of the fold changes, and which genes went up the most" -- Jordan, marketing network analyst

Participant: Jordan, marketing network analyst (persona: study/personas/marketing-analyst.md).
Company MacBook on the 27-inch monitor, Chrome, 1440 by 900, zoom 100 percent.

This task is outside her field. She has never worked with gene data; she was told only that the
project is already open and the numbers she needs are in it. That is deliberate: it tests whether
the screens carry a stranger to the answer without the domain knowledge.

Screens used: the open "Stress response study" project with the 300-protein network
(ppi-core-300), the Styles list with its Look menu and the Hub labels layer open, color by value
(choosing an attribute, then the numbers settings), the Export dialog with Figure (.svg) checked
in the Screen look and in the Print look, the Data panel with the node table sorted by the size of
the change (the dialog's "ways in" state), the done state after export, the table dock as it
appears on the navigation screen (a different dataset), the Export dialog's table preview (also a
different dataset), and the export flow page.

Renders she looked at: shots/record/r4-jordan-grayfig-styles.png, shots/record/r4-jordan-grayfig-styles-looks.png,
shots/record/r4-jordan-grayfig-styles-top-n.png, shots/record/r4-jordan-grayfig-cbv-choose.png,
shots/record/r4-jordan-grayfig-cbv-numbers.png, shots/record/r4-jordan-grayfig-export-figure.png,
shots/record/r4-jordan-grayfig-export-grey.png, shots/record/r4-jordan-grayfig-export-first.png,
shots/record/r4-jordan-grayfig-export-ways-in.png, shots/record/r4-jordan-grayfig-export-done.png,
shots/record/r4-jordan-grayfig-export-table.png, shots/record/r4-jordan-grayfig-table.png,
shots/record/r4-jordan-grayfig-table-ppi.png, shots/record/r4-jordan-grayfig-flow-export-full.png.

Moderator's task, as given: "Make a black-and-white figure of the fold changes for a journal that
prints in gray, and tell me which genes went up the most."

## Transcript (thinking aloud)

**First look.** "OK, full disclosure, I don't do genes. Fold change -- that's, like, how much
something went up or down, right? Times two, times three. Fine. It's a lift number. I can work
with a lift number."

"Stress response study. 300 nodes. The graph is all brown -- orange to dark brown. Legend bottom
left says 'Color: betweenness'. That's my bridge score, I know that one. But the task says fold
changes, and nothing on this screen is colored by fold change. So first I have to change the
color."

"Left side: 'Nothing has been sent from this project.' OK, good, I like that it just says it. Not
my customer data today anyway, but I noticed it."

"Sets and paths: 'Down in stress, rule, 148'. Huh. So somebody already made a group of the ones
that went down. Is there an 'up in stress'? No. Only down. Weird. If there were an 'Up in stress'
I would just click it and be done with half the question."

**Changing the color.** "Right side, Style stack. Rows: Betweenness color, Hub labels, Size:
degree, Base style. There's a plus. In Gephi I'd go to Appearance, Nodes, Ranking. Here -- I
click the Betweenness color row, it opens a card on the left. Fill, Color, a gray swatch. I click
the swatch."

"'Color: apply a color or a value.' Palette colors, then 'From the data: log2FoldChange, numbers,
-2.52 to 3.15'. log2. Ugh. That's the fold change, I guess, with log on it. So 3.15 is the most it
went up and -2.52 the most it went down? I'll assume negative is down. I pick it."

"Now it says 'log2FoldChange as color'. Scale linear, palette 'diverging, Red to blue', midpoint 0.
Little histogram. 'The palest color sits at 0. Below 0 is red, above is blue.' Honestly that
matches my brain -- red is bad, red is down. Fine."

"The legend on the canvas: 'Below 0, 148. Above 0, 152.' OK, 148 below -- that matches the 'Down
in stress 148' set on the left. Good, two numbers that agree. I actually check that stuff."

"There's 'Fix at current value' at the top of the settings card. No idea what that does and I'm
not clicking it. Sounds like it bakes something in."

**Black and white.** "Now gray. I print decks in grayscale all the time, and red versus blue both
go to the same mush -- I've been burned by that. There's a 'Look: Screen' dropdown next to Style
stack. I open it. Screen, Print, High contrast. Print: 'Reads in gray on white paper and for
color-blind readers. Where a color shows a direction, a shape shows it too.' That is literally my
problem. I like that it says it in normal words."

"'Colors you set by hand are kept.' Fine. I'd rather not switch the whole project, though, I just
want the file. Let me find export first and see if it does it there."

**Export.** "Where's export... there's no Export button on the Graph screen I can see. I go to the
hamburger, or -- the Data tab has an 'Export...' button up top. That works. In Gephi it's File,
Export, SVG/PDF/PNG, so this is roughly where I'd expect it."

"Big dialog. Figures: Figure (.svg), checked. 'Vector, with real text. For a paper or slides.'
Good -- slides is me. Width 174 mm, two columns. I don't know what the journal wants, the
moderator didn't say. 'Also: 85 mm, one column; 254 mm, a slide.' Nice that it tells me the slide
size, I'd use that for my own stuff."

"Preview shows the colored version, and under it a yellow warning: 'Values just above and below 0
print as the same gray.' And a button, 'Use Print look'. That's exactly the thing I would have
found out after the printer. I click it."

"Now there are two pictures: 'The file, as written' and 'Printed in gray, the same file'.
Triangles up, triangles down, little circles. Legend: 'up: +0.25 to +3.15, 133. down: -0.25 to
-2.52, 120. no change: within 0.25 of 0, 47.' And a check mark: 'Increases and decreases stay
apart in gray.'"

"OK, that's really good. The gray one is readable. Up triangles, down triangles. I would put this
in a deck. My VP would not ask what purple means, because there's no purple."

"But hang on. Wait. Two minutes ago the legend said 148 below and 152 above. Now it says 120 down
and 133 up and 47 no change. Which one goes in the report? I didn't set any 0.25. Where did 0.25
come from? It's in the methods text too: 'no change within 0.25 of 0'. I didn't choose that. If a
reviewer asks why 0.25 I have no answer. This is the thing that kills me with Talkwalker -- the
dashboard says one number, the download says another. Here I can at least see why they differ,
but I didn't pick the rule."

"Also -- 'Shown at 76% of print size'. The legend text in the preview is tiny. I'm squinting. I'd
zoom the browser."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good. Export 2 files. The done
state: toast, 'Exported stress-response-study_figure.svg and its methods file, in the Print
look.' And it's listed under 'Sent and saved' on the left. OK. And the canvas stayed in Screen,
so I didn't wreck the project. Fine."

**Which genes went up the most.** "Now the second half. The figure labels ten names: MAPK10,
E2F1, MAPK2, NDUFS5, SNRNP70, RPS6, WRN, CHEK1. That's eight. The Labels row says 'Top N by this
layer's value, 10, by |log2 fold change|'. The bars mean absolute, right? So it's the ten biggest
moves, up OR down. That's not what was asked. I was asked which went UP."

"'2 labels hidden to avoid overlap: show list'. I open it: MRE11 +2.35, RPL17 -2.25. So RPL17 went
down and MRE11 went up. OK so the list mixes. Can I make it only the ups? 'Also: Above a
threshold' -- maybe I could say above 2? I'd try that. But that's for labels on the picture, not
an answer."

"In the gray figure the up triangles are darker the bigger they are. So in theory I read the
darkest up-triangles. No. I'm not reading a ranked list off a dot picture, that's the whole
reason I hate the hairball."

"I want a table. Sort descending, top ten, copy. Where is the table on this project? The other
screen I was shown had a table at the bottom -- but that's Les Miserables, Valjean and Gavroche.
Not my genes. There is an 'Export table as CSV...' link there. For this project I don't see a
table dock at all on the Graph screen."

"On the Data tab, though -- there it is. A table under the map: 'Full graph: 300 nodes. Sorted by
|log2FoldChange|.' CHEK1 3.15, WRN 2.61, SNRNP70 2.58, RPS6 -2.52, MAPK10 -2.42. Again the bars --
sorted by size, not direction. So RPS6 and MAPK10 are in there but they went down. I'd click the
column header to sort by the real value, highest first. I assume that works, every table works
like that. I can't see it here though. I only see five rows."

"So from what I can see: CHEK1, up 3.15 -- that's, what, log2, so about eight or nine times?
Then WRN 2.61, SNRNP70 2.58, then MRE11 2.35 from the hidden-label list. After that I don't know;
I'd need to scroll the table."

"How did the table get sorted by the absolute thing? I didn't do that. Somebody did it before me.
If it were sorted plain descending I'd have my answer in one glance."

"When I tried the Export dialog's table option, the preview showed accounts -- ACC-233575, risk
scores, 'Mule ring suspects'. That's a different project entirely. I'm confused about whether I
clicked the wrong thing. In a real session I'd close it and start over."

**Scale and drift.** "Would this figure survive two million nodes? I mean, as a figure, no -- it's
a hairball by then no matter what. That's not a fair ask. Skip."

"The real annoyance here is my VP only reads the first slide, so this figure goes on slide one
with the title 'Genes that went up' and three names in 40-point font. The triangles are for the
appendix. Nobody reads the appendix."

"And honestly, the gray print thing -- I've been screen-shotting Gephi and pasting a legend in
PowerPoint for years. This writes the legend into the file. That alone saves me ten minutes a
deck."

## Answer given to the moderator

"The figure: exported, Print look, triangles for up and down, gray-safe, legend and a methods
file with it. The genes that went up the most, from what I could see: CHEK1 (+3.15), WRN (+2.61),
SNRNP70 (+2.58), MRE11 (+2.35). I'm fairly confident of the first three because they were in the
sorted table with numbers. MRE11 I only got from the hidden-labels list. I can't tell you the
fifth one without scrolling. Also -- the figure says 133 up, the canvas said 152 up, and the
difference is a 0.25 cut-off I didn't choose, so ask the biologist whether 0.25 is right."

## Single Ease Question

**4 of 7.** "The black-and-white part was a 6 -- it warned me before I printed, one button fixed
it, and it showed me the gray version side by side. That's the best I've seen for that. The 'which
went up' part was a 2 -- everything is sorted by the absolute size, so up and down are mixed, the
labels are mixed, and I had to assemble the answer from a table I found by accident and a hidden
list. And the counts changed between screens because of a threshold I never set."

## Would she use this instead of her current tool?

"For the figure, yes -- instead of Gephi plus a PowerPoint legend. The gray check and the legend
in the file are real time savers, and 'nothing is uploaded' means I don't need legal. For the
ranked list, no, not yet: I'd still export to CSV and sort in Excel, because the table here
wanted to sort by the absolute value and I couldn't see a plain 'highest first' on this project.
If the table under the map sorted by the real number when I clicked the header, it'd be a yes for
both."

## Observations for the study team (moderator's notes)

1. The Print look's no-change band (0.25) appeared without the participant setting it, and it
   changed the headline counts (152 up on the canvas; 133 up in the figure). She read the mismatch
   as the dashboard-versus-download problem she distrusts in her listening suite. Where the band
   comes from, and who set it, is not stated at the point she sees the new counts.
2. "Top N by |log2 fold change|" and the table sorted by |log2FoldChange| both answer "biggest
   change", not "went up the most". She understood the bars as absolute value and correctly
   noticed down-regulated genes mixed in, but had no visible way to get "top N, highest first" for
   labels, and did not see a signed sort for the table on this project.
3. The sets list had "Down in stress" but no "Up in stress"; she looked for the mirror first.
4. No table dock was visible on the Graph screen for this project; she found the sorted table only
   on the Data tab. The table-dock and table-export screens she was shown used other datasets
   (Les Miserables, a mule-ring case), which confused her.
5. The gray preview is shown at 76 percent of print size and its legend text was hard to read at
   laptop width.
6. Strongest positive: the gray warning before export, the one-click Print look, and the side-by-
   side "as written / printed in gray" preview. She said this saves her the PowerPoint legend step.
