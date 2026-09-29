# Session: may I use this on company data? -- Analyst Alex

Participant: Analyst Alex (operations data analyst, logistics; company policy says supplier,
customer and depot data does not leave approved systems).

Task as given: "Your organization has strict rules about where data may go. Decide whether you may
use this tool on your data, and tell me what you would say to IT."

Screens seen, as a participant sees them (design notes hidden), rendered at 1440 x 900:

- Start screen: `shots/r6-alex-dsh-start-screen-view.png`
- Where your data goes: `shots/r6-alex-dsh-data-location-view.png` and the whole page,
  `shots/r6-alex-dsh-data-location.png`
- A project open, at rest: `shots/r6-alex-dsh-frame-at-rest-view.png`
- Data panel: `shots/r6-alex-dsh-data-panel-view.png`, and taller so the bottom section shows,
  `shots/r6-alex-dsh-data-panel-tall.png`

## Think-aloud

**Start screen.**

"OK. 'Open a graph.' First thing, before I touch anything -- the line right under the title: 'Files
stay on this computer. graphty reads them in this browser and uploads nothing.' Good, that's where
I load the file, that's where I want it. Second line, 'Projects are kept in this browser.' Fine.

No sign-in. No 'create an account'. That's already better than half the stuff I've tried -- an
account means a server with my stuff on it.

But 'uploads nothing' is a sentence on a web page. Anyone can write that. IT is going to ask me how
I know. There's a link, 'Where your data goes'. Clicking that."

**Where your data goes.**

"Right, this is a proper page. 'It is written so you can forward it to whoever approves software
where you work.' Well, yes, that's exactly what I need. 'Copy link', 'Print or save as PDF' -- I'd
save the PDF and attach it to the ticket. There's a version and a date on it: 'Describes graphty
2.0. Updated September 28, 2026.' IT will like that, it means if it changes they can see it
changed.

'In short' box. Files read by the browser, not uploaded. No account, no server that receives your
data. Data only leaves through two things, both off until I turn them on: 'Connect to data source'
and 'the Assistant'. Projects stay in this browser on this computer. OK. That's four sentences I
can paste into an email. That's basically the email.

Scrolling. 'What stays in this browser' -- files, projects, exports. Exports go through my own
save dialog, 'graphty keeps no copy'. Good. There's a row about an Assistant key and a data-source
password; I'm not going to use either, I'm loading CSVs.

'What leaves this browser, and only when you ask.' This is the table IT actually cares about. Data
source: the query goes to the source I type, 'run by whoever runs it -- not by graphty.' Fine,
we're not doing that. The Assistant: my question, the counts, each column's name with 'up to 10 of
its values', and names of nodes it looks up, to Anthropic or OpenAI or Google. OK -- that's the one
that would get me in trouble. Supplier names going to OpenAI is exactly what the training video
was about. But it says off until I set a provider. So I just... don't set one. I'd want that
stronger, though -- see below.

'Opening graphty: Nothing from your files. Where graphty is hosted.' Hosted where? It doesn't say.
It just says 'where graphty is hosted'. That's circular. First question from IT is going to be
'whose server is this coming from, what country'. And I don't know.

'What graphty does not send.' No account. No file contents. 'No fonts, icons or code from other
sites while you work.' Good, that's the kind of detail the security guy asks about. Then 'Usage
statistics and crash reports:' -- and nothing. It just stops. Blank. Is that a bug on the page or
is that them not wanting to say? If I forward this, that's the line IT circles in red. A blank
after 'crash reports' reads worse than 'yes, we collect some.'

'Check it yourself' -- open the Network tab and watch. OK, that's honest, I respect that. I'd
actually do that. Well, I'd do it with the Karate club sample, not with the supplier file.

'What this page does not promise.' Doesn't cover what the AI provider does with it. Doesn't keep
projects safe if the browser data gets cleared -- noted, our laptops get re-imaged, so I'd download
the project file. 'Not a certification or a contract.' Fair. Honestly this section makes me trust
the rest more; it doesn't read like marketing.

'For organizations.' 'Running your own copy of graphty, inside your network:' -- blank again.
'Turning the Assistant off for everyone in an organization:' -- blank. 'Questions this page does
not answer: Contact.' I click Contact... nothing. It doesn't go anywhere. So the three questions IT
would actually escalate -- can we host it, can we turn the AI off for everyone, who do we email --
are the three with no answer. That's a bit of a punchline."

**A project open (Les Miserables sample).**

"Loaded the sample to see what it looks like with something open. Under the project name, 'Nothing
has been sent from this project', underlined, so it's a link. And down the left edge, 'Assistant
Off. Nothing is sent.' OK, I like that it's always on screen. If somebody walks past my desk, or I
screenshot it for the ticket, it's right there."

**Data panel.**

"Different project in this one, the bank transfers. Same line, 'Nothing has been sent from this
project'. Scroll the Data panel to the bottom -- 'Sent and saved from this project'. 'Sent:
nothing. The Assistant is off and no data source is connected.' Link back to the same page.

Then: 'Who hosts graphty, and where: Not decided yet. Usage statistics and crash reports: Not
decided yet. Assistant off for a whole organization: Not decided yet.'

Huh. So here it says 'Not decided yet' where the other page just had a blank. At least this one
is honest about it. But -- 'not decided yet' on who hosts it? That tells me it isn't finished.
I can't send IT a tool where the vendor hasn't decided who hosts it. And also, why is this in my
data panel at the bottom and not on the page I'm meant to forward? The forwarding page should say
the same thing.

'Saved: nothing yet. Every file an export writes is listed here.' OK, so there's a log. If I did
use it, I could export that log for audit. That's nice, Gephi has nothing like that."

## Decision

"Can I use it on my data? On the real supplier file -- not yet. On the sanitised extract, the one
with codes instead of supplier names -- yes, today. I'd do that anyway with any new tool.

The reason it's 'not yet' isn't that anything looks wrong. The design of it is right: it runs in
the browser, nothing goes anywhere unless I turn on the Assistant or a data source, and it tells
me on screen that nothing has been sent. The problem is the three things IT asks first -- who
serves it and from where, does it phone home with usage stats, and can we lock the AI off -- are
blank or 'not decided'. Our policy isn't 'the analyst thinks it's fine', it's 'IT approved it'."

## What I would say to IT

"Hi -- I'd like to use a browser-based graph tool called graphty for supplier network analysis.
Their data page is attached as a PDF (version 2.0, dated September 28, 2026). Summary: files are
read in the browser and not uploaded; there's no account and no server that receives our data;
projects are stored in the browser on my laptop only. Data only leaves through two optional
features, a database connector and an AI assistant, both off by default; I'd use neither. The page
explains how to confirm this in the browser's Network tab, and I'm happy to do that with you on a
sample file.

Open items on their side: who hosts the app and where, whether it collects usage statistics or
crash reports, and whether the AI assistant can be switched off for everyone. Their page doesn't
answer these yet and has no contact address. Until those are answered I'll only use it with the
anonymised extract. Could you tell me whether that's OK, and what you'd need to approve the real
data?"

"That email took me about two minutes because the page basically wrote it. That's the good part."

## Single Ease Question

**5 out of 7.**

"What took longest was the bottom of the page: working out whether the blanks after 'crash
reports' and 'running your own copy' meant 'no' or 'not telling', and then finding 'Not decided
yet' in a completely different place, the bottom of the Data panel. And clicking Contact and
getting nothing. The first half -- start screen line, the link, the summary box, the table -- that
was quick and I'd give it a six."

## Would I use this instead of my current tool?

"For this question -- 'can I put company data in it' -- it's already better than Gephi. Gephi's a
desktop install that needs admin rights, so IT has to get involved anyway, and Gephi Lite says
'runs in your browser' on its home page and that's about it. This gives me something I can
actually forward.

But I can't switch until IT says yes on the real data, and IT won't say yes while 'who hosts it'
says 'not decided yet'. So: I'd try it on the anonymised extract this week, see if the numbers
match NetworkX, and put in the ticket. If the ticket comes back approved, then maybe."

## Problems observed

1. **Blanks on the forwardable page.** "Usage statistics and crash reports:", "Running your own copy
   of graphty, inside your network:" and "Turning the Assistant off for everyone in an
   organization:" end in nothing. Read as evasive, or as a broken page. Severity: high for this
   task -- the page exists to be forwarded, and those are the lines a reviewer circles.
2. **Hosting not named.** The row "Opening graphty -- Where graphty is hosted" says nothing about
   who or what country, and the Data panel says "Not decided yet". Blocks approval on its own.
   Severity: high.
3. **Contact goes nowhere.** Styled as a link, does nothing when clicked. Severity: medium.
4. **The two places disagree in form.** The Data panel says "Not decided yet" for the same three
   items the forwardable page leaves blank; the honest version is in the place IT never sees.
   Severity: medium.
5. **The Assistant is off per person, not lockable.** Alex's plan is "just don't set it up", which
   he knows IT will not accept as a control. Severity: medium (already an open question on the
   page).

## What worked

- The line on the start screen, where the file is loaded, with the page one click away.
- No sign-in anywhere before seeing data.
- The "In short" box: four sentences that became the body of the email to IT almost verbatim.
- Version and date on the page, and Print or save as PDF.
- "What this page does not promise" -- made the rest more believable.
- "Nothing has been sent from this project" and "Assistant Off. Nothing is sent." always on screen.
- The "Check it yourself" Network-tab instruction.
