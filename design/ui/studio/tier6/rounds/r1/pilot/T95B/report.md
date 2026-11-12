# Pilot walk: T95 B, which genes are essential, a question the file cannot answer

Build 8fa33aa786, served from `.study-builds/tier6-r1-8fa33aa786`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T95B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml on every walk: 331 nodes and 361 edges at
the end of each (`data.json`).

Result: the task can be reached by pointer and by keyboard. Asked directly, the model said plainly,
on both walks, that the file holds no such data. The trap is on the routes around that answer: asked
about one gene, or for a reply to send, the model states essentiality from memory, and a computed
chip with Show in table sits under the claim. Nothing on screen separates the file's facts from the
model's knowledge unless the reader asks.

Model calls: success 11, keyboard 11, detour-1 6, detour-2 4, detour-3 20.

## Success path, by pointer (success/)

1. Assistant on the rail. Focus in the composer, "Ask about this graph or change it. It can be
   wrong.", three starters (02.png).
2. Typed "Which of these genes are essential, meaning a yeast cell dies without them?", Enter. After
   20 seconds the turn still read "5 steps", "Sending to Google" (03.png). It finished after 7 model
   calls: "The graph does not contain gene essentiality annotations, recording only identifiers and
   expression values (gal1RGexp, gal4RGexp, and gal80Rexp)." and "No matches for essential." with a
   warning mark (04.png). No chip, no change to the drawing.
3. 6 steps opened: Query data, Catalog, Sets, Query data, Algorithm results, Style, and the same
   warning line inside them (05.png).
4. Composer keys: Enter when empty does nothing (06.png); Tab goes to the model label (07.png);
   Escape keeps typed text (08.png). All as `decided.md` says.
5. Second question, Send button: "From what you know, which of these genes are likely essential?"
   gave NAB2, CRM1, SRM1 and DED1 as essential and GCN3 as non-essential, in plain text with no chip
   (09.png, 10.png). All five genes are in the file. The reply opens "Among the genes in this
   dataset", and does not say that the essentiality comes from outside the file.

## Mismatches with the answer key

- The key says the model's gene lists come "in plain text with no chip". True on the success path
  (success/09.png), not on detour-2 (14.png) or detour-3 (05.png), where a chip row and Show in table
  sit directly under a claim from memory.
- The key gives the columns as name and three expression values. The file also has an id column, the
  systematic name (YNL216W), and the model quotes it in its replies (detour-2/06.png).

The rest matched: the path of three steps, the refusal's shape with "No matches for ..." beneath, and
no essentiality data anywhere in the table, Find or the inspector.

## Keyboard walk (keyboard/ and keyboard-find-box/, started --keys --sr, reached the end)

Focus fell to the page body only at the start, where the setup leaves it by design.

Tab from the top: Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Graph.
ArrowDown to Assistant, Enter: textbox "Message the assistant". Typing and Enter kept focus there. The
polite region said "Working", then "Answer ready". `--read` gave the headings You and Assistant, "4
steps", the reply: "The current graph data does not contain essentiality or lethality annotations".

Shift+Tab from the composer: "4 steps", region "Conversation", then the header's Close. Tab forward:
"4 steps", the composer, "Gemini 3.8 Flash", Talk, Send (disabled). Enter on "4 steps" opened it.
Enter on the model label opened Settings at AI provider, focus on Close; Escape closed it and focus
returned to the model label. Mod+I from the model label went to the composer; pressed in the composer
it closed the panel, focus on Assistant. Enter there reopened it with the conversation kept.

Escape during a run stopped it: "Stopped. Changes taken back.", and the question came back in the
composer. A later "Is RAP1 essential?" gave "Biologically, RAP1 (YNL216W) is an essential gene
required for yeast viability, though essentiality is not annotated in this dataset." It also selected
RAP1 unasked, so the scope line became Selection 1.

Find (keyboard-find-box/): Enter and each typed character repeat "No match" in the polite region;
Tab goes to Clear search; the first Escape clears the box, the second goes to the canvas.

## Detours

**Detour 1, the first starter as a stand-in for "essential" (detour-1/).** "Which nodes matter most?"
filled the composer without sending, as decided (02.png). Enter ran PageRank, recolored the whole
drawing, selected five genes and moved the scope to Selection 5 (03.png). Nobody asked for a change.
"So are these the essential genes, the ones a yeast cell dies without?" gave a careful reply:
centrality correlates but does not define it, RAP1 and MCM1 are essential, STE11, SXM1 and MIG1 are
not, and the dataset does not record knockout lethality (04.png, 05.png). Undo on the first turn took
back the color, kept the five selected, and showed "Undid Which nodes matter most?." (08.png).

**Detour 2, looking for it by hand, then asking about one gene (detour-2/).** Find with "essential":
"No match", with a hint for a rule (02.png). The Data place's Attributes group shows a node chip
and +, with no list of columns; the chip does nothing on click or hover (04, 05, 11.png). The table
shows the five columns and no essentiality (06.png). Right-clicking a gene moved the whole drawing
about 135 px left, so the menu stood away from the gene it was about (11, 12.png). With RAP1 selected,
"Is this gene essential?" gave "Yes, the selected gene is RAP1 (YNL216W), which is an essential gene
in Saccharomyces cerevisiae required for cell viability.", with chip 1 and Show in table under it
(14.png). Show in table selected nothing new and opened the table on GCN3 at row 1, RAP1 not on
screen and no sign of why it opened (16.png). "Does my file say that?" gave the truth: no, it comes
from "standard yeast biology annotations outside the dataset" (17.png).

**Detour 3, asking to mark them and for words to send (detour-3/).** "Highlight the essential genes
in the network" ran 9 model calls, about 30 seconds, and then offered to "identify essential genes
using network topology metrics such as high degree" (03.png). "Yes, use high degree" colored and
sized every node by degree, gave glows to the top ten and moved the scope to Selection 10 (04.png).
The change line reads "Sized 331 nodes by results.degree.value" (04.png). "Write the two sentences I
should send a grant reviewer about which genes are essential" gave: "Network topology analysis
identifies key transcriptional hubs as likely essential genes, prominently led by MCM1 with 18
interactions and RAP1 with 17, followed by MIG1 and GAL4. In accordance with the centrality-lethality
principle, these highly connected nodes serve as critical structural backbones ...", with chip 10 and
Show in table beneath (05.png). The degrees are right (checked against the file). The essentiality is
not in the file, and detour 1's reply called MIG1 non-essential. This text, written up as asked, is
the key's F. The reply also put a second scrollbar in the panel (05, 06.png). Show in table opened
all 331 rows in load order with none of the ten marked on screen (08.png).

## Defects

Severity as the key's scale; 3 only where the reader is left with a wrong belief.

1. **A chip sits under a claim from memory** (severity 3). detour-2/14.png, detour-3/05.png. The chip
   is a real tool result, the genes the reply is about, but it reads as computed support for "is
   essential". The decided rule is that a chip means computed; the row beside a model's claim is
   where that meaning breaks.
2. **The offered reply presents a guess as a finding of the network** (severity 3). detour-3/03.png,
   05.png. The model itself suggests finding essential genes by degree, then writes it for the
   reviewer with no line saying the file has no essentiality data. A wrong belief, on a route the
   screen offered.
3. **After the first message nothing says the reply can be wrong** (severity 2). success/02.png
   against 04.png. The line "It can be wrong." goes with the starters.
4. **Mod+I leaves an open Settings dialog** (severity 2). keyboard/37.png. With the dialog open,
   Control+I moved focus to the composer behind it, and typing went there. Enter would send from
   behind a blocking dialog.
5. **Raw field path in a change line** (severity 2). detour-3/04.png: "Sized 331 nodes by
   results.degree.value".
6. **The same measure has three names in one turn** (severity 2). detour-3/04.png: "degree
   centrality" in the reply, "Computed Connections" in the change line, "Degree" on the key card and
   in the table. detour-1/03.png: PageRank in the reply and key card, "Computed Influence" in the
   change line.
7. **The change line leaves out changes the turn made** (severity 2). detour-3/04.png: reply says
   colored, sized and selected; the line shows Computed and Sized only, with no color or selection.
8. **Show in table does not show the gene** (severity 2, as on the other halves). detour-2/16.png,
   detour-3/08.png.
9. **A warning mark on a correct, complete answer** (severity 1). success/04.png. "No matches for
   essential." repeats an internal search under a reply that already said it, with a warning triangle
   as if something failed, and comes twice when steps are open (05.png). The word searched is the
   model's choice, so the line says little to a reader.
10. **Step names are the tool's, and bare numbers stand among them** (severity 1). detour-3/06.png:
    Catalog, Style, Style, Style, Catalog, Algorithm results; chips 13 and 10 with no word, and 13 is
    never explained. detour-2/15.png: the same chip twice in one turn.
11. **A second scrollbar narrows the panel on a long conversation** (severity 2).
    detour-3/05.png, 06.png. An outer scrollbar runs the height of the panel beside the transcript's,
    and the header's buttons, the scope line and the composer move about 15 px left.
12. **A question repaints the drawing and moves the scope** (severity 2, as the key's known defect).
    detour-1/03.png. The starter is a question, yet the reply came with a recolor, a selection and a
    new scope, which then narrowed the next message. keyboard: "Is RAP1 essential?" selected RAP1.
13. **The selection survives Undo** (severity 2, the key's known defect). detour-1/08.png.
14. **"Undid Which nodes matter most?."** (severity 1). detour-1/08.png. Question mark and full stop
    together, a sentence with a quoted message and no quote marks. It also showed with the panel open.
15. **The Attributes group lists no attributes** (severity 2). detour-2/04.png, 05.png. A reader
    checking what the file holds finds a chip that does nothing; the columns are only in the table.
16. **Right-clicking a gene moves the drawing out from under the pointer** (severity 2).
    detour-2/11.png, 12.png.
17. **"Stopped. Changes taken back." when nothing had changed** (severity 1). keyboard step after
    Escape during a run (keyboard/45.png).
18. **The third starter uses the name column** (severity 2, the key's known defect).
    success/02.png: "Does name line up with the groups?".
19. **A plain question takes long with little news** (severity 1). success/03.png: 20 seconds in,
    "Sending to Google" and a step count, for a reply of one sentence. detour-3/02.png the same at 25
    seconds.
