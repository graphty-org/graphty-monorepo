# Is this file worth an afternoon? -- Explorer Elena

Participant: Explorer Elena, a product manager with no graph training (simulated).
Task as the moderator gave it: "A colleague sent you this file. Decide whether it is worth your
afternoon, and tell me anything that looks off."
Screens, in order: the start screen, the load step (the file's import dialog, in the state where
its weight column is read as text), the graph at rest.
The planted problem: the file's number column is read as text, and Load is switched off until
she chooses how to read it.

## Transcript

**Start screen.**

> OK. "Open a graph." Four little pictures -- karate club, Les Miserables, proteins, bank
> transfers. Those are someone else's graphs, not mine. The bank one is just a grey smudge.

> "Files stay on this computer ... uploads nothing." Good, actually, because this is from a
> colleague and I would not want to put it on some random website. That's the first thing I'd
> have asked.

> My file is in Downloads. I'd normally just drag it onto the window. There's nothing that says
> I can drop it here, so ... I'll click "Open...". It's kind of tiny down there under the
> pictures. I almost read it as a footnote.

> "Connect to data source" -- no, I don't have a data source, I have a file.

**Load step, first look.** (She is shown the dialog for ppi-core-300-evidence.tsv.)

> Whoa, OK. That's a lot of form. "Open ppi-core-300-evidence.tsv." So it's proteins. My
> colleague is in -- I don't actually know why they have proteins. Fine.

> Left side: Format, "Each row is: An edge", Ends, Direction. I don't know what an edge is
> exactly. I think it's the lines? "Ends: protein_a -- protein_b." OK, so a line from one protein
> to another. That's actually kind of clear once I stare at it.

> "Direction: Undirected." I'm not touching that.

> There's a red X next to "confidence" and a black menu is open with "Number, NA as missing",
> "Number, drop the rows with NA", and "Text" with a tick. Why is it Text? It's numbers. Did my
> colleague export it wrong? The little table on the right shows NA in red -- oh, some of them are
> NA. So it's their spreadsheet. Or maybe I did something when I downloaded it.

> Bottom left, red: "Load is off: choose how to read confidence." OK. So it won't let me go on.
> That's -- honestly that's better than it just loading and being weird later. At least it tells
> me what button to press.

> Which one do I pick? "NA as missing: 2,298 edges; 150 of them without a weight." "Drop the rows:
> 2,148 edges; the 150 rows are not loaded." I don't want to throw away rows from someone else's
> file, I don't know what they mean. Keep them. I pick the first one, "NA as missing."

> (Moderator reads her the next state: the confidence column now says Number, NA as missing.)

> Now there's a whole new thing under it. "confidence as a weight means: Similarity, Distance,
> Capacity, Unknown." ... I have no idea. It was on Unknown before and it jumped to Similarity? Did
> I do that? "Larger is closer." "As a distance 1 - w." "1/w, -log w." This is the Gephi feeling.
> I'm not going to pretend I know what minus log w is. I'd leave whatever it picked.

> And "Weight" in that second column. Weight of what? The protein? I thought confidence was how
> sure someone was. I'd have guessed weight means how big the dot is.

> Now the yellow one: "1,036 extra parallel edges." Parallel? Like, lines on top of each other?
> "Several rows join the same two proteins, one per evidence source." So the same pair is in
> there more than once. Is that a mistake in the file? That's more than a third of the rows. That
> is exactly the kind of thing I'd want to tell my colleague -- "hey, half your file is repeats" --
> except I don't know if it's a mistake or normal for proteins.

> "Keep all" or "Merge into one, max of confidence: 1,262 edges." The merge one sounds tidier but
> then it says "the source column is not kept." I don't want to lose stuff. Keep all. Whatever it
> picked.

> "What will load: nodes 298, edges 2,298, without a weight 150." Nodes, I think, are the dots.
> 298 dots. The file name says 300. So two went missing? It doesn't say why. Probably something in
> the file. I'll ignore it. ... Actually that does bug me a little. It said 300 in the recent list
> too.

> Load. Blue button. Click.

**The graph at rest.** (She is shown the at-rest frame, which is the Les Miserables graph, not
the protein file.)

> OK wait -- "Les Miserables"? "miserables.json"? That's not my file. Did it open the sample? Did
> I click the sample picture by accident? ... The names are Valjean, Javert, Cosette. That's not
> proteins.

> (Moderator: "Pretend this is your file.")

> Fine. It's actually nice. Colours, some names, not a hairball. It's holding still. The yellow
> clump in the middle with the big dot, Valjean -- that's the most important one, it's the biggest
> and it's right in the middle. So in my file that would be the protein everything depends on.

> Legend bottom left: "Group color 2, 8, 4, 1, 3, 5, 0, Other." Groups called 2 and 8? What's
> group 8? Numbers aren't names. "Size by degree, 1, 10, 36." Degree. There it is. I don't know
> what degree means. Temperature? I'm going to assume big means important.

> Right side, "Statistics: Nodes 77, Edges 254, Density 0.0868, Connected components 2 (1
> isolate), Degree distribution" with a little bar thing. Density 0.0868 -- is that a lot? Is that
> good? "1 isolate" -- that's probably the lonely dot out on the left. That one I get, that's
> actually useful, "one thing on its own."

> "weight: value" under Edges. I spent three minutes choosing what weight means and it just says
> "value". Did my choice stick? I can't tell.

> Left rail: Graph, Assistant, Results, Notes. "Assistant" is greyed out. If there's an assistant
> I'd ask it "what am I looking at", but it looks switched off.

> Would I spend my afternoon on it? ... It opened, it didn't make me install anything, it didn't
> crash, and the picture is not a mess. But I still can't tell you whether the file is interesting.
> I'd screenshot the picture, send it back to my colleague with "did you know a third of the rows
> are repeats and 150 have NA?", and ask them what the big dots mean. That's the useful part --
> the dialog told me stuff about the file I wouldn't have seen in Sheets without a pivot.

## What looks off, in her words

- "It said the file was 300 proteins and then it said 298 dots. Where did two go?"
- "It opened a totally different graph. Or I did something wrong." (She blamed herself first.)
- "It asked me what weight 'means' and gave me math. I just want it to pick one and tell me."
- "Group 2, group 8 -- those aren't names."
- "Nothing told me I could just drag the file in."

## Single Ease Question

**4 of 7.** "I got through it, but only because the red message told me which box to fix. The
weight-means part I just left alone and hoped."

## Would she use it instead of her current tool

"Instead of Sheets? No -- Sheets is where the file lives. Instead of never looking at it as a
picture? Maybe. It ran in the browser, it said it wouldn't upload anything, and the import thing
caught problems in my colleague's file that I'd have missed. But once it drew the picture it
started saying 'degree' and 'density' at me and I stopped knowing what was going on. If it told
me in plain words what the big dots and the groups mean, I'd give it the afternoon."

## Notes for the studio (moderator)

- She resolved the planted problem correctly and quickly: the red footer message and the red
  select were enough, and each choice's row count let her pick "keep" without understanding the
  term NA. She read the block as helpful, not as an error she caused -- though she first guessed
  the export was at fault.
- She did not understand "confidence as a weight means" and did not notice it switch from Unknown
  to Similarity between states; she read "Weight" as the size of a dot.
- She read "1,036 extra parallel edges" as a possible data error, which is a useful reading for
  her goal (telling the colleague what is off), but she could not tell whether it was normal.
- The 300 in the file name and recent list against 298 nodes was noticed and not explained on
  screen.
- The at-rest frame shows a different dataset from the file she loaded; she took it as her own
  mistake before the moderator intervened. The flow as a sequence breaks here.
- On the graph she confidently read size and centrality as importance, and group numbers as
  meaningless labels; "degree" and "density" were not understood.
- She missed the drop-to-open behaviour: nothing on the start screen says a file can be dropped.
