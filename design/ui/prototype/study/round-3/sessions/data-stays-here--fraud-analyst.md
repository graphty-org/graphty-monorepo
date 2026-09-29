# Session: "Is this OK to use, and did anything just leave?" -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (simulated; persona in
`../../../personas/fraud-analyst.md`). Mode: self-directed, not mandated by her manager.

Moderator's task, as given: "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run, nothing opened), the "Where your data goes" page it
links to, and the main window at rest with the Bank transfers data open. The design notes and
state switchers printed around each mock were treated as not part of the product.

## Part 1 -- before loading anything

**Looking at the start screen.**
"OK. 'Open a graph'. First thing my eye goes to is the line with the padlock: 'Files stay on this
computer. graphty reads them in this browser and uploads nothing.' Fine. Every vendor says that.
The one who sold us the case system said that too, and then it turned out the 'smart matching'
went to their cloud."

"Second line: 'Projects are kept in this browser.' Hm. In this browser. We're on managed Edge, and
the desktop team re-images laptops whenever they feel like it. So my case work lives in a browser
cache? I'll come back to that."

"Samples. Karate club, Les Miserables, protein something... 'Bank transfers, 3,000 accounts'. I'd
want to know that's fake data before I click it -- if it's somebody's real transfers I'm not
touching it. There's an (i). I'd hover. Not going to bother right now."

"'Connect to data source...' -- that's the one I would not click. That's the one that sounds like
it phones somewhere. There's an (i) on it too. Hovering: 'Sends only your query, to the source
you name.' OK. At least it admits it sends something. That's more honest than most."

**Clicks "Where your data goes".**
"Right, this is what I actually want. A page I can forward. 'Copy link', 'Print or save as PDF' --
good, because IT security will want a PDF attached to the ticket, not a link to a website they have
to vet first."

"'In short': files not uploaded, no account, no server that receives your data. Data leaves only
through Connect to data source and the Assistant, both off until you turn them on. Projects on
this computer only. That's three sentences. I could paste that into the access request."

"Table of what stays. Files, projects, exports. 'An Assistant key' -- so there's an AI thing. Of
course there is."

"What leaves. The Assistant: 'your question; the graph's counts; each column's name with up to 10
of its values... and the names and values of the nodes it looks up'. Stop. Node names -- on my data
those are account numbers. Up to ten values of each column -- that's amounts, maybe customer names
if the export has them. Going to Anthropic, OpenAI or Google 'under your own key'. My own key? I
don't have a key. Nobody at the bank has a key. If I turned that on with real customer data I'd be
explaining it to compliance by lunchtime. At least it says so plainly, I'll give it that."

"'Opening graphty: nothing from your files. Where graphty is hosted.' And then this pink box:
'Owner decision open: who hosts graphty, and where.' So... it's a web page. Who runs the web page?
That's literally the first question IT will ask me. If it's some cloud host in another country, the
answer is no before anyone reads the rest."

"'Usage statistics and crash reports: Owner decision open.' So they don't know yet if it collects
telemetry? A crash report with a stack trace can have data in it. That's the second question IT
asks."

"'Check it yourself. Open your browser's developer tools, choose the Network tab.' Ha. Developer
tools are disabled on our laptops by group policy. I can't check it myself. IT could."

"'For organizations. Running your own copy of graphty inside your network: owner decision open.'
That's the answer that would actually get this approved -- if we could run it on our own server,
behind our own firewall, the vendor-risk review is a week instead of three months. And it's not
decided."

"'Turning the Assistant off for everyone: owner decision open.' Same thing. My manager will ask:
can we lock the AI off? Right now the answer is 'it's off until each person sets a key'. That's a
promise about people behaving, not a control. Our auditors don't accept that."

**Her answer to "Is this OK to use?"**
"Honestly? Not my call, and this page makes that clear enough that I'd forward it. For what the
page does say, I believe it more than most, because it tells me what does leave instead of just
'we take security seriously'. But the three things my IT security team decides on -- who hosts it,
does it phone home with telemetry, can we run our own copy -- are all 'not decided'. So my answer
today is: I'd use it on the sample data, I would not load a real customer export until IT signs
off, and IT can't sign off on a page with blanks in it."

## Part 2 -- mid-session, Bank transfers open

**Looking at the main window.**
"Transfers, March 2026. Under the name: padlock, 'This browser. Nothing sent.' OK, that answers the
moderator's question in about two seconds. And on the left bar, under 'Assistant', 'Off. Nothing is
sent.' It's small -- at 125 percent it'll be fine, at 100 percent I'm squinting. But it's there
and it's in words, not just a grey icon."

"Did anything just leave? The screen says no. Do I trust it? More than I'd trust nothing. What I
don't know: 'nothing sent' -- since when? Since I opened the project? Since I opened the tab? If I
had run a query to our database an hour ago, would it still say that, or would it say 'sent
earlier'? There's a file name chip, 'transfers-2026...', I'd click it."

**Clicks the file chip (the file popover).**
"'This browser. Nothing sent. Projects are kept in this browser. Where your data goes...' Opened
from this computer, read Sep 28, 10:42. Fine. Same answer, one level deeper. There's no 'last
sent: never' or a log I can screenshot for the case file, though. The data page said every send
goes in Version history with an 'Export log' -- I'd look for that if a send had happened. With
nothing sent, I'd just want the screen to say 'Nothing has been sent from this project' so I can
screenshot that into the file for my own protection."

"And the lightning bolt on the bottom toolbar -- I don't know what that is. If that's the AI, it
worries me that it's right there next to the select tool. I'm not clicking it to find out."

**Her answer to "Did anything just leave your machine?"**
"According to the screen, no: 'This browser. Nothing sent.' and the Assistant says 'Off'. I'd
believe it for the data. I would not swear to it in an audit, because I can't open dev tools and
the page hasn't said who hosts it or whether it sends crash reports."

## Afterwards

**Single Ease Question (1 very hard -- 7 very easy): 5.**
"Finding the answer was easy -- the lines are right where I look, and the page is the first vendor
page I've seen that I could actually forward. It's a 5 not a 6 because the page answers the
question I don't care about -- my files -- and leaves blank the ones IT cares about: hosting,
telemetry, self-hosting, a central off switch."

**Would you use this instead of your current tool?**
"Instead of i2 or Excel? No, not on the strength of this -- this is the permission slip, not the
tool. But this is the first time a tool has got past my 'does it upload anything' question in the
first minute instead of in month three of vendor review. If they fill in those pink boxes with
'you can run it on your own server, no telemetry, and IT can turn the AI off for everyone', I'd
send the PDF to my manager the same day. Until then it's sample data only."

## Problems observed

1. Hosting, telemetry, self-hosting and a central Assistant switch are unanswered on the page an IT
   reviewer reads -- the four questions a bank decides on (severity 3).
2. The Assistant sends account IDs and column values to a third-party AI; the only control is
   "off until each person sets a key", which a bank auditor does not accept as a control
   (severity 3).
3. "Projects are kept in this browser" on a managed, re-imaged laptop reads as "my case work can
   vanish"; no hint on the start screen that a project file download is the safe copy
   (severity 2).
4. "Check it yourself" relies on browser developer tools, which bank laptops block (severity 2).
5. "Nothing sent" has no time scope and no screenshot-able log entry for "nothing has been sent from
   this project" to put in the case file (severity 2).
6. The unlabelled lightning-bolt tool on the bottom toolbar raised a worry that it is the AI;
   she avoided it (severity 2).
7. "Bank transfers" sample does not say it is synthetic on its face (severity 1).
8. The rail's "Assistant / Off. Nothing is sent." caption is very small (severity 1).
