# Session: "Is this file worth my afternoon?" -- supply chain risk analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst, lives in Excel and Power BI,
not a network scientist; see study/personas/supply-chain-analyst.md).

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

Screens, in order: the start screen (first run, nothing opened), the load step with the file
`ppi-core-300-evidence.tsv` where the weight column is read as text, and the main window at rest
with the "Proteins" data set. Renders read fresh from the current pages at 1440 x 900.

Outcome: success with difficulty. She found and fixed the text-weight problem quickly and without
help. She could not decide whether the file was worth an afternoon, and she caught two number
mismatches between the load step and the main window that made her stop trusting the counts.

Single Ease Question: 4 of 7.

---

## Transcript (think-aloud, her words)

### 1. Start screen

> OK. "Open a graph." Graph -- like a chart? No, there's pictures of dots. Fine.
>
> First thing I read is the line with the lock: "Files stay on this computer. graphty reads them
> in this browser and uploads nothing." Good. That's the first thing IT asks me. There's a link,
> "Where your data goes" -- I'd click that and send it straight to the security reviewer. That's
> honestly the most useful thing on this page for me. Second line, "Projects are kept in this
> browser." Hm. So if IT clears my browser on Monday, my work is gone? I'll come back to that.
>
> Samples: karate club, Les Miserables, proteins, bank transfers. None of that is my world. Bank
> transfers is the closest. I'm not clicking samples, my colleague sent me a file.
>
> Where's "Import"? I don't see the word import. "Open..." -- OK, that's a file. I'd have just
> dragged the file onto the window, I don't see anything telling me I can, but I'd try it anyway.
> "Connect to data source..." -- that's for SAP or whatever, not today.
>
> Clicks Open... and picks the file the colleague sent.

### 2. Load step -- the file opens

> "Open ppi-core-300-evidence.tsv." Wait. PPI? Protein? My colleague sent me a protein file?
> OK, whatever, the moderator said a file, I'll play along. If this came to me for real I'd email
> back "wrong attachment?"
>
> Left side: Format, "TSV, tab, header row" -- fine, it figured that out on its own, I didn't
> have to tell it. "Each row is: An edge." I don't know what an edge is. I'd guess it means a
> link between two things, because of the next line: "Ends: protein_a -- protein_b". OK, so each
> row links protein A to protein B. Like supplier to sub-supplier. That I get.
>
> "Direction: Undirected." Fine, don't care.
>
> Now the red. There's a red X next to "confidence", and on the right in the blue box: "confidence
> is read as text, so it cannot weigh edges. 150 of 2,298 values are NA; the rest are numbers
> between 0 and 1." That is exactly the thing that bites me in Excel -- one "N/A" in a column and
> the whole thing is text and my SUMIFS returns zero. So yes, that's what's off. It told me in
> the first line, I didn't have to hunt. Good.
>
> And the table under it shows me the actual rows, line 29, 31, 44... with the NA in red. I like
> that. Tables I trust. Line numbers means I could go back to the file and check.
>
> Load button's grey. Bottom left in red: "Load is off: choose how to read confidence." OK, clear
> enough, it's telling me what to do.
>
> Opens the Read as dropdown next to confidence.
>
> Three choices. "Number, NA as missing -- 2,298 edges; 150 of them without a weight." "Number,
> drop the rows with NA -- 2,148 edges; the 150 rows are not loaded." "Text -- cannot weigh edges."
> I like that each one tells me what I'd end up with, in numbers. That's how I'd want Excel to
> ask me. I'm not dropping 150 rows of somebody else's data without knowing why they're blank --
> blank might mean "not measured," not "zero." I'd pick "NA as missing."
>
> Two things though. There's the same "Choose how to read it" box on the right side in the blue
> panel AND the dropdown on the left. Are those the same thing? I'm assuming yes, because they
> say the same thing, but I had to stop and think about which one to click.
>
> And "Weight" -- in the Role column it says Weight. Weight of what? In my world weight is
> kilograms on a shipment. I'm guessing it means "how strong the link is". Nobody told me that.
> Did I pick Weight or did the tool? I don't remember doing it, and my colleague didn't send me
> settings, just a file. If the tool picked it, why is it blocking me over its own choice?
>
> Second warning, the yellow one: "1,036 extra parallel edges. Several rows join the same two
> proteins, one per evidence source." Parallel edges -- no idea what that means as a term, but the
> sentence under it I get: the same pair shows up more than once. Like the same supplier in the
> list twice under two ERP codes. It's set to "Keep all: 2,298 edges." I'll leave it, I don't
> know enough to change it. But half the rows are repeats? That's something I'd flag to my
> colleague. That's off.
>
> Down at the bottom: "nodes 298, edges 2,298", and "298 nodes -- 2 proteins in the file have no
> interaction: GSK3B, NOTCH1." OK, the file's called "core-300" and I get 298, and it tells me
> which two are missing and why. That's actually nice. I'd write those two names down.
>
> Small stuff: the little grey column headers -- "Column", "Read as", "Role", and the tiny "text"
> under "confidence" in the table -- I'm squinting. On my laptop at the plant I would not read
> those. And when the dropdown is open there's a little empty box sticking out under it next to
> protein_a, looks like something's behind it.
>
> Picks "Number, NA as missing". Load turns on. Clicks Load.

### 3. The main window after loading

> OK, dots. Coloured blobs: Ribosome, Proteasome, Complex I... legend bottom left with counts,
> 56, 40, 35. Fine, I can read a legend. Top left says "Human protein interactions", and a little
> file chip "ppi-core-300.g..." -- cut off. Is that my file? Mine was ".tsv". This says ".g"
> something. Did it open a different file?
>
> Right side, Statistics. Nodes 300. Edges 1,262.
>
> Hang on. The screen before said 298 nodes and 2,298 edges. It even told me which two were
> missing. Now it's 300 and 1,262. Which one is right? I left "Keep all" on. 1,262 is the
> "merge" number I think -- I didn't pick merge. And "Connected components: 3 (2 isolates)" -- so
> now the two proteins it said it wouldn't load ARE loaded?
>
> This is exactly the thing that makes me close a tool. The counts changed between two screens
> and nothing told me why. If I put 300 on a slide and my colleague says 298, I look like an idiot.
>
> And where are my 150 blanks? The load screen told me 150 edges without a weight. Here it says
> "undirected, weight: confidence" and nothing about 150 missing. So I'm supposed to remember
> that myself?
>
> OK, forget the numbers for a second. The question was: is this worth my afternoon. What does
> this screen tell me? There's a cluster of grey dots in the middle with names -- MYC, AKT1, UBC,
> YWHAZ, TP53 is orange and big-ish. Big dots I'm guessing are the important ones ("Size by degree"
> -- degree, I don't know, bigger number is bigger dot I suppose). If these were suppliers, the big
> grey ones in the middle connecting all the colours would be my chokepoints. That part I can
> sort of see.
>
> But I can't get a list. I want a table: top ten by whatever the size is, with the number next to
> it. "Density 0.0281" -- means nothing to me. "Degree distribution" with a tiny little bar chart
> -- too small to read, and I don't know what it would tell me anyway.
>
> Left side: "Graphs", "Sets and paths", "Styles", "Views". "Sets and paths" -- no idea. Down the
> far left: Graph, Assistant "Off. Nothing is sent." (tiny, but I like that it says so), Results,
> Notes. "Results" is probably where the list would be if I ran something. I'd click Results next.
>
> Bottom toolbar: arrow, some sliders icon, a page icon, a lightning bolt, "2D". I wouldn't touch
> the lightning bolt, no label. "2D" -- is there a 3D? That's for demos.
>
> "Export files..." top right, blue. Good that it's big. But does that give me the table in Excel,
> or a picture? I'd click it to find out before I spent any more time, because if I can't get it to
> Power BI or at least a CSV, this is a side tool.

### 4. Her answer to the moderator

> Is it worth my afternoon? For this file: no, and the reason is the file, not the tool -- it's
> protein data, it's not mine, and half the rows are repeats. I'd send it back and ask what they
> wanted me to look at.
>
> What looked off: one, the confidence column had "NA" in it so it came in as text -- the tool
> caught that right away and told me exactly what each fix would do, and that part I'd honestly
> use. Two, about 1,000 rows are the same pair repeated. Three, and this is the one I'd report as
> a bug: the load screen said 298 and 2,298, and the next screen says 300 and 1,262, and the file
> name looks different. I can't tell you which number is real.

---

## Single Ease Question

**4 of 7.** "Finding the problem in the file was easy -- a 6. Deciding if it's worth my time, I
couldn't, and the numbers not matching knocked it down."

## Would she use it instead of her current tool?

> Not instead. The import check is better than what I have -- Excel just silently makes the column
> text and I find out a week later when a total is wrong. If it did that on my SAP export and told
> me "412 suppliers have no country" the same way, I'd use it as a checker before I build the
> Power BI model. But the picture at the end doesn't answer a business question on its own; I'd
> need a ranked list I can export. And it has to give me the same number on every screen, or I
> can't put it in front of my VP. Plus IT has to sign off -- the "nothing leaves your browser" line
> helps with that, the "projects kept in this browser" line worries me for Monday.

---

## Problems observed

| Screen | What happened | Severity (1-4) |
| --- | --- | --- |
| Main window at rest | Node and edge counts differ from what the load step promised (298 / 2,298 with "Keep all" chosen, versus 300 / 1,262 and "2 isolates"); nothing explains the change. She stopped trusting every number. | 4 |
| Main window at rest | The file chip is truncated to "ppi-core-300.g..." while she opened a .tsv; she could not confirm which file was loaded. | 3 |
| Main window at rest | The 150 edges loaded without a weight are not mentioned anywhere after loading; the decision she made in the load step vanishes. | 3 |
| Main window at rest | Nothing on screen answers "is this worth my time": no ranked list of the most connected items, and the statistics (density, a tiny degree histogram) mean nothing to her. | 3 |
| Load step | "Weight", "edge", "parallel edges", "Undirected" are unexplained; she did not know whether she or the tool had set confidence as the Weight, and so why it was blocking her. | 2 |
| Load step | The same "how to read confidence" setting appears twice (issue panel and column row); she paused to work out which one to use. | 1 |
| Load step and main window | Small grey labels (column headers "Read as", "Role", the "text" type under a table header, the "Off. Nothing is sent." note in the left rail) are hard to read at her eyesight and on a 14-inch laptop. | 2 |
| Main window at rest | Unlabelled toolbar icons (lightning bolt, sliders) and "Sets and paths" she would not click; "Export files..." does not say whether a table comes out. | 2 |
| Start screen | No "Import" wording and no visible cue that a file can be dropped on the window; she found "Open..." but looked for import first. | 1 |
| Start screen | "Projects are kept in this browser" raised a worry that clearing the browser loses her work. | 2 |
| Load step | With the Read as list open, an empty field outline sticks out under it beside protein_a. | 1 |

## What she liked

- The lock line on the start screen, and a link she can forward to IT.
- The blocking message names the problem in its first line, in counts, and Load stays off with the reason in words.
- Each choice in the Read as list states what would load ("2,148 edges; the 150 rows are not loaded").
- The sample rows with line numbers and the NA values in red.
- "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1" -- the drop explained by name.
