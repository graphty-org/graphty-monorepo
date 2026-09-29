# Session: may I use this on our data? -- Priya, threat hunter at a regional bank

**Task given by the moderator:** "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

**Screens seen, in order, as the participant sees them (design notes hidden), dark theme, about
half a 1440p monitor (1280 wide):**

1. The start screen -- `shots/r4c-priya-ds-start.png`
2. An open project at rest -- `shots/r4c-priya-ds-frame-at-rest.png`
3. "Where your data goes", the whole page -- `shots/r4c-priya-ds-data-location-full.png`
4. Data > Sent and saved, in an open project -- `shots/r4c-priya-ds-data-panel.png`

---

## Think-aloud

### 1. Start screen

> Okay. Before I touch anything: is this approved, where does it run, does it phone home. That's
> the whole task, really.
>
> First line under "Open a graph": "Files stay on this computer. graphty reads them in this
> browser and uploads nothing." Fine. Everyone says that. Maltego says nice things too. But it's
> the first thing on the screen, not buried in a footer, and there's a link right next to it,
> "Where your data goes". That's the right instinct. I'll click that in a second.
>
> "Projects are kept in this browser." So it stores stuff locally. In browser storage, I assume.
> On a managed laptop with a roaming profile that's a question for IT, not for me.
>
> Samples, don't care. "Open..." -- fine, local file. "Connect to data source..." -- that one's
> the thing that would leave. There's a little info icon way over on the right of that row, easy
> to miss. So "uploads nothing" is true for files, and there's at least one door out. I want to
> see how many doors there are.
>
> No sign-in. No "create account". Good. That alone gets it past the first five seconds that most
> SaaS tools fail.
>
> But nothing on this screen tells me who is serving me this page. What's the URL, whose domain,
> who runs it. It's a web page. Somebody hosts it.

### 2. An open project (protein sample, since I'm not loading bank data)

> I'm not putting bank data in this. Pretending I opened my scrubbed auth export; the mock has a
> protein graph, whatever.
>
> Top left under the project name: lock icon, "Nothing has been sent from this project". Okay,
> that's actually useful. That's a status, not a promise -- it's telling me what happened, not
> what it intends. I like that more than the start screen line.
>
> Left rail, under Notes: "Assistant. Off. Nothing is sent." Good that it's off. Better that it
> says so without me hunting for a setting. I would never click it anyway -- anything labelled
> Assistant with bank data is an instant no from me.
>
> Question though: "from this project". What about the app as a whole? What about before I
> opened a project? I'll assume it means the same thing. My IT person won't assume.

### 3. "Where your data goes"

> Opens as its own page, with "Copy link" and "Print or save as PDF". Okay, somebody has
> actually filed a vendor review before. That PDF goes straight into the ticket. "Describes
> graphty 2.0. Updated September 28, 2026." Good, versioned and dated. Now, is the thing I'm
> running 2.0? I didn't see a version number anywhere in the app. Minor, but IT will ask.
>
> "In short" box. Four bullets. Files read by the browser, not uploaded, no account, no server.
> Data leaves only through two features, both off: Connect to data source and the Assistant.
> Projects in this browser. No password or key in the log or project file. That's the paragraph I
> would paste into the ticket. That's genuinely what I wanted.
>
> "What stays in this browser" table. Files, projects, exports, Assistant key, data-source
> password kept in memory only. Fine. Password not written to storage -- IT will like that.
>
> "What leaves this browser, and only when you ask". What, to whom, when. This is the table I'd
> have had to build myself. Data source: my query goes to the source I point it at, run by
> whoever runs it, not graphty. Good -- if I point it at our own Neo4j, it stays inside.
> Recipe or project file that names a source: nothing until I confirm. Good, that closes the
> "someone sends me a file that beacons out" hole. I actually thought about that.
>
> The Assistant row: "the names and values of the nodes it looks up". Node names. On my data
> those are account names and hostnames. So the Assistant is a hard no for us, full stop. Fine,
> it's off. Local model row: model downloaded from its publisher once. Okay.
>
> "Opening graphty -- Nothing from your files. The browser asks for graphty's own code... To
> whom: Where graphty is hosted." ...Where is it hosted? It doesn't say. That's the column where
> I need a name and a country and it just says "where graphty is hosted". That's not an answer,
> that's the question repeated back to me.
>
> And here's the thing IT will jump on, and they'd be right: every time the page loads, the
> browser pulls the code fresh from whoever hosts it. So everything on this page is true of 2.0
> today. Next Tuesday they push a new build and it's a different app, and nobody at the bank
> reviewed it. Approving a hosted web app is approving whoever controls that server, forever.
> The only version of this that gets through our review is one we run ourselves, or at least one
> pinned to a version we checked.
>
> Scrolling. The "The app says when something leaves" box. Status line under the project,
> Data > Sent and saved lists every send, "See what was sent", "Export log" to attach to a
> review. Okay, that's an audit trail. That's the notebook habit -- record of what happened. I'd
> use that.
>
> "What graphty does not send." No account. No file contents except via the listed features. No
> fonts or code from other sites -- good, no Google Fonts CDN calling out. Then:
>
> "Usage statistics and crash reports:"
>
> ...and nothing. Colon, then blank. Is that "none"? Is that "we haven't decided"? Is it a render
> bug? This is the single most important line on the page for me and it's empty. Telemetry is the
> first thing our review template asks. If I forward this PDF to IT with that line blank, they
> send it back in five minutes.
>
> "Check it yourself. Open the Network tab." Honestly, I'm not going to. That's not my job and
> it's the tool's job to say it. But I'd leave it in for IT; their guy will do exactly that, and
> it's good that the page invites it instead of hoping nobody looks.
>
> "What this page does not promise." This is the part that makes me trust the rest. It doesn't
> protect projects from loss. It doesn't protect against extensions or backups. "Not a
> certification or a contract." Good. Vendors never write this section. It reads like somebody
> who has been in a review meeting.
>
> "For organizations."
> "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank.
> "Questions this page does not answer: Contact" -- a link to... it doesn't look like it goes
> anywhere. No address.
>
> So the three things my IT team actually needs -- can we host it, can we kill the Assistant
> centrally, and who do we email -- are exactly the three lines that are empty. Everything
> before that is excellent, and then it stops right at the door.

### 4. Data > Sent and saved (payments sample)

> Went back into a project and opened Data. Bottom of the panel, "Sent and saved from this
> project". "Sent: nothing. The Assistant is off and no data source is connected." Link back to
> the data page. "Saved: nothing yet. Every file an export writes is listed here."
>
> Good. Consistent with what the top line says. And it lists exports too, which is actually more
> than I expected -- an export is where our data really walks out, onto a share drive, so knowing
> what I wrote is useful for the case notes.
>
> The top line here is underlined, so it's a link. On the protein project it didn't look like
> one. Small thing. I'd have clicked the rail "Assistant Off" before I'd have guessed the status
> line opens anything.
>
> I don't see "Export log" here -- I guess it shows up once there's something in it. Fine. I'd
> want to be able to export "nothing was sent" too, honestly. An empty log is evidence.

---

## Decision

> Can I use it on bank data? **No. Not today.** Not because it looks leaky -- it looks less leaky
> than anything else I've trialled -- but because it isn't on the approved list, and this page,
> as it stands, can't get it onto the list. The blanks are exactly the review questions.
>
> Can I use it on a public lab dataset or my scrubbed, tokenised export on my own laptop to see
> whether it's worth a review? Probably, as long as the domain isn't blocked by Defender. With
> the Assistant never touched and no data source connected. That's what I'd actually do, and
> I'd keep it to data that isn't bank data.

## What I would say to IT

> "There's a browser-based graph tool, graphty, I'd like reviewed for analysing exported auth
> logs. Their data-handling page is attached as a PDF. Summary: files are parsed in the browser
> and not uploaded, no account, no server-side storage, projects live in browser storage on the
> laptop. Only two features send data out -- a connector to a data source we name, and an AI
> Assistant that sends node names to Anthropic, OpenAI or Google. Both are off by default. We
> would want the Assistant blocked outright.
>
> Open items before this can go anywhere:
> 1. Who hosts it and in which country -- the page doesn't say.
> 2. Telemetry and crash reporting -- the line is blank on their page.
> 3. Can we self-host a pinned version inside our network? Because it's a hosted web app, the
>    code is re-downloaded on every load, so approving today's version doesn't cover next
>    week's. Self-hosted or nothing.
> 4. Can we disable the Assistant centrally, by policy, not per user?
> 5. A contact for vendor questions -- none listed.
> 6. Browser storage on managed laptops: does that fall under our endpoint data rules?
>
> Their page tells you how to verify with the Network tab; I'd like someone to do that on a lab
> file before we go further."

---

## Single Ease Question

**4 out of 7.**

> Finding the information was easy -- one link from the first screen, and the page is laid out
> the way a review wants it. But the task was to *decide*, and I couldn't, because the page goes
> blank exactly on hosting, telemetry, self-hosting and who to contact. Finding it: 6. Deciding:
> 2. Call it a 4.

## Would I use this instead of my current tool?

> Instead of Splunk or my notebook? No, it doesn't replace either; that's not the question for
> me. As an extra tool for looking at an exported slice? Maybe -- this is the first graph tool
> where the privacy story would survive our review *if* the blanks get filled. Maltego leaks to
> the target, Graphistry is a hosted vendor with a months-long review. This page is better
> than either. But until I can tell IT "we host it ourselves, it collects no telemetry, and the
> Assistant is off by policy", it stays on my lab box with lab data. Right now, it's a "not
> yet", not a "no".

---

## Observations for the facilitator (in the participant's words where possible)

- **The blanks read as blanks.** In the participant's view, "Usage statistics and crash
  reports:", "Running your own copy of graphty, inside your network:", "Turning the Assistant off
  for everyone in an organization:" and "Where graphty is hosted" all show a label with no
  answer, and "Contact" goes nowhere. She read them as "not decided" at best and "a bug" at
  worst. "This is the single most important line on the page for me and it's empty."
- **Hosted code is the real objection.** "Every time the page loads, the browser pulls the code
  fresh... Approving a hosted web app is approving whoever controls that server, forever." The
  page says what version 2.0 does but gives a reviewer no way to hold the app to 2.0. Self-hosting
  or a pinned version is, for her, the whole approval.
- **No version in the app.** The page says "Describes graphty 2.0"; she found no version number
  in the app to match it against.
- **Status line affordance differs.** On the protein project the "Nothing has been sent from
  this project" line did not look clickable; on the payments project it is underlined. She would
  not have guessed it opens anything.
- **Empty log as evidence.** She wanted to export "nothing was sent" as proof, not only a log
  with entries.
- **What worked:** the link on the first screen; the what / to whom / when table; the file that
  names a data source asking before it connects; the "does not promise" section ("Vendors never
  write this section"); Print or save as PDF for the ticket; the Assistant stating "Off. Nothing
  is sent." in the rail.
