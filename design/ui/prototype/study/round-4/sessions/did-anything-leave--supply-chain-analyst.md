# Session: did anything leave? -- Dana, supply chain risk analyst

Participant: Dana Okafor, supply chain risk analyst at an industrial equipment maker (about 1,400
direct suppliers). Lives in Excel and Power BI. Supplier lists are confidential and under NDA, and
any new web tool that touches them goes through an IT security review that takes weeks.

Task as given by the moderator: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Screens seen, in order:

- `shots/screens__start-screen.png` -- the start screen, nothing opened
- `shots/screens__frame-at-rest.png` -- a sample project open (Les Miserables)
- `shots/screens__data-panel.png` and `shots/screens__data-panel-s7.png` -- the Data panel, with
  "Sent and saved from this project"
- `shots/screens__data-location.png`, `shots/record/screens__where-your-data-goes--study.png` and
  `shots/screens__data-location-full.png` -- the "Where your data goes" page, top and whole,
  including section 3, "What the app says when something leaves" (the line under the project
  name after a data-source query, the Sent and saved list, and "See what was sent")

---

## 1. Start screen -- before I give it anything

> "Open a graph." OK. First thing under it, with a little padlock: "Files stay on this computer.
> graphty reads them in this browser and uploads nothing." That is the exact sentence my IT guy
> wants. Good that it's here and not in a footer.
>
> "Projects are kept in this browser." Kept in the browser... like cookies? If IT re-images my
> laptop, is it gone? Probably. I'll come back to that.
>
> "Where your data goes" -- blue, underlined. That's the one I'd click for IT. Not yet though, the
> task says answer from the app first.
>
> "Connect to data source..." with an (i). Plug icon. That obviously goes out somewhere. Hover...
> [hover text per the page: "Sends only your query, to the source you name."] Only your query.
> Fine. But what data source? Does this talk to SAP? To our risk platform? It doesn't say. If it
> can't read SAP I'm not connecting anything, I'm dragging in my CSV.
>
> No sign-in, no account. Honestly that's the first good sign. Every time a tool wants an account
> I know there's a server holding my supplier list.
>
> Grey text is small. The line about files is fine, the "Projects are kept..." line is light grey.
> With my glasses, OK. Without, I'm squinting.

## 2. A project open -- "does it send anything right now?"

> I opened the sample, Les Miserables, whatever that is. Top left under the project name: padlock,
> "Nothing has been sent from this project." OK, so there's my answer. Right under the name, I
> didn't have to look for it.
>
> And on the left edge, under Notes: "Assistant. Off. Nothing is sent." Two places say nothing.
> I like that it says "Off" -- I don't want some AI thing quietly reading my suppliers.
>
> Is "Nothing has been sent" clickable? It doesn't look like a link here, it's just grey text
> with a lock. [Data panel screenshot] Oh -- on this other screen the same line IS underlined.
> So it's a link. On the first screen I'd never have known to click it.
>
> Data panel, bottom: "Sent and saved from this project. Sent: nothing. The Assistant is off and no
> data source is connected. Where your data goes." That box is readable. Then "Saved to this
> computer" with the files it exported -- april-communities.svg, accounts-by-pagerank.csv...
> Useful, actually. IT also asks "where did the export go". Here's the list.
>
> So, answer from the app, first time: "It says nothing was sent. Nothing leaves unless I connect
> a data source or turn on the Assistant, and both are off." I'd be comfortable saying that.

## 3. After a data-source query

> [Section 3 of the page, the "after a query" pictures.] Different project, bank transfers, and
> they connected to "neo4j.internal.example". I don't know what neo4j is. Some database. We don't
> have one of those -- our stuff is SAP and a spreadsheet. So this is hypothetical for me. Let's
> pretend it's our server.
>
> The line under the project name changed: "Sent to neo4j.internal.example: 1 query. Nothing
> else." Good. It names the server, not just "a data source". IT will ask "which server" and
> there it is. "Nothing else" -- I actually like that, it answers the next question before they
> ask it.
>
> Click it and you get the list: "Query to neo4j.internal.example, 1 query, 13:47." Eye icon on
> the right -- "See what was sent". What went is the query I wrote. Hm. If I wrote a query with a
> supplier name in it, then the supplier name went to our own server. That's fine, it's ours.
>
> But wait -- 3,000 accounts came back. That's data coming IN. Does IT care about that? Probably
> not, it's our own server talking to my browser. But the list only says what went out. I'd
> want one line that says "the answer came back to this browser only" right on the row -- the
> page says it in the table, the list doesn't.
>
> And the other example, the Assistant one: "Question to api.anthropic.com, 40 node names, 3
> statistics." Opened it: the question, then ACC-365386, ACC-946224... "and 34 more". So it sends
> the names. If those were my suppliers, 40 supplier names just went to an AI company. That's an
> NDA problem. Good that it shows me, bad that it's that easy. I'd leave the Assistant off and
> tell IT so.
>
> Answer after the query: "One query went to our own server, named, at 13:47. Nothing else left.
> Here's exactly what went." That's a better answer than I can give for most of our tools.

## 4. Something to forward

> "Where your data goes" page. Opens in its own tab, no project needed -- good, IT won't have to
> open the tool. "It is written so you can forward it to whoever approves software where you
> work." Well, that's me. "Describes graphty 2.0. Updated September 28, 2026." Version and date,
> IT always asks.
>
> "Copy link" and "Print or save as PDF". PDF. That's what goes on the ticket.
>
> "In short" -- four lines. Not uploaded, no account, no server. Only two features send anything,
> both off until you turn them on. Projects on this computer only. No password in the log or the
> project file. That's the paragraph I'd paste into my email.
>
> Tables -- I read tables. "What stays in this browser": files, projects, exports, an Assistant
> key. "What leaves this browser, and only when you ask": data source, a recipe that names a data
> source, the Assistant, the in-browser model, and "Opening graphty -- nothing from your files".
> Clear. Four columns, what, to whom, when. IT will like "to whom".
>
> "Check it yourself. Open your browser's developer tools, Network tab..." I'm not doing that. But
> my IT guy will, and he'll like being told he can.
>
> Now the pink boxes. [On the full page.] "Owner decision open: who hosts graphty, and where." --
> that's IT's FIRST question. What country is it hosted in. And it's blank. "Usage statistics and
> crash reports: owner decision open." That's IT's second question. "Running your own copy inside
> your network: owner decision open." Third question. "Contact: who answers a reviewer's
> questions: owner decision open." So if IT has a follow-up, there's nobody to ask.
>
> Maybe the pink stuff is notes for whoever builds this. But if I forward this page today, the
> three things my reviewer will actually ask about are the three things it doesn't answer. He'll
> send it back with "who hosts it, is there telemetry, who do I call". And he'll ask for a SOC 2
> or a security questionnaire. The page even says "not a certification or a contract". Fair,
> honest -- but that's where our review usually stalls.
>
> "Export log" on the Sent and saved list -- writes the list to a file to attach. What kind of
> file? CSV? PDF? Doesn't say. If it's a CSV I can open it in Excel first, which I would, before
> I send anything to IT. I'd attach the PDF of the page plus the log.
>
> "It does not keep projects safe from loss. Clearing this site's data... deletes them." OK, so
> my re-image worry was right. "Download project file" makes a copy. Noted -- that's not an IT
> answer, that's a me answer: back it up.
>
> Also -- two pages? "Data location" and "Where your data goes" -- same page, I think. Fine.

## 5. What I'd write to IT

> "The tool runs in the browser. Files aren't uploaded, there's no account. Only two things send
> data: a data-source connection (to a server we name) and an AI Assistant (to Anthropic, OpenAI
> or Google under our own key). Both are off by default; I will not turn on the Assistant. The app
> shows under each project what was sent and to where, and I can export that list. Attached: their
> data page as PDF, and the log. Open questions they haven't answered: who hosts it and in which
> country, whether it collects usage stats, whether we can host it ourselves, and who to contact."

---

## Single Ease Question

**5 of 7.** Answering from the app was easy -- the line is under the project name, twice over.
After the query it was easy too: named server, "Nothing else". Forwarding was one click to a
PDF. I lose two points because the page I'd forward is blank on hosting, telemetry and a
contact, which is what my IT reviewer actually asks, and because on the first screen the
"Nothing has been sent" line doesn't look clickable.

## Would I use this instead of my current tool?

> Instead of? No. This task isn't about my job, it's about getting past IT, and nothing here puts
> anything in Power BI. But this is the best "where does the data go" answer I've seen from a tool
> -- better than our risk platform, which I couldn't answer this for without a vendor call. It
> removes one blocker. If they fill in who hosts it and whether there's telemetry, IT might
> actually approve it in days instead of weeks. Then I'd still have to see it do something with
> my supplier list that a pivot table can't.

---

## Moderator notes (observed, not the participant's words)

- The persistent line under the project name answered the question in one glance, both at rest
  and after a query. "Nothing else." was noticed and liked: it pre-empted the follow-up question.
- On the frame at rest the privacy line is grey text with a lock and no underline; on the Data
  panel the same line is underlined. She did not recognise it as a link on the first screen.
- She read the pink "Owner decision open" boxes on the full page as the product's answers being
  missing. Whether or not a real participant would see them, the four open items (hosting and
  country, usage statistics and crash reports, self-hosting, a contact for reviewers) are exactly
  an IT reviewer's standard questions. Until they are answered the forwardable page will be sent
  back.
- "Export log" does not say what format it writes. She wanted to open it in Excel before sending.
- The Sent and saved row for a data-source query lists what went out but not that the answer came
  back only to this browser; the table on the page says it, the row does not.
- "Connect to data source..." gave no hint which sources it reaches. She assumed it might not
  read SAP and treated the query step as hypothetical; "neo4j" meant nothing to her.
- The Assistant's "See what was sent" showing node names made the NDA risk concrete for her. She
  decided to keep it off, which is the page working as intended.
- Small light-grey secondary lines ("Projects are kept in this browser.", the rail's
  "Assistant Off") were hard for her to read without glasses.
