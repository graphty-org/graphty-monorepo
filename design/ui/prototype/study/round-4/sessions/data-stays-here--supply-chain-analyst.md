# Session: may I use this on our supplier data? -- supply chain risk analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst at an industrial equipment
maker, about 1,400 direct suppliers; supplier lists are confidential and under NDA; corporate
Windows laptop, new web tools go through an IT security review that "asks where data is stored").

Task as given by the moderator: "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

Screens seen, as a participant sees them (design notes hidden):
- Start screen: `shots/tasks/data-stays-here/01-start-screen.png`, and at laptop size
  `shots/record/dana-r4-dsh-start-laptop.png`
- A project open (sample data): `shots/tasks/data-stays-here/02-frame-at-rest.png`
- "Where your data goes" page, full length: `shots/record/dana-r4-dsh-data-location-full.png`
- Data panel of a project: `shots/record/dana-r4-dsh-data-panel2.png`

---

## 1. Start screen

> OK. "Open a graph." First thing I see under it, before any of the pictures: "Files stay on this
> computer. graphty reads them in this browser and uploads nothing." Good. That is literally the
> first question IT asks, so it is nice that it is the first line and not buried in a footer.

> Second line, "Projects are kept in this browser." Fine. Kept in the browser meaning what -- if
> IT re-images my laptop, it is gone? I will come back to that.

> There is a blue link, "Where your data goes." That is the one I want. Before I click, though --
> "Connect to data source..." down at the bottom, with a little info icon. That one worries me more
> than the file one. If that means it pulls from SAP or something, that is an integration, and an
> integration is a whole other review. I am not touching it. I just want to drop in my CSV.

> The grey text is small. On the laptop in a meeting I would be leaning in. It is readable, but it
> is grey on white and I would bump the zoom.

Moderator note: she did not open any sample. She went straight for the link.

## 2. "Where your data goes" page

> It opened a page on its own. Good -- "It is written so you can forward it to whoever approves
> software where you work." Well, somebody thought about me. There is "Copy link" and "Print or save
> as PDF." PDF is what I would attach to the IT ticket. That is actually useful.

> "Describes graphty 2.0. Updated September 28, 2026." OK, a date and a version. IT will ask which
> version I am using, so that is good to have there.

> "In short." Four lines. Files are read by the browser and not uploaded, no account, no server
> that receives your data. Data only leaves through two features, both off until you turn them on:
> Connect to data source and the Assistant. Projects on this computer only. No password or key in
> the list of what was sent.

> That is clear. Honestly clearer than what my risk platform vendor sent us, which was a 40-page
> SOC 2 thing nobody read.

> "What stays in this browser" -- it is a table, good, I read tables. Files you open: CSV, JSON,
> GraphML, GEXF... CSV is what I need. My ERP export is actually an Excel file most of the time, I
> save it as CSV, fine. "The file is not copied anywhere."

> Projects: "kept in this browser's storage ... on this computer. They are not synced to another
> browser or computer. They stay until you delete the project or clear this site's data." Hm. So
> my desktop at my desk and my laptop are two different worlds. And our IT clears browser data on
> some policy, I think -- I would lose my work. That is not a security problem, it is a me problem.
> Further down it says "Download project file" makes a copy I control. OK, I would save it to our
> SharePoint then. Which, by the way, IT will ask about: that file has our supplier list in it.

> Exports go through the save dialog, no copy kept. Fine.

> "What leaves this browser, and only when you ask." Also a table. Connect to data source: the query
> goes to "the source at the address you enter, run by whoever runs it -- not by graphty." OK so if
> I never click it, nothing. I would not click it.

> The Assistant. "Your question; the graph's counts; each column's name with up to 10 of its values
> or its range; and the names and values of the nodes it looks up to answer you." To Anthropic,
> OpenAI or Google, "under your own key." Hold on. Ten values of each column -- that is ten supplier
> names going to an AI company. That is exactly the thing our policy says no to. I do not have a
> key and I would not get one approved, so for me it stays off. But I need to be able to tell IT
> "it is off and nobody can turn it on." Can they lock it off?

> Last row, "Opening graphty -- where graphty is hosted." ...Where IS it hosted? It says "where
> graphty is hosted" and then does not say. IT's first question is going to be "whose server, what
> country." That is a blank.

> Then a grey box: the app says when something leaves, "Nothing has been sent from this project"
> under the project name, and a list you can export. OK -- that is a nice touch, an audit trail I
> could hand over. I like that more than I expected to.

> "What graphty does not send." No account, no file contents, no fonts or code from other sites.
> "Usage statistics and crash reports:" ...and then nothing. The line just ends with a colon. Is
> that a yes or a no? That is the one line a security reviewer will read twice. If it collects
> crash reports, does a crash report have my data in it? I cannot answer that from this.

> "Check it yourself. Open your browser's developer tools, choose the Network tab..." I am not doing
> that. Our IT might. I would forward it to them and let them.

> "What this page does not promise." Doesn't cover what the Assistant provider does with data,
> doesn't protect projects from being lost, not a certification or a contract. Honest. IT will read
> "not a certification or a contract" and say "so no DPA, no SOC 2." Which is fair; it is not a
> vendor, I guess. But that line will slow the review down, not speed it up.

> "For organizations." Here we go -- this is the section I actually need. "Running your own copy of
> graphty, inside your network:" -- colon, nothing. "Turning the Assistant off for everyone in an
> organization:" -- colon, nothing. "Questions this page does not answer: Contact." And Contact goes
> where? An email? A form? Nothing tells me.

> So the three questions IT will actually ask -- who hosts it, can we host it ourselves, can we lock
> the AI off -- are the three lines that are empty. Everything else is answered well. That is
> frustrating, because the rest is better than most tools.

Moderator note: at the bottom of the page she saw the row of small pictures of the app (the start
screen, a "Sent and saved" list, a menu with "Where your data goes", a list of sends to
api.anthropic.com).

> What are these little screenshots at the bottom? "Sent to api.anthropic.com... Question... ACC-365386,
> ACC-946224..." That is an example showing account numbers going to Anthropic? If I forward this PDF
> to IT, that is the picture they will circle in red. I understand it is showing how you would see it,
> but it reads like a demo of the thing we are worried about.

## 3. A project open

> Let me look at what a project looks like, since the page said the line under the name tells me.
> "Human protein interactions" -- one of the samples. Under the name: "Nothing has been sent from
> this project." With a lock. OK. And in the far left, "Assistant. Off. Nothing is sent." in tiny
> grey text, stacked on three lines. I would not have noticed that if I was not looking for it. But
> it is there, and it is on every screen, which is what I want to point at when IT asks "how do you
> know."

> Everything else on this screen -- density, connected components, degree distribution -- I do not
> know what those words mean and I am not here for that today.

## 4. Data panel

> The data panel of another project. At the top, "Nothing has been sent from this project," and it
> is underlined, so it is a link. At the bottom, "Sent and saved from this project -- Sent: nothing.
> The Assistant is off and no data source is connected." That is the sentence I would screenshot for
> the ticket, plus the PDF.

> "Export..." at the top of the panel. That is my way into Power BI, I suppose, but that is a
> different question. For the IT question: export writes a file to where I pick. Fine.

## 5. Her answer to the task

> Can I use it? My honest answer: I can probably use it *for a trial on a scrubbed file* -- supplier
> names replaced with codes -- today, because by this page nothing goes anywhere. On the real
> supplier list, not until IT signs off, and I would not want to be the one arguing for it with three
> blanks in the "For organizations" section.

What she would write in the IT ticket:

> "Requesting review of graphty (web, version 2.0), for analyzing our supplier network. Per the
> attached vendor statement (PDF, dated Sept 28 2026): files are read in the browser and not
> uploaded; there is no account and no server receiving data; projects are stored in the browser on
> my machine only. Data leaves only through two optional features, a data-source connector and an
> AI assistant using a personal key. I will not use either. The app shows 'Nothing has been sent'
> on every project and can export a log of anything sent. Open questions the statement does not
> answer: (1) where the app is hosted and by whom, (2) whether it collects usage or crash data,
> (3) whether we can host it internally, (4) whether we can disable the AI assistant centrally.
> There is no support contact listed. Please advise whether this can be approved for confidential
> supplier data, or for anonymized data only."

> And they will come back with: "who is the vendor, do they have a DPA, and can we block the AI
> thing." Two of those I cannot answer from this page. So I would expect weeks, and probably a no
> for the real list unless we can run our own copy.

## Single Ease Question

**5 out of 7.**

> Finding the answer was easy -- first line on the start screen, one click to a page written for
> exactly this. It lost points because the page stops right where IT's questions start: hosting,
> crash reports, running our own copy, locking off the Assistant, and who to contact. I could find
> everything; I just could not find an answer to the part that decides it.

## Would she use it instead of her current tool?

> Not instead. Nothing replaces Power BI for my VP and nothing replaces the risk platform we pay for.
> As a side tool for the chokepoint question -- maybe, if IT approves it, and this page is the best
> start on an IT review I have seen from a free tool. If the blanks were filled in, and especially if
> "run your own copy inside your network" said yes, I would put in the ticket this week. With the
> blanks, I would try it on a scrubbed file and wait.

---

## Observations for the studio

- **The trust line works and is found first.** "Files stay on this computer ... uploads nothing" was
  read before anything else on the start screen, and the link went straight to the right page. She
  never opened a sample before settling the IT question.
- **The page's format fits an IT review.** Forwardable page, "Print or save as PDF", version and
  date, and tables were all used as intended. She built her ticket text directly from "In short".
- **The five unfinished lines on the page read as blanks, not as "to be decided".** In the
  participant view, "where graphty is hosted" names no host, and "Usage statistics and crash
  reports:", "Running your own copy of graphty, inside your network:" and "Turning the Assistant
  off for everyone in an organization:" end with a colon and no text. The "Contact" link does not
  say where it goes. These are exactly the questions that decide an IT review, so the page falls
  short at its most important point. Severity: high for this persona. Until the decisions land,
  the page should say what is true today rather than leave an empty colon.
- **The Assistant row alarmed her.** "Each column's name with up to 10 of its values" means
  supplier names going to an AI provider. Clear and honest, but she asked at once whether an
  organization can lock it off, which the page leaves blank.
- **The row of example screens at the foot of the page works against it once it is forwarded.**
  The example of "Sent to api.anthropic.com" with account numbers is what a reviewer will circle.
  If the printed PDF includes that section, consider leaving it out of print or labelling it
  clearly as an example of the log.
- **Browser-only storage is a work-continuity worry, not a security one.** Clearing site data and
  laptop re-imaging would lose projects; separate desk and laptop browsers do not share them. She
  would save the project file to SharePoint, and noted that this file then carries the supplier
  list, which IT will also ask about.
- **"Assistant: Off. Nothing is sent." in the left rail is small grey text on three lines.** She
  found it only because she was looking. She wants it as evidence, so it needs to be legible.
- **"Connect to data source..." on the start screen made her more cautious, not less.** She read it
  as an integration needing its own review and decided not to touch it.
- **She wanted a fallback she could do today:** anonymize supplier names and trial it. Nothing in
  the product helps her with that; noted, not asked for.
