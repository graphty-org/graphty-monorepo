# Session: is it OK to put company data in it, and did anything leave? -- Analyst Alex

Participant: Alex, operations data analyst at a logistics company (supplier, customer and depot
data must not leave approved systems). Company Windows laptop, Chrome, no admin rights.

Task as given by the moderator: "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens: the start screen (first run), the "Where your data goes" page it links to, then the main
window with the Les Miserables sample open (resting, with the file popover open, with the Assistant
on, and the version with no line under the project name).

## Part 1 -- before loading anything

**Start screen.** "OK, 'Open a graph'. Samples, Open, Connect to data source. Before I touch Open --
there's a line right under the title. Little padlock. 'Files stay on this computer. graphty reads
them in this browser and uploads nothing.' Right. That's the thing I was going to ask, so, credit,
it's where I'd look. Second line, 'Projects are kept in this browser.' Fine."

"But -- I mean, every website says that. It's a website. Somebody is hosting this page. 'Uploads
nothing' according to who? That's what IT is going to say to me, not what I think."

"There's a link, 'Where your data goes'. I'll click that before I do anything else."

"Also -- 'Connect to data source'. That one obviously sends something. Hovering the little (i)...
'Sends only your query, to the source you name.' OK, so that's the one that talks to the network,
and it's a separate button. I'm not touching it. Good that it's separate from Open."

**Where your data goes page** (opens in a new tab). "Oh, this is a proper page. 'Written so you can
forward it to whoever approves software where you work.' OK, that is literally what I need. Copy
link, Print or save as PDF -- yeah, I'd PDF this and attach it to the ticket. There's a date and a
version on it, 'graphty 2.0, updated September 28'. Good, because IT will ask which version."

"'In short': not uploaded, no account, no server that receives your data. Data leaves only through
two features, both off until you turn them on: Connect to data source and the Assistant. Projects
kept in this browser, this computer only. Three lines. I can paste those into an email."

"Scrolling. Table of what stays. Files, projects, exports, 'an Assistant key'. Then what leaves --
feature, what, to whom, when. Connect to data source sends the query to whoever runs the source.
The Assistant sends 'your question, the graph's counts, each column's name with up to 10 of its
values'. Hm. Up to ten values. So if I turned that on, ten supplier names go to -- Anthropic,
OpenAI or Google. OK, at least it says so. I'm not turning that on, obviously."

"'Opening graphty: nothing from your files... where graphty is hosted' -- and then there's a pink
box. 'Owner decision open: who hosts graphty, and where.' Uh. OK. That's the first thing security
asks: where's the server, what country."

"'What graphty does not send.' No sign-in, good -- a sign-in would have made me close the tab. No
fonts or code from other sites. Then 'Usage statistics and crash reports' -- pink again, 'Owner
decision open: whether graphty collects any.' That's... that's the actual question. If there's
analytics on the page, what's in it? Node names in an error report? I can't send this to IT with
a blank there. They'll bounce it straight back."

"'Check it yourself: developer tools, Network tab.' Fine, I can do that, F12 works on my laptop.
Honestly I probably would do that, with the sample loaded."

"'For organizations' -- running your own copy: pink. Turning the Assistant off for everyone: pink.
Contact: pink. So the bottom third of this is 'we haven't decided'. I get it's a mock. But if the
real one shipped like that I'd assume the answer to telemetry is 'yes, some' and they didn't want
to write it down."

"Nothing about cost anywhere, either. Is it free? Does it stay free? My manager will ask. Not a
data question, but it's the same ticket."

"So -- is it OK to use? For the sample and my sanitised extract, the one with supplier codes
instead of names: yes, I'd go ahead today. For the real supplier file: not until IT signs off, and
this page is what I'd send them, but they'll come back on hosting and telemetry. Which is still
better than Gephi Lite, where I had nothing to send at all."

What I'd do: open the Les Miserables sample, F12, watch the network tab. Not my real file.

## Part 2 -- mid-session, "did anything just leave your machine?"

**Main window, Les Miserables open.** "OK, it's open. Where would it tell me... Top left, under the
project name: padlock, 'This browser. Nothing sent.' Small grey text, but it's where the name is,
so I'd see it. So: no, nothing left. That's the answer the screen gives me."

"On the left rail as well, under Assistant: 'Off. Nothing is sent.' Two places saying the same
thing. Fine. Slightly -- the rail one's tiny, three lines of grey under an icon that isn't there.
Took me a second to read it as a label and not a bug."

"Here's my problem with 'Nothing sent' though. It's a sentence that's always there. Is it a
statement about right now, or about the whole session? If I'd connected to a source ten minutes
ago and then closed that, would it still say 'Nothing sent'? The moderator asked 'did anything JUST
leave' -- this doesn't tell me what happened, it tells me the rule. I'd believe the rule. I'd like
a record."

**Clicking the file chip, miserables.json.** "Popover. 'This browser. Nothing sent. Projects are
kept in this browser.' 'Where your data goes...' link again -- good, I can find the page again
without going back to the start. 'Opened from: this computer. Read: Sep 28, 10:42.' Replace data.
OK. So the file came from my disk and that's it. That's consistent. Same words as the start screen,
which matters -- if they'd said something different in two places I'd trust neither."

**The version with the Assistant on.** "Now the line under the name says 'Assistant on: sends names
and statistics' and it's wrapped onto two lines and squashed. Names of what? The nodes? The
columns? My suppliers? 'Sends' -- has it sent, or will it send when I ask? The page I read earlier
said 'each time you send a question', but this line doesn't say that. If I saw this on the real
file I'd have a small heart attack and close the tab. Also the Assistant icon is back on the rail
with sparkles, which -- fine, at least it's obvious it's on."

**The version with no line under the name.** "This one has nothing under the project name. Just
the file chip and 'Full graph'. The only thing saying anything is the rail: 'Assistant. Off.
Nothing is sent.' But that's about the Assistant, right? It doesn't say anything about the file
or Connect to data source. So if you asked me here 'did anything leave', I'd say... probably not?
I'd have to click the file chip to check. I prefer the one with the line. It costs four words and
it answers the question before I ask it. I'm going to ask it every time -- every time I open it
with a new file."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 5.**
"Finding the answer was easy -- it's the first line on the start screen and the first line in the
project. What took longest was the data page, and the reason it's not a 6 or 7 is the pink bits:
hosting, analytics, who to contact. Those are the three things IT asks, and they're the three
things that aren't answered. And 'Nothing sent' tells me the rule, not what actually happened."

**Would you use this instead of your current tool?**
"For the picture half -- the Gephi half -- on a sanitised extract, yes, I'd try it this week; it's
in the browser, no install, no admin rights, no sign-in, and it tells me where the data goes, which
Gephi Lite never did in a way I could forward. On the real supplier file, not until my IT people
say yes, and they won't until that page says who hosts it and whether it collects anything. I'd
still do the numbers in Python until I've checked betweenness matches NetworkX, but that's another
day."

## Problems observed

1. Where your data goes page: hosting, usage statistics and crash reports, self-hosting and the
   contact are all "owner decision open". These are exactly the questions an IT reviewer asks
   first; a page shipped with any of them blank would be bounced and read as evasive. Severity 3.
2. Main window, location line: "This browser. Nothing sent." reads as a standing rule, not a record.
   It does not answer "did anything just leave" if something was sent earlier in the session and
   has since stopped (a source connected and closed, an Assistant question). He wanted a short
   history of what left and when. Severity 2.
3. Main window, Assistant on: "Assistant on: sends names and statistics" wraps and crowds the header,
   and does not say names of what, or that nothing goes until he asks a question. On a real file it
   reads as "your supplier names are being sent". Severity 3.
4. Main window, version with no line at rest: only the Assistant's rail caption speaks, and it is
   about the Assistant only, so he could not answer the question without clicking the file chip.
   He preferred the version with the line. Severity 2.
5. Rail caption "Off. Nothing is sent." under a missing icon is tiny and first read like a rendering
   glitch. Severity 1.
6. Nothing anywhere on cost or licence, which is part of the same approval ticket. Severity 1.

## What worked

- The padlock line is the first thing under the title, before Open, exactly where he looked.
- The forwardable page with Copy link, Print or save as PDF, a version and a date: he would attach it
  to the IT ticket as is.
- The table of what leaves, to whom and when, including the Assistant's "up to 10 values".
- Connect to data source is a separate row with its own (i) saying what it sends.
- The same words on the start screen, the page and the file popover; the popover links back to the
  page.
- No sign-in anywhere.
- "Check it yourself" with the Network tab: he intends to do it.
