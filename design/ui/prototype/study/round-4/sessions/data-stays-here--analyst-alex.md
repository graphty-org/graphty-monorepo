# Session: may I use this on company data? -- Analyst Alex

Participant: Alex, data analyst on an operations analytics team at a logistics company. Company
policy says supplier, customer and depot data does not leave approved systems. Uses NetworkX and
Gephi today.

Task as given by the moderator: "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

Screens seen, in order, as a participant sees them (design notes hidden):

- `shots/tasks/data-stays-here/01-start-screen.png` -- the start screen, nothing opened
- `shots/tasks/data-stays-here/02-frame-at-rest.png` -- the protein sample open
- `shots/tasks/data-stays-here/03-data-location.png` and `shots/record/r4-alex-dsh-data-location-full.png`
  -- the "Where your data goes" page, top and whole
- `shots/record/r4-alex-dsh-data-panel.png` and `shots/screens__data-panel-s7.png` -- Data panel, with
  "Sent and saved from this project"

---

## 1. Start screen

> OK. "Open a graph." Before I touch anything -- first line under the title: "Files stay on this
> computer. graphty reads them in this browser and uploads nothing." Good. That is literally the
> first question I had, and it's right where I'd load the file. Not buried in a footer. Gephi Lite
> does something like this too, I think.
>
> "Projects are kept in this browser." Hm. Kept in the browser meaning... browser storage? So if
> Chrome syncs, does that go to my Google account? I don't know. I'd guess no, but that's the kind
> of thing IT asks and I can't answer.
>
> "Where your data goes" -- blue link. That's what I'd click. I'm not opening a real file yet.
>
> There's also "Connect to data source..." with a little (i). That one obviously sends something
> somewhere -- I'd hover it. [Hover text: "Sends only your query, to the source you name."] Fine,
> I'm not using that, our warehouse isn't something I'd point a web tool at anyway.
>
> No sign-in. No "create account". That actually matters -- a login wall and I'm already assuming
> there's a server holding my stuff.
>
> Nothing about price, though. Is this free? Who makes it? I can't tell from here. That's the
> other half of what my manager asks.

## 2. The "Where your data goes" page

> Opens in its own tab, OK. "It is written so you can forward it to whoever approves software
> where you work." Ha. OK, somebody knows exactly who's reading this. "Describes graphty 2.0.
> Updated September 28, 2026." Good -- a version and a date. IT will ask which version.
>
> "Copy link" and "Print or save as PDF." PDF is what I'd attach to the ticket. That's genuinely
> useful; normally I'm screenshotting a privacy policy.
>
> "In short" box. Four lines. Files not uploaded, no account, no server that receives your data.
> Data leaves only through two features, "Connect to data source" and "the Assistant", both off
> until I turn them on. Projects kept on this computer only. No password or key in the sent list or
> a project file.
>
> That's -- honestly that's the paragraph I'd paste into the ticket, more or less.
>
> "What stays in this browser" table. Files you open: read into memory, not copied anywhere.
> CSV is listed, good, that's what I've got. Projects: "not synced to another browser or computer."
> OK, that answers my Chrome-sync question, sort of. It says they aren't synced. I'll take that.
> Exports go through the save dialog. Fine, same as any download.
>
> "What leaves this browser, and only when you ask." Here's the Assistant row. What is sent:
> "Your question; the graph's counts; each column's name with up to 10 of its values or its range;
> and the names and values of the nodes it looks up." To "Anthropic, OpenAI or Google -- under your
> own key."
>
> So -- if I turn that on, supplier names go to OpenAI or whoever. Up to ten values of every
> column. That's a no for real data, full stop. Compliance would kill that instantly. Good that it
> says so plainly, though; I'd rather know. And it's off unless I set a key, which I don't have and
> wouldn't get.
>
> There's "The Assistant, with a model that runs in the browser -- nothing from your data." OK,
> interesting, but I'm not going to be the guy who explains that distinction to IT.
>
> "Opening graphty: Nothing from your files. The browser asks for graphty's own code." To whom:
> "Where graphty is hosted." ...Where IS it hosted? That's a non-answer. That's the first thing
> they'll ask -- which company, which country. It just says "where it's hosted". Circular.
>
> The grey box: the line under the project name says "Nothing has been sent from this project"
> until something is, and there's a Data > Sent and saved list with times and addresses, and
> "Export log". OK, so there's an audit trail I could hand over. That's more than Gephi gives me,
> to be fair, although Gephi doesn't send anything, so.
>
> "What graphty does not send." No account. No file contents except those features. No fonts or
> code from other sites.
>
> "Usage statistics and crash reports:" -- and then nothing. Colon, blank. Is that a typo? Does
> it mean "yes" and they forgot to fill it in? That's the exact line IT reads. A blank next to
> "crash reports" reads to me like "we'd rather not say." I'd be suspicious. A crash report could
> have a chunk of the graph in it, for all I know.
>
> "Check it yourself. Open your browser's developer tools, Network tab." I mean -- I can do that.
> Our IT person definitely can. I'd actually do it with the sanitised extract before I asked
> anyone. That's a nice touch; it's not "trust us".
>
> "What this page does not promise." Doesn't cover what a provider does with data. Doesn't keep
> projects safe from loss -- clearing site data deletes them, "Download project file" makes a
> copy. OK, note to self, download the project file or I'll lose an afternoon again. Doesn't
> protect from browser extensions or backups of the computer. "It is a description of graphty
> 2.0, not a certification or a contract."
>
> Yeah... that line is honest, but that's the line IT will circle. "Not a certification." They're
> going to want a certification, or a vendor questionnaire, or something with a company name on
> it.
>
> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. "Questions this page does
> not answer: Contact" -- and Contact is a link, but to what? Three empty lines, in the section
> that's literally for my organization. That's where IT's questions are. Can we host it
> ourselves -- blank. Can we switch the AI off for everyone -- blank. Who do I email -- a link with
> no address.
>
> So the part about me is great, and the part about my company is empty.

## 3. With a graph open (the protein sample)

> I opened the protein sample, not my own data. Under the project name: a lock and "Nothing has
> been sent from this project." And on the left rail, "Assistant Off. Nothing is sent." Two places
> saying the same thing. Good. That's the kind of thing I'd screenshot for the ticket.
>
> "From this project" -- does that mean other projects might have sent something? I guess each
> project has its own log. Slightly odd wording but fine.
>
> Counts are right there, 300 nodes, 1,262 edges. Unrelated to the task, but that's what I'd check
> with my own file.

## 4. Data panel -- "Sent and saved from this project"

> Data tab, at the bottom: "Sent: nothing. The Assistant is off and no data source is connected."
> And under that, "Saved to this computer" with the SVG, the CSV, the recipe, the project file,
> each with a date. [Second picture] OK, so it lists exports too. Not just what went out, what I
> wrote to disk. That's a decent log. If compliance ever asks "what did you do with the supplier
> file", I can point at that.
>
> I did have to go to the Data tab and scroll to the bottom to find it. The one-liner under the
> project name opens it, apparently, but I wouldn't have guessed that's clickable. Doesn't matter
> much, I'd find it once.

## 5. Decision

> Can I use it on my data? Honestly -- on the sanitised extract, yes, today. Supplier names
> replaced by codes, few hundred rows, and I'd have the Network tab open while I did it, to see for
> myself that nothing goes out.
>
> On the real supplier file: not without IT signing off. Not because of anything I saw that's
> wrong -- it's that the page leaves the three questions IT always asks blank: who hosts it, does it
> phone home with usage or crash data, and can we run it ourselves. And there's nothing about who
> makes it or what it costs, which is the first thing my manager asks.

## 6. What I would say to IT

> "Hi -- I'd like to use a browser-based graph tool called graphty for the supplier network work.
> Their data page is attached (PDF, describes version 2.0, dated 28 Sep 2026). Short version:
>
> - It runs in the browser. Files are read locally and not uploaded; there's no account and, per
>   the vendor, no server that receives the data.
> - Only two features send anything: connecting to a data source, and an AI assistant that sends
>   node names and column samples to OpenAI / Anthropic / Google under your own key. Both are off
>   by default. I'd use neither, and I don't have a key.
> - Projects are kept in the browser's storage on my laptop, not synced.
> - The app keeps a log of anything sent and every export, which I can export for you.
> - They say you can verify it in the browser's Network tab. I tried it with the sanitised extract
>   first. [Would actually do this before sending.]
>
> What the page does not answer, and what I'd need you to decide on: where it's hosted and by whom;
> whether it collects usage statistics or crash reports (the line is blank); whether we can host our
> own copy internally; whether we can disable the assistant for everyone; and who to contact. It
> also says it's a description, not a certification. Can you tell me whether this is approvable, or
> whether we need a vendor questionnaire?"

## 7. Single Ease Question

**5 out of 7.**

> Finding the answer about my own laptop was easy -- the line's on the first screen and the page
> is one click. What took longest was figuring out that the questions IT will actually ask aren't
> answered anywhere. I read the whole page expecting the hosting and the "phones home" answers, and
> they're blanks. That's why not a 6.

## 8. Would I use this instead of my current tool?

> Not instead, not yet. Gephi is already installed on my laptop and IT already signed off on it,
> and it doesn't send anything because it's a desktop app. This one, I'd put in a ticket, and I'd
> use it on the sanitised extract in the meantime. If IT comes back yes -- and if it actually saves
> me the Gephi half every month -- then maybe. But the data question has to be closed by IT, not by
> me reading a nice page.

---

## Observations (moderator)

1. **Strongest point: the privacy line sits exactly where Alex loads a file.** He found it before
   doing anything, followed the link without prompting, and never went looking for a privacy
   policy. The no-sign-in start screen was noticed and counted in the tool's favour.
2. **The page is forwardable and he used it as intended.** Version and date, "Print or save as
   PDF" and "Check it yourself" (Network tab) were each called out as things he would put in the
   IT ticket. His drafted IT message is built almost entirely from the "In short" box.
3. **Blank lines read as evasion.** In the participant view, "Usage statistics and crash
   reports:", "Running your own copy...:", "Turning the Assistant off for everyone...:" and the
   "Contact" link all show nothing after the label. Alex read the crash-report blank as "we'd
   rather not say" and suspected crash data could carry graph content. Severity is high: these are
   the exact lines an IT reviewer reads first, and until they are filled the page argues against
   approval rather than for it.
4. **"Where graphty is hosted" is circular.** The "To whom" cell for opening graphty names no host
   and no country; Alex called it a non-answer and put hosting first in his list of open questions
   for IT.
5. **Nothing says who makes the tool or what it costs.** Alex raised licence and price twice (start
   screen, final decision). Neither the start screen nor the data page mentions them, and for him
   approval and purchase are one conversation.
6. **"Not a certification or a contract" is honest but is what IT will circle.** He did not want it
   removed; he wanted to know what exists instead (a vendor questionnaire, a named company).
7. **The Assistant disclosure worked.** He understood that supplier names would leave if the
   Assistant were turned on, decided he would not turn it on, and could say so to IT in one line.
   The in-browser model row did not help him; he would not try to explain the distinction to IT.
8. **The sent-and-saved log was valued as an audit trail**, especially that it lists exports as
   well as sends. He would not have guessed that the one-liner under the project name opens it;
   he found it by going to the Data tab and scrolling to the bottom.
9. **Minor wording:** "Nothing has been sent from this project" made him ask whether other projects
   might have sent something.

Outcome: he reached a decision and a message for IT, but the decision is "sample data yes, real
data only after IT", driven by the four unanswered organization-level items and the missing
maker/price, not by anything the page says the tool does.
