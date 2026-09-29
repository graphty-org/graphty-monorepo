# Session: does this tool send data anywhere? -- Sarah, fraud investigator

**Participant.** Sarah, a complex-case financial crime investigator at a mid-size bank
(persona: study/personas/fraud-analyst.md). Locked-down Windows laptop, corporate Chrome, no admin
rights. Customer data may not leave approved systems; SAR content is confidential by law.

**Task, as the moderator gave it.** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they can
read." The same task, in the same words, as the previous two rounds.

**Mode.** Not mandated. IT asked her, so she wants to answer and get back to her cases; she gives
it a few minutes, not an afternoon.

**Screens seen, in order** (study view, design notes hidden): the project frame on the March
transfers file; the start screen; the "Where your data goes" page, read top to bottom including
the strip of app pictures at its foot; the Data panel of a payments project, first at the top and
then scrolled to "Sent and saved".
Renders: shots/tasks/did-anything-leave/01-frame-at-rest.png, 02-start-screen.png,
03-data-location.png; shots/r6-sarah-dal-data-location-full.png (whole page, crops in
tmp/sarah-did-anything-leave/c0.png to c2.png); shots/r6-sarah-dal-data-panel-s1.png and
shots/r6-sarah-dal-data-panel-s7.png.

---

## Think-aloud

### 1. Answer from the app -- the project I have open

> March transfers, 3,000 accounts. Under the name: "Nothing has been sent from this project."
> Underlined, so it's a link. On the left rail: "Assistant. Off. Nothing is sent." Two places, no
> clicking. That's the answer I'd give IT on the phone: nothing has left from this case.

> What I'd want next to it is "since when". "Nothing has been sent" -- ever? Since I opened it
> this morning? I assume ever, for this project. I'll take it.

> The file chip says transfers-2026-03.csv. So this came off my own disk. Fine.

### 2. The start screen

> "Files stay on this computer. graphty reads them in this browser and uploads nothing." Then
> "Where your data goes", a link. "Projects are kept in this browser." Same as before. Good that
> it says it before I've opened anything, because that's when IT asks.

> "Connect to data source..." has a little (i) way over on the right edge. I only see it because
> I'm looking for it. It says "Sends only your query, to the source you name." That one sentence
> is the whole answer to half of this task and it's hiding at the far end of the row.

### 3. "Where your data goes" -- the thing I'd forward

> Title, then "It is written so you can forward it to whoever approves software where you work."
> OK, that's what I need. "Describes graphty 2.0. Updated September 28, 2026." Dated and
> versioned. IT will ask which version; it says. Copy link, Print or save as PDF. I'll do the PDF,
> because a link to an outside site gets flagged by our mail filter and they'll want a file in the
> ticket anyway.

> "In short." Four lines. Files not uploaded, no account, no server. Only two things send: data
> source and Assistant, both off until I turn them on. Projects in this browser. "No password or
> key ever appears in the list of what was sent, in an exported copy of that list, or in a project
> file." That last one is new, and it's the one IT asks right after "does it upload". Good.

> "What stays in this browser" -- files, projects, exports, the Assistant key, the data-source
> password. "Kept in memory until you close the tab. It is never written to this browser's
> storage." That's a straight answer. IT will like that.

> "What leaves this browser, and only when you ask." Four columns: feature, what, to whom, when.
> This is the table our vendor questionnaire asks for, almost column for column. Data source: "The
> query you write, and any sign-in... Its answer comes back to this browser only." To whom: "The
> source at the address you enter, run by whoever runs it -- not by graphty." Right, our Neo4j is
> ours. That's the line that matters for the second half of the task.

> "Opening graphty -- Nothing from your files... Where graphty is hosted." Where IS it hosted?
> That's not an answer, that's the question repeated. IT's very first line on any web tool is
> "what domain, what country, who runs the server". This cell just points back at itself.

> Then the box: "The app says when something leaves." After a query the line reads "Sent to
> neo4j.internal.example: 1 query. Nothing else." That's what I'd see. OK.

> "What graphty does not send." No account. No file contents except the features above. No fonts
> or code from other sites. Then: "Usage statistics and crash reports:" -- and nothing. Blank. The
> sentence just stops. Is that a yes? A no? A typo? That is THE question. Telemetry is how data
> leaves without anyone clicking anything. If I forward this, IT reads that line and the ticket
> comes straight back to me with "please clarify". And it makes the rest of the page look
> unfinished, which makes them trust the rest less.

> "Check it yourself. Open your browser's developer tools, choose the Network tab." Our Chrome
> has DevTools blocked by policy. I can't. IT can, though -- actually I'd leave that paragraph in
> for them, it's aimed at them more than at me.

> "What this page does not promise." Doesn't cover what the source or provider does with data.
> Doesn't protect from loss if the laptop is re-imaged. Doesn't protect from extensions or other
> people on the login. "A description of graphty 2.0, not a certification or a contract." Fine.
> That's honest. That section is why I'd believe the top half.

> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. "Questions this page does
> not answer: Contact" -- Contact who? It's a link with no address on it. Three blanks in the
> section written for exactly the people I'm forwarding it to. IT is going to ask "can we host it
> ourselves" before they ask anything else, and the page has a colon and then air.

> At the bottom there's a strip of little pictures -- the start screen, a list, a menu, the project
> header with "Sent to neo4j.internal.example: 1 query", the list of sends, one opened. No
> headings on them. Are those part of what prints? If the PDF has screenshots of somebody's
> "Which flagged accounts send money to the same merchants?" with account numbers in it, I'm not
> attaching that to a ticket. I'd have to print it and look before I send it.

### 4. "Again after running a data-source query"

> Where do I run the query? There's "Connect to data source..." on the start screen but nothing
> behind it I can go through. The only place I see "after a query" is that picture strip at the
> bottom of the page I'm meant to forward. So I can tell IT what the app WOULD say. I can't tell
> them I did it and here's what it said. Same as last time.

> From the pictures: the line under "Transfers, March 2026" turns into "Sent to
> neo4j.internal.example: 1 query. Nothing else." The chip becomes the server's name. That's a
> host IT can check against the firewall. Better than "sent to data source". I like "Nothing
> else." -- it's the sentence I'd write myself.

> The list: "Query to neo4j.internal.example -- 1 query -- 13:47." 13:47 what day? The case runs
> three weeks. The opened one for the Assistant says "Sep 28, 14:09" but the list rows only have
> the time. And the eye on the query row -- I only get to see the Assistant question opened. What
> did the query carry? My queries have account numbers in the WHERE clause. IT will want to know
> whether the query text is kept in that log, because then the log is customer data too.

> The Assistant one opened is honest: "40 node names, ACC-365386, ACC-946224..." That's account
> numbers going to api.anthropic.com. If I saw that on a real case I'd be the one explaining it.
> But the tool told me, which is more than most do.

> After the query, the risk isn't what was sent -- it's what came back. 3,000 accounts and 9,113
> transfers are now sitting in Chrome's storage on my laptop. The table on the page does say it:
> "Its answer comes back to this browser only", and projects are "kept in this browser's storage".
> But the line in the app only talks about "sent". If IT asks "and now where does the data live",
> I'd go back to the page, not the app.

### 5. The Data panel -- the app's own record

> Data rail. Sources, versions, recipes. At the bottom, "Sent and saved from this project".
> "Sent: nothing. The Assistant is off and no data source is connected. Where your data goes."
> Good, agrees with the header.

> Then, right under it, in my app: "Who hosts graphty, and where: Not decided yet." "Usage
> statistics and crash reports: Not decided yet." "Assistant off for a whole organization: Not
> decided yet."

> ...In the product? On my case? If I screenshot this panel for IT as "here's what the app says",
> the first thing they read is that nobody has decided who hosts it or whether it phones home.
> That's worse than the blank on the page. A blank looks like a typo; "Not decided yet" is the
> vendor telling me in writing that the answer to the telemetry question is unknown. I would not
> send this screen. At least it's consistent with the page -- the page is blank where the app says
> "not decided" -- so nobody's lying. But it answers IT's question with "we don't know".

> "Saved to this computer" -- a list of files I exported, with dates this time. That's my own
> audit trail. I'd use that for QA more than for IT.

> "Export log" is in the header of that list. What format? CSV? PDF? Does it have the account
> numbers the Assistant sent? The page says no passwords or keys. Doesn't say no customer data.
> I'd still send the PDF of the page, not the log.

### 6. What I'd actually send

> The PDF of "Where your data goes", after checking whether the bottom pictures print. With a note
> from me covering the three blanks, which means I'm writing half the answer myself.

---

## What she would send IT (her words)

> Hi -- re your question on the graph tool.
>
> Short answer: it runs in the browser. Files we open are read locally and not uploaded; there's
> no account and no server that receives our data. Only two features send anything: a connection
> to a data source (it sends our query to the address we give it -- that would be our own Neo4j
> server -- and the results come back to the browser) and an AI Assistant, which is off unless
> someone sets a provider and key. I have not turned the Assistant on.
>
> The app shows this per case: the line under the project name reads "Nothing has been sent from
> this project", and after a query it reads "Sent to <our server>: 1 query. Nothing else." It
> keeps a list of every send with time and address.
>
> Their statement is attached (PDF, "Where your data goes", describes version 2.0, dated
> Sep 28, 2026). Data-source passwords are held in memory only; no password or key goes into their
> logs or project files.
>
> Three things it does NOT answer, which I assume you'll need before approving: who hosts it and in
> which country, whether it collects usage statistics or crash reports, and whether we can run our
> own copy internally. The app itself says "not decided yet" for all three. There's no contact
> address on the page. Also note that anything we pull in stays in Chrome's storage on the laptop
> until the project is deleted.
>
> -- Sarah

---

## Single Ease Question

**4 out of 7.**

> The first half is easy -- two places say nothing's gone before I click anything, and the
> page is the right shape for IT. The second half I still can't do, only look at a picture of.
> And the thing I forward has blanks exactly where IT's first two questions go, and the app
> itself says "not decided yet" on them. I wrote a third of that email covering for the page.
> Last time I didn't have to explain blanks. That's why it's lower.

## Would she use it instead of her current tool?

> For this question, my current tool is the vendor's security questionnaire and i2, which is on
> our own server so IT already signed off. This page is clearer than most vendor answers I've
> forwarded -- the "what leaves, to whom, when" table and the "does not promise" list are better
> than what our case-system vendor gave us. But I don't pick tools, IT does, and IT won't pass
> something whose own app says "Who hosts graphty: not decided yet" and "Usage statistics: not
> decided yet". Until those say an actual host and "none", no -- I'd keep using i2 for the link
> charts and Excel for everything else. If those were filled in, and I could run it on our own
> server, I'd send it to IT the same afternoon.

---

## Problems observed

1. **The page to forward has blanks where IT's first questions go.** "Usage statistics and crash
   reports:", "Running your own copy of graphty, inside your network:" and "Turning the Assistant
   off for everyone in an organization:" end in a colon and nothing; "Contact" is a link with no
   address; "Opening graphty" says only "Where graphty is hosted." She read the blanks as the page
   being unfinished, trusted the rest less, and had to cover all of them in her own email.
   Severity: high.
2. **The app itself shows "Not decided yet" three times in Sent and saved** (who hosts graphty,
   usage statistics and crash reports, Assistant off for a whole organization). On a live case
   this is the vendor telling the analyst, in the product, that telemetry and hosting are
   unknown. She would not screenshot this panel for IT. Severity: high.
3. **"After a data-source query" can still only be seen as a picture**, and the picture sits at
   the foot of the page she is meant to forward, unlabelled. She can say what the app would show,
   not that she did it. Severity: medium.
4. **She could not tell whether the strip of app pictures prints with the page.** One of them
   shows an Assistant question with account numbers; she would have to print and check before
   attaching the PDF to a ticket. Severity: medium.
5. **What a query carried is still never shown.** Only the Assistant question is shown opened.
   She cannot see whether the query text (which carries account numbers in her work) is kept in
   the send list or the exported log. Severity: medium.
6. **After a query the risk moves from "sent" to "kept", and the app's line speaks only of
   "sent".** The page's table now says the answer "comes back to this browser only", which helps,
   but the app never says where the 3,000 accounts now live. Severity: medium.
7. **Export log: format and contents unknown.** The page now says no password or key is in it;
   it does not say whether account numbers an Assistant question carried are. She sent the page
   PDF instead. Severity: low.
8. **Send rows show a time without a date** ("13:47") on a project that runs for weeks; only the
   opened detail has the date. The "Saved to this computer" rows do have dates. Severity: low.
9. **"Nothing has been sent from this project" does not say since when.** She assumed "ever, for
   this project". Severity: low.
10. **The (i) on "Connect to data source..." sits at the far right edge of the row**, away from
    its label, yet it carries the one-sentence answer to half of the task. Severity: low.
11. **"Check it yourself" asks for developer tools**, which her bank's Chrome policy blocks. She
    kept it in for IT, who can. Severity: low.

## What worked for her

- The answer at rest needs no click: "Nothing has been sent from this project" under the name and
  "Assistant. Off. Nothing is sent." on the rail, matching the start screen line and the Data
  panel's "Sent: nothing."
- After a query the line names the server and ends "Nothing else." -- a host IT can check against
  the firewall, not "a data source".
- The new "In short" line that no password or key appears in the send list, its exported copy or
  a project file answered IT's usual second question before it was asked; the data-source
  password row ("kept in memory until you close the tab") was a straight answer.
- "Its answer comes back to this browser only" in the query row closes half of the "where does the
  data live after a query" question on the page itself.
- The "what leaves, to whom, when" table matches her bank's vendor questionnaire, and "What this
  page does not promise" made the page read as a statement, not marketing.
- Dated and versioned, with Print or save as PDF -- the form IT actually wants in a ticket.
- "See what was sent" on an Assistant question shows the real account IDs that went out:
  unwelcome, but honest.
