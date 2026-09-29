# Session: "Is this file worth an afternoon?" -- Tom, the lab manager who receives files

**Participant.** Tom, 52, lab manager of a cell biology lab. He opens what the postdoc sends him and
never builds a network himself. Simulated from `study/personas/recipe-recipient.md`.

**Task as given by the moderator.** "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."

**What he was shown**, in order, each as the participant view with the design notes hidden:

1. The start screen -- `shots/study/round-3/sessions/img/tom-waa-start-screen-html-task-worth-an-afternoon.png`
2. The load step with a blocking problem, the "Read as" list open --
   `shots/study/round-3/sessions/img/tom-waa-load-step-html-task-worth-an-afternoon-blocked.png`
3. The load step once confidence reads as a number, with the repeated-pairs list open --
   `shots/study/round-3/sessions/img/tom-waa-load-step-html-task-worth-an-afternoon-policy.png`
4. The graph as it opens -- `shots/study/round-3/sessions/img/tom-waa-frame-at-rest-html-task-worth-an-afternoon.png`

The file is `ppi-core-300-evidence.tsv`: protein pairs, one row per evidence source, with a
confidence score where 150 of 2,298 values are "NA".

---

## Transcript (thinking aloud)

### 1. The start screen

> OK. The email says "ppi-core-300-evidence.tsv, have a look, it's the core set". TSV. That's a
> spreadsheet thing, tab-separated, I know that one, Excel opens it. She said open it in graphty.

> So there's a page. Four pictures across the top -- karate club, Les Miserables, protein
> interactions, bank transfers. These are examples, I suppose. Not mine. The protein one has
> colours, that's nice, but that's not the file.

> Where's my file go? I'd just drag it on here from the downloads bar. There's "Open..." with a
> folder, that's the other way. Fine.

> Hang on. Before I drag the lab's stuff into a web page -- where does it go? This isn't
> published. I'm looking for something that says it stays here... I don't see anything. There's a
> little thing on the side of "Connect to data source" but I'm not hovering over every icon. It
> doesn't ask me to sign in, but that doesn't mean anything. Every web page uploads things.

> [Moderator: "What would you do?"]

> Honestly? It's her file, not my hits, and she sent it to me in plain email already, so it's
> already out of the building if that was going to happen. I'll open it. If it were our qPCR list
> I'd stop here and ask IT.

*He drags the file onto the window.* (Clicking Open... would do the same: the page says a drop
anywhere opens the file.)

### 2. The load step -- the file will not load

> Whoa. OK. That's a lot. "Open ppi-core-300-evidence.tsv". Format, "Each row is", "Ends",
> "Direction", "Columns, Read as, Role"... This is the Cytoscape import screen all over again.
> I don't know what "Each row is: an edge" means. I didn't set any of this. I assume she did,
> or it guessed.

> And the Load button is grey. There's red at the bottom: "Load is off: choose how to read
> confidence." So it won't open until I answer a question about a column I didn't make.

> [He reads the red line on the right.] "confidence is read as text, so it cannot weigh edges.
> 150 of 2,298 values are NA; the rest are numbers between 0 and 1." ... Right. NA. So some of
> them are blank. That I understand -- that's Excel, that's "not available". And it's showing me
> the rows: PSMA4, PSMD2, NA; PSMA5, PSMA7, NA. Those are proteasome subunits. All "coexpression".
> Huh. So the blanks are all the coexpression rows? At least the ones it's showing.

> That's actually something off, isn't it -- why would the confidence be missing only on
> coexpression? I'd ask her about that.

> The list is open already. Three choices. "Number, NA as missing -- 2,298 edges; 150 of them
> without a weight." "Number, drop the rows with NA -- 2,148 edges; the 150 rows are not loaded."
> "Text -- cannot weigh edges, Load stays off."

> I don't want to throw anything away. I don't know what "weigh edges" means, but "drop the rows"
> sounds like deleting her data and "missing" sounds like leaving it as it is. So: the first
> one. I like that it tells me the number either way. 2,298 minus 150, 2,148. That adds up.

> [Moderator: "Was that question something you could answer?"]

> I guessed. I guessed the safe-sounding one. If she'd been in the room I'd have asked her. Why is
> it asking ME? It's her file. Presumably it opens fine for her.

> Something else -- down at the bottom, "298 nodes -- 2 proteins in the file have no interaction:
> GSK3B, NOTCH1." The file says core-300. It says 298. And it tells me which two. OK, that I like.
> That's the thing I'd have counted myself. GSK3B and NOTCH1 with nothing -- that's odd too,
> NOTCH1 with no partners in a core set? Another one for her.

### 3. The load step, second question

> Now Load is blue. But there's a yellow one. "1,036 extra parallel edges. Several rows join the
> same two proteins, one per evidence source." And another list: "Keep all: 2,298 edges" or
> "Merge into one, max of confidence: 1,262 edges."

> "Parallel edges". I don't know what parallel means here. Reading the second line: "One edge per
> row, so degree counts every source. A metric that needs one edge per pair merges them by max of
> confidence and says so on its result." ... No. I read the first line of that. Keep all. It's
> already chosen, it's yellow not red, it isn't stopping me. I'm not changing something I don't
> understand.

> So which is it, 2,298 or 1,262 connections? Both numbers are on the screen. If the PI asks "how
> many interactions", I'd say... I'd say I don't know, ask her.

*He clicks Load.*

### 4. The graph

> Right. Grey dots. Grey lines. A big ball with some clumps around the edge. A few names:
> MAPK1, HSP90AA1, AKT1, MYC, UBB, UBC, YWHAZ, TP53, RPS8, RPL28. The usual suspects. Every
> network has TP53 in the middle.

> It's a pretty picture. What's the one thing it's telling me? No colours. The protein sample on
> the first page had coloured groups. This doesn't. Is that because it's a raw file, or did I
> break it with that question? I think it's because it's a raw file. I think.

> Left side: "Human protein interactions". "This browser. Nothing sent." Oh -- there it is. Now it
> tells me. That's where I wanted it two screens ago. Good to know, though.

> Right side, numbers. Nodes 298, edges 2,298. Same as the load screen, good. Density, connected
> components 1 -- whatever those are. [Squinting at the small grey line under Edges.]
> "undirected, 1,036 parallel, no weight."

> No weight? Wait. The whole reason it wouldn't open was that confidence couldn't weigh the
> edges. I picked the option that made it a number so it could. And now it says no weight. So
> what did I pick? Did it do anything? That's exactly the "I clicked apply, nothing changed"
> thing. Either the question didn't matter, or it didn't take. Either way I don't trust the
> screen now.

> [Moderator: "Is it worth your afternoon?"]

> From this? No. I can't tell anything from a grey ball. What I learned, I learned on the import
> screen: 150 blanks, all coexpression from what I saw, and two proteins with nothing attached,
> GSK3B and NOTCH1. Those are questions for her, and I can write them in an email in five
> minutes. I'm not spending the afternoon; she could have sent me a PNG and an Excel file.

> And I'd want to know about that "no weight" before anyone shows the PI anything with
> confidence on it.

---

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 3.**

> It opened, and it didn't make me install anything, I'll give it that. But it stopped and made me
> answer a question about her data that I had to guess at, and then at the end it said the thing I
> picked wasn't there. The counts were good -- the 298 and the two names, that's the best bit.

**Would he use this instead of his current tool?**

> My current tool is "ask her for a PNG". For looking at a file someone sends me, no, not like
> this -- the picture didn't tell me anything and it asked me questions that are her job. If she
> sent me one that already had her colours on it and it just opened, maybe. The import screen
> telling me which rows were blank and which proteins weren't in it -- that I'd use. That's what
> I actually wanted to know.

---

## What went wrong, by screen

| Screen | What happened | Frustration (1-4) |
|---|---|---|
| Graph as it opens | The Edges line reads "no weight" right after the load step made him choose how confidence becomes the weight; he concludes his choice did nothing and stops trusting the screen | 4 |
| Load step (blocking) | The file will not load until he answers a question about how a column he did not make should be read; he guesses the safe-sounding choice without understanding "weigh edges" | 3 |
| Start screen (as rendered for the study) | No title and no line saying where the file goes; he hesitates before dragging in lab data and only finds "This browser. Nothing sent." after loading. The designers' own render of the same screen does show the line, so the participant view may be dropping it | 3 |
| Graph as it opens | All grey, no legend, no colour: nothing tells him whether the file is worth time; the sample on the start screen had coloured groups and his did not, and he wonders whether his answer caused it | 3 |
| Load step (repeated pairs) | Two edge counts (2,298 and 1,262) and the words "parallel edges", "degree", "metric"; he keeps the default and cannot say how many interactions there are | 2 |
| Load step (whole dialog) | Format, Each row is, Ends, Direction, Read as, Role -- a wall of settings he never set, reminiscent of the tool he avoids | 2 |

## What worked for him

- "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1" answered the count he
  would have checked against "core-300", with the names.
- Each choice in the "Read as" list said its result in counts (2,298 edges, 150 without a weight;
  2,148 edges, 150 rows not loaded), so he could check the arithmetic.
- The sample of NA rows, with line numbers and gene names, let him spot something odd in the data
  (the blanks he saw were all coexpression).
- No install, no sign-in.

## What he noticed about the data ("anything off")

- 150 confidence values are "NA"; the five rows he was shown were all coexpression evidence.
- The file is named core-300 but only 298 proteins have a partner; GSK3B and NOTCH1 have none.
- The same protein pairs appear on several rows, one per evidence source, so there are two
  different "number of interactions" (2,298 rows, 1,262 pairs).
