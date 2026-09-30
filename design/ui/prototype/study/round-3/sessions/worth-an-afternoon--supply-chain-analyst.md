# Session: "Is this file worth an afternoon?" -- Dana Okafor, supply chain risk analyst

Participant: Dana Okafor (composite persona, supply chain risk analyst at an industrial equipment
maker; lives in Excel and Power BI, not a network scientist).

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

The file: `ppi-core-300-evidence.tsv`, a tab-separated file of protein interactions, one row per
piece of evidence. Two traps are planted in it: the `confidence` column arrives read as text
(150 of its 2,298 values are `NA`), and many rows repeat the same pair of proteins, one row per
evidence source.

Screens walked, in order, as the participant saw them (the study view, design notes hidden):
the start screen, the open dialog blocked on the `confidence` column, the same dialog with the
duplicate-rows choice open, and the main window after loading.

Renders used: `shots/record/dana-r3-start.png`, `shots/record/dana-r3-blocked.png`, `shots/record/dana-r3-policy.png`,
`shots/record/dana-r3-frame.png`.

---

## 1. Start screen

> OK. Blank page, four pictures. "Karate club", "Les Miserables", "Protein interactions, 300
> proteins", "Bank transfers". These are demos. I don't need demos, I have a file.
>
> Wait -- "Protein interactions, 300 proteins." The file he sent me is called
> ppi-core-300-something. Is that the same thing? Did he send me the sample? ... No, I'm not
> going to click a picture and find out it's somebody's tutorial. I'll open my actual file.
>
> "Open..." -- there it is, small, under the pictures. That's what I want. I'd have expected it
> first, above the samples, or a big "drop a file here" box. It's a plain line of text, I almost
> read it as a caption.
>
> Before I load anything: where does this go? This is a web page. My colleague's file might be
> under NDA for all I know. I don't see anything on this screen that says where the file goes.
> There's no heading, no line about privacy, nothing. If this were my supplier list I'd stop here
> and ask IT.

What she did: clicked "Open..." and chose the file.

Moderator note: the start screen's heading "Open a graph" and both privacy lines ("Files stay on
this computer. graphty reads them in this browser and uploads nothing." and "Projects are kept in
this browser.") are in the page but are hidden in the study render, because that block carries the
kit's annotation marker. The participant never saw the privacy answer she was looking for. Worth
re-running this step with the lines visible before drawing a conclusion about it.

## 2. Open dialog -- blocked on "confidence"

> Right, a dialog. "Open ppi-core-300-evidence.tsv." Good, that's the file name, so it's not the
> sample.
>
> Left side: Format, TSV tab header row -- fine. "Each row is: An edge." I don't know what an edge
> is in this sense. A line, I suppose. Every row is a line between two things. OK. "Ends:
> protein_a -- protein_b." Fine, it picked the two name columns, and it guessed right; I can see
> it guessed, it's in a dropdown. "Direction: Undirected." Don't care.
>
> The red. "Load is off: choose how to read confidence." Load button is grey. OK, it's telling me
> I have to do something. That's fair, at least it's not loading garbage and not telling me.
>
> Top right in the blue box: "confidence is read as text, so it cannot weigh edges. 150 of 2,298
> values are NA; the rest are numbers between 0 and 1." Right. That's the classic. Somebody's
> export wrote NA for blank and now the whole column is text. Happens to me every week with SAP.
> Excel would do the same thing and it wouldn't tell me.
>
> "Cannot weigh edges." Weigh? And on the left, the "Role" dropdown says "Weight". Weight of what?
> In my world weight is freight -- kilos on a pallet. There's no weight column in this file. It
> took "confidence" and called its job "Weight". I'd leave that alone because I don't know what
> changing it does, but I don't love that the word means something different to me.
>
> The table underneath is nice: line 29, PSMA4, PSMD2, coexpression, NA. Red NA. Five of 150,
> "Show first rows". That I understand -- it's showing me the actual bad rows with line numbers.
> That's what I'd do with a filter in Excel. Good.
>
> The "Read as" dropdown is open: "Number, NA as missing -- 2,298 edges; 150 of them without a
> weight." "Number, drop the rows with NA -- 2,148 edges; the 150 rows are not loaded." "Text --
> Cannot weigh edges: Load stays off while its role is Weight."
>
> NA as missing. Obviously. I'm not throwing away 150 rows of somebody's data because a score is
> blank. And it tells me what I get in each case, in counts, before I pick. That's the bit I
> like. I pick "Number, NA as missing."

## 3. Open dialog -- the duplicate rows

> Issues went from 2 to 1. Load button is blue now. Good.
>
> What's left: yellow, "1,036 extra parallel edges. Several rows join the same two proteins, one
> per evidence source." Parallel edges -- don't know the phrase. But the second sentence I get:
> same pair, several rows, one per source. Duplicates, basically. Half the file.
>
> That's the thing that bites me. We had a "biggest chokepoint" that turned out to be the same
> distributor entered twice. So my instinct is merge.
>
> Opened the dropdown. "Keep all: 2,298 edges. One edge per row, so degree counts every source. A
> metric that needs one edge per pair merges them by max of confidence and says so on its
> result." -- I read "Keep all, 2,298 edges" and the first few words. The rest is too long, and I
> don't know what degree is.
>
> "Merge into one, max of confidence: 1,262 edges. One edge per pair of proteins. The source
> column is not kept, because a merged edge has several."
>
> Hm. Merge throws away the source column. I don't like losing a column I didn't make -- if
> somebody asks me "where did this come from" I'd have nothing. And "max of confidence" means it
> picks the best score, which is the optimistic answer, not the one I'd put in front of a VP.
>
> I kept "Keep all". But honestly I'm not sure I made the right call, and nothing told me which
> is the normal choice for this kind of file. I'd want a third option: keep one row per pair AND
> keep a count of sources. That's a pivot table.
>
> Bottom: "What will load: nodes 298, edges 2,298, without a weight 150." And "298 nodes -- 2
> proteins in the file have no interaction: GSK3B, NOTCH1." Wait -- 300 proteins in the file, 298
> load. So two get dropped? Or they're there but not connected? It says "have no interaction" --
> then why are they in the file at all? That's the kind of thing I'd ask the colleague about. At
> least it named them. That's honest.
>
> Clicked Load.

## 4. Main window after loading

> OK. A hairball. Grey dots, a few names: MAPK1, HSP90AA1, MYC, AKT1, UBB, UBC, YWHAZ, TP53, RPL28,
> RPS8. I've heard of TP53 on the news, cancer thing. That's the extent of my biology.
>
> Top left: "Human protein interactions." "This browser. Nothing sent." -- there's my privacy
> answer, finally. Small and grey, but it's there. That's the line I'd screenshot for IT. Under it
> a little pill "ppi-core-300-..." cut off. I hovered it to see the whole name and the tooltip
> said "miserables.json, opened from this computer." What? That's not my file. Did it open the Les
> Miserables sample? Now I'm not sure what I'm looking at.
>
> Right side, "Statistics". Nodes 298, Edges 2,298. That matches what the dialog said. Good. Then
> in grey underneath: "undirected, 1,036 parallel, no weight".
>
> No weight? I just spent the whole dialog telling it confidence IS the weight, NA as missing. The
> dialog said 150 without a weight -- so 2,148 WITH a weight. Now it says no weight at all. So
> either it threw away my choice, or "no weight" means something I don't understand. Either way,
> this is exactly the moment I stop trusting the numbers. If the tool quietly undoes the one
> decision it forced me to make, what else did it change?
>
> Density 0.0285. Connected components 1. Degree distribution, a little bar chart the size of a
> postage stamp. I don't know what any of that tells me about whether this file is any good.
> "Attributes 2" -- which two? Presumably confidence and source. "5 more" -- more what?
>
> The left: "Graphs: Evidence rows." "Sets and paths." "Styles: Base style." "Views." None of that
> says "table". Where's the list? I want to see the rows, sort by confidence, see which proteins
> have the most sources. That's how I'd decide if it's worth an afternoon -- in a table, not a
> picture. The bottom toolbar is five icons: an arrow, something like a route, a sticky note, a
> lightning bolt, "2D". I'd hover each one. None of them looks like a table.
>
> The little grey text on the far left rail -- "Assistant. Off. Nothing is sent." -- I can barely
> read that at my desk, forget the laptop.
>
> "Export files..." top right, blue. Good, at least I can get something out. I'd want the rows as
> a CSV to open in Excel, not a picture.

## 5. The verdict

> Is it worth my afternoon? The file? It's protein data -- it's not my world, so the honest answer
> is it's not worth MY afternoon, I'd send it back to whoever deals with biology.
>
> Did the tool help me decide? Partly. The open dialog did the real work: it caught the NA problem
> before loading and showed me the bad rows with line numbers, it told me half the rows are
> duplicates by source, and it named the two proteins that don't connect to anything. That's three
> things I'd have found in Excel eventually, maybe in twenty minutes; here they were in front of me
> in one screen. That's the good part.
>
> What's off, in the file: confidence has 150 NA scores, half the rows are the same pair repeated
> once per source, and two proteins in the file connect to nothing.
>
> What's off, in the tool: after all that, the main screen says "no weight", which contradicts
> what I chose. And the file name on hover says "miserables.json". Two things on the one screen
> that should reassure me, and both make me doubt it. After that the picture doesn't tell me
> anything a VP could use, and I can't find the table.

**Single Ease Question (1 very hard -- 7 very easy): 4.**

> Middle. Opening the file was easier than I expected; figuring out whether I could trust what
> loaded was harder than it should be.

**Would she use this instead of her current tool?**

> Not instead of anything. For a file like this I'd still open it in Excel first -- a pivot on the
> two protein columns tells me about the duplicates, and a filter on NA tells me about the scores.
> The load check here is better than Excel's, I'll give it that; if it had my supplier list and
> did the same thing with blank lead times and suppliers entered twice, I'd look at it. But I'd
> still ask: will IT approve it, and can I get the table into Power BI? Nothing here answered the
> Power BI part. And if the main screen says the opposite of what I told the dialog, I can't put
> its numbers in front of anyone.
