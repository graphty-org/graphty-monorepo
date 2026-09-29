# Session: "Is this file worth my afternoon?" -- the recipe recipient (Tom)

Participant: Tom, the lab manager who receives network files and never builds them (persona:
`study/personas/recipe-recipient.md`). Simulated participant; his words are paraphrase in his
register, not a real person's.

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

The file: `ppi-core-300-evidence.tsv`, a protein interaction list from the lab's postdoc. In this
version of the file the confidence column has "NA" in 150 rows, so graphty reads the column as
text.

Screens walked, in order: the start screen (first run), the load step (the confidence column
blocked, then the repeated-pairs choice), and the main window at rest with the protein network.

---

## 1. The start screen

**What he sees.** "Open a graph", a line with a lock: "Files stay on this computer. graphty reads
them in this browser and uploads nothing." A link, "Where your data goes". Four sample pictures
(Karate club, Les Miserables, Protein interactions, Bank transfers), then Open... and Connect to
data source....

> "OK, it's a web page. Nobody asked me to sign in, nothing to install. Good, that's the first
> hurdle and it didn't trip me."

> "'Files stay on this computer... uploads nothing.' Right. That's the sentence I'd want to
> forward to IT, and there's a link that says where the data goes. I'm not going to read that page
> now, but I like that it's there. This one's her file anyway, not my hits."

He does not look for a button first. He drags the attachment out of his email onto the browser
window, which is his habit.

> "I just dropped it on the page. Let's see if it takes it."

(The prototype: a drop anywhere counts as Open.... It does.)

> "The samples are nice pictures but I don't know what karate has to do with anything. I skip
> those. 'Protein interactions' -- is that ours? No, 300 proteins, it's a sample. Moving on."

## 2. The load step -- first look

**What he sees.** A big dialog titled "Open ppi-core-300-evidence.tsv". On the left: Format, Each
row is, Ends, Direction, then a Columns table with "Read as" and "Role" drop-downs. On the right:
"Issues 2", a red one at the top, a yellow one below it, a small table of rows with red NA values,
and "What will load: nodes 298, edges 2,298". In the footer, in red: "Load is off: choose how to
read confidence". The Load button is greyed out.

> "Oh. Here we go. I wanted to look at it and it's asking me questions. Format, 'Each row is an
> edge', 'Ends'... I don't know what half of these are and she's not here."

> "Red. 'confidence is read as text, so it cannot weigh edges.' Is her file broken? Did I break it
> by dragging it? I didn't ask it to weigh anything."

He reads the first line of the red issue and skips the second at first, then goes back to it
because it has numbers in it.

> "'150 of 2,298 values are NA; the rest are numbers between 0 and 1.' OK, NA I know -- that's
> 'we didn't measure it'. So it's not the file that's wrong, it's that some rows are blank. Fine.
> That's the first thing that actually made sense to me."

> "And the little table has the NA rows in red. PSMA4, PSMD2, coexpression, NA. Yeah, those are
> just empty. That's what Excel does too."

He notices the Role column.

> "'Role: Weight.' Who set that? I didn't. Is that her setting or the program guessing? If I
> change it, am I changing her file?"

He does not touch Role.

**Attempt 1.** He goes for the big button first.

> "Load is grey. I'll click it anyway."

(Nothing happens; the footer still says "Load is off: choose how to read confidence".)

> "Right, it won't. It's telling me to 'choose how to read confidence'. There's a drop-down that
> says 'Choose how to read it'. Fine, one more try, then I'm emailing her."

## 3. The load step -- choosing how to read confidence

**What he sees.** The list opens under the confidence row: "confidence: 2,148 numbers, 150 NA",
then three choices, each with a result line:

- Number, NA as missing -- 2,298 edges; 150 of them without a weight
- Number, drop the rows with NA -- 2,148 edges; the 150 rows are not loaded
- Text (ticked) -- Cannot weigh edges: Load stays off while its role is Weight

> "OK, this I can do. Each one tells me what I get. 'NA as missing' -- keep everything, the blank
> ones are just blank. 'Drop the rows' -- I lose 150 interactions. I don't want to lose anything
> she sent me. The first one."

> "It still says 'weight'. I don't know what a weight is here. I'll take 'missing'. If it's wrong
> she can tell me."

He picks "Number, NA as missing". The red issue goes; one yellow issue stays: "1,036 extra
parallel edges -- Several rows join the same two proteins, one per evidence source." Its drop-down
reads "Keep all: 2,298 edges".

> "'Parallel edges.' No idea. 'Several rows join the same two proteins, one per evidence source' --
> OK, so PSMA1 and PSMB4 are in there twice, once for coexpression and once for text mining. That's
> normal, that's how STRING gives it to you."

He opens the list because it is yellow and yellow means "look at me".

> "'Keep all: 2,298 edges. One edge per row, so degree counts every source. A metric that needs one
> edge per pair merges them by max of confidence...' I stopped at 'degree'. That's not my job.
> 'Merge into one, max of confidence: 1,262 edges... The source column is not kept.' I'm not
> throwing away a column of her file. Keep all. It was already on Keep all, so I leave it."

> "Is yellow a problem or not? It doesn't say 'this is fine'. It doesn't say 'fix this'. I'm going
> to assume it's fine because Load went blue."

**The counts.** He reads "What will load" carefully, as he does any number.

> "nodes 298, edges 2,298, without a weight 150. Hang on, the file's called core-300. Where are the
> other two?"

He finds the line under the counts: "298 nodes -- 2 proteins in the file have no interaction:
GSK3B, NOTCH1".

> "Oh, that's good. That's exactly what I'd have asked. Two are on their own, and it names them.
> GSK3B and NOTCH1 -- she added those by hand, I bet. I can tell her that."

> "150 without a weight, 2,298 lines. I'd count the rows in Excel. If Excel says 2,299 with the
> header, that matches."

He clicks Load.

Time in the load step: about two and a half minutes, which is past the two minutes he gives a new
file. He stayed because the NA line made sense.

## 4. The main window, at rest

**What he sees.** A coloured network: clusters in green, pink, black, blue, orange, dark orange,
yellow, light blue, with labels on some nodes (MAPK1, TP53, BRCA1, MYC, AKT1, UBC, YWHAZ, RPS8). A
legend at bottom left: "Module color" with Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32,
MAPK signalling 31, DNA repair 30, Cell cycle 29, TGF-beta 21, Other 26; "Size by degree 1, 10, 34".
Top left: "Human protein interactions", "This browser. Nothing sent.", a file chip reading
"ppi-core-300.g...", "Full graph". On the right: Statistics with Nodes 300, Edges 1,262.

**Minute 0 to 1 -- does it look like what she sent?**

> "Well, that's a picture. Coloured blobs, the proteasome in one place, the ribosome in another.
> That looks like the kind of thing she puts in lab meeting. I relax a little."

> "'This browser. Nothing sent.' Good. Says it again. I like that it says it where I can see it."

**Then he reads the numbers, as he always does.**

> "Wait. Statistics says Nodes 300, Edges 1,262. The box a minute ago said 298 and 2,298. Which
> is it? I chose 'Keep all' so I'd get 2,298. Now it's 1,262 -- that's the 'merge' number, the one
> I said no to."

> "And the little tag at the top says 'ppi-core-300.g-something'. The file I dropped was
> 'ppi-core-300-evidence.tsv'. Is this even my file? Did it open one of those samples instead?
> 'Protein interactions, 300 proteins' was a sample on the first page."

> "And where did the colours come from? The file I opened was two protein columns, a source and a
> confidence. There was no module column in that dialog. So who decided 'Ribosome' and 'Proteasome'?"

This is the moment he stops trusting the screen.

> "This is exactly what happens. It says one thing, then it shows another, and I'm the one who
> looks foolish in lab meeting. I'd screenshot both and send them to her: 'Which one is right?'"

(Moderator note: the main-window mock shows the GraphML version of the protein network, with its
saved module styling, not the result of this load. The seam between the two mocks is what Tom
reacted to. His reaction is still the finding: he checks the count on the load step against the
count in the window, and a mismatch, for any reason, ends his trust.)

**Minute 1 to 3 -- is it worth my afternoon?**

He looks at the picture again, setting the numbers aside.

> "What's it telling me? Big grey ones in the middle -- MYC, AKT1, UBC, HSP90. They're the biggest,
> so they've got the most connections, I suppose. That's what 'Size by degree' means? I'd guess
> so. But they're grey, and in the key grey is 'Other'. So the most connected proteins are 'Other'?
> That's backwards to me. I'd have thought those were the important ones."

> "These two oranges -- Proteasome and DNA repair -- are close for me. I can tell them apart because
> they're in different places on the picture, not because of the colour. If they were mixed
> together I'd be stuck."

> "The legend has numbers next to the names -- Ribosome 56. That's how many proteins in it, I take
> it. That's useful. I can say 'the ribosome group has 56' to the PI."

> "The side panels -- Graphs, Sets and paths, Styles, Views, Statistics, Density, Connected
> components... I'm not reading those. Too many rows. 'Degree distribution' with a little bar
> chart. No."

> "There's a lightning bolt and some icons at the bottom. I don't know what they do and I'm not
> clicking them to find out. Export files is blue at the top right -- that'll be how I get a
> slide. I'll try that next time."

> "Did I change her file? Nothing says I did. It says 'Human protein interactions' at the top
> and nothing about saved or not saved. I think I've only looked. I hope so."

**Verdict on the task.**

> "Is it worth my afternoon? The picture, maybe -- it's clearer than the STRING ones she pastes in.
> But I can't use it for anything until I know which numbers are right. 2,298 or 1,262. 298 or 300.
> I'm not going to stand up in lab meeting with two numbers. I'd email her, and honestly, she could
> have just sent me a PNG and the Excel file."

---

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 3.

> "The opening was easy. The dialog was a questionnaire I shouldn't have had to fill in, though the
> NA bit made sense once I read the numbers. The end was the problem: it didn't match what it had
> just told me."

**Would he use this instead of his current tool?**

> "My current tool is her sending me a PNG. Compared to Cytoscape, yes -- no install, no IT ticket,
> and it told me the data stays on my laptop, twice. That's more than anything else has ever told
> me. But I'd only use it if what I see at the end matches what it said at the start, every time.
> One mismatch and I'm back to asking for the PNG."

---

## What went wrong, in order of how much it cost him

1. **The main window's counts and file name did not match the load step.** Load said 298 nodes and
   2,298 edges ("Keep all"); the window said 300 nodes and 1,262 edges (the "Merge" figure), and the
   file chip named a `.graphml` file instead of the `.tsv` he dropped. Colours by module appeared
   for a file whose columns had no module. He read this as the tool showing him someone else's
   graph and stopped trusting it. Severity 4. (Partly a seam between two mocks; the check he made
   -- load count against window count -- is one every recipient will make.)
2. **The load step opens as a form for a person who only wanted to look.** Format, Each row is,
   Ends, Direction, Read as, Role are questions he cannot answer, and a red error with Load greyed
   out on first sight made him think the file was broken. He got through on his second try only
   because the NA explanation carried numbers he understood. Severity 3.
3. **"Weight" was set on confidence and he did not know by whom.** The block exists only because
   the role is Weight, and nothing tells him whether that came from the sender's file or from
   graphty, or whether changing it changes her file. Severity 2.
4. **"Parallel edges" in yellow with no word on whether it needs action.** Jargon he skipped;
   the default "Keep all" was right for him, but he could not tell the yellow row was safe to
   ignore. Severity 2.
5. **The most connected proteins are drawn in the grey of "Other".** He read the big grey hubs as
   "the important ones are uncategorised", which he found backwards. Severity 2.
6. **Two oranges (Proteasome, DNA repair) are near-identical for his colour vision.** He separated
   them only by position. Severity 1 here, higher on a figure where the groups mix.
7. **No sign he had not changed the sender's file.** He hoped, rather than knew, that only looking
   had changed nothing. Severity 1.

## What worked for him

- No sign-in, no install; dropping the file on the page opened it.
- "Files stay on this computer... uploads nothing" before any data went in, and "This browser.
  Nothing sent." in the main window. He said it twice unprompted.
- Each "how to read confidence" choice stating its result in counts; he chose without help.
- "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1": the count that did not
  match the file name explained itself, with names, before he asked.
- The legend's counts per module gave him a number he could say to the PI.
