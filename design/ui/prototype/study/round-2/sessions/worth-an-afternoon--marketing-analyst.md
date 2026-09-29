# Worth an afternoon? -- Jordan, marketing network analyst

Participant: Jordan, growth-marketing analyst who does "the network stuff" one or
two days a week (persona: study/personas/marketing-analyst.md).

Moderator's task, as given: "A colleague sent you this file. Decide whether it is
worth your afternoon, and tell me anything that looks off."

Screens, in order: the start screen, the load step (the file opens with its
weight column read as text), then the main frame once the file is loaded.
Renders read: shots/screens__start-screen.png, shots/s2-jordan-blocked.png,
shots/s2-jordan-policy.png, shots/s2-jordan-far-ppi.png.

Planted problem: the colleague's file has a "confidence" column that the tool
reads as text because 150 of its values are "NA".

---

## 1. Start screen

> OK. "Open a graph." Plain. I like that nothing is asking me to sign up. First
> thing I look for is where my file goes -- and it's right there under the
> title: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Good. That's the sentence I'd paste to legal. There's a
> "Where your data goes" link, so I'd send that to IT instead of paraphrasing
> it.
>
> "Projects are kept in this browser." Hm. Which means if I clear Chrome, or my
> laptop gets reimaged, it's gone? I'd want to know that before I spend an
> afternoon. I'll come back to it.
>
> Samples: karate club, Les Miserables, proteins, bank transfers. None of these
> is my world. The bank one is a grey blob -- that's the hairball, literally
> the thumbnail is a hairball. Anyway, I have a file, I don't need a sample.
>
> Where do I drop it? I'm looking for a big dashed "drag your CSV here" box and
> there isn't one. There's "Open..." down under the samples, kind of small. I'd
> probably just drag the file onto the window and hope. [Moderator: that
> works.] OK, but nothing told me that. I'd have clicked Open... after a
> second of hunting.
>
> "Connect to data source..." -- no. That sounds like a connector to Snowflake
> or whatever, that's an IT ticket. Skip.

Clicks: Open... (would have tried dragging first).

## 2. The load step -- the colleague's file

> "Open ppi-core-300-evidence.tsv." PPI? Protein-protein... this is the
> bio-people's file. Fine, my colleague sent it, maybe he wants a second pair
> of eyes, maybe it's a test. It's a TSV, not a CSV, and it read it without
> asking me about delimiters. That's already better than Excel.
>
> Left side: Format, "Each row is: An edge", "Ends: protein_a -- protein_b",
> Direction "Undirected". "Ends" is a weird word, I'd have said "from / to" or
> "source / target", but I get it. I'm not touching any of those -- they look
> right and I don't know enough to argue.
>
> Right side, top, red: "confidence is read as text, so it cannot weigh
> edges. 150 of 2,298 values are NA; the rest are numbers between 0 and 1."
> OK, that's actually a clear sentence. I know exactly what happened: someone
> exported from R or pandas and the blanks came out as the letters N-A. That
> happens to me every other week with the listening-tool export -- and nobody
> ever tells me, I just find out when a sum in Excel is wrong.
>
> And the footer says "Load is off: choose how to read confidence." Load is
> greyed. Honestly -- mixed feelings. I'm glad it caught it. I'd also be a
> tiny bit annoyed that I can't just look at the thing first. But it told me
> why in one line, so fine.
>
> There's a dropdown in the red row, "Choose how to read it", and there's the
> same thing on the left next to confidence, which says "Text". I click the
> one on the left because that's where my eye is.
>
> Menu: "Number, NA as missing -- 2,298 edges; 150 of them without a weight."
> "Number, drop the rows with NA -- 2,148 edges; the 150 rows are not loaded."
> "Text -- cannot weigh edges." I like that each one tells me the count I'll
> end up with. That's the kind of thing I'd put in a footnote: "150 rows had
> no score and were kept unweighted." I pick "NA as missing", because I don't
> throw away data I didn't collect.
>
> The table on the right shows me the actual NA rows with line numbers. Line
> 29, 31, 44... all "coexpression". Huh. So is it one evidence source that has
> no score? That's the thing I'd ask my colleague about. Nice that I can see
> it -- I wouldn't have spotted that pattern otherwise.
>
> Wait, what's the Role "Weight" -- did I set that? No, it came like that. So
> "weight" here means the strength of the connection, not what I mean by
> weight, which is "make the big ones big". OK. Noted. I would've got that
> wrong on my own file.

Clicks: the column's "Read as" menu, then "Number, NA as missing".

> Now it says "Issues 1" -- "1,036 extra parallel edges. Several rows join the
> same two proteins, one per evidence source." Parallel edges. I've never said
> "parallel edges" in my life. I think it means the same pair shows up more
> than once -- like the same two accounts replying to each other five times.
> The dropdown says "Keep all: 2,298 edges" or "Merge into one, max of
> confidence: 1,262 edges". For my mention data I'd want to keep all, the
> repeats ARE the engagement. Here I don't know. Default is keep all, and it's
> yellow not red, so I leave it.
>
> Bottom: "What will load: nodes 298, edges 2,298, without a weight 150". And
> a line: "298 nodes -- 2 proteins in the file have no interaction: GSK3B,
> NOTCH1." Oh, that's good, because the file is called core-300 and my first
> thought was "where are the other two". It answered the question before I
> asked it. That's the Brandwatch problem -- the dashboard says 4,000, the
> download says 3,100, and nobody says why. This one says why.
>
> Load. It's blue now.

Clicks: Load.

## 3. The main frame, loaded

> ...Hang on. Top-left the file chip says "ppi-core-300.g..." -- that's not
> the file I opened. Mine was "...-evidence.tsv". And Statistics says Nodes
> 300, Edges 1,262. The load screen literally just told me 298 and 2,298. I
> kept all. So which is it? 1,262 is the "merge" number, which I didn't pick.
> And 300 is the number it just explained was really 298.
>
> [Moderator: what would you do?]
>
> Honestly this is where I'd stop trusting it. That's exactly my screen-says-
> 4,000-download-says-3,100 thing. It was so careful on the load screen and
> then the main screen contradicts it. If this is a real bug, I'm out. If it's
> just your mockup, fix it, because I read the numbers first.
>
> Also: the colours. "Module color" -- Ribosome, Proteasome, Complex I, MAPK
> signalling. Where did those come from? The file I loaded had four columns,
> none of them "module". So either it computed clusters and named them -- which
> would be amazing and also I'd want to know how -- or this is a different
> file. I assume a different file.
>
> OK, setting that aside and judging the screen itself. The map is readable.
> It's not a hairball, there are eight coloured clumps, labels on the big
> ones, and a legend in the corner with counts. The legend is what I'd
> screenshot for the deck -- "what's purple" is answered, well, "what's pink"
> is "Cell cycle". Size by degree, 1 to 34. Fine.
>
> "This browser. Nothing sent." under the title, and the Assistant says "Off.
> Nothing is sent." Good, consistent. I'd still ask IT once.
>
> Statistics: density 0.0281, connected components 3 (2 isolates). Wait --
> isolates. The load screen said GSK3B and NOTCH1 have no interaction and
> weren't loaded. Here there are two isolates. Same two? Then they WERE
> loaded? I'm going in circles.
>
> What I don't see: a table. I want to sort by something and copy the top 40.
> There's "Results" on the left rail, maybe that's it? There's "Export
> files..." top right -- I'd click it and I bet I get a picture when I want a
> CSV. I'd also look for a button that says something like "find the
> connectors" and there isn't one; the lightning bolt at the bottom maybe? I
> wouldn't click a lightning bolt without knowing what it does.
>
> Edges says "undirected, weight: confidence". Good, it remembered my choice
> about the column. That part's consistent.
>
> [Off-topic] You know what I'd actually love? If my listening vendor exported
> files this cleanly. Since the Twitter API went paid I get whatever CSV they
> feel like, with "N/A", "-", and blanks all in the same column. If this thing
> catches that on load, that alone saves me the Excel pass.

## Verdict

**Worth the afternoon?** For this particular file -- no, not for me. It's a
protein network; I'd open it, see it's clean except the NA thing, and send my
colleague two lines: "confidence has 150 NA, all look like the coexpression
rows -- intended?" and "GSK3B and NOTCH1 have no partner in the TSV." The load
screen gave me both of those in about a minute, which is honestly the most
useful thing that happened.

For the tool, on my own data: maybe. The load screen is the best import I've
seen -- it told me what was wrong, what each fix would cost in rows, and why a
count was lower than the filename. Then the main screen showed me numbers that
didn't match what I'd just been told, and a file name that wasn't mine. If
that's real, it undoes all of it.

**Single Ease Question: 4 / 7.** Loading was a 6. Deciding whether the result
is trustworthy was a 2, because the numbers changed between screens.

**Would I use it instead of my current tool?** Instead of Brandwatch, no -- we
pay for that and it collects the data. Instead of Gephi for the actual map,
yes, I'd try it on my next mention export: no install, it says nothing leaves
the laptop, and the import catches the junk values. But I need to find the
table and get a CSV out before I'd bring it to my manager, and I didn't see
where that lives.

---

## Problems observed

1. **Numbers and file change between load and main screen (severity 4).** Load
   step: 298 nodes, 2,298 edges (Keep all), file ppi-core-300-evidence.tsv.
   Main frame: 300 nodes, 1,262 edges, file chip "ppi-core-300.g...", legend
   from a "module" column the TSV does not have, 2 isolates the load step said
   were not loaded. Participant stopped trusting the tool.
   "It was so careful on the load screen and then the main screen contradicts
   it."
2. **No visible drop target on the start screen (severity 2).** Dropping
   anywhere works, but nothing says so; "Open..." is small and below the
   samples. "I'm looking for a big 'drag your CSV here' box and there isn't
   one."
3. **"Parallel edges" and "Ends" are jargon (severity 2).** She guessed right
   about repeats, but only by analogy with reply counts; left the default
   without understanding. "I've never said 'parallel edges' in my life."
4. **"Weight" role clashes with her meaning (severity 2).** She uses "weight"
   for "sized by"; the pre-set role on confidence means connection strength.
   She noticed only because the planted column was already Weight. "I would've
   got that wrong on my own file."
5. **Two places to fix one setting (severity 1).** The issue row's dropdown
   and the column's Read as field are the same value; she used the column one
   and was briefly unsure whether the issue-row one also needed setting.
6. **No table or CSV route visible on the main frame (severity 3).** She looked
   for a sortable table and a CSV export; saw "Results" and "Export files..."
   and expected a picture. "I bet I get a picture when I want a CSV."
7. **"Projects are kept in this browser" raises a loss worry (severity 1).**
   Read as "gone if Chrome is cleared", with no route shown on the start
   screen.

## What worked

- The lock line under "Open a graph" answered her data question before she
  asked it.
- The blocking issue said what happened, in counts, in one sentence, and each
  fix stated how many rows it would keep.
- The sample showed the NA rows themselves with line numbers; she spotted the
  pattern (all coexpression) herself.
- "298 nodes -- 2 proteins in the file have no interaction: GSK3B, NOTCH1"
  explained a count lower than the filename before she asked.
- Legend with counts on the map; not a hairball.
