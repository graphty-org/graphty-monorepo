# Session: "Does this tool send data anywhere?" -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (simulated; persona in
../../personas/fraud-analyst.md). Mode: not mandated -- she is doing this because IT asked, not
because her manager bought the tool.

Task as given by the moderator: "Your IT reviewer asks whether this tool sends data anywhere.
Answer from the app, then again after running a data-source query, and forward something they
can read."

Screens used: the app frame with a graph open (Les Miserables sample, then the Transfers sample),
the start screen, and the "Where your data goes" page. Renders read as the participant would see
them; the HTML was read only to learn what a click would do.

## Transcript (think-aloud)

**1. App frame, Les Miserables open.**

"OK, so IT wants to know if it phones home. First thing I look at is the top left, the name of
the thing. 'Les Miserables' -- fine, that's the sample. Under it: lock icon, 'This browser.
Nothing sent.' Huh. That's actually the sentence I'd want. Two seconds and I have the answer
without hunting through settings."

"And on the left, under Assistant, 'Off. Nothing is sent.' So there's an AI thing and it's off.
Good. I wouldn't turn that on anyway. Two places telling me the same thing. I'll take it."

"But 'nothing sent' is the app saying it about itself. My IT guy doesn't care what the app says
about itself, he wants something in writing. Can I click the lock line?"

(The lock line itself is plain text. She clicks the file chip next to it, 'miserables.json',
because it is the only thing near it that looks clickable.)

"Oh, there's a little popup. 'This browser. Nothing sent. Projects are kept in this browser.
Where your data goes...' -- there's a link. Opened from 'this computer', read Sep 28 10:42.
That's the audit-trail kind of line I like. Took me a guess to get here though -- I clicked the
file name, not the lock. If I'd clicked the lock and nothing happened I'd have assumed there was
nothing more."

**2. Transfers sample (the bank-looking data).**

"Let me switch to the one that looks like my data, Transfers, 3,000 accounts. ... Wait. The line
under the name is gone. It just says the file name and 'Full graph'. And the Assistant button is
greyed with no 'Nothing is sent' under it. So on the sample that actually looks like bank data,
the sentence I was relying on isn't there? Is that because it's a different kind of file? If I
were showing IT this screen I'd have nothing to point at. That's the one that matters to me."

(Moderator note: the Transfers render appears to be the empty-at-rest version or an older
render. Sarah cannot tell which; to her the reassurance simply disappears.)

**3. Start screen.**

"Let me go back to the front page. 'Open a graph.' Right under the title: 'Files stay on this
computer. graphty reads them in this browser and uploads nothing.' and 'Projects are kept in
this browser.' Then a link, 'Where your data goes'. That's clear. Plain words. Nobody had to
explain 'client-side' to me."

"Down the bottom, 'Connect to data source...' with a little (i). That's the one IT will ask
about, because 'data source' in my bank means the warehouse. Hovering the (i)..." (In the mock
the (i) shows nothing; the design note says it would read "Sends only your query, to the source
you name.") "...nothing. OK. I'd expect it to tell me what it connects to."

**4. Running a data-source query.**

"Now the second half -- run a query and ask again. I click 'Connect to data source...'."

(The mock has no dialog behind it and no frame state after a query. The frame's design note says
the line under the project name would change to 'Sent to: {source}' after a query, but no screen
shows it. Sarah cannot run a query or see the after-state.)

"Nothing. There's no screen for it. So I can't tell you what the app says after a query. I
can tell you what the document says, but that's not what IT asked. They'll want to see the app
admit it sent something -- and to where -- right there on the screen, and ideally in the
project so I can show it later. If the top line just keeps saying 'Nothing sent' after I've
pulled from a database, that's a lie in writing and I'm the one who screenshotted it."

"I'll mark that half as not done."

**5. 'Where your data goes' page.**

"Opened the link. New tab, its own page, a proper title. 'Describes graphty 2.0. Updated
September 28, 2026.' Good, a version and a date -- IT always asks 'which version did you
review'. 'Copy link' and 'Print or save as PDF'. PDF is what I'd actually send. Our mail filters
half the links anyway, and a PDF goes in the vendor-review folder."

"'In short': files not uploaded, no account, no server that gets your data. Data leaves only
through two features, both off: Connect to data source and the Assistant. Projects kept on this
computer only. That's three sentences. I could paste that into the email body as-is."

"The table, 'What leaves this browser'. Connect to data source: 'The query you write, and any
sign-in the source asks for. To the source at the address you enter, run by whoever runs it --
not by graphty.' OK so it's browser to our database, nothing in the middle. That's the answer to
the second half of the question, at least on paper. IT will ask: does the sign-in get stored?
Where? It says the Assistant key is kept in the browser, but it doesn't say the same about the
data-source password. I'd want that line."

"The Assistant: 'your question, the graph's counts, each column's name with up to 10 of its
values, and the names and values of the nodes it looks up' -- to Anthropic, OpenAI or Google.
Names of the nodes. In my world a node is a customer. That's customer names and account numbers
going to an AI company. Absolutely not. It's off, fine, but IT is going to want to know they can
switch it off for everybody, and..."

"...here: 'For organizations -- Turning the Assistant off for everyone.' And a pink box: 'Owner
decision open.' Same pink box on 'who hosts graphty, and where', on 'usage statistics and crash
reports', on running our own copy, and on who to contact. So the four questions my IT reviewer
asks first -- where's it hosted, what telemetry, can we run it internally, can we lock the AI off
-- are the four with pink boxes. I get that it's a draft. But I can't forward this. If I send
it with those boxes, the answer is 'come back when you know'."

"'Opening graphty: nothing from your files; the browser asks for graphty's own code, for any web
page. Where graphty is hosted.' So it IS a website. Someone hosts it. IT will read 'graphty has no
server that receives your data' and then 'where graphty is hosted: [blank]' and ask me what
country. I don't know."

"'Check it yourself: open developer tools, Network tab.' I'd never do that, but my IT guy
would, and he'd like being told he can. That's a good line for him, not me."

"'What this page does not promise' -- it's not a certification. Clearing site data deletes
projects. That second one scares me more than the upload question, honestly. A case I built
disappears because someone re-imaged my laptop. It says download the project file. Fine, noted."

## Outcome

- From the app: answered. "This browser. Nothing sent." under the project name and "Off.
  Nothing is sent." on the Assistant button, on Les Miserables. Not on the Transfers sample,
  where the line was missing.
- After a data-source query: not answered from the app. There is no connect dialog and no
  after-query state to look at. Answered only from the document.
- Something to forward: the page exists and the PDF button is right, but she would not forward it
  while hosting, telemetry, self-hosting, organization-wide Assistant off and a contact address
  are all still open.

Single Ease Question: 4 of 7. "The first answer was easy. The second I couldn't do. The document
I'd sign off on once the pink boxes are gone."

## Would she use this instead of her current tool?

"Instead of Excel, no -- that's not what this is. Instead of i2 for the few cases that need a
link chart, maybe, and this page is the reason it even gets to IT: 'runs in the browser, nothing
uploaded, here's a dated PDF' is a better start than most vendors give me. But IT approves, not
me, and right now the first four things they ask are blank. And if it can talk to our warehouse,
the screen has to say so after it does, every time. Until then it's a sample viewer I'm not
allowed to put real accounts into."

## Problems

1. After a data-source query there is nothing to see: no connect dialog and no frame state
   showing what was sent and to whom. The core second half of the task could not be done in the
   app. (Severity 3)
2. The forwardable page leaves open exactly the questions an IT reviewer asks first: who hosts it
   and in what country, usage statistics and crash reports, running an internal copy, turning the
   Assistant off for everyone, and whom to contact. With those open, she would not forward it.
   (Severity 3 -- expected in a draft, but it decides whether the page does its job.)
3. On the Transfers sample the "This browser. Nothing sent." line and the Assistant's "Nothing is
   sent" caption are absent, so the reassurance disappears on the data that looks like hers.
   (Severity 2)
4. The lock line under the project name is not clickable; the path to "Where your data goes" is
   through the file chip beside it, which she found by guessing. (Severity 2)
5. The page says where the Assistant key is kept but not where a data-source sign-in is kept or
   whether it is remembered. (Severity 2)
6. The (i) on "Connect to data source..." shows nothing in the mock; she expected it to say what
   it connects to and what it sends. (Severity 1)
7. The Assistant sends "names and values of the nodes" -- for her, customer names and account
   numbers -- to an outside AI provider. Stated honestly, but it is the line IT will stop on.
   (Severity 2)

## What worked

- "This browser. Nothing sent." under the project name: the answer in the first two seconds, in
  plain words.
- The start screen's "Files stay on this computer ... uploads nothing" line and its link.
- A dated, versioned page with Print or save as PDF -- the format a vendor-review folder takes.
- The table of what leaves, to whom and when; "Check it yourself" with the Network tab for IT.
- "What this page does not promise", including that clearing site data deletes projects.
