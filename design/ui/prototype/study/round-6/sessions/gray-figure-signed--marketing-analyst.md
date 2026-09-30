# Session: "A black-and-white figure of the fold changes, and which genes went up the most" -- Jordan, marketing network analyst

Participant: Jordan, marketing network analyst (persona: study/personas/marketing-analyst.md).
Company MacBook on the 27-inch monitor, Chrome, 1440 by 900, zoom 100 percent.

Task as given: "Make a black-and-white figure of the fold changes for a journal that prints in
gray, and tell me which genes went up the most."

This task is outside her field: she has never worked with gene data. She did the same task on
earlier versions of these screens, so she arrives with expectations: last time the gray check was
good, the "which went up" part was not, and two screens gave two different counts.

Screens used, all rendered as a participant sees them (design notes hidden): the "Stress response
study" project with its 300-protein network, the Styles list (at rest, the Look menu, the Hub
labels layer), color by value (choosing an attribute, then the numbers settings), the Export
dialog (Figure checked in the Screen look, then in the Print look with the hidden-label list
open), the Data panel with its node table (the Export dialog's "ways in" state), the done state
after export, the table dock and its column-header menu, and the inspector showing a result.

Renders: shots/record/r6-jordan-gfs-styles-list.png, shots/record/r6-jordan-gfs-styles-list-looks.png,
shots/record/r6-jordan-gfs-styles-list-top-n.png, shots/record/r6-jordan-gfs-colour-by-value-choose.png,
shots/record/r6-jordan-gfs-colour-by-value-numbers.png, shots/record/r6-jordan-gfs-export-dialog-figure.png,
shots/record/r6-jordan-gfs-export-dialog-figure-grey.png, shots/record/r6-jordan-gfs-export-dialog-ways-in.png,
shots/record/r6-jordan-gfs-export-dialog-done.png, shots/record/r6-jordan-gfs-table-dock.png,
shots/record/r6-jordan-gfs-table-dock-ranked.png, shots/record/r6-jordan-gfs-table-dock-header.png,
shots/record/r6-jordan-gfs-inspector-result.png.

---

## 1. The project as it opens

"OK, Stress response study, 300 nodes. It's colored orange-to-brown by betweenness right now, and
the labels are the top 12 by degree. That's not what I want -- the task says fold changes. On the
right I see an Attributes list with log2FoldChange, -2.52 to 3.15. That's my number. Negative is
down, positive is up, I remember that much from last time."

"Sets on the left: Hubs, TP53 neighbors, 'Down in stress', 148. Still no 'Up in stress'. I looked
for the mirror image last time too. If there was one I'd just click it and read the list. There
isn't, so I'll keep going."

## 2. Coloring by the fold change

"Fill, Color, and the picker lists 'log2FoldChange, numbers, -2.52 to 3.15' first under From the
data. Easy, that's the one." (colour-by-value, choose)

"Now it's red to blue, linear, midpoint 0. The note at the bottom says 'Below 0 is red, above is
blue: use Reverse for the opposite.' Fine -- red is down, that reads like a stock ticker to me.
The legend says 148 below 0 and 152 above. Remember those numbers, because last time the figure
said something different and I stopped trusting it." (colour-by-value, numbers)

"There's a Look dropdown up by the Style stack. Screen, Print, High contrast. Print says 'Reads in
gray on white paper and for color-blind readers. Where a color shows a direction, a shape shows it
too.' That's literally my task. But it says 'Look for the whole project' -- I don't want to wreck
my screen colors for the whole project just for one file. I'll leave it and see if the export
asks." (styles-list, looks)

## 3. Export: the Screen look first

"Export, Figure (.svg) is ticked. 174 mm, two columns -- I'd have to check the journal's column
width, but at least it tells me the other sizes. White background, legend beside, right. Labels:
'Top N by this layer's value', 10, 'by |log2 fold change|'. The bars again. That's the size of
the change, up or down. So the labels will be the ten biggest moves, not the ten biggest
increases. OK, noted."

"Under the preview there's a yellow warning: 'Values just above and below 0 print as the same
gray.' And a button, 'Use Print look'. That's exactly the thing I would have got wrong on my own.
And 'Look, for this file only' at the top -- good, so I can do Print here without touching the
project. That answers my worry from the Styles list." (export-dialog, figure)

## 4. Export: the Print look

"Clicked Use Print look. Now I get two previews side by side, 'The file, as written' and 'Printed
in gray, the same file'. I love that. That's the thing I do by hand -- print to PDF, set it to
grayscale, squint."

"The nodes are triangles now. The legend says 'Shape is the sign; darker is a larger change.'
Pointing down is down, pointing up is up. I get that without reading it twice. And four gray
steps, same steps both sides. Table in the legend: down 2, 13, 48, 85 = 148. Up 3, 22, 55, 72 =
152. Let me add... yes, 148 and 152. Same numbers as the canvas legend. Last time the figure said
133 and the canvas said 152 and nobody told me why. This time it matches. That's worth a lot to
me, honestly -- that's the check I run before I show anyone anything."

"The line under the previews: 'Increases and decreases stay apart in gray (148 below 0, 152
above): the triangle carries the sign.' With a check mark. Good."

"I did have to zoom in to see the triangles point. At the size it shows me -- it says 76 percent
of print size -- the pale ones, the 0 to 0.8 ones, are very light on white and I honestly can't
tell up from down on the smallest nodes. On paper at full size it's probably fine. The big dark
ones are obvious." (export-dialog, figure-grey, enlarged)

"Small thing: the Degree part of the legend still draws circles for node size, but every node in
the picture is a triangle now. I'd get a comment from someone on that."

"Bigger thing, and I only noticed it when I zoomed: the file 'as written' is still red and blue.
Only the right-hand preview is gray. My task said a black-and-white figure. If the journal prints
in gray, fine, this survives. But if my boss or the journal says 'send it black and white', I don't
see a way to write the gray one. I'd probably send the color one and hope. Or screenshot the gray
preview, which is exactly what I'm trying to stop doing."

## 5. Which genes went up the most

"Labels on the figure: MAPK10, MAPK2, E2F1, NDUFS5, SNRNP70, RPS6, WRN, CHEK1, and two hidden:
MRE11 +2.35 and RPL17 -2.25 -- the hidden list gives the numbers, nice. But these are the ten
biggest changes either way. To know which went up I have to look at which triangles point up.
SNRNP70, WRN, CHEK1 are dark and pointing up. MAPK10, RPS6 point down. E2F1 and MAPK2 I think
point down, they're dark red in the color version. I would not bet my job on that from triangles
this size."

"So I went looking for a table. The table dock I was shown is Les Miserables, and the ranked one
is a 'Human protein interactions' project with degree and betweenness and pagerank -- no fold
change column at all. That's not my project. I'm confused why I'm looking at it." (table-dock,
table-dock-ranked)

"The one that works is on the Data tab: a table under the map, 'Sorted by |log2FoldChange|'.
CHEK1 3.15, WRN 2.61, SNRNP70 2.58, RPS6 -2.52, MAPK10 -2.42. So again the absolute value. Ups and
downs mixed. For the top three that's fine, I can skip the minus signs. For a top ten I'd be
scrolling and skipping minus signs, and that's where I make mistakes." (export-dialog, ways-in)

"On the other table there's a header menu with 'Sort descending'. If that works on the
log2FoldChange column and means the real number, not the size, then that's my answer: click
header, sort descending, read the top. But the table I'm on says it's sorted by the bars, and
nothing tells me whether 'descending' means biggest number or biggest size. I'd click it and
check whether CHEK1 is still first and RPS6 has gone to the bottom. If it did, I'd trust it."
(table-dock, header)

"Putting it together with the legend: the legend says exactly 3 genes are up by 2.4 or more, and
the table gives me three positives above 2.4 -- CHEK1, WRN, SNRNP70. That lines up. And MRE11 at
+2.35 is the only other up in the top ten by size, so it has to be the fourth. I worked that out;
the screen didn't tell me."

## 6. Done

"Export 2 files. The Data panel now lists 'stress-response-study_figure.svg and its methods file,
Print look. Today 19:12, to Downloads.' Nothing is uploaded. Good, no legal ticket." (done)

"The methods file says Print look, shape is the sign, the four gray steps, 148 below and 152
above, and which labels were hidden. If a reviewer asks 'what do the triangles mean', I paste that.
That's the PowerPoint legend step I used to do by hand."

## Her answer

"Figure's exported: two-column SVG, Print look, triangles for up and down, four gray steps, and
it prints in gray without losing the direction. The file itself is still in color, though, so if
you literally need black-and-white pixels, tell me and I'll figure something out.

Went up the most: CHEK1 (+3.15), WRN (+2.61), SNRNP70 (+2.58). Those three are the only genes up
by more than 2.4. Next is MRE11 (+2.35) -- I'm fairly sure of that one, but I got it from the
hidden-labels list, not a sorted table. In total 152 went up and 148 went down, and every screen
agrees on that now."

## Single Ease Question

**5 of 7.** "The gray part is a 6, maybe a 7 once the degree legend matches the triangles -- it
warned me, one button fixed it, the counts match everywhere, and I didn't need to know anything
about genes. The 'went up the most' part is still a 3. Everything is ranked by the size of the
change, so ups and downs are mixed in the labels and the table, and the tables I was shown for
this were someone else's project. I got the answer by adding up a legend and reading minus signs.
It's better than last time because the numbers agree, so at least I believe what I assembled."

## Would she use this instead of her current tool?

"For the figure, yes, instead of Gephi plus a PowerPoint legend plus a grayscale print test. The
side-by-side gray preview and the methods text are the reasons. I'd want a way to write the gray
version as the file, for the times someone says 'black and white' and means it.

For the ranked list, not yet. I'd still export to CSV and sort in Excel, because I can't see a
plain 'highest first' on the fold change here -- the labels and the table both want the size of
the change. Give me 'Top N, highest first' next to 'Top N by size', or an 'Up in stress' set next
to 'Down in stress', and it's a yes for both."

## Observations for the study team (moderator's notes)

1. The count mismatch from the earlier version is gone: the canvas legend, the Print legend and
   the methods file all say 148 below 0 and 152 above. She checked this first and it restored her
   trust; she used the legend's up column (3 above 2.4) to confirm her answer.
2. The sign-as-shape Print look worked for a non-specialist on first read ("pointing down is
   down"). She had to enlarge the preview to see the palest triangles' direction; at 76 percent
   of print size the lightest step on white is hard to read on the smallest nodes.
3. The Print look's legend still draws the node-size key as circles while every node is a
   triangle.
4. She read "black-and-white figure" literally: the file as written is color, only the preview is
   gray. She saw no way to write the gray rendering as the file and would have fallen back to a
   screenshot of the preview.
5. "Which went up the most" is still not answered directly. Labels are "Top N by |log2 fold
   change|" and the Data panel table is sorted by |log2FoldChange|; she had no visible "highest
   first" on the signed value, and did not know whether the header menu's "Sort descending"
   would sort by the number or by its size. She would test it by checking whether RPS6 moved.
6. The sets list still has "Down in stress" and no "Up in stress"; she looked for it first again.
7. The table-dock screens she was shown belong to other projects (Les Miserables, and a "Human
   protein interactions" project with no fold change column). The only fold-change table she
   found was on the Data tab.
8. The Styles list's Look menu says "for the whole project", which made her avoid it; the Export
   dialog's "Look, for this file only" is what made her willing to switch. She did not know the
   two were connected.
