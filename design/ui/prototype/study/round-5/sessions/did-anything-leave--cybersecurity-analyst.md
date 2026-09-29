# Session: did anything leave? -- Priya, threat hunter

Participant: Priya, senior threat hunter in the security operations team of a regional bank. Splunk
and Defender all day, a Jupyter notebook for real analysis, BloodHound with raw Cypher. Production
data stays inside the bank; any new tool goes through vendor and software review first, and her
security team can block an unsanctioned web app's domain on every laptop.

Task as given by the moderator: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they can
read."

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/tasks/did-anything-leave/01-frame-at-rest.png` -- the bank transfers sample open
- `shots/tasks/did-anything-leave/02-start-screen.png` -- the start screen, nothing opened
- `shots/tasks/did-anything-leave/03-data-location.png` and
  `shots/r4-priya-leave-data-location-full.png` -- the "Where your data goes" page, top and whole
- `shots/r4-priya-leave-data-panel.png` and `shots/r4-priya-leave-data-panel-s7.png` -- Data panel,
  first load and a month on, with "Sent and saved from this project"

---

## 1. The app, a project already open

> OK. First three questions, same as always: is this approved, where does it run, does it phone
> home. It's not approved, obviously, nobody's reviewed it, so in real life I'd stop here. Study,
> so I keep going.
>
> Top left: "Transfers, March 2026", and under it a lock and "Nothing has been sent from this
> project." OK. That's the answer to the question in one line, and it's where I'd look first. Good.
> But "from this project." Why the qualifier? What about the app itself, or another project? My
> reviewer is going to read "from this project" as "something else might have."
>
> Is that line clickable? Black text, a lock. It doesn't look like a link here. I'd hover it maybe.
> I wouldn't click it.
>
> Left rail, bottom: "Assistant. Off. Nothing is sent." Right, an AI thing. I'm not touching
> anything called Assistant, I don't care that it's off, I care that it can't be switched on by
> somebody on my team with a personal key. Park that.
>
> Nothing else on this screen talks about network. No "offline" badge, no version number. Fine.
> The rail has a "Data" button. That's where I'd expect a source to be.

## 2. The start screen

> Here it's said up front: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." And "Projects are kept in this browser." Then a link, "Where your data goes."
> That's the right place for it, before I load anything. I like that it's the first thing, not a
> footer.
>
> "Connect to data source..." with an (i). Hover once. [Tooltip: "Sends only your query, to the
> source you name."] Fine, that's honest. "Only your query" -- and my credentials, presumably? It
> doesn't say that. Minor. I'll see if the page does.
>
> No sign-in, no "create account", no upgrade button. That's half my drop-out list gone already.

## 3. "Where your data goes"

> New tab, its own address. Good -- that's a link I can paste into the ticket. "It is written so
> you can forward it to whoever approves software where you work." Somebody's met a reviewer.
> "Describes graphty 2.0. Updated September 28, 2026." Version and date. The reviewer will ask
> which version, so that matters.
>
> "Copy link", "Print or save as PDF." PDF goes on the ticket. That's the "something they can read"
> part of the task, done, if the content holds up.
>
> In short. Four lines. Files not uploaded, no account, no server that receives your data. Data
> leaves only through Connect to data source and the Assistant, both off until you turn them on.
> Projects on this computer only. No password or key in the sent list or a project file. OK. That's
> four sentences I can paste.
>
> "What stays." Files, projects, exports, Assistant key, data-source password -- "kept in memory
> until you close the tab, never written to this browser's storage." Good, that's the one I was
> going to ask. The password line answers my tooltip question from the start screen, so why didn't
> the tooltip just say it.
>
> Projects: "the graph, its results, styles, sets, views and notes are kept in this browser's
> storage." Hold on. So if I run a query against our graph database, the rows that come back sit in
> Edge's storage on my laptop, indefinitely, until I delete the project. That's not "sending" but
> it's the first thing our DLP person asks: is it encrypted at rest, and what happens on a shared
> or re-imaged machine. The page answers the second one further down, sort of ("does not protect
> data from ... other people on the same login ... backups"). It does not connect the dots between
> "query result" and "sits in browser storage." A reviewer reading fast will think the data-source
> row is only about what goes out. For us, what comes IN and stays is the bigger question.
>
> "What leaves this browser, and only when you ask." Table with what, to whom, when. That's the
> format I want. Connect to data source: "the query you write, and any sign-in the source asks
> for. Its answer comes back to this browser only." To whom: "the source at the address you enter,
> run by whoever runs it." When: "when you connect, and each time you refresh or run a query."
> Good. That's a real answer. "A recipe or project file that names a data source: nothing, until
> you confirm." Good -- somebody thought about a file that makes you call out. That's the Maltego
> problem, a thing that queries something you didn't mean to.
>
> The Assistant. "Your question, the graph's counts, each column's name with up to 10 of its
> values, and the names and values of the nodes it looks up." To Anthropic, OpenAI or Google.
> That's a lot, and it's written plainly, which I respect. It's also exactly why it'll be
> disabled. Which brings me to --
>
> "Opening graphty: nothing from your files. Where graphty is hosted." ... Where IS it hosted? It
> doesn't say. That's the domain I'd have to get allowlisted, or the one Defender blocks. A
> reviewer's first question is "whose server, which country." This row says "where graphty is
> hosted" like I'd know.
>
> "What graphty does not send." No account. No file contents except through the features above.
> No fonts, icons or code from other sites. Good, that's CDN calls covered, most tools forget
> that.
>
> "Usage statistics and crash reports:" -- colon, then nothing. Nothing. Is that "none"? Is it a
> bug in the page? That is THE line. Telemetry is the phone-home question. If I forward this and
> the reviewer sees a colon with nothing after it on the telemetry line, the review stops right
> there and I look like I didn't read it.
>
> "Check it yourself. Open your browser's developer tools, choose the Network tab." Fine, and
> honestly I wouldn't. But my reviewer might, and it's the right thing to tell them. On a managed
> Edge I might not even have dev tools. Not the page's fault.
>
> "What this page does not promise." Doesn't cover what the source or provider does with data.
> Doesn't keep projects safe from loss. Not a certification or a contract. OK -- that section makes
> me trust the rest more. A page that only reassures reads like marketing.
>
> "For organizations." "Running your own copy of graphty, inside your network:" -- blank. "Turning
> the Assistant off for everyone in an organization:" -- blank. "Questions: Contact" -- a link to
> who? Three of the four things my reviewer actually needs to approve this are empty. Can we host
> it inside? Can we kill the Assistant by policy? Who do I email? Blank, blank, a link with no
> name. I'd read those blanks as "no" or "we haven't decided," and a reviewer at a bank reads
> "haven't decided" as "no."
>
> And then below that, with no heading, there are pictures of the app. Start screen, a menu, a
> "Sent and saved" panel. Is this part of the page? Does the reviewer get these? Oh wait -- there.
> "Transfers, March 2026 -- Sent to neo4j.internal.example: 1 query. Nothing else." And another one,
> "Sent: 1 query to neo4j.internal.example, 2 questions to the Assistant. Nothing else." So that's
> what the line in the header turns into after a query. That's the second half of my task, and I
> only found it because I scrolled past the end of the document into what looked like leftover
> screenshots.

## 4. Data panel -- answering again "after a query"

> Back in the app. Data on the rail. Header line again, underlined this time: "Nothing has been
> sent from this project." So here it IS a link and on the other screen it wasn't. Whatever.
>
> Sources: transfers-2026-03.csv. A file, not a data source. Versions, recipes, style files.
> Bottom: "Sent and saved from this project." "Sent: nothing. The Assistant is off and no data
> source is connected. Where your data goes." That's a good sentence -- it gives the reason, not
> just the claim. I'd screenshot that for the ticket.
>
> Now, "after running a data-source query." I can't. Every Data panel I have in front of me is from
> a file. There's no query state in the app mocks. The only place I saw what happens after a query
> is those pictures at the bottom of the forwardable page. From them: the header line names the
> host, "neo4j.internal.example: 1 query. Nothing else." Good -- it names the host, not "a data
> source." "Nothing else" is exactly the phrase a reviewer wants. Then the list: "Query to
> neo4j.internal.example, 1 query, 13:47," with an eye. And "Export log" at the top of that list.
>
> The eye on the Anthropic row opens "Sent to api.anthropic.com" with the question, the 40 node
> names, the three statistics, "Anthropic, your key." That's actually what I'd want -- the actual
> payload, not a summary. But the eye on the query row -- what does it show? The query text? The
> address? How many rows came back? The sign-in, the user name? They drew the Assistant one and not
> the query one, and the query is the one I'd use. For my reviewer, "1 query" with no text is a
> count, not evidence.
>
> And another thing. In that "after" picture the header says "Sent to neo4j..." but I don't see the
> left rail. If the rail still says "Assistant. Off. Nothing is sent." next to a header saying
> "Sent to neo4j," that's two statements side by side that read like they contradict. "Nothing is
> sent" is about the Assistant, I get it now, but my reviewer won't.
>
> Month-on version of the panel: April data, recipes, style files, and "Saved to this computer" --
> april-communities.svg, accounts-by-pagerank.csv, a recipe, a project file "with its data." And
> still "Sent: nothing." OK. So exports are logged too. Good; the reviewer's next question after
> "what went out on the network" is "what got written to disk," and this answers it. "Project file,
> with its data" -- that one I'd flag, that's the file that leaves the building on a USB stick.
> Not the tool's problem.

## 5. What I'd forward

> Two things. The PDF of "Where your data goes." And, after a query, the Export log from Sent and
> saved. But I never saw what Export log produces. CSV? PDF? Does each row carry the host, the
> time, and the query text? Does it say which graphty version? If it's a CSV with timestamps and
> host and the query, that's gold -- I'd drop it next to our proxy logs and check they match. If
> it's a screenshot-shaped PDF with "1 query," it's a count again.
>
> Would the reviewer approve from the page as it stands? No. Not with the telemetry line and the
> hosting line empty and no contact. The structure is right; it's missing the answers only the
> people who run it can give.

## Single Ease Question

> 4 out of 7. Answering "does it send anything" from a project at rest: easy, 6. The page is
> the best "where does my data go" I've seen from a tool, and it's forwardable. Answering it again
> after a query: I only found what it would look like at the bottom of a document, not in the app,
> and the query row shows a count, not the query. And the thing I forward has blanks exactly where
> my reviewer looks first.

## Would I use this instead of my current tool?

> Instead of Splunk or my notebook, no -- it's not that kind of tool. Instead of BloodHound or
> Maltego for a graph view, on scrubbed or lab data: maybe, and this part of it is a reason for,
> not against. It says what goes out, to whom, when, and keeps a log I can check against the
> proxy. Maltego never did that and it leaked to targets. But I can't bring it to a review until
> the page names who hosts it, says "no telemetry" or lists it, says whether we can run it inside
> our network, and gives a contact. Until then it's "not on the list," and that's where I stop in
> real life.

---

## Observations (for the facilitator)

1. **The telemetry line is blank on the forwardable page.** "Usage statistics and crash
   reports:" ends in a colon with nothing after it, in the participant view and in print. It is
   the phone-home question; a reviewer stops there. Severity 4.
2. **Hosting, self-hosting, organization-wide Assistant off, and contact are all empty or
   unnamed.** "Where graphty is hosted" names no host or country; the three "For organizations"
   lines are blank or a nameless Contact link. For a bank reviewer these are the approval
   criteria. Severity 3 (the page must not ship until these are filled in; the design itself is
   right).
3. **The after-a-query state is not in the app mocks.** Every Data panel state shows "Sent:
   nothing" from a file. The only view of the header after a query ("Sent to
   neo4j.internal.example: 1 query. Nothing else.") and of the sent list is a set of unlabelled
   pictures below the end of the forwardable page, which she first took for leftovers and
   wondered whether the reviewer would see them. Severity 3.
4. **The query row in the sent list shows a count, not the query.** "Query to
   neo4j.internal.example, 1 query, 13:47" with an eye; only the Assistant row's detail is drawn.
   She needs the query text, the address, the rows returned and the user it signed in as (not
   the password), both on screen and in the exported log. Severity 3.
5. **Export log's content and format are unknown.** It is the second thing to forward. She would
   want a CSV (or equivalent) with time, host, query text, and the graphty version, to reconcile
   against proxy logs. Severity 2.
6. **Queried data stored in browser storage is not connected to the data-source row.** The page
   says projects (the graph included) live in browser storage, and separately that a query's
   answer comes back to the browser. It never says that a query's rows then persist on the laptop
   until the project is deleted, or whether that storage is encrypted. For a bank, what comes in
   and stays is as important as what goes out. Severity 3.
7. **"Assistant. Off. Nothing is sent." on the rail reads as a global claim.** Beside a header
   that says "Sent to neo4j..." after a query, it will read as a contradiction to a reviewer.
   Scope the caption to the Assistant ("Assistant off") or drop "Nothing is sent." Severity 2.
8. **"Nothing has been sent from this project"** -- "from this project" invites "and from
   elsewhere?". Also a plain lock line on one screen and an underlined link on another; she did not
   try to click it where it was not underlined. Severity 2.
9. **The Connect to data source tooltip omits the sign-in.** "Sends only your query" -- the page
   says the sign-in goes too, and where the password is kept. The tooltip should match the page's
   words. Severity 1.
10. **Keep:** the privacy line under the project name; the start screen's first line; a separate,
    dated, versioned, printable page with Copy link; the what / to whom / when table; "nothing
    until you confirm" for files naming a source; "no fonts, icons or code from other sites";
    "What this page does not promise"; "Sent: nothing" with its reason; the host named in the
    after-query line and "Nothing else."; the See-what-was-sent detail showing the real payload;
    exports logged under Saved to this computer. Severity 0.
