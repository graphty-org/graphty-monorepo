# Session: "Is this OK to use with our data?" -- Alex, operations data analyst

Participant: Alex, 31, data analyst at a logistics company. Company laptop, no admin rights,
supplier and depot data must not leave approved systems. Uses NetworkX plus Gephi today.

Task as given by the moderator: "Before you load anything: your organisation is strict about
where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run, nothing opened), the "Where your data goes" page it
links to, and the main window with a graph open (at rest, the file popover, and the Assistant
switched on).

## Think-aloud transcript

**Start screen, first look.**

"OK. 'Open a graph.' Four samples, Open, Connect to data source. Before I touch any of that --
where does the file go. ... Oh, it's right there, second line. 'Files stay on this computer.
graphty reads them in this browser and uploads nothing.' Fine. That's the sentence I was looking
for, and it's where I'd look for it, next to Open. I didn't have to hunt a footer for it."

"'Projects are kept in this browser.' Hm. So if I save work it's in Chrome, not on a server.
Good for IT, bad for me if somebody re-images my laptop. Park that."

"Now -- the line says uploads nothing. Every web tool says that. Gephi Lite says that. It's a
claim. My security people won't take a line on a start page, they'll want something they can
read. There's a link, 'Where your data goes'. I'll click that."

**Where your data goes (opens in a new tab).**

"Right, a whole page. 'Copy link', 'Print or save as PDF'. OK, that's actually what I'd need --
I can paste this into the ticket to the security team instead of trying to explain it myself.
That's the first time a tool has given me the thing to forward."

"'In short': files not uploaded, no account, no server that receives your data. Data leaves only
through two things, Connect to data source and the Assistant, both off until you turn them on.
Projects on this computer only. Good, three lines, I can quote those."

"Table of what leaves. Connect to data source -- the query goes to the database I name. Fine,
that's our database, that's allowed. The Assistant -- 'your question, the graph's counts, each
column's name with up to 10 of its values, and the names and values of the nodes it looks up' --
to Anthropic, OpenAI or Google. OK so that one is the problem. Supplier names going to OpenAI is
exactly the call I don't want to get. But it says off until I set a provider. So I just... don't
set one. Can IT force it off? Let me look."

"'For organizations.' ... There's a pink box. 'Owner decision open: whether an organization can
switch the Assistant off centrally.' So -- no, not today. It's per person. That's the question my
security team asks first: can we turn it off for everybody. If the answer is 'trust each analyst
not to paste in an API key', they'll say no to the whole thing. I'd probably still get to use it,
but I'd have to argue for it."

"And 'Usage statistics and crash reports' -- also a pink box, not decided. That's the other
question they always ask. Does it phone home. Right now the page doesn't say. I get that this is
a mock, but if that line shipped blank I'd assume the answer is yes."

"'Opening graphty -- where graphty is hosted' -- also open. Where is the server that serves the
page, what country. They'll ask that too. Honestly they'll ask 'who is graphty', is there a
company, is there a contract, what does it cost. Nothing here tells me whether my manager has to
sign something. I'd guess it's free because there's no sign-in, but I'm guessing."

"'Check it yourself. Open your browser's developer tools, Network tab.' ... Heh. I think DevTools
might be blocked on our laptops, I've never tried. Nice idea though. The IT person can do that,
not me."

"'What this page does not promise -- clearing this site's data deletes projects.' Yes, that's the
thing I parked. Our laptops get wiped on refresh. There's a 'Download project file'. OK, so I'd
keep a copy on the shared drive. Fine. At least it says so up front instead of me finding out."

"So: is this OK to use? For the sample data, today, sure. For the supplier file, I'd forward this
page to security first and wait. I'm more comfortable than I usually am with a web tool -- it
actually tells me what goes where -- but three of the questions they'll ask are still pink boxes."

**Moderator: "Go ahead and open something." Alex opens Les Miserables (the sample), not a real
file.**

"Sample first. I'm not putting the supplier file in until someone signs off."

**Main window, graph open, at rest.**

"Nodes 77, edges 254, fine. Under the name there's the lock again: 'This browser. Nothing sent.'
And on the left under Assistant: 'Off. Nothing is sent.' OK. Two places say it."

**Moderator, mid-session: "Did anything just leave your machine?"**

"...No? It says 'This browser. Nothing sent.' right under the project name. That took me one
second, it's where my eye goes anyway. And the Assistant says off."

"But -- how do I know that line is live and not just a sticker? Would it change if something did
go? The page I read said it would, it said the line changes to 'Sent to ... at 14:02, 40 node
names'. On this screen I can't tell that. If it always says 'Nothing sent' I'd trust it about as
much as a 'we take your privacy seriously' banner."

"If I click the file name -- miserables.json -- I get a little box: 'This browser. Nothing sent.
Projects are kept in this browser. Where your data goes.' Opened from this computer, read 10:42.
Same sentence again. Consistent at least. It's not telling me anything new, but it's not
contradicting itself either, which Gephi Lite sort of did."

**Moderator switches the mock to "Assistant on".**

"OK so now the line under the name changed, and there's an icon on Assistant. It says something
like 'Assistant on: sends names and statistics' -- it wraps onto two lines and runs into the
name, I can't read the project name. Sends to who? The page said it'd name the host, like
api.anthropic.com. This one I'm looking at doesn't say where. 'Sends names' -- which names?
Supplier names? All of them? I'd want 'sends' to say 'to Anthropic' right there."

"And it's 'sends', future tense. So has anything gone yet? I think no, because I haven't asked it
anything. But that's me reasoning it out, the screen doesn't say 'nothing sent yet'. If I asked
one question, the page says it would switch to 'Sent to ... 40 node names' with a 'See what was
sent'. That's the thing I'd actually want -- a list I can hand to IT if they ask what went out.
I didn't see that one on screen though."

"Honestly, for me the rule would just be: never turn the Assistant on with work data. Then the
answer is always no."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 6.**

"Finding the answer was easy -- the line is next to Open and under the project name, I didn't
have to look. What took longest was reading the data page, and it still doesn't answer the three
things security asks: does it collect usage stats, where is it hosted, can we turn the AI off
for the whole team. Those aren't hard to find, they're just not answered yet."

**Would you use this instead of your current tool?**

"For the data question, yes, it's better than what I've got. Gephi's a desktop app so nobody
asks, but every browser tool I've tried I had to guess. This one hands me a page to forward.
Would I put supplier data in it tomorrow? No -- I'd send security the link and the PDF, and
I'd use the samples and my sanitised extract until they answer. If they come back and say fine,
and it can do my betweenness and my monthly rerun, then maybe. The privacy part won't be what
stops me; the pink boxes might."

## Problems observed

1. **Three questions an IT reviewer asks first are open on the data page** (whether graphty
   collects usage statistics or crash reports; who hosts graphty and in what country; whether an
   organization can turn the Assistant off for everyone). Alex reads an unanswered telemetry line
   as "probably yes". Severity 3.
2. **"Nothing sent" reads as a fixed label, not a live status.** On the resting window nothing
   shows that the line would change if something left; Alex only knows because the data page told
   him. Severity 2.
3. **With the Assistant on, the render's line under the project name names no destination and
   wraps into the project name** ("Assistant on: sends names and statistics"). The data page
   promises the host ("to api.anthropic.com"); Alex wanted it on screen. The current mock source
   already names the host; the shot shows an older wording. Severity 2.
4. **With the Assistant on but nothing asked yet, nothing says "nothing sent yet"**; Alex had to
   reason that the future tense meant nothing had gone. Severity 2.
5. **No word on cost, licence or who is behind graphty**, which decides whether his manager must
   approve it. Severity 2.
6. **"Check it yourself" relies on browser developer tools**, which a locked-down corporate
   laptop may block; it helps the IT reviewer, not the analyst. Severity 1.
