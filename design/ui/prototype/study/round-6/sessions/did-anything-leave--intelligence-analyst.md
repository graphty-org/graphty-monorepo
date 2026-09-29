# Did anything leave? -- Marcus, criminal intelligence analyst

Task, as the moderator read it: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Participant: Marcus, 44, state fusion center analyst. Works in i2 Analyst's Notebook and Excel on
a locked-down agency laptop; case data is criminal justice information and may not leave
agency-approved systems.

Screens seen, in order (renders in shots/): the task's canvas screen with the bank transfers
project open (shots/tasks/did-anything-leave/01-frame-at-rest.png), the start screen
(02-start-screen.png), the "Where your data goes" page top
(03-data-location.png) and in full (r6-marcus-dal-data-location-full.png), the Data panel
scrolled to "Sent and saved" (r6-marcus-dal-data-panel-s7.png).

---

## Think-aloud

### 1. The canvas screen, answering from the app

> Okay. IT wants to know if it phones home. First thing I look for is anything that says cloud,
> sync, account. Top left, under the project name: "Nothing has been sent from this project."
> It's underlined this time. Last time it was grey text and I didn't think it was a link. Now I'd
> click it.
>
> And down the left rail, under Notes: "Assistant. Off. Nothing is sent." Two places saying the
> same thing. Fine. I don't love that there's an "Assistant" at all -- that's the AI thing -- but
> it says off, and it says nothing is sent, so I'm not going to fight it today.
>
> "From this project," though. My IT guy doesn't care about a project. He cares about the program.
> If I open a different case, does it say the same thing? I'd assume yes. I'd have to check.

He clicks the privacy line.

### 2. Data > Sent and saved

> "Sent: nothing. The Assistant is off and no data source is connected." Good -- it tells me why
> it's nothing. That's the sentence I'd paste.
>
> Then under it, three lines: "Who hosts graphty, and where: Not decided yet." "Usage statistics
> and crash reports: Not decided yet." "Assistant off for a whole organization: Not decided yet."
>
> Well. At least it's not a blank anymore. It's honest. But put yourself in the reviewer's chair.
> First question on the security questionnaire is where is it hosted and who runs it. The tool
> itself tells me that's "not decided yet." Telemetry, "not decided yet." That's the whole
> ticket. He reads that and it's a no. Not a maybe -- a no. I'd rather it said "graphty collects
> none" if that's true, and if it's not true, I need to know that before I put a phone dump in it.
>
> Below that, "Saved to this computer" -- every file I exported, what was in it, the date.
> april-communities.svg, accounts-by-pagerank.csv, a project file. That's a discovery record. I
> like that more than anything else on the screen, honestly. Defense asks what I produced and
> when, I've got a list.

### 3. After a data-source query

> Now the part where I actually connect something. Start screen has "Connect to data source..."
> at the bottom with an info mark. I don't have a live source in this mock -- I can't run a real
> query -- so I'm going by the pictures on the "Where your data goes" page, section with the
> app screenshots.
>
> After a query, the line under the project name reads "Sent to neo4j.internal.example: 1 query.
> Nothing else." That's good. It names the host, it says one, and it says nothing else. That's
> exactly the sentence IT wants: where, how much, and a closed door on everything else.
>
> Then the list: "Query to neo4j.internal.example, 1 query, 13:47," with an eye icon. The page
> says the eye is "see what was sent." They show me what the eye opens for the Assistant question
> -- the question text, the provider, 40 account names, 3 statistics, a Copy as text button --
> but they don't show me what it opens for the query. That's the one I care about. For us, the
> query IS the sensitive part. If I type a subject's name or a phone number into it, that search
> term is what left the building. I'd want to see the actual text, and I'd want it in the log.
> Last time I said this. I still can't see it.
>
> Side note: "neo4j." Our records system isn't that. I don't know if RMS or the state database
> would count as a "data source." Probably doesn't matter for this question -- if it's our own
> server, it's our own server.
>
> And the Assistant one -- "40 node names" sent to api.anthropic.com. That's forty account
> numbers going to an outside company. Good that it tells me. That's also why I'd never turn it on
> with case data. I'd tell IT to make sure it stays off, and then I'm back to "Assistant off for
> a whole organization: Not decided yet."

### 4. Forwarding something they can read

> The link at the bottom of Sent and saved, "Where your data goes." Opens a page. "Describes
> graphty 2.0. Updated September 28, 2026." Version and date -- that's what makes it a document
> and not a sales page. "Copy link" and "Print or save as PDF." PDF's what I'd attach to the
> ticket.
>
> "In short," four lines. Files read by the browser, not uploaded. No account, no server that
> receives the data. Data leaves only through two features, both off until you turn them on.
> Passwords never show up in the log. That's a solid top. If the reviewer reads nothing else,
> he's got it.
>
> The "What leaves this browser" table -- feature, what's sent, to whom, when. That's the format
> they want. "Opening graphty: nothing from your files, where graphty is hosted, each time the page
> loads." Where IS it hosted? Still doesn't say.
>
> "Data-source password: kept in memory until you close the tab, never written to storage."
> Good. Reviewer will like that.
>
> "Check it yourself. Open developer tools, Network tab." Our guy will actually do that. Good.
>
> Now scroll down. "Usage statistics and crash reports:" -- and nothing. A colon and nothing.
> "Running your own copy of graphty, inside your network:" -- nothing. "Turning the Assistant off
> for everyone in an organization:" -- nothing. "Questions this page does not answer: Contact" --
> and Contact isn't a link to anything I can see.
>
> Hang on. The panel inside the app said "Not decided yet" for these. The page I'm supposed to
> forward just has blanks. So the app and the document disagree -- one says undecided, one says
> nothing at all. If I print this to PDF, the reviewer gets three empty answers on the three
> questions he's going to ask first. "Can we run it on our own server" is literally the question
> that decides whether I can use it. It's the blank.
>
> I'm not forwarding a privacy document with blanks in it. I'd forward the top box and the table
> as a screenshot, and write the rest myself. Or I'd copy the "Sent: nothing" line out of the app
> and send that. Which kind of defeats the point of the page.

### 5. Wrap-up

> So: answering from the app, yes, easy. Two clicks, and it tells me why nothing went. After a
> query, it names the host and says nothing else -- also good. Forwarding it, the page is ninety
> percent there and the ten percent that's missing is the ten percent IT asks about. Same three
> holes as last time. They got filled in inside the app but not on the page I'm supposed to send.

---

## Single Ease Question

**5 of 7.** "The in-app part is easy. The forwarding part I'd have to fix up myself before I
sent it."

## Would you use this instead of your current tool?

> Not for case data, not yet. For a tool like this the question isn't whether I can find the
> privacy page -- I can -- it's whether IT signs off. The page says hosting is undecided, telemetry
> is undecided, and running it inside our network is blank. Until one of those says "you can run
> it on your own server, it collects nothing," it's a no from the reviewer, and it's a no from me.
> I'd use it on a public-records chart. If they answer those three, I'd put in the ticket myself.

---

## What went well (in his words)

- "It's underlined this time." The privacy line on the canvas screen now reads as a link; he
  clicked it without hunting.
- "Sent: nothing. The Assistant is off and no data source is connected." The zero with its reason
  is the sentence he would paste.
- "Sent to neo4j.internal.example: 1 query. Nothing else." Names the host, counts it, closes the
  door on everything else.
- "Not decided yet" in the app instead of blank colons: "At least it's honest."
- The list of files saved to this computer: "That's a discovery record."
- Version, date and "Print or save as PDF" on the page: "that's what makes it a document."
- Data-source password held in memory only, and "Check it yourself" with the Network tab.

## Problems (severity 1 = cosmetic, 4 = blocks the task)

1. **The page he forwards still has blank answers (4).** "Usage statistics and crash reports:",
   "Running your own copy of graphty, inside your network:" and "Turning the Assistant off for
   everyone in an organization:" end in a colon with nothing after, and "Contact" leads nowhere.
   The in-app list says "Not decided yet" for the same questions, so the app and the forwardable
   page disagree. He would not forward a privacy document with blanks. Quote: "I'm not forwarding
   a privacy document with blanks in it."
2. **Hosting and self-hosting are unanswered anywhere (4 for adoption, 3 for the task).** Both the
   app ("Who hosts graphty, and where: Not decided yet") and the page ("Where graphty is hosted")
   leave the reviewer's first question open; for criminal justice data that alone decides the
   ticket. Quote: "He reads that and it's a no. Not a maybe -- a no."
3. **What a data-source query sent is still not shown (3).** The query row has a "see what was
   sent" eye, but the only detail shown is for an Assistant question; the query text -- a
   subject's name or phone number -- is the sensitive part and belongs in the record. Quote: "For
   us, the query IS the sensitive part."
4. **The answer is per project, not per tool (2).** "Nothing has been sent from this project" --
   IT asks about the program. Quote: "My IT guy doesn't care about a project. He cares about the
   program."
5. **Export log does not say what file it writes (2).** He cannot tell whether the reviewer can
   open it.
6. **The Assistant sends account identifiers (2, informational).** "40 node names" to
   api.anthropic.com is disclosed clearly, which is right, but it confirms he needs an
   organization-wide off switch, which is the third blank. Quote: "That's forty account numbers
   going to an outside company."
7. **"Data source" shown only as a graph database (1).** He does not know whether his records
   system counts.
