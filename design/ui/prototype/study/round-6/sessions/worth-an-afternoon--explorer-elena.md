# Is this file worth an afternoon? -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training. Lives in spreadsheets,
Slides charts and her company's analytics dashboard. Says "dots" and "lines", never "node" or
"edge". Played in the long-clock variant: a curious afternoon, three or four dead ends tolerated.

**Task as given:** "A colleague sent this file. Is it worth an afternoon?"

**Screens seen (study view, 1440 by 900, design notes hidden):**

- Start screen: `shots/record/r6-elena-worth-01-start.png`
- Open dialog, the confidence column read as text, its menu open: `shots/record/r6-elena-worth-02-blocked.png`
- Open dialog, pairs that repeat, its menu open: `shots/record/r6-elena-worth-03-policy.png`
- The loaded graph: `shots/record/r6-elena-worth-04-frame.png`
- Shown by the moderator when she asked what clicking a dot and the Quick actions button would
  do: the first-look screens on the Les Miserables sample -- a clicked dot
  (`shots/record/r6-elena-worth-fl-s5.png`), Quick actions typed into (`shots/record/r6-elena-worth-fl-s6a.png`)
  and the result it opens (`shots/record/r6-elena-worth-fl-s6b.png`). The moderator said these were the
  same screens on a different file.

**Outcome:** success with difficulty on loading; partial on the question. She got the file in,
checked nothing was lost, and this time found the Quick actions button on her own. She still could
not answer "is it worth an afternoon" from the loaded screen, because nothing on it says what the
file is about or what is interesting in it, and every name on it is a protein she has never heard
of. Her answer: "The tool is worth an afternoon. The file, ask the person who sent it -- or send
them the top five list and ask if that surprises them." Engagement dipped at the Statistics panel
and came back at Quick actions.

---

## Transcript

### 1. Start screen

> "Open a graph." OK. Files stay on this computer, uploads nothing -- good, because I'm not
> putting a colleague's file on some random website. There's a "Where your data goes" link. I'm
> not going to read that, but it's nice that it's there.
>
> Samples... karate club, Les Miserables, protein interactions, bank transfers. Not mine. Somebody
> sent me a file, I'll just drag it in. (Drags the file from her Downloads bar onto the empty white
> space under the samples.) There's no "drop here" box, so I don't know if that did anything.
>
> (Moderator: "Dropping it anywhere does the same as Open. Go ahead.")
>
> OK. Otherwise I'd have hit "Open..." -- it's right there. "Connect to data source" sounds like
> IT, skip.

### 2. The Open dialog, first look

> Oh. A lot of stuff. "Open ppi-core-300-evidence.tsv." PPI? ... "protein_a", "protein_b".
> Proteins. Why did Marco send me proteins? Maybe it's a test file. Whatever, let's see.
>
> And there's a menu open already, black, in the middle of everything. Did I click that? I don't
> think I clicked that.
>
> Right side: "Issues 2" with a yellow warning thing. Great, I broke it already. (Reads the first
> line.) "confidence is read as text: 150 of 2,298 scores are NA." NA like... not available? So
> some rows just don't have a score. Our exports do that all the time, there's always a blank
> column.
>
> The black menu. "Number, NA as missing -- 2,298 edges; 150 of them with no confidence." "Number,
> leave out the rows with NA -- 2,148 edges; the 150 rows are not loaded." "Text." Leave out rows,
> no. I don't delete somebody else's rows. The blue one says missing, and "2,298", same as the
> total. I'll take the blue one. It's blue so it's probably the one they want you to pick anyway.
>
> (Clicks "Number, NA as missing".)
>
> I like that every one of these tells me how many I end up with. That's the thing I always want
> to know and never get told.

### 3. The Open dialog, repeated pairs

> OK, one issue now. "865 pairs appear more than once." I don't know what I'm supposed to feel
> about that. "Each row is one evidence source for a pair (parallel edges)." Parallel edges. No
> idea. (Opens the menu.)
>
> "Keep each: 2,298 edges." "Combine into one: 1,262 edges ... The source column is not kept."
> Not kept. No. Keep each. Nothing gets thrown out, that's my rule. There's a sentence about "a
> measure that needs one link per pair combines them itself" -- I'm not reading that. Keep each.
>
> (Looks at the table under it.) Oh, this is what they mean: PSMA1 and PSMB10 three times, one says
> databases, one textmining, one experiments. So three places said these two go together. OK,
> that actually makes sense. Keeping them.
>
> Left side... "Role: Edge type", "end", "end". I'm not touching those. "Direction: Undirected." Is
> that bad? It sounds like it doesn't have a direction. Proteins probably don't go anywhere.
>
> "What will load: 300 nodes, 2,298 edges, 150 with no confidence." So 300 dots.
> "2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded unconnected." Oh, good --
> it's not dropping them, it's telling me. I always assume things just disappear.
>
> "Weight: confidence, not used yet." Not used yet... by what? Don't care. Load.
>
> (Hesitates at the top of the page.) Wait, behind the box it says "Recent: Human protein
> interactions, Sep 21." I've never opened this before. Is that Marco's? Did it open his thing?
> ... Fine. Load.

### 4. The loaded graph

> (The picture appears.) OK. Grey dots and a lot of grey lines. It's a blob, but it's a blob with
> lumps -- there's a lump top left, one top right, one right, one bottom, a couple on the left.
> Like five or six groups. That's more than I usually get.
>
> The names in the middle: UBC, UBB, MYC, AKT1, HSP90AA1, TP53... TP53 I've actually heard of,
> that's the cancer one? From a podcast. So this is some cancer thing.
>
> (Reads the white card bottom left.) "Labels: the 12 proteins with the most partners. 2 more
> hidden where they overlap." OK so the labelled ones are the busy ones. And UBC is right in the
> middle, so UBC is the boss. The one everything goes through.
>
> Those dots way out on their own, top right and bottom right -- those must be the two with no
> partner. GSK-something and NOTCH. Those are the weird ones. If I had an afternoon I'd look at
> those first.
>
> Top left: "Human protein interactions." That's not what the file was called. Then "Nothing has
> been sent from this project" -- nice, again. The file tag says ppi-core-300... so it is the
> file. And "Evidence rows" under Graphs. Is that a tab? A second graph? I'll leave it.

### 5. Trying the picture

> I want to click the biggest one... they're all the same size. OK, UBC then, it's the middle.
>
> (Moderator: "On this screen a click shows that protein's details in the right panel. Here is the
> same thing on the Les Miserables sample," and shows the clicked-dot screen.)
>
> Valjean. "degree 36, #1 of 77." I don't know degree, but number one of seventy-seven, got it.
> "36 neighbors." That's my kind of screen. So on mine I'd click UBC and it'd say number one of
> 300 or whatever. Fine. But it'd say it about a protein, and I don't know what that protein is.
>
> Can I search? I don't know any of the names except TP53. (Looks for a search box on the canvas,
> doesn't see one; there's a magnifier next to "Graphs" on the left and she does not notice it.)
> Scrolling zooms, I assume. Yeah.

### 6. The Statistics panel

> Right side. "Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing, repeated pairs
> kept, no numeric edge column." That's my choices read back to me, good, that matches -- wait,
> "no numeric edge column"? I picked "Number" for confidence. The box said "Weight: confidence,
> not used yet." Now it says there isn't one. ... I probably did the menu wrong. Whatever, it's
> Marco's file.
>
> "Overview: General. Change overview..." No idea. Not clicking.
>
> Nodes 300, edges 2,298 rows, linked pairs 1,262. Those match the box. Good. I checked.
>
> Density 0.0281. Is that a lot? That's a number with nothing next to it. Connected components:
> "3 (2 isolates)". Three... the two loners plus everything else? So the lumps I see aren't
> "components". So the lumps are... what, then? Just how it happened to fall?
>
> Degree distribution, little bar chart. Yeah. (Scrolls past.) Attributes 2. Five more. OK.
>
> (Answers get short here. Looks back at the canvas without doing anything for a while.)

### 7. How do I find the ones that matter?

> I kind of want it to just tell me. "These are the important ones." Or colour the lumps.
>
> (Looks at the bar at the bottom.) Arrow, some wiggly thing, "Quick actions", 2D. Quick actions
> -- that's a word, at least. (Clicks it.)
>
> (Moderator: "It opens a box you can type into. Here it is on the Les Miserables sample," and
> shows the typed-into screen.)
>
> Oh, like the search thing in Notion. Someone typed "who matters most". "Betweenness -- who sits
> between the groups." "PageRank -- who is tied to well-connected characters." "Closeness -- who
> is near everyone." "Degree -- who has the most direct ties, already shown as size."
>
> OK, I don't know those words, but the little explanations I get. "Who sits between the groups"
> -- that's what I want, because I can see groups. There's a grey line under it: "value's meaning
> is not set, so it runs unweighted." I don't have a "value". I have "confidence". Is that the
> same thing? I'll just press it.
>
> (Moderator shows the result screen.)
>
> "47 of 77 characters score 0. Valjean alone scores 0.57; next is Myriel at 0.177." OK, that's a
> sentence. Top nodes: Valjean, Myriel, Gavroche, Marius, Fantine. That's the thing -- that list I
> would paste in Slack. On mine it'd be five proteins.
>
> Is 0.57 good? I don't know, but it's way more than the next one, so I get it. Valjean's the guy.
>
> "Size set by Size: degree. Size by betweenness instead." ... Not touching it.

### 8. So, is it worth an afternoon?

> Honestly? For the tool, yes. It opened his file in, what, two minutes, it didn't lose anything,
> it told me what it did, and there's a way to ask "who matters" that answers in English.
>
> For the file -- I can't tell you. It's 300 proteins. I can see it has lumps and a busy middle,
> and I could get a top-five list, but I don't know if UBC being on top is interesting or obvious.
> Nothing on the screen said "here's what's interesting about this file". So what I'd actually do
> is run the who-matters thing, screenshot the list, and send it back to Marco: "is this
> surprising?" If he says yes, it's worth an afternoon. That's his call, not mine.

---

## After the task

**Single Ease Question (1 very difficult -- 7 very easy):** 5.

> Getting it in was easy, easier than I expected once I stopped panicking about the yellow
> "Issues". Finding the "who matters" thing I got to on my own, because it says Quick actions and
> not just a little icon. I'm not giving it a 6 because the first picture is grey and doesn't tell
> me anything about the file, and the right side is numbers I can't read.

**Would she use this instead of her current tool?**

> Instead of Excel and a bar chart? Not instead -- next to it. I'd try it on our accounts export
> this week, because it's in the browser, no install, no account, and it counts everything back
> to me. For a file I don't understand, like this one, no tool is going to fix that. I'd want the
> first picture to colour the lumps, so I have something to point at before I have to find a
> button.

---

## What she got wrong, and did not correct

- Read the highlighted row of the confidence menu as the tool's pick ("it's blue so it's the one
  they want"). The row was simply the one under the pointer; the menu has no recommendation. Her
  choice happened to be a sensible one.
- Said "UBC is right in the middle, so UBC is the boss." Where a dot sits on the canvas means
  nothing; the labels mark the proteins with the most partners, which she read and then ignored.
- Named the far-off dots as "the two with no partner". There are more than two dots sitting apart
  on the canvas, and nothing on the screen marks which two are GSK3B and NOTCH1.
- Took "Connected components 3" to mean the lumps she sees are an accident of the drawing. The
  lumps are real groups of closely linked proteins; the panel counts something else and does not
  say so.
- Blamed herself for "no numeric edge column" after she had set confidence to read as a number.
  The Open dialog said "Weight: confidence, not used yet"; the loaded screen says there is no
  numeric edge column. The two screens disagree and she concluded she had used the menu wrong.
- Assumed "value" in the Quick actions line was her "confidence" column, or might be. On the
  sample it is a different column; on her own file she would not know what it referred to.

## Problems found

| Where | What happened | Severity (Nielsen 0-4) |
|---|---|---|
| Loaded graph | Nothing on the first screen says what is interesting about the file: all dots grey, no groups coloured, no "the most connected are..." line in words. She could not answer the task from this screen and had to go looking for a tool to do it. | 3 |
| Loaded graph, Statistics | "no numeric edge column" contradicts both her choice (confidence read as a number) and the Open dialog's "Weight: confidence, not used yet". She blamed herself. A reader who blames the tool instead stops trusting every count on the panel. | 3 |
| Loaded graph, Statistics | "Connected components 3 (2 isolates)" sits next to a picture with five or six visible lumps; she concluded the lumps do not mean anything. | 3 |
| Loaded graph, canvas | The two proteins the dialog named as unconnected are not marked on the canvas; she picked the wrong far-off dots with confidence. | 2 |
| Loaded graph, Statistics | Density 0.0281 and the degree bars have no scale or plain-words reading; she skipped them and her engagement dropped here. | 2 |
| Open dialog | The column menu is already open when the dialog appears, and the row under the pointer looks like a recommendation. | 2 |
| Open dialog | "Issues 2" in a warning colour made her think she had broken something before she read that both issues were choices with a safe default. | 2 |
| Open dialog, repeated pairs | "parallel edges", "Edge type", "end" and "Weight: not used yet" were skipped; she decided by refusing any option that drops a column or rows, not by understanding it. The example table (one pair, three sources) is what made it click. | 2 |
| Quick actions | "value's meaning is not set" names a column by its name in the sample; a reader whose weight column is called something else cannot tell whether it means hers. | 2 |
| Open dialog, backdrop | A Recent project dated Sep 21, "Human protein interactions", shows behind the dialog on her first visit and made her wonder whether the tool had opened someone else's project. | 1 |
| Loaded graph, header | The project is titled "Human protein interactions" though the file is ppi-core-300-evidence.tsv, and the graph is called "Evidence rows"; she could not tell where either name came from, or whether "Evidence rows" was a second graph. | 1 |
| Loaded graph, search | The only search is a small magnifier beside "Graphs" in the left panel; she looked for search on the canvas and did not find it. | 1 |
| Start screen | No visible sign that dropping a file on the page works; she needed the moderator to confirm it. | 1 |

## What delighted her

- Every choice in the Open dialog said how many rows or lines she would end up with.
- "2 proteins have no partner in the file ... They are loaded unconnected." Nothing vanished, and
  it said so.
- The example rows under "pairs appear more than once" (one pair, three sources) explained the
  issue better than the sentence did.
- The loaded screen repeated her choices back in one line, and its counts matched the dialog's.
- "Quick actions" is written on the button; she found it without help.
- Each measure in Quick actions came with a plain meaning ("who sits between the groups").
- "47 of 77 characters score 0. Valjean alone scores 0.57" and the top-five list: the one thing
  she would paste into Slack.
- "#1 of 77" next to a clicked dot's number told her what the number meant without knowing the
  word.
