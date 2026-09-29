# Session: Did anything leave? -- Dana Okafor, supply chain risk analyst

**Task, as the moderator gave it:** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they can
read."

**Screens seen (study view, 1440 x 900 at her desk monitor):** the open project at rest
(`shots/tasks/did-anything-leave/01-frame-at-rest.png`), the start screen
(`02-start-screen.png`), the "Where your data goes" page (`03-data-location.png`, and the whole
page scrolled, `shots/tmp/dana-r6-leave/loc-full.png`), and Data > Sent and saved
(`shots/tmp/dana-r6-leave/panel-s7.png`).

---

## 1. The project at rest -- "does it send anything?"

> OK, it's a bank-transfers sample, not my suppliers, but fine. The IT question. Where would it
> say... Top left, under the project name: "Nothing has been sent from this project." And it's
> underlined now, so it's a link. Good -- last time I didn't know I could click it.
>
> Down the left edge, under "Assistant": "Off. Nothing is sent." That's tiny and grey. I had to
> lean in. But it says the same thing, so two places agree.
>
> So the answer from the app is: nothing has been sent. That took me five seconds. That part's
> fine.
>
> What I'd actually want to know is "nothing has been sent" -- ever? since I opened it? since the
> project was made? It says "from this project". I'll take that as "ever, for this project". IT
> will ask "and what about the tool itself when it loads?" -- that's not a project question.

## 2. Clicking the line -- Data > Sent and saved

> Clicked it. The Data panel opens and scrolls to "Sent and saved from this project". Grey box:
> "Sent: nothing. The Assistant is off and no data source is connected." Good, that's the
> sentence I'd paste.
>
> Then under it:
> "Who hosts graphty, and where: Not decided yet."
> "Usage statistics and crash reports: Not decided yet."
> "Assistant off for a whole organization: Not decided yet."
>
> ...Hm. That's the first thing I'd hide from IT, not show them. "Who hosts it: not decided yet"?
> If I'm using it, somebody's hosting it. And "usage statistics: not decided yet" -- that reads to
> me like "we might be collecting, we haven't made up our minds." My reviewer will circle that and
> send it back. I'd rather it said nothing than "not decided".
>
> Under that, "Saved to this computer" -- a list of files with dates. Figure, a CSV, a project
> file. That's nice for me, actually, that's my audit trail of what I exported. Not what IT asked,
> but I'd use it.

## 3. The page I'd forward -- "Where your data goes"

> There's "Where your data goes" as a link in that grey box, and on the start screen next to
> "Files stay on this computer... uploads nothing." Opened it.
>
> Heading, one paragraph that literally says "written so you can forward it to whoever approves
> software where you work." OK, somebody thought about me. "Copy link" and "Print or save as PDF"
> -- that's the forward. Good.
>
> "In short" box, four lines. Files aren't uploaded, no account, no server. Data leaves only
> through "Connect to data source" and "the Assistant", both off. Projects kept in this browser.
> No password or key in the log or in a project file. That's the box my reviewer will read and
> nothing else. It's good.
>
> Two tables. "What stays in this browser" -- files, projects, exports, Assistant key,
> data-source password "kept in memory until you close the tab". That last one IT will like.
> "What leaves this browser, and only when you ask" -- what, to whom, when. Tables I can read.
> The Assistant row: "the names and values of the nodes it looks up". Node names -- for me that's
> supplier names. NDA. Assistant stays off. That's the page doing its job.
>
> Then "What graphty does not send". Account, file contents, fonts... then:
> "Usage statistics and crash reports:" -- and nothing. Colon, then blank. Is the page broken?
> Didn't load? Same down at "For organizations": "Running your own copy of graphty, inside your
> network:" -- blank. "Turning the Assistant off for everyone in an organization:" -- blank.
> "Questions this page does not answer: Contact" -- a link, no email address.
>
> So the app panel said "Not decided yet" on these and the forwarding page has empty colons on
> the same questions. Which is it? And those three blanks are exactly my reviewer's checklist:
> telemetry, can we host it ourselves, can we switch the AI off for everybody, who do I email.
> Everything else on this page is better than I get from our risk platform. But the page I send
> to IT has holes in precisely the four places IT looks.
>
> "Check it yourself" -- open developer tools, Network tab. I won't, IT might. Fine, that's for
> them.
>
> "What this page does not promise" -- clearing the site data or a re-imaged laptop deletes
> projects. That's a me-problem, not IT's. Noted: download the project file. Our laptops get
> re-imaged.

## 4. After a data-source query

> Now "run a data-source query". On the start screen there's "Connect to data source..." with a
> little (i). Doesn't say which sources. SAP? Our ERP? I don't know. I don't have a "data
> source" in the sense they mean -- I have an export from SAP that I save as CSV. So in real life
> I would never do this step; I'd open the CSV and the answer stays "nothing has been sent".
>
> I couldn't actually do a query in the app. What I found was at the bottom of the "Where your
> data goes" page -- a strip of pictures. Is that the app, or part of the page I'm forwarding?
> Looks like pictures of the app. Reading them:
>
> - The line under the project name changes to "Sent to neo4j.internal.example: 1 query. Nothing
>   else." It names the server. "Nothing else" -- good, that's the follow-up question answered
>   before it's asked. "neo4j" means nothing to me; I assume it's our server name in the example.
> - With the Assistant too: "Sent: 1 query to neo4j.internal.example, 2 questions to the
>   Assistant. Nothing else."
> - The Sent and saved list: "Query to neo4j.internal.example -- 1 query -- 13:47", with an eye
>   icon, and "Export log" at the top.
> - The eye on an Assistant question shows exactly what went: "40 node names" with account
>   numbers. That's the scary one, and it shows it honestly.
>
> So after a query, the answer is: one query went to our own server, nothing else, and the data
> came back only to me -- well, the table on the page says "its answer comes back to this browser
> only"; the row in the list doesn't. My reviewer would want that on the row.
>
> "Export log" -- to what? CSV? PDF? Still doesn't say. I'd want to open it in Excel before I
> attach it to anything. And in the real panel I looked at, there's no Export log button at all
> under Sent and saved -- only in the picture. Maybe it shows up once something's been sent.

## 5. What I'd write to IT

> "The tool runs in the browser; files are read on the laptop and not uploaded; no account.
> Only two features send anything: a data-source connection (to a server we name, our own) and
> an AI Assistant (to Anthropic, OpenAI or Google under our key). Both are off by default. I will
> use CSV exports from SAP only, so nothing will be sent; the app shows 'Nothing has been sent
> from this project' and would name the server if that changed. Their data page is attached as
> PDF. They have not answered: who hosts it, whether it collects usage statistics or crash
> reports, whether we can host it ourselves, and who to contact -- the page leaves those blank
> and the app says 'not decided yet'."
>
> And I know what comes back: "Come back when they've decided."

---

## Single Ease Question

**4 of 7.** Answering from the app was easy -- the line is under the project name and it's a link
now, and after a query it names the server and says "Nothing else". Forwarding is one click to a
PDF. I drop from last time because the thing I forward now has blank colons where the answers
should be, and the app itself says "Not decided yet" on who hosts it and on usage statistics.
That's worse than silence: it tells my reviewer the vendor hasn't decided whether to collect
data. And I couldn't really "run a query"; I had to read pictures at the bottom of the page and
guess they were the app.

## Would I use this instead of my current tool?

> Instead of? No. This task is about getting past IT, not about my job, and nothing here gets
> anything into Power BI. On the narrow question -- "does it send our supplier list anywhere" --
> this is the clearest answer I've had from any tool; our risk platform needed a vendor call.
> But IT approves on the whole checklist, and hosting, telemetry and a contact are blank. Until
> those are filled in, this is a side tool I use with CSVs on my own laptop and don't mention in
> the security review.

---

## Moderator notes (observed, not the participant's words)

- The privacy line under the project name is now underlined and she recognised it as a link at
  once; in round 5 she did not. It answered the at-rest question in one glance.
- The three "Not decided yet" rows in Data > Sent and saved (hosting, usage statistics,
  organization-wide Assistant off) cost trust in the product rather than reading as honesty. She
  said she would hide them from IT. "Who hosts graphty: not decided yet" read as nonsense to her
  ("if I'm using it, somebody's hosting it") and "usage statistics: not decided yet" read as
  "might collect".
- In the study view the forwardable page shows the same open questions as bare colons with
  nothing after them ("Usage statistics and crash reports:", "Running your own copy of graphty,
  inside your network:", "Turning the Assistant off for everyone in an organization:") and a
  "Contact" link with no address. She first thought the page had failed to load. The app says
  "Not decided yet" where the page says nothing, so the two disagree in wording on the same
  questions. Whatever the answers become, the page as a participant sees it should not end a
  sentence at a colon.
- The after-query state was reachable only as pictures at the bottom of the forwardable page;
  she was unsure whether they were the app or part of the page she was about to send. There is no
  after-query state of the app itself among the task's screens, and the Data panel mock has no
  Export log button.
- "Connect to data source..." still gives no hint which sources it reaches; with an SAP CSV
  export, she treated the whole query branch as hypothetical for her. "neo4j" meant nothing.
- Still open from round 5: Export log does not say its file format, and the Sent list's query row
  does not say the answer came back only to this browser (the table on the page does).
- The Assistant row ("names and values of the nodes it looks up") and the "See what was sent"
  panel with account numbers made the NDA risk concrete; she decided to keep the Assistant off.
  The page working as intended.
- The rail's "Off. Nothing is sent." and other small grey secondary text were hard for her to
  read.
- She valued "Saved to this computer" as a personal export trail, unprompted.
