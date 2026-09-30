# Is this file worth an afternoon? -- Tom, the recipe recipient

**Participant:** Tom, 52, lab manager of a twelve-person cell biology lab. Twenty years at the
bench, no network training. Receives files from the lab's computational postdoc and reads them;
never builds one. Managed 13-inch laptop, no admin rights, browser zoom at 110 percent, reading
glasses, mild red-green colour weakness. Gives a new tool about two minutes and two attempts.

**Task as given:** "A colleague sent this file. Is it worth an afternoon?"

**What he was sent:** `ppi-core-300-evidence.tsv`, from the postdoc, with a one-line email: "the
core interaction set, have a look when you can." No screenshot this time.

**Screens seen (study view, 1440 by 900):**

- Start screen: `shots/record/r4-tom-worth-01-start.png`
- Open dialog, the confidence column: `shots/record/r4-tom-worth-02-load-blocked.png`
- Open dialog, repeated pairs: `shots/record/r4-tom-worth-03-load-policy.png`
- The loaded graph: `shots/record/r4-tom-worth-04-frame.png`
- "Where your data goes" (he followed the link): `shots/record/r4-tom-worth-05-data-location.png`
- The first-look storyboard (`storyboards/first-look.html`), skimmed at the end when the
  moderator pointed him to it.

**Outcome:** he got the file open without installing anything, which he said was the first time
that has happened with one of the postdoc's network files. He got through the open dialog by
guessing on both questions it asked him. The graph that came up was grey, titled with a name he
did not recognise, and did not tell him what the clusters meant. His verdict: not worth his
afternoon; maybe worth the postdoc's afternoon to set it up so it is worth fifteen minutes of his.
Single Ease Question: 3.

---

## Transcript

### 0. Before the browser

> She sent a .tsv. I double-click it... and it opens in Excel. Of course it does. OK, well, at
> least I can see it. protein_a, protein_b, source, confidence. Let me scroll to the bottom --
> row 2,299. So 2,298 rows, one's the header. Remember that number.
>
> Some of the confidence cells say NA. She probably did that in R. And I should check nothing
> turned into a date... SEPT, MARCH... no, looks fine. Close it, don't save.
>
> She said to use "graphty". Fine, it's a web page, that's already better than the Java thing.

### 1. Start screen (`r4-tom-worth-01-start.png`)

> "Open a graph." Right. First thing I read: "Files stay on this computer. graphty reads them in
> this browser and uploads nothing." Hm. "Reads them in this browser" -- a browser is the
> internet, as far as I'm concerned. But it says uploads nothing. There's a link, "Where your
> data goes". It's not my data today, it's hers, but the next thing she'll ask is to put my qPCR
> hits on it, so I'm going to look.

He clicked "Where your data goes" (`r4-tom-worth-05-data-location.png`).

> "It is written so you can forward it to whoever approves software where you work." Well,
> that's me, or it's IT. "Print or save as PDF" -- good, I can attach that to the ticket.
> "Files you open are read by this browser and are not uploaded. graphty has no account and no
> server that receives your data." That's clear enough. "Data leaves the browser only through
> two features, both off until you turn them on." Connect to data source, and the Assistant.
> I won't touch either.
>
> Then the list of files: "CSV, JSON, GraphML, GEXF, GML, DOT and Pajek". Mine is a .tsv. Is a
> TSV a CSV? It's tabs instead of commas. I'd hope so, but it doesn't say. I'll find out.

Back on the start screen:

> OK, where does her file go? The big things are the pictures -- Karate club, Les Miserables,
> Protein interactions, Bank transfers. Protein interactions, 300 proteins. Hers is
> "ppi-core-300". Is that the same thing? Did she put her file in here already? It's the
> prettiest one, it's got colours...
>
> No -- "Samples". These are examples. I'm not clicking that, I'll end up looking at somebody
> else's network and presenting it to the PI.
>
> "Open..." There. It's small. I'd have missed it if I hadn't been looking for the word. I'm
> going to do what I always do and just drag the file from the email onto the window.

(The design accepts a file dropped anywhere on the window; nothing on the screen says so, but
because it is his first instinct, it worked.)

> It did something. Good.

### 2. Open dialog, the confidence column (`r4-tom-worth-02-load-blocked.png`)

> "Open ppi-core-300-evidence.tsv." OK, so it read a TSV. That answers that.
>
> Now there's a lot. Format, Each row is, Ends, Direction... all filled in already. I'm not
> touching those. On the right, "Issues 2" with a yellow exclamation mark. That's never good.
>
> "confidence is read as text: 150 of 2,298 scores are NA."
>
> 2,298. That's my row count. Good, it read every row. That's the first thing that made me
> trust it a bit.
>
> 150 NA. So it's her file, not me -- I saw those NAs in Excel. But is it a problem? It's yellow.
> Is it going to break?

He did not read the grey second line under the heading. The menu under the confidence row was
open in front of him.

> And now it wants me to choose. "Number, NA as missing." "Number, leave out the rows with NA."
> "Text." Text has a tick next to it. The first one is lit up blue.
>
> Honestly, I don't know. "Leave out the rows" -- no, I'm not throwing out 150 of her rows, she'd
> kill me. "NA as missing" sounds like what NA means. I'll take the blue one. It looked like the
> one it wanted me to pick.
>
> Is the tick the default and the blue the suggestion, or the other way round? I'd probably ask
> her about this bit.

### 3. Open dialog, repeated pairs (`r4-tom-worth-03-load-policy.png`)

> OK, one issue left. "865 pairs appear more than once." Well, yes -- she said it was evidence,
> each row is one source. Same pair from databases, text mining, experiments. That line under it
> says that too: "Each row is one evidence source for a pair". Fine.
>
> And another question. "Keep each: 2,298 edges." "Combine into one: 1,262 edges."
>
> So which is the network? Is it 2,298 or 1,262? If the PI asks "how many interactions", those
> are two different answers. I don't know which one she'd give.
>
> "Combine into one... The source column is not kept." No. I'm not deleting her column. Keep
> each. 2,298 -- that's my row count again, so at least that one I can check.
>
> Down the bottom: "What will load: nodes 300, edges 2,298, with no confidence 150." 300 matches
> the file name. "2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded
> unconnected."
>
> NOTCH1 with no partner, in a core set? That's odd. But it named them. I'll ask her whether she
> filtered those out on purpose. That's the kind of thing I'd actually want to know.
>
> "Weight: confidence, not used yet." I don't know what that means and I'm not going to find out.
> Load.

He pressed Load.

### 4. The loaded graph (`r4-tom-worth-04-frame.png`)

> ...It's grey.
>
> The Protein interactions picture on the first page had colours -- green, orange, blue clumps.
> This is all grey dots and grey lines. Did I break it, or did it never have colours?

(The file has no column that could colour it, so a grey drawing is correct. Nothing on the screen
says so.)

> And the title at the top says "Human protein interactions." That's not her file name. Her file
> is ppi-core-something. There's a little tag under it, "ppi-core-300-..." cut off. So is this her
> file or is this the sample? And on the dialog, behind it, there was a "Recent: Human protein
> interactions, Sep 21". I never opened anything on September 21st. I've never used this.
>
> OK, the tag says ppi-core-300, and the numbers on the right say Nodes 300, Edges 2,298. That's
> hers. I think. But I had to go and check.
>
> "Nothing has been sent from this project." Good. And on the left, "Assistant Off. Nothing is
> sent." I don't know what the assistant is and I'm glad it's off.

The label card at the bottom left:

> "Labels: the 12 proteins with the most partners." That I understand. That's a nice plain
> sentence. UBB, UBC, HSP90AA1, YWHAZ... ubiquitin, heat shock, 14-3-3. Those are in everything,
> they stick to everything. So the middle of this is just the usual sticky proteins. TP53, MYC,
> AKT1 -- well, yes. That's a list any textbook would give you.
>
> So what's the one thing this is telling me? The clumps around the outside -- five or six of
> them. Are those real complexes, or is that just where they landed? That's exactly what the PI
> is going to ask, "is it clustered, or is that the layout?" Nothing here tells me.

The right-hand panel:

> "Layout: Force-directed", with a play button. I'm not pressing play on something I don't
> understand. Statistics: Density 0.0281 -- means nothing to me. "Connected components 3 (2
> isolates)". Two isolates -- I suppose those are GSK3B and NOTCH1, the two from before. Those
> two dots out on their own, top right and bottom. OK, that's consistent, at least.
>
> "Style stack: Base style." "Results" with a plus. I don't know. That's her side of things.
>
> There's no legend. There's nothing to legend, I suppose, because it's all grey. But then what
> would I show the PI? A grey hairball with twelve names on it.

At about the five-minute mark:

> That's twice now. Once in the dialog where I had to guess, and now a picture that doesn't tell
> me anything I didn't know. I'll ask her to just send me a PNG. With the colours on.

### 5. The first-look storyboard (moderator pointed him to it)

> This is somebody called Elena, and Les Miserables. It's about her file, not mine. The first
> picture has "Open... or drop a file here" and a line listing the file types. The screen I had
> just said "Open..." -- nothing about dropping. I only dragged because I always do.
>
> Then she drags her file onto one of the samples and picks "Replace data... This file's nodes
> and edges, drawn with the sample's colors and sizes." Oh. So that's how you get the colours on.
> "Replace data" -- I'd never click that. Replace what? Whose data? That sounds like it'd wipe
> something.
>
> I'm not reading the rest of this. It's for someone who wants to learn it.

---

## Debrief

**Moderator: On a scale of 1 to 7, how easy was that?**

> Three. Getting it open was easy -- no install, no login, it read my TSV, and it counted my rows
> right, which is more than Excel does. That's worth something. But then it asked me two
> questions I couldn't answer, and I guessed both. And at the end I had a grey picture with a
> title I didn't recognise, and nothing that told me if the clumps mean anything.

**Moderator: Is it worth an afternoon?**

> Not mine. Maybe hers. If she sets the colours up and sends me the thing already done, I'd open
> it -- the no-install part is real, and I'd forward that "where your data goes" page to IT
> today. But I can't judge her network from this. I don't know if the clusters are the biology
> or the drawing.

**Moderator: Would you use this instead of what you use now?**

> What I use now is her sending me a PNG and an Excel file. For this file, no -- the PNG would
> have told me more. For looking at something she's already set up, without calling IT to
> install Java? Maybe. That part I'd try again. But she'd have to set it up.

**Moderator: What would you change?**

> I don't know, that's her job. I'd want to know if it worked. And I'd want to know which number
> to tell the PI.

---

## What the session showed

**Worked for him**

- No install and no sign-in. He said this was the first network file from the postdoc he opened
  himself.
- The line about files staying on this computer, and the "Where your data goes" page with its
  print and forward buttons. He planned to send the PDF to IT.
- Dropping the file on the window worked, which is what he tries first.
- The row count. The open dialog said 2,298, the number he had counted in Excel. That was the
  point at which he started to trust it.
- The two proteins with no partner were named, GSK3B and NOTCH1. He matched them to the two
  isolated dots and to "2 isolates" in the statistics, and wrote down a question for the
  postdoc about NOTCH1.
- The label card ("the 12 proteins with the most partners") was the one piece of the graph
  screen he understood without help.

**Where he stumbled, most serious first**

1. **The graph was grey and nothing said why.** He had just seen the coloured Protein
   interactions sample, and assumed he had broken something. The file has no column that could
   colour it, but the screen does not say that. This was the second of his two failures, and it
   ended the session.
2. **He could not tell whether the project was the postdoc's file or the sample.** The title
   read "Human protein interactions", not the file name. The file name was cut off in the chip
   under it. The Protein interactions sample card had the same count of 300 proteins. A Recent
   entry, "Human protein interactions, Sep 21", showed behind the dialog even though he had never
   used the app, and the start screen had no Recent section at all.
3. **The open dialog asked two questions he could not answer.** He got through both by guessing.
   On the confidence column the menu showed a tick on Text and the highlight on "Number, NA as
   missing", and he could not tell which was the default and which was the suggestion. He took
   the highlighted one "because it looked like the one it wanted". The yellow warning icons made
   him think the file was broken before he had seen anything.
4. **"Keep each: 2,298" or "Combine into one: 1,262": which is the number of interactions?** He
   chose Keep each because it matched his row count and because Combine said it would drop the
   source column. He still did not know which number to give the PI.
5. **Nothing tells him whether the clusters are real or an artefact of the layout.** This is his
   first job with any network the postdoc sends him. "Force-directed" and a play button did not
   help, and he would not press play on something he did not understand.
6. **The screen did not tell him a file could be dropped on it.** The start screen showed only
   "Open...", small and below the samples. The drop worked because dragging is his habit. The
   storyboard's version of the same screen says "or drop a file here" and lists the file types
   it reads; the current screen does not.
7. **TSV is not in the list of formats on the "Where your data goes" page.** It lists CSV, JSON,
   GraphML, GEXF, GML, DOT and Pajek. He wondered whether his .tsv would open. It did.
8. **"Replace data", in the storyboard, sounds like it destroys something.** It is how a reader
   gets a sample's colours onto a file. He said he would never click it.

**Single Ease Question:** 3 of 7.

**Instead of his current tool (a PNG and a spreadsheet from the postdoc)?** Not for this file.
Possibly for files the postdoc has already styled, because it needs no install.
