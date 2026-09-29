# Session: did anything leave? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank
(persona: study/personas/fraud-analyst.md). Locked-down Windows laptop, corporate Chrome, no admin
rights, no developer tools. Customer data may not leave approved systems; SAR content is
confidential by law.

**Task, as the moderator gave it.** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

**Mode.** Not mandated. Her own initiative, so her usual patience. She treats the question as a
real one: in her bank, IT's answer decides whether the tool may touch customer data at all.

**Screens seen, in order** (study view, design notes hidden): the start screen, the project frame
with the March transfers open, the Data panel of a payments project (at first load, then a month
on), and the "Where your data goes" page, including its pictures of what the app shows after a
data-source query.
Renders: shots/r4-sarah-dal-start-view.png, shots/r4-sarah-dal-frame-at-rest.png,
shots/r4-sarah-dal-data-panel.png, shots/r4-sarah-dal-data-panel-s7.png,
shots/r4-sarah-dal-data-location.png (crop: tmp/sarah-dal/loc-bottom.png).

---

## Think-aloud

### 1. Start screen -- the answer before I open anything

> Two lines under "Open a graph". "Files stay on this computer. graphty reads them in this browser
> and uploads nothing." And "Projects are kept in this browser." Then a link, "Where your data
> goes". OK. That's a claim, not an answer. Every vendor's first slide says "your data never
> leaves". IT will want it in writing with a date on it.
>
> "Connect to data source..." at the bottom with a plug. That's the one that obviously talks to
> something. There's a little (i) at the far right of that row, all the way over by the edge --
> I nearly didn't see it. It says it "sends only your query, to the source you name." Fine. So
> the honest answer is already "no, except that".
>
> I'm opening the bank transfers sample so I'm looking at something shaped like my data. Not
> putting real data in here until IT says so.

### 2. In the project -- "answer from the app"

> Left side, under the project name: a lock and "Nothing has been sent from this project". Good.
> That's where I'd look, top left, like a case number. And down the left rail, under Notes:
> "Assistant. Off. Nothing is sent." So two places say nothing went. I like that it says it
> without me clicking anything.
>
> But "nothing has been sent" -- sent by whom? My browser loaded this page from somewhere. That's
> a send, technically. IT will say that before I do. I'll come back to it.
>
> The statistics on the right, "Loaded: transfers-2026-03.csv" -- that's the file on my laptop.
> Nothing there says "uploaded". OK.
>
> Clicking the line. In the payments project it's underlined, so it's a link. It takes me to Data,
> a section at the bottom called "Sent and saved from this project". Grey box: "Sent: nothing.
> The Assistant is off and no data source is connected. Where your data goes." And under it,
> "Saved: nothing yet. Every file an export writes is listed here."
>
> Right, so that's my first answer for IT: in the app, it says nothing sent, and it keeps a list.
> A month on, the same section lists the files I exported -- the SVG, the CSV of accounts, the
> recipe, the project file -- with dates. That's actually useful to me separate from IT. If QA asks
> "what did you take out of the tool on this case", that's it. That's an audit trail.
>
> Odd thing: in one screen the line has a lock and isn't underlined, in the other it's underlined
> with no lock. Same sentence. I'd click it either way, I'm just noticing.

### 3. Running a data-source query -- "then again after"

> Now the second half. I want to connect to something and run a query, then ask the same
> question. I go to "Connect to data source..." on the start screen.
>
> [Moderator: that dialog is not in these screens. The "Where your data goes" page shows what the
> app says afterwards. Work from that.]
>
> So I can't actually do it. I'll read the pictures, but I'm telling IT I read a picture, not
> that I ran it.
>
> Bottom of the "Where your data goes" page, there's a row of little screenshots. First one: the
> project name, and under it, an upload arrow and "Sent to neo4j.internal.example: 1 query.
> Nothing else." That's the line that used to say "Nothing has been sent". OK -- so it changes.
> It names the server. Good; "sent to data source" would be useless to IT, they need a host
> name they can check against the firewall.
>
> Second one, after the Assistant as well: "Sent: 1 query to neo4j.internal.example, 2 questions
> to the Assistant. Nothing else." Fine.
>
> Third: the list. "Sent and saved from this project", "Export log" top right. Rows:
> "Question to api.anthropic.com, 40 node names, 3 statistics, 14:09", another at 14:02, and
> "Query to neo4j.internal.example, 1 query, 13:47". Eye icon on each.
>
> Fourth: the eye opened on the 14:09 question. "Sent to api.anthropic.com. When Sep 28, 14:09.
> Provider: Anthropic, your key." The question text. Then "40 node names: ACC-365386, ACC-946224,
> ..." and the statistics.
>
> Hang on. Those are account numbers. Going to an outside AI company. Well, it says so, and it's
> off unless I switch it on, and I wouldn't. But now I know exactly what it looks like if somebody
> on my team does. That's a thing IT needs to see, and honestly the page is being straight about
> it.
>
> What I don't get to see is the eye opened on the query row -- the one I actually care about for
> this task. "1 query". Which query? My query text will have account numbers in it too. And what
> came back -- the answer comes back into the browser and gets kept in the project, in Chrome, on
> my laptop. The table on the page says "Its answer comes back to the browser" and projects "stay
> until you delete the project or clear this site's data". So after the query, the answer to
> "does it send data anywhere" is "one query to our own server" -- but the answer to "does it
> keep data anywhere" just changed. Now there's customer data from our database sitting in
> Chrome storage. IT will ask that second question the moment I answer the first.
>
> Also, the times in the list are just times. 13:47. A case runs for weeks. On a review a month
> later, 13:47 on what day? The detail pane has a date; the list doesn't.
>
> And "Nothing else." -- I read that as a promise. I'd want to know what makes it true. If I
> refresh, does "nothing else" still hold? Page code gets loaded from wherever graphty is hosted
> every time -- the page admits that in the table ("Opening graphty ... where graphty is
> hosted"). It doesn't say where that is.

### 4. Forwarding something IT can read

> Two candidates. "Export log" in the Sent and saved list -- writes the list of sends to a file.
> And the "Where your data goes" page itself, with "Copy link" and "Print or save as PDF" at the
> top, "Describes graphty 2.0. Updated September 28, 2026."
>
> The PDF is the one. It's got a date and a version, so when they approve it they're approving
> something specific. The "In short" box is four lines I could paste straight into the access
> request. The "What leaves this browser" table -- feature, what is sent, to whom, when -- is
> basically the vendor data-flow questionnaire our IT sends out. I'd paste that. "What this page
> does not promise" -- I'd keep that in too. Makes it look less like marketing.
>
> The log I'd think twice about. If I'd used the Assistant, the log is a list of account numbers
> sent to an outside company, and I'd be emailing that to IT. Page says no password or key is in
> it. Fine, but account numbers are the problem, not passwords. I don't know what the file looks
> like -- CSV? PDF? Does it include the query text? Nothing shows me. So I'd send the PDF, and
> say "I can export the send log for a specific project if you need it."
>
> Now the bits I'd have to explain away, and I can't:
>
> - "Usage statistics and crash reports:" -- and then nothing. Blank. That's question one on our
>   form. If I send this, IT reads blank as "yes, and we don't want to say".
> - "Running your own copy of graphty, inside your network:" -- blank. That's the question
>   that actually decides it for a bank.
> - "Turning the Assistant off for everyone in an organization:" -- blank. They will not rely on
>   me not turning it on.
> - "Contact" -- a link that doesn't say who. Who signs this?
> - "Check it yourself. Open your browser's developer tools..." -- I can't; they're locked on my
>   laptop. IT can. That paragraph is for them, which is fine, it's going to them.
>
> "Copy link" -- to where? If it's a public site, IT can open it. If I'm looking at some internal
> copy, the link might not work outside. I'd print.

### 5. Verdict

> So. From the app, before: "nothing sent", said in three places, and a list I can open. After a
> query: it names the server and counts it, and there's a log. That's better than anything else I
> use -- Excel doesn't tell me anything and I'd never know if an add-in phoned home. But I didn't
> run the query, I read a picture of it, and I never saw what "1 query" contains. And the thing I
> forward to IT has three blanks in exactly the places IT looks first. I'm not sending a document
> with blanks on telemetry and self-hosting to our security team. I'd get it back in a day with
> those three circled.

---

## What she would send IT (her words)

> Subject: graphty -- data handling, for review
>
> Attached is the vendor's "Where your data goes" page (graphty 2.0, dated Sep 28 2026), printed
> to PDF. Short version from what I can see in the app:
>
> - Files I open are read in the browser, not uploaded. The app shows "Nothing has been sent from
>   this project" until something is.
> - Two features send data, both off by default: a data-source connection (sends the query to the
>   server we name, e.g. our own Neo4j) and an AI Assistant (sends account IDs and summary
>   numbers to an outside provider). I don't plan to use the Assistant.
> - After a data-source query the app changes that line to "Sent to [our server]: 1 query" and
>   keeps a per-project log I can export.
> - Projects, including anything pulled from a data source, are stored in the browser on my
>   laptop until deleted.
>
> Not answered on their page: telemetry / crash reports, self-hosting, an org-wide switch for the
> Assistant, and who the contact is. I've asked them. Can you tell me whether browser storage of
> case data is acceptable, or whether it has to be cleared after each session?

---

## Single Ease Question

**5 out of 7.** "Answering from the app was easy -- it tells you before you ask. The second half
I couldn't actually do, I read a picture of it. And the part I'm forwarding has blanks on the
exact lines IT reads first, so the forwarding isn't done, I'm just sending a document with a
cover note apologizing for it."

## Would she use it instead of her current tool?

> Not instead of anything yet -- for this question my current tool is "don't use anything IT
> hasn't approved", and this doesn't get approved with those blanks. But if they fill in
> telemetry, self-hosting and the Assistant switch, this is the easiest approval request I'd
> have ever written. i2 went through months of vendor review and I never got a page this clear
> out of it. The sent-and-saved list is the bit I'd actually use every day, for QA, not for IT.

---

## Problems observed

1. **The forwardable page has blank answers on the reviewer's first questions.** In the version a
   reader sees, "Usage statistics and crash reports:", "Running your own copy of graphty, inside
   your network:" and "Turning the Assistant off for everyone in an organization:" end with
   nothing, and "Contact" names no one. The page is the thing she forwards, so the blanks travel
   with it. "IT reads blank as yes." Severity: high -- it blocks the outcome, not the path.
2. **"After a data-source query" can only be seen as a picture.** There is no screen for
   connecting and running a query; the only view of the app after one is a thumbnail on the
   "Where your data goes" page. She could describe it to IT but not say she had done it.
   Severity: medium (a gap in the mocks, but it is the half of the task that matters most).
3. **What a query sent is never shown.** "See what was sent" is shown opened only for an
   Assistant question. For the query row she cannot see the query text (which in her work
   carries account numbers) or learn whether the answer's rows are logged. Severity: medium.
4. **After a query, the risk moves from "sent" to "kept", and the app's line only speaks about
   sent.** The query's answer becomes part of a project stored in the browser. "Sent to
   neo4j.internal.example: 1 query. Nothing else." is true and still leaves IT's next question --
   customer data at rest in Chrome -- for her to raise herself. Severity: medium.
5. **Export log's content and format are unknown, and it may itself carry customer data.** She
   could not see what the file contains; if it lists the account numbers an Assistant question
   carried, emailing it to IT is a data-handling event of its own. She sent the PDF instead.
   Severity: medium.
6. **The send list shows times without dates.** "13:47" on a project that runs for weeks; only the
   detail pane has the date. Severity: low.
7. **"Nothing else." reads as a promise without saying what makes it true**, while the same page
   says page code is loaded from wherever graphty is hosted, and never names that place.
   Severity: low.
8. **The privacy line looks different in two places** (lock icon and plain text in the project
   frame; underlined link without the lock in the Data panel). She would click either, but
   noticed. Severity: low.
9. **The (i) on "Connect to data source..." sits at the far right edge of the row**, away from the
   label; she nearly missed the one sentence that answers the question at the point of use.
   Severity: low.

## What worked for her

- Three places answer at rest without a click: the start screen line, "Nothing has been sent
  from this project" under the project name, and "Assistant. Off. Nothing is sent." on the rail.
- After a query the line names the server and counts the sends -- "a host name IT can check
  against the firewall", not "sent to data source".
- "Sent and saved from this project" doubles as a QA record of what left the tool on a case --
  she valued it more for her own audit trail than for IT.
- "See what was sent" on an Assistant question shows the actual account IDs that went out:
  unwelcome, but honest, and exactly what a reviewer needs to see.
- "Where your data goes" is dated and versioned, prints to PDF, and its "What leaves this browser"
  table matches the data-flow questionnaire her IT sends vendors.
- "What this page does not promise" made the page read as a statement rather than marketing.
