# Session: may I use this on our supplier data? -- supply chain risk analyst

Participant: Dana Okafor (composite persona: supply chain risk analyst at an industrial equipment
maker, about 1,400 direct suppliers; supplier lists are confidential and under NDA; locked-down
corporate Windows laptop; any new web tool that touches supplier data goes through an IT security
review that asks where data is stored).

Task as given by the moderator: "Your organization has strict rules about where data may go.
Decide whether you may use this tool on your data, and tell me what you would say to IT."

Screens seen, as a participant sees them (design notes hidden):
- Start screen: `shots/tasks/data-stays-here/01-start-screen.png`
- A project open (sample data): `shots/tasks/data-stays-here/02-frame-at-rest.png`
- "Where your data goes" page, full length: `shots/r6-dana-dsh-data-location-full.png` (the same
  page reached from the Help menu: `shots/r6-dana-dsh-where-your-data-goes.png`)
- Data panel of a project, and its "Sent and saved from this project" section:
  `shots/r6-dana-dsh-data-panel.png`, `shots/r6-dana-dsh-data-panel-sent.png`, read with
  `screens/data-panel.html` for the part below the fold

---

## 1. Start screen

> "Open a graph." Right under it, first thing: "Files stay on this computer. graphty reads them in
> this browser and uploads nothing." OK. That is the sentence IT wants, and it is at the top, not
> in a footer. Good.

> It is small, though, and grey. On my laptop at 110 percent I am leaning in to read the one line
> that actually matters to me. The sample names under the pictures are bigger than the privacy line.

> "Projects are kept in this browser." Kept in the browser -- so if IT re-images my laptop, it is
> gone? Park that.

> "Where your data goes" -- blue link. That is the one. Before I click: "Connect to data
> source..." at the bottom. That is the scary one. If that means it can reach into SAP, that is an
> integration, and integrations are a different conversation with IT. I am not touching it.

> Samples: karate club, Les Miserables, proteins, bank transfers. None of that is mine. Fine, it
> is a demo. I would open "Open..." with my CSV, but the task is whether I am allowed to, so I read
> first.

## 2. "Where your data goes" page

> Title: "Where your data goes." First paragraph, last sentence: "It is written so you can forward
> it to whoever approves software where you work." Somebody has met an IT department. And there
> is "Print or save as PDF" and "Copy link" right there. That is exactly what I would do -- save
> the PDF and attach it to the ticket. Nice.

> "Describes graphty 2.0. Updated September 28, 2026." Good, IT will ask what version they are
> approving.

> "In short" box. I read this, I skip the rest the first time.
> - Files are read by the browser, not uploaded, no account, no server that receives your data.
> - Data leaves only through two features, both off until you turn them on: Connect to data source
>   and the Assistant.
> - Projects kept in this browser, on this computer only.
> - No password or key ever appears in the list of what was sent.
>
> OK. Four lines, and two of them are what I would have typed into the ticket myself. The
> Assistant -- I did not turn anything on, so that is off. Good.

> "What stays in this browser" -- a table. I like tables. Files you open: read into memory, not
> copied. CSV is in the list, so my SAP export is covered. Projects: kept in this browser's
> storage "until you delete the project or clear this site's data." That answers my re-image
> question: yes, it is gone. Not IT's problem, mine. Exports: "written by your browser's save
> dialog to the folder you choose." Fine, that is the same as saving anything from Excel.

> "What leaves this browser, and only when you ask." Connect to data source: the query goes to
> "the source at the address you enter, run by whoever runs it -- not by graphty." OK, so if we
> never connect it, nothing. The Assistant: "the names and values of the nodes it looks up."
> Wait. For me that is supplier names. If somebody turned that on, our supplier names go to
> Anthropic or OpenAI or Google. That is a hard no under our NDAs. But it says off until you set a
> provider with your own key, and I do not have a key and I am not getting one. So: we just say
> "Assistant: not used." IT will want to know they can switch it off for everyone, not trust me.

> "Opening graphty -- Nothing from your files -- Where graphty is hosted." Where IS it hosted?
> That cell just says "where graphty is hosted." That is the first thing IT asks: which company,
> which country. The page does not say. I would have to write "unknown" in the ticket.

> The grey box: "The app says when something leaves." The line under the project name says
> "Nothing has been sent from this project" until something is. And there is an export log. OK,
> that is good for an audit. I do not know that IT will care, but our compliance person would.

> "What graphty does not send." No account. No file contents. No fonts from other sites. Then:
> "Usage statistics and crash reports:" -- and nothing after the colon. Is that a typo? Did they
> forget to finish the sentence? That is the one line IT reads twice. A blank there looks worse
> than a "yes, we collect crashes." Honestly, it makes me trust the rest a little less.

> "Check it yourself. Open your browser's developer tools, Network tab." I am not going to do that.
> I would forward that bit to IT; they can.

> "What this page does not promise." Skimming. Not what a data source or provider does with the
> data. Clearing site data deletes projects -- "Download project file" makes a copy. OK. "It is a
> description of graphty 2.0, not a certification or a contract." Fair. IT will ask if there is a
> SOC 2 or anything; I guess the answer is no, it does not need one if nothing leaves. That is
> their call.

> "For organizations." "Running your own copy of graphty, inside your network:" -- blank.
> "Turning the Assistant off for everyone in an organization:" -- blank. "Questions this page does
> not answer: Contact." So the three things IT would actually ask me, the page has the question
> and not the answer. Two colons with nothing after them. That is the section with our name on it
> and it is empty.

> The pictures at the bottom show what the app says after something is sent -- "Sent to
> neo4j.internal.example: 1 query. Nothing else." And a list with an eye icon. That is reassuring
> to look at, but it is about features I will not use.

## 3. A project open

> Sample project, proteins. Top left under the name: "Nothing has been sent from this project." It
> is underlined, so it is a link. That is a good line to have in a screenshot for IT. It is small,
> again.

> Down the left rail, under Notes: "Assistant. Off. Nothing is sent." Grey, tiny, but it is there.
> Two places saying the same thing. Good, it is not buried.

> The rest of the screen -- "Style stack," "Density," "Connected components" -- not my task, and
> half of that I would not click anyway.

## 4. Data panel

> Clicking "Nothing has been sent from this project" goes to the Data panel, "Sent and saved from
> this project." It says "Sent: nothing. The Assistant is off and no data source is connected."
> Then three lines: "Who hosts graphty, and where -- Not decided yet." "Usage statistics and crash
> reports -- Not decided yet." "Assistant off for a whole organization -- Not decided yet."

> Huh. At least here it says "not decided" instead of a blank. That is actually more honest than
> the other page. But "not decided yet" is not something I can put in a security review. IT will
> read that as "come back when it is decided."

> "Saved to this computer" -- a list of exported files: an SVG, a CSV table, a project file. OK.
> So I can see what I exported. Nice for my own sanity; IT does not care.

> "Export..." button at the top of the panel. Separate question -- does it give me something Power
> BI can read? A CSV, it looks like. Fine. Not today's task.

## 5. Her answer to the task

> Can I use it on our supplier data? Probably yes, for the file part -- I load a CSV, it stays in
> Chrome, I never turn on the Assistant, I never connect a data source. That is what the page says
> and the app backs it up with that "nothing has been sent" line. But I cannot say "yes" until IT
> says yes, and IT will stop on three questions this page leaves blank.

> What I would send IT, pretty much word for word:
>
> "Requesting approval to use graphty (web app, version 2.0) for supplier network analysis. Vendor
> statement attached (PDF). Summary: files are opened in the browser and not uploaded; no account
> or login; projects are stored in browser storage on my laptop only. Two features send data out
> -- a data-source connector and an AI assistant using a third-party provider -- both off by
> default; I will not enable either. Open questions the vendor has not answered: (1) who hosts the
> web app and in which country; (2) whether it collects usage statistics or crash reports; (3)
> whether it can be self-hosted internally or the assistant disabled centrally. Can you check the
> network traffic (the vendor says you can verify in dev tools) and advise?"

> Honestly, the page made that email easy to write. It is the three blanks that will cost me a week.

## Single Ease Question

**5 / 7.**

> Finding the answer was easy -- one link from the first screen, a summary box, and a PDF button.
> I did not have to hunt. I am knocking two off because the page asks the exact questions IT asks
> and then leaves them blank, including one line that just stops at a colon. I cannot finish the
> job, I can only start the ticket.

## Would she use it instead of her current tool?

> Instead of? No. Beside, maybe, if IT clears it. The data story is better than most things I have
> been sent -- Gephi never told me anything, and the vendor demos wanted an account before I saw
> anything. But my VP lives in Power BI and my company already pays for a risk platform. This is a
> side tool at best, and a side tool I can only use once IT has the hosting answer.

---

## Observations for the studio

- **Blank lines read as mistakes, not as "undecided".** On the "Where your data goes" page, three
  lines end in a colon with nothing after them ("Usage statistics and crash reports:", "Running
  your own copy of graphty, inside your network:", "Turning the Assistant off for everyone in an
  organization:"), and "To whom" for "Opening graphty" says only "Where graphty is hosted." Dana
  read the first as a typo and said it lowered her trust in the rest. The Data panel shows the
  same three questions as "Not decided yet", which she called more honest. Severity: high for
  this task -- these are exactly the questions IT asks.
- **The "Contact" link has no address**, so the one escape hatch for a reviewer's questions goes
  nowhere she can see.
- **The Assistant row is the one that matters for NDA data.** "The names and values of the nodes it
  looks up" is supplier names in her world. She was satisfied only because it is off by default
  and needs her own key; she immediately wanted an organization-wide switch, which is blank.
- **Forwardability landed.** "Written so you can forward it", "Print or save as PDF", the version
  and date line, and the four-line "In short" box let her draft the IT request in one pass.
- **The in-app confirmation landed.** "Nothing has been sent from this project" under the project
  name and "Assistant: Off. Nothing is sent." in the rail gave her a line she would screenshot.
- **Readability.** The privacy line on the start screen, the project-name line and the rail text
  are small and grey; on a 14-inch laptop at 110 percent zoom she had to lean in to read the
  lines that matter most to her.
- **Project loss on re-image** was answered ("until you ... clear this site's data"; "Download
  project file"), and she accepted it as her own problem, not IT's.
