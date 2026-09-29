# Session: does my data stay here? -- computational biologist

**Participant:** a computational biologist who leads a small drug-target group at a research institute
with a pharma partner. Works in R and igraph, uses Cytoscape for figures, and does not upload
unpublished data to a server whose data handling she cannot see.

**Task as the moderator gave it:** "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

**Screens used:** the start screen (first run; the "not saving" state; the drag-a-file state; the state
with an Assistant provider set), then the main window with Les Miserables open (at rest; the file chip
opened; the "not saved" menu).

**Outcome:** partly answered. The first question gets a clear claim in one line, which she accepts
provisionally. The second question has no answer on screen at all; she reasons her way to "probably
nothing" but cannot show it to anyone.

---

## Part 1: before loading anything

**Start screen, first run.**

> "OK. 'Open a graph.' Four samples -- karate club, Les Miserables, a protein one, bank transfers. The
> protein one is 300 proteins, which is a toy, but fine.
>
> The question was whether I'm allowed to use this. First thing I look for is the lock icon, and
> there is one, right under the title: 'Files stay on this computer. graphty reads them in this
> browser and uploads nothing.' Good. That's the sentence I need, and it's before I've done anything,
> which is where it should be. Cytoscape never had to say this because it was a desktop app, and every
> web viewer I've tried either doesn't say or says it on a privacy page nobody reads.
>
> But it's a claim. It's one line of grey text. What I'd actually have to tell our information
> governance person is: where is this page served from, does it phone home -- analytics, crash
> reports, anything -- and can I run it without the network. None of that is here. If I'm being
> honest I'd open the browser's developer tools and watch the network tab while I load a file.
> That's fine for me. It is not something I can put in a data management plan."

**Pause on "in this browser".**

> "'Reads them in this browser.' Does it keep a copy in the browser? I'd guess yes if there are
> 'recent projects'. So my data sits in Chrome's storage on this laptop. That's still 'this
> computer', OK, but on a managed machine where the profile syncs, that's a different question. It
> doesn't say. I only found out it stores projects at all because of the other state --"

**Start screen, "This browser is not saving projects" state.**

> "-- this one. 'This browser is not saving projects.' Hover: 'site data is blocked or this is a
> private window. Download project file keeps your work.' So normally it DOES save into the browser.
> Fine, I'd actually prefer to run it in a private window then, for anything unpublished, and keep
> the project file on our share drive. That's useful to know, but I learned it from an error state,
> not from the sentence at the top."

**The "Connect to data source..." row.**

> "'Connect to data source...' with an (i). The (i) says 'Sends only your query, to the source you
> name.'
>
> Hm. 'Only your query.' If the source is STRING, my query IS the gene list. Four hundred DEGs from
> an unpublished knockdown -- that's the data. That's the thing I'm not allowed to send. 'Only' is
> doing a lot of work in that sentence. I'd want it to say, in so many words: this sends the
> identifiers you enter to string-db.org, or wherever. And I'd want it to say that on the screen
> where I type the query, not on a hover here.
>
> I don't click it. For this task I'd use Open... with a local TSV and skip this entirely."

**The sample tiles and the help button.**

> "Do the samples download from somewhere when I click them? Doesn't matter for privacy -- it's their
> data, not mine -- but it would tell me whether the thing works offline. The (i) on the tiles
> probably describes the dataset. The question mark in the corner -- if that opens a web page, that's
> a request out too, harmless, but again, I can't tell."

**Start screen, the state with an Assistant provider set.** (The moderator showed it.)

> "'The Assistant sends what you ask it about to Anthropic.' OK, credit where it's due, that names the
> company. That's better than 'AI features may use third-party services'. But 'what you ask it about'
> -- if I ask it about a module, does it send the gene names in the module? The expression values?
> The whole network? Our pharma partner's contract would care about exactly that difference. I would
> not touch this with unpublished data unless I could switch it off and see that it was off. And I
> would never have set a provider in the first place, so for me this line just shouldn't appear."

**Her answer to the first question:**

> "Provisionally yes -- for local files, via Open..., with nothing typed into 'Connect'. On the
> strength of one sentence I'd check myself in the network tab. I could not hand this screen to our
> governance people as it stands: there's no 'what we send, ever' page, no mention of telemetry, and
> nothing about whether it runs offline."

---

## Part 2: mid-session -- did anything just leave my machine?

**Main window, Les Miserables open, at rest.**

> "Right. Graph's on screen, colours by group, a legend. Now: did anything leave?
>
> Where would it tell me? I'm looking for the lock again. It's gone -- that sentence was only on the
> start screen. Top left: 'Les Miserables', a chip 'miserables.json', 'Full graph'. Right side:
> Export..., statistics. Left rail: Graph, Assistant, Results, Notes. The Assistant icon is grey. I
> assume grey means off. It doesn't say off. If I were being careful I'd hover it, and if it said
> 'set up a provider' I'd relax."

**Clicks the file chip, "miserables.json".**

> "'Opened from this computer. Read Sep 28, 10:42.' Good -- that's the closest thing to an answer on
> this screen. The file came from here. It doesn't say anything went anywhere. But it also doesn't say
> nothing went anywhere. It's describing where the data came from, not where it went. Those are
> different questions."

**Opens the project menu ("not saved" state).**

> "'Not saved: this browser's storage is full. Download project file.' So it's saving to the browser
> as I go -- local. That's fine. This confirms the saving is local, not to some cloud account, because
> otherwise the message would be about a server, not browser storage. That's me inferring, though.
> Nothing says 'saved on this computer'."

**Looks at Export..., top right.**

> "Export... -- I'd assume that writes a file to my disk. If it had a 'share link' in it I'd want to
> know where that lives before I pressed it. I don't see a share option on this screen, which, for this
> question, is actually reassuring."

**Her answer to the second question:**

> "I think nothing left. But I think that because I didn't press 'Connect' and the Assistant looks
> grey, not because the screen told me. There's no status anywhere that says 'local only' or 'offline'
> or 'last network request: none'. If our compliance officer stood behind me and asked, I'd have to
> say 'I believe not' and open developer tools. For a web app handling patient-derived or partner
> data, the answer to 'did anything leave' should be visible at all times, the way the file chip is --
> a small 'Local' marker that changes the moment something goes out, and names where it went."

---

## After the task

**Single Ease Question (1 very hard, 7 very easy): 4.**

> "The first half was easy -- they put the right sentence in the right place. The second half I
> answered by elimination. A four."

**Would she use this instead of her current tool?**

> "For looking at a network from a local file, maybe -- the start screen is more honest about data than
> any web viewer I've tried, and it's more honest than Cytoscape's apps, which call out to STRING and
> half the time you don't notice. But 'uploads nothing' in grey text is a promise, not evidence. I'd
> want a page I can send to information governance: what's sent, when, to whom, whether it runs
> offline, whether I can host it inside our network. Until then it's something I use on published data
> and public samples, and my unpublished knockdown network stays in R."

---

## Problems observed

1. **Nothing in the main window answers "did anything leave?"** (main window, at rest; severity 3). The
   privacy sentence appears only on the start screen. Once a graph is open there is no persistent local
   or network status. She answered by elimination and could not show the answer to anyone.
   > "I think nothing left. But I think that because I didn't press 'Connect', not because the screen told me."
2. **"Sends only your query" understates what a query is** (start screen, the Connect to data source
   (i); severity 3). For a gene-list lookup the query is the unpublished data. The wording does not name
   the destination or say that the identifiers typed are what is sent, and it sits behind a hover.
   > "'Only' is doing a lot of work in that sentence. If the source is STRING, my query is the gene list."
3. **No telemetry, offline or hosting statement anywhere** (start screen; severity 3). "Uploads
   nothing" covers files, but not analytics, error reports, help pages or where the app itself is
   served from. There is nothing a compliance reviewer could be pointed at.
   > "I could not hand this screen to our governance people as it stands."
4. **Browser-side storage is learned only from error states** (start screen, "not saving" state; main
   window, "not saved" menu; severity 2). The first-run sentence does not say that projects are kept in
   this browser's storage, which matters on managed or synced profiles.
   > "I learned it from an error state, not from the sentence at the top."
5. **The Assistant rail item is greyed but not labelled as off** (main window, left rail; severity 2).
   Grey reads as disabled but does not state that nothing is being sent.
   > "I assume grey means off. It doesn't say off."
6. **The Assistant disclosure does not say what data goes** (start screen, Assistant provider set;
   severity 2). It names Anthropic, which is good, but "what you ask it about" does not say whether node
   names, attribute values or the whole network are included.
   > "If I ask it about a module, does it send the gene names in the module? The expression values?"
7. **The file chip answers "where from", not "where to"** (main window, file chip popover; severity 1).
   "Opened from this computer" is the only on-canvas evidence and it is the wrong direction for the
   question.

## What worked

- The lock line under "Open a graph" is in exactly the right place: before any file, in plain words,
  one sentence. Better than any web viewer she has compared it to.
- The Assistant disclosure names the company instead of "third-party services".
- The file chip popover states the origin ("Opened from this computer") and the read time.
- No share button on the main window, so there is nothing to press by accident.
