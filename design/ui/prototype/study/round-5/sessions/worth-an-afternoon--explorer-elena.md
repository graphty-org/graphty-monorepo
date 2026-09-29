# Is this file worth an afternoon? -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training. Lives in spreadsheets,
Slides charts and her company's analytics dashboard. Has never said "degree" or "node" out loud.
Played in the long-clock variant: a curious afternoon, three or four dead ends tolerated.

**Task as given:** "A colleague sent this file. Is it worth an afternoon?"

**Screens seen (study view, 1440 by 900, design notes hidden):**

- Start screen: `shots/tasks/worth-an-afternoon/01-start-screen.png`
- Open dialog, the confidence column read as text: `shots/tasks/worth-an-afternoon/02-load-step-blocked.png`
- Open dialog, pairs that repeat: `shots/tasks/worth-an-afternoon/03-load-step-policy.png`
- The loaded graph: `shots/tasks/worth-an-afternoon/04-frame-at-rest.png`
- Shown by the moderator when she asked how to find "the important ones": the Quick actions
  frame and the Betweenness result frame of the first-look storyboard (`storyboards/first-look.html`,
  product frames only)

**Outcome:** success with difficulty on loading, failure on the question. She got the file in
without losing anything and was pleased by that. She could not say whether the file was worth an
afternoon, because nothing on the loaded screen told her what the file was about or what was
interesting in it, and she did not recognise a single name on it. Her answer was about the tool,
not the file: "for my accounts export, maybe; for this, I'd ask the person who sent it."
Engagement dropped at the statistics panel.

---

## Transcript

### 1. Start screen

> OK. "Open a graph." Files stay on this computer, uploads nothing. Fine, good, I wasn't going to
> read the rest of that.
>
> Samples. Karate club, Les Miserables, protein interactions, bank transfers. Cute. I don't need a
> sample, somebody sent me a file.
>
> I'm just going to drag it in. (Drags the file from her Downloads folder onto the middle of the
> empty white area.) Does that work? There's no "drop here" box.
>
> (Moderator: "In the real app, dropping it anywhere does the same as Open. Go ahead.")
>
> OK, good. I'd have tried "Open..." next anyway. What's "Connect to data source"? Doesn't matter.

### 2. The Open dialog, first look

> Whoa, OK. That's a lot. "Open ppi-core-300-evidence.tsv." ... What is "ppi"? Is that some
> finance thing? Oh -- "protein_a", "protein_b". It's proteins. Why did Marco send me proteins?
> Fine. Maybe it's the example he means.
>
> Left side, Format, "Each row is: An edge". I don't know what an edge is but it picked it, so I
> trust it. "Ends: protein_a -- protein_b." OK so those are the two things that connect. That I
> get. That's my Account and Integration columns, basically.
>
> Right side: "Issues 2". Oh no, I did something. (Reads the highlighted line.) "confidence is
> read as text: 150 of 2,298 scores are NA." NA... not applicable? So some rows don't have a
> score. That's -- honestly that's probably fine? Our exports have blanks all the time. Did he
> export it wrong or did I open it wrong?
>
> And there's already this black menu open over everything. "Number, NA as missing." "Number,
> leave out the rows with NA." "Text." Text has the check mark. The top one is blue, so I guess
> blue is the one it wants me to pick? (Clicks "Number, NA as missing".) It says 2,298 edges, same
> as before, and "150 of them with no confidence". So I keep everything. I'm not picking "leave
> out", I'm not throwing away his rows.
>
> (Moderator, afterwards: the blue row was only the one under the pointer, not a recommendation.
> She: "Oh. Well, it looked like the recommended one. Same thing in our dashboard filters.")

### 3. Pairs that repeat

> Now it's "Issues 1". OK, one gone, that feels like progress. "865 pairs appear more than once."
> That sounds bad. Duplicates? "Each row is one evidence source for a pair (parallel edges)."
> Parallel edges. No idea. Evidence source -- so there's a column saying where it came from?
> Yes, "source": databases, textmining, experiments. OK so the same two proteins show up three
> times because three places said so. That actually makes sense, I read the little table and got
> it.
>
> (Opens the dropdown.) "Keep each: 2,298 edges." "Combine into one: 1,262 edges ... The source
> column is not kept." Not kept. No. I'm not deleting a column from someone else's file. Keep each.
> I didn't read the rest of that paragraph.
>
> Down here, "What will load": 300 nodes, 2,298 edges, 150 with no confidence. "2 proteins have no
> partner in the file: GSK3B, NOTCH1. They are loaded unconnected." Oh, I like that. It's telling
> me it didn't lose them. That's the thing I always worry about -- stuff just vanishing and me not
> knowing. OK.
>
> "Weight: confidence, not used yet." Not used yet by who? I'll find out later, I guess.
>
> Left side, "source" says "Edge type" and the others say "end". I'm not touching those.
>
> Wait, behind the box it says "Recent: Human protein interactions (300 proteins), Sep 21." I
> didn't open anything on Sep 21. Is that someone else's? (Moderator: "Ignore the background.")
> OK.
>
> Load. (Clicks Load.)

### 4. The loaded graph

> Ooh. OK. That's -- yeah, there are clumps. There's a clump top left, one on the right, one at
> the bottom, one bottom right. That's kind of nice actually, it's not the spaghetti I expected.
>
> And there are names in the middle. UBC, UBB, MYC, AKT1, HSP90... So those are the important
> ones, right? They're in the middle of everything. UBC is dead centre, so UBC is the main one.
> (She states this as fact.)
>
> (Reads the small card at the bottom left.) "Labels: the 12 proteins with the most partners. 2
> more hidden where they overlap." Oh, so it's the ones with the most connections. OK, same thing,
> the busiest ones. I still think the one in the middle is the main one.
>
> These dots out on their own -- top right, bottom -- those are probably the two it told me about,
> the ones with no partner. (Several dots sit apart from the clumps; nothing on the canvas marks
> which two are the unconnected ones. She picks two and moves on.)
>
> The dots are all grey. Is grey good or bad? There's no colour. In the samples on the first
> screen they had colours, why is mine grey?
>
> Top left: "Human protein interactions." Where did that name come from? My file's called
> ppi-something. "Nothing has been sent from this project." OK, nice, you keep telling me that.
> "Evidence rows" under Graphs. That's highlighted. Is that the graph or is that the table? Not
> sure.
>
> Now what. The question is, is this worth an afternoon. I'd click the biggest dot, but they're all
> the same size. (Clicks near UBC on the canvas.) Does it tell me what UBC is?
>
> (Moderator: "That screen isn't part of this set. What would you look at on this screen?")

### 5. The right-hand panel

> Right side. "Graph. Background: Theme. Layout: Force-directed." Don't know, don't care.
>
> "Statistics." Here we go. "Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing,
> repeated pairs kept..." yes, that's what I picked, good. (She stops reading there. The line goes
> on: "no numeric edge column", although she had just set confidence to read as a number. She did
> not see it.)
>
> "Overview: General." "Change overview..." Change it to what? I'm leaving it.
>
> Nodes 300, edges 2,298. OK, matches the box before. That's reassuring, I checked that.
>
> Density 0.0281. Is that a lot? There's an i. (Hovers; the mock has no tooltip text, so the
> moderator says nothing.) Still don't know if it's a lot.
>
> Connected components: "3 (2 isolates)". Three... groups? But I can see like four clumps. So
> it's saying three. Hm. Oh, 2 isolates, those are the two lonely ones. So one big thing plus two
> lonely ones is three. So the clumps don't count as groups. OK, that confuses me a bit.
>
> Degree distribution, little bars. Skipping. Attributes 2, "5 more".
>
> Style stack, Base style. Results, plus. Plus what?
>
> (Pause.) Yeah. OK.

*Engagement dropped here: answers shortened, she stopped trying controls on the right panel.*

### 6. Moderator prompt: "How would you find out what's interesting in it?"

> I'd want a button that says "show me the important ones." There isn't one... is there?
> (Looks at the toolbar at the bottom: an arrow, a squiggly thing, a lightning bolt, "2D".) The
> lightning, maybe? Lightning is usually "quick" something. I wouldn't have clicked it on my own,
> I thought it was like a boost mode.
>
> (Moderator shows the Quick actions frame from the first-look storyboard: a search box with "who
> matters most" typed, listing Betweenness, PageRank, Closeness, Degree, each with a short
> meaning.)
>
> Oh -- OK, that's what I want. "Betweenness -- who sits between the groups." That one. That's the
> first time a word like that came with an explanation. I'd never have typed "who matters most"
> though, I'd have typed... "important"? Would that work? (Moderator: can't say.)
>
> "value's meaning is not set, so it runs unweighted." What's value? I don't have a value, I have
> confidence. Is that the same? It's a different file. I don't know.
>
> (Moderator shows the result frame: a bar chart, "47 of 77 characters score 0. Valjean alone
> scores 0.57", a Top nodes list.)
>
> OK, that list I can use. Top 5, one number each, and it says most of them are zero. That's the
> thing I'd paste in Slack. But that's Les Miserables, not this. For this file I'd get "UBC, 0.something"
> and I'd have no idea what UBC is.

### 7. Her verdict

> Is it worth an afternoon? For me, this file? No. I can see it has clumps, and it loaded clean,
> and nothing went missing, which honestly is more than I expected. But I don't know what a
> single one of these names means, and nothing on the screen told me what's interesting. It told
> me it has 300 of them and a density. I'd message Marco: "It opens fine, it's got four or so
> clusters and a handful of really connected ones in the middle -- UBC, MYC, AKT1. What did you
> want me to look at?"
>
> For my own accounts export, maybe an afternoon. The load bit was actually the best part. If I
> could get that list thing -- the top ones with one number -- on my accounts, I'd use it.

---

## After the task

**Single Ease Question (1 very difficult -- 7 very easy):** 4.

> Loading was fine, like a 5 or a 6, once I stopped panicking about "Issues". But the question was
> "is it worth it" and I couldn't answer it from what I saw, so I can't say it was easy.

**Would she use this instead of her current tool?**

> My current tool is a spreadsheet and a bar chart, so... it's not instead, it's in addition. I'd
> try it with my own export, because it's in the browser, it didn't want an account, and it told
> me it didn't drop anything. I wouldn't use it for someone else's file I don't understand. And
> I'd want colours or something on my first picture, not all grey.

---

## What she got wrong, and did not correct

- Read the highlighted row in the confidence menu as the tool's recommendation. It was the row
  under the pointer. Her choice happened to be a reasonable one.
- Said "UBC is dead centre, so UBC is the main one." Position on the canvas carries no meaning;
  the labels mark the twelve proteins with the most partners. She read the label card and kept
  her reading anyway.
- Picked two lone dots as the two proteins "with no partner". Several dots sit apart on the
  canvas and nothing marks which two are the unconnected ones, so her pick is a guess.
- Took "Connected components: 3" as "the clumps don't count as groups", and was left believing the
  tool disagreed with what she could see.
- Did not see that the summary line says "no numeric edge column" right after she chose to read
  confidence as a number. She stopped reading the line after the part that matched her choices.

## Problems found

| Where | What happened | Severity (Nielsen 0-4) |
|---|---|---|
| Loaded graph | Nothing tells a newcomer what is interesting: no groups coloured, no "the most connected are..." summary, only counts and a density with no scale. She could not answer the task from this screen. | 3 |
| Loaded graph, Statistics | "Connected components 3" contradicts the four clumps she sees; she concluded the tool and the picture disagree. | 3 |
| Loaded graph, Statistics | The summary says "no numeric edge column" after she set confidence to read as a number. She did not notice; a reader who does would stop trusting the load. | 3 |
| Loaded graph, toolbar | The lightning button is the way to the one thing she wanted (who matters most); she read it as a speed setting and would not have clicked it. | 3 |
| Open dialog, confidence menu | The menu opens by itself over the dialog, and the hovered row looks like a recommendation. | 2 |
| Open dialog, repeated pairs | "parallel edges", "Edge type", "end" and "Weight: not used yet" are words she skipped; she decided by avoiding the option that deletes a column, not by understanding it. | 2 |
| Open dialog | "Issues 2" in a warning colour made her think she or the sender had broken something, before she read that both issues were choices. | 2 |
| Open dialog, backdrop | A Recent project dated Sep 21 appears behind the dialog on what was her first visit. | 1 |
| Loaded graph, title | The project is called "Human protein interactions" when her file is named ppi-core-300-evidence.tsv; she did not know where the name came from. The graph is called "Evidence rows", which she could not place. | 1 |
| Quick actions (storyboard frame) | "value's meaning is not set" names a column her file does not have; on her own file she would not know whether "value" meant "confidence". | 2 |
| Start screen | No visible hint that dropping a file works; she tried it anyway and needed the moderator to confirm. | 1 |

## What delighted her

- "2 proteins have no partner... They are loaded unconnected." -- nothing vanished, and it said so.
- Every choice in the Open dialog said how many edges she would end up with.
- The counts on the loaded screen matched the counts in the dialog; she checked.
- The first picture had visible clumps instead of a hairball.
- In the Quick actions frame, each measure came with a short meaning in plain words.
- The Top nodes list with one number each and "47 of 77 score 0" was the thing she would paste
  into Slack.
