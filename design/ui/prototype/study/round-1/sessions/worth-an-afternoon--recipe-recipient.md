# Session: is this file worth an afternoon? -- the recipe recipient (Tom)

Participant: Tom, lab manager, cell biology lab. Receives network files from the lab's
postdoc; never builds one. Mild red-green colour weakness, reading glasses, 1440 by 900 laptop.

Task as given by the moderator: "A colleague sent you this file. Decide whether it is worth
your afternoon, and tell me anything that looks off."

Screens used, in order: the start screen (first run, and the moment a file is dropped on it),
the step that checks a file's columns before it loads (the version where the weight column is
read as text), and the main window once a graph is open.

Outcome: loaded, with help from guessing. He could not decide whether the file was worth his
afternoon. Single Ease Question: 3 of 7.

---

## Transcript

**Start screen, nothing opened yet.**

> Tom: OK. "Open a graph." Big white page, some little pictures. Karate club, Les Miserables...
> none of these are mine. Where's the file she sent? Oh -- I have to bring it in myself. Right.
>
> Underneath the heading: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Hm. That's the first thing I'd want to know, so good. I'd still like IT to
> tell me that, not the page itself. But fine, it's not our hits, it's her file, I'll go on.
>
> It's small grey writing, though. I had to lean in.

He drags the attachment from email onto the window (his first move with any file).

> Tom: Box goes blue. "Drop to open as a new project -- the columns are checked before anything
> loads." Checked by who? By me? I'll let go and see.

**The column check, weight read as text.**

> Tom: Whoa. OK. That's a lot. "Open ppi-core-300-evidence.tsv." That's her file, good, the
> name's right.
>
> Format, "Each row is", Ends, Direction, Undirected... Read as, Role, End, End, Edge type,
> Weight. I don't know what any of this wants from me. She said "just open it". I thought it
> would look like the picture on her slide.
>
> There's red. On the right: "confidence is read as text, so it cannot weigh edges. 150 of 2,298
> values are NA; the rest are numbers between 0 and 1." And down at the bottom in red, "Load is
> off: choose how to read confidence". And the Load button's greyed out.
>
> So I can't even look at it until I answer a question about her column. Is that my fault or
> hers? NA -- that's "not available", R puts that in. So it's her file, not me. At least it
> tells me it's 150. I'd want to count that myself in Excel before I believed it, but I believe
> it's roughly right.

He looks at the table of five rows with red NA in the confidence column.

> Tom: PSMA4, PSMD2, coexpression, NA. OK, those are proteasome subunits, I know those. So the
> rows with no number are coexpression ones. That's actually useful, that's something off in
> her file I'd ask her about.

He opens the red "Choose how to read it" list (in the render it is open under the confidence
row on the left).

> Tom: Three choices. "Number, NA as missing." "Number, drop the rows with NA." "Text."
> I read the first line of each. Drop -- no. I'm not throwing away 150 rows of her data. Text is
> what it is now and it's broken. So the first one. "2,298 edges; 150 of them without a weight."
> Fine, keep everything, some have no weight. That sounds like "leave it alone", which is what I
> want.
>
> Moderator: What do you expect happens when you pick it?
>
> Tom: The red goes away and the button turns blue. That's all I'm after.

**After choosing "Number, NA as missing".**

> Tom: Red's gone. Blue Load button. Good. But now there's a yellow one: "1,036 extra parallel
> edges." Parallel? Like parallel lines? "Several rows join the same two proteins, one per
> evidence source." And a list: "Keep all: 2,298 edges" or "Merge into one, max of confidence:
> 1,262 edges."
>
> I don't know. That's nearly half. Is that a problem or is that normal? It's yellow, not red,
> so I'm guessing it's not stopping me. I'm leaving it on whatever it was. Keep all -- again,
> don't change her file.
>
> And on the left now there's "confidence as a weight means: Similarity, Distance, Capacity,
> Unknown", and "As a distance: 1 - w". I'm not touching that. That's her job. I don't know
> which one it is and I'm not learning it at four o'clock. Is it something I need? It doesn't
> say.
>
> "What will load: nodes 298, edges 2,298, without a weight 150." Those numbers I like.
> 298 proteins. If she told me 300 I'd want to know where the other two went, but it's close.

He presses Load.

**Main window.**

> Tom: ...That's not her file. "Les Miserables, miserables.json." Valjean, Cosette. I opened a
> protein file.
>
> Moderator: This part of the prototype shows a different graph. Pretend it's your file.
>
> Tom: All right, but if that happened for real I'd be on the phone to her. "I opened it and it
> turned into a book."
>
> Pretending. Big coloured picture in the middle, labels on the big dots. Colours, a key down
> the bottom left: "Group color, 2, 8, 4, 1, 3, 5, 0, Other." Group 2 is 14 of them. What's
> group 2? It's a number. In our file would that be the complex? The pathway? It doesn't say
> what the groups are. I couldn't read that key to the PI.
>
> "Size by degree, 1, 10, 36." Degree of what? Bigger dot, more lines coming off it, I think.
> I'd guess.
>
> Colours -- the blue and the light blue I can tell apart, orange and yellow-orange I can just
> about. Nothing's red and green, so no complaint there.
>
> Right side: Nodes 77, Edges 254, "undirected, weight: value". Density 0.0868. I don't know
> what density tells me. Connected components, "2 (1 isolate)". Degree distribution, a tiny bar
> chart. That's a statistics panel. I skip those.
>
> There's "Replace" next to "Overview: General". I'm not clicking that. Replace what? And at the
> top, the file name in a little tag; I clicked it and it says "Opened from this computer, Read
> Sep 28, 10:42" and a button "Replace data...". Again. I don't want to replace anything, I
> want to know who made it and what the colours are.
>
> Top right, a blue "Export..." button. That's probably my slide. Good that it's there, I'd
> find that.
>
> And on the left, "Styles: Group color, Size by degree, Base style". Is that "the lab's
> colours" she talks about? Maybe. I wouldn't click them.
>
> Moderator: So, is this file worth your afternoon?
>
> Tom: I can't tell you. It opened, eventually, after I answered two questions I didn't
> understand. The picture's pretty. What's it telling me? The page tells me it has 77 things and
> 254 lines and it's got groups numbered 0 to 8. It doesn't tell me what she thinks it shows.
> What I'd take back to her is the NA thing: 150 coexpression rows have no confidence. That's
> the one real thing I found, and I found it on the loading screen, not in the picture.
>
> I also don't know if I changed her file. I picked "NA as missing" and "keep all". Does that go
> back into her file? Next time she opens it, is it different? Nothing said.

## After the task

**Single Ease Question: 3 of 7.**

> Tom: The opening page was fine, and it told me where the file goes, which I did want. Then I
> hit a wall with Load turned off and a question about her column. I got past it because the
> first choice sounded like "don't change anything". If the first choice had been the drop one,
> I'd have picked that too, honestly. Then another question about parallel edges and a
> similarity-distance thing I just left alone. That's two guesses to open one file.

**Would you use this instead of what you use now?**

> Tom: What I use now is her sending me a PNG and an Excel sheet. This is better than
> Cytoscape -- nothing to install, didn't need IT, and it said it wasn't uploading. But she
> could have just sent me a PNG. If she'd set the NA thing and the parallel thing before she
> sent it, and it opened straight to her picture with a key that said what the groups are, then
> yes, I'd use it. The way it is, I'd open it, see it wants me to decide things, and email her.

## What looked off, in his words

- "It asked me how to read her column before it would show me anything."
- "I picked the first option because the second one said drop. I don't know if it was right."
- "Parallel edges, nearly half of them. Yellow. Is that bad? I don't know."
- "Similarity, distance, capacity, 1 - w. Not my job."
- "The key says group 2, group 8. Group of what?"
- "Replace, Replace data. Twice. I didn't want to replace anything."
- "Nothing told me whether her file changed."
- "The 150 rows with no confidence -- that I would take back to her. That was useful."

## Moderator notes

- He found the planted defect (the confidence column read as text because 150 values are NA)
  and correctly blamed the file rather than himself. The count and the five sample rows did that.
  He then resolved it by reading only the first line of each choice and avoiding the word "drop",
  not by understanding the choice.
- He left the parallel-edge list and the weight-meaning control untouched on the grounds that
  they were not his to decide. A different default would have been accepted just as silently.
- The prototype's main window shows a different dataset from the file loaded in the column
  check; the moderator had to intervene. In a real session this is the "that's not what she
  sent" moment that ends his patience.
- He never found an answer to "is it worth my afternoon": no title, author or statement of what
  the sender meant the picture to show, and a legend of bare group numbers.
- The legend title reads "Group color" in one state of the main window and "Color by group" in
  another.
