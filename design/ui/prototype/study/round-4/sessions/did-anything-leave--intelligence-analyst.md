# Did anything leave? -- Marcus, criminal intelligence analyst

**Task given by the moderator:** "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

**Participant:** Marcus, 44, criminal intelligence analyst at a state fusion center. Case data is
criminal justice information; nothing leaves agency-approved systems. Uses i2 Analyst's Notebook
and Excel. Asks where the data goes before he loads anything real.

**Screens seen, in order (participant view, 1440 wide):** start screen, the project frame at rest,
the Data panel, the Data panel scrolled to "Sent and saved", the "Where your data goes" page, and
that page's section showing the app after a data-source query.
Renders: `shots/r4-marcus-dal-*.png`.

---

## 1. Start screen -- "Open a graph"

> OK. First thing on the page, before any button: little padlock, "Files stay on this computer.
> graphty reads them in this browser and uploads nothing." Good. That's the question I ask every
> vendor and usually I have to ask it out loud in the demo. Second line, "Projects are kept in
> this browser." Fine.
>
> Blue link, "Where your data goes". That's what IT wants. Hold on to that.
>
> "Connect to data source..." down at the bottom with a little (i). The (i) says it "sends only
> your query, to the source you name." So that one does send. At least it says so up front and
> doesn't bury it.
>
> What I notice is what it doesn't say. This is a website. "Stays on this computer" -- the file,
> sure. But I got here by typing an address. Who runs that address? Not on this screen.

## 2. The frame, a project open

> Top left under the project name: padlock, "Nothing has been sent from this project." And down
> the left rail under "Assistant" it says "Off. Nothing is sent." Two places, same answer. I like
> the rail one better, it's short.
>
> Is "Nothing has been sent from this project" something I click? On this screen it's plain grey
> text, no underline. I would not have clicked it. On the Data screen the same line is
> underlined. Pick one.
>
> Also -- "from this project." IT didn't ask about this project. They asked about the tool. If I
> had three projects open last week, do I go into each one? That's a project answer to a
> program question.
>
> And "Assistant". I'm not turning on anything called an Assistant with case data. The fact that
> it says Off is the right default. I'd want IT to be able to lock it off. Let's see if that's
> anywhere.

**Answer he would give IT at this point:** "It says it reads files in the browser and uploads
nothing. The AI thing is off. The only thing that sends is connecting to a database, and it says
so. There's a page that explains it."

## 3. Data panel, scrolled to "Sent and saved from this project"

> Grey box: "Sent: nothing. The Assistant is off and no data source is connected." That's the
> sentence I'd read over the phone. It gives the reason, not just the zero. Good.
>
> Under that, "Saved to this computer" -- the SVG, the CSV, the recipe, the project file, each
> with a date. That's actually useful for a different reason: discovery. I can say what files
> came out of this tool and when. i2 doesn't give me that.
>
> Little circle-arrow on each one. Re-export, I'm guessing. Don't care right now.

## 4. "Where your data goes" page

> Opens as its own page. "It is written so you can forward it to whoever approves software where
> you work." Somebody has actually met an IT reviewer. "Describes graphty 2.0. Updated September
> 28, 2026." Version and date -- the reviewer will ask for both.
>
> "Copy link" and "Print or save as PDF" right at the top. That's the forward. PDF is what I'd
> attach to the ticket; a link to a website that can change after they approve it is not what
> they want.
>
> "In short" box. Four lines. No account, no server that gets the data. Data leaves only through
> two features, both off. No password or key in the log or the file. That's the whole memo right
> there.
>
> The "what stays" table. Files, projects, exports, Assistant key, data-source password "kept in
> memory until you close the tab... never written to this browser's storage." That's a line a
> security guy will like.
>
> The "what leaves" table. Feature, what, to whom, when. Connect to data source: "the query you
> write, and any sign-in... to the source at the address you enter, run by whoever runs it --
> not by graphty." Right. For me that's our own records system; I don't have a problem there.
>
> The Assistant row names Anthropic, OpenAI or Google. With my data, that's a hard no, and I'm
> glad it's written down so plainly rather than hidden. "Off until you set a provider." Fine.
>
> "Opening graphty -- nothing from your files -- where graphty is hosted -- each time the page
> loads." Where IS it hosted? It doesn't name it. That's the first question back from IT, I
> guarantee it.
>
> "What graphty does not send": no account, no file contents... "Usage statistics and crash
> reports:" -- and then nothing. Colon, blank. Is that a yes or a no? That is THE question. Every
> reviewer asks about telemetry first. A blank there reads like they didn't want to answer.
>
> "Check it yourself. Open developer tools, Network tab." Our IT will actually do that. I can't
> -- dev tools are locked on my laptop -- but they can. Good line.
>
> "What this page does not promise." Honest. "It does not keep projects safe from loss. Clearing
> this site's data... deletes them." Noted. That one worries me for a different reason, a case
> that disappears when IT re-images my laptop. But it tells me to download the project file. OK.
>
> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. "Questions this page
> does not answer: Contact." Those are the three things my IT would actually need to say yes.
> Can the department run it on our own server, can they kill the AI for everyone, and who do they
> call. All three are empty. If I print this to PDF and attach it to the ticket, it goes out with
> three dangling colons. I'd be embarrassed to send that. I'd probably cut that section off
> before I forwarded it, which is worse, because then it looks like I hid it.

**Answer he would give IT at this point:** "Here's their page as a PDF. Short version is it runs
in the browser and doesn't upload files. They don't say whether they collect usage data or who
hosts it, and they don't say whether we can run it ourselves. I'll ask."

## 5. After a data-source query (the section of the page that shows the app after a query)

> This is the part of the task I actually care about: after I pull from a database, what does it
> say.
>
> The line under the project name changes to "Sent to neo4j.internal.example: 1 query. Nothing
> else." It names the address. It says "Nothing else." That's the right sentence -- I'd paste it
> into the ticket word for word. If it had said "Sent to: data source" I'd have told them it was
> useless.
>
> Second example after the Assistant is used: "Sent: 1 query to neo4j.internal.example, 2
> questions to the Assistant. Nothing else." That one I'd never produce, the Assistant stays off.
> But it's good that it would show up there and not hide.
>
> The "Sent and saved" list: each send with host and time. Query to neo4j.internal.example, 1
> query, 13:47. Eye icon on it. On the Assistant rows the eye opens exactly what went -- the
> question, "40 node names", the account numbers, the three numbers. That's thorough.
>
> But I only get shown the eye on an Assistant question. What does the eye on the query row
> show? The query text? Because the query IS the sensitive part for me. If I searched our system
> for a name or a phone number, that name went to the server -- our server, fine, but the audit
> log needs the text. "1 query" doesn't tell me what I asked. I'd want to see the query text
> there, same as the Assistant.
>
> "Export log" up in the corner. That writes the list to a file "for a reviewer". What kind of
> file? If it's something IT opens in Excel or reads as a PDF, great. If it's JSON, they'll ask
> me what it is. Doesn't say.
>
> And "neo4j" -- we don't have that. Our stuff is the RMS and state systems. I assume "data
> source" means more than that one. Not sure.

**Answer he would give IT after the query:** "After I pulled from the database it says 'Sent to
[our server]: 1 query. Nothing else.' I've attached the tool's log of what was sent and the
page about where data goes."

## 6. The forward

> What I'd send: the "Where your data goes" page as a PDF, plus the exported log from the project
> after the query, plus one line: "Sent to [host]: 1 query. Nothing else." That's more than any
> vendor has ever given me unasked.
>
> What comes back, I can predict: "Who hosts it? Telemetry? Can we run it in-house?" and the
> page has blanks for exactly those. So I'd answer the first question well and lose on the
> second round.

---

## Single Ease Question

**5 out of 7.**

> Finding the answer was easy -- it's on the first screen, the link is right there, the line
> after the query is exactly right. Where it gets hard is the part IT asks second: telemetry,
> hosting, running it ourselves, who to call. Those are blank, and a blank on a privacy page is
> worse than a "no".

## Would you use this instead of your current tool?

> Not instead. i2 is on my machine and IT already signed off on it; that's the whole reason it's
> still there. For the data question specifically, this is better than i2 -- i2 never tells me
> what it did or didn't send, it just assumes it's local. If they fill in those blanks, and the
> answer to "can the department run it on our own server" is yes, I'd put in the ticket. As long
> as it's someone else's website with telemetry unanswered, it's dead on arrival for real case
> data. I'd use it on a public-records chart, maybe.

---

## What went well (in his words)

- "Files stay on this computer... uploads nothing" is on the start screen before any button.
- "Sent to neo4j.internal.example: 1 query. Nothing else." -- names the host and says nothing
  else went; he would paste it into the ticket verbatim.
- "Sent: nothing. The Assistant is off and no data source is connected." -- the zero comes with
  its reason.
- Version and date on the page, and Print or save as PDF at the top: a document a reviewer can
  file.
- Data-source password held in memory only, never stored; "Check it yourself" with the Network
  tab.
- The list of files saved to this computer is a record he could use in discovery.

## Problems (severity 1 = cosmetic, 4 = blocks the task)

1. **Blank answers on the page he forwards (4).** "Usage statistics and crash reports:",
   "Running your own copy of graphty, inside your network:" and "Turning the Assistant off for
   everyone in an organization:" end in a colon with nothing after; "Contact" goes nowhere. These
   are the reviewer's first follow-up questions, and a printed PDF carries the blanks. He would
   rather forward nothing than a privacy page with blanks.
2. **Hosting is not named (3).** "Opening graphty ... Where graphty is hosted" -- the page never
   says where that is or who runs it.
3. **The query row does not show the query text (3).** "1 query" says nothing about what was
   asked; for an analyst the search term (a name, a phone number) is the sensitive part and
   belongs in the audit record.
4. **The privacy line answers for one project, not the tool (2).** "Nothing has been sent from
   this project" -- IT asks about the program; he would have to check every project.
5. **The privacy line does not look clickable on the canvas screen (2).** Plain grey text with a
   padlock on the frame at rest; underlined on the Data panel. He would not have clicked it.
6. **Export log does not say what file it writes (2).** He cannot tell whether the reviewer can
   open it.
7. **"Data source" shown only as a graph database (1).** He does not know whether his records
   system counts.
