# Session: does the data stay here? -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center (simulated;
see ../../personas/intelligence-analyst.md). Case data he handles is criminal justice
information and may not leave agency-approved systems.

Task as given by the moderator: "Before you load anything: your organisation is strict about
where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run, nothing opened), the "Where your data goes" page it
links to, and the graph window at rest with the Les Miserables sample open, including the file
popover and the state with the Assistant switched on.

## Part 1 -- before loading anything

**Start screen.**

> OK. "Open a graph." Four sample pictures, Open, Connect to data source. Fine. What I'm looking
> for is the fine print, and -- there it is, right under the title, with a little padlock:
> "Files stay on this computer. graphty reads them in this browser and uploads nothing." Then
> "Projects are kept in this browser."

> I'll be honest, that's the first time a tool has told me that before I asked. Usually I'm
> digging through a privacy policy written by a lawyer. So, good. But a sentence on a web page
> is a sentence on a web page. The vendor that told us "your data never leaves" had a sync
> service turned on by default. I need something I can hand to our ISO.

> "Connect to data source..." -- that's the one I'd never touch with case data. There's a little
> (i) at the end of the row. Hovering... "Sends only your query, to the source you name." Fine,
> at least it admits that one sends something. I'm not clicking it.

> I click "Where your data goes."

**Where your data goes page.**

> New tab. "A plain page to forward to an IT or security reviewer." Now we're talking -- that is
> exactly what my ISO is going to ask me for. "Copy link", "Print or save as PDF". Good, I can
> attach a PDF to the software request ticket.

> "In short." Three lines. Files are read by the browser, not uploaded, no account and no
> server that receives your data. Data leaves only through two features, both off until I turn
> them on: Connect to data source, and the Assistant. Projects stay in this browser on this
> computer only. That's the right shape. That's the paragraph IT reads.

> "What stays in this browser" -- files, projects, exports, an Assistant key. "Exports are
> written by your browser's save dialog to the folder you choose." Good, so the export goes
> where I put it, on the S: drive, not somewhere else.

> "What leaves this browser, and only when you ask." Table. Connect to data source -- the query
> goes to whatever address I type. Recipe files that name a data source -- asks me first. The
> Assistant -- "your question, the graph's counts, each column's name with up to 10 of its
> values, and the names and values of the nodes it looks up", to Anthropic, OpenAI or Google.
> Stop right there. The names of the nodes ARE my subjects. That's a CJIS problem, full stop.
> OK, but it says it's off until I set a provider, and I'm not setting one. As long as somebody
> can't turn it on for me.

> Next row, "Opening graphty." "Nothing from your files. The browser asks for graphty's own code,
> as for any web page. To whom: Where graphty is hosted." And then there's a pink box:
> "Owner decision open: who hosts graphty, and where. The page names the host and its country
> here."

> Huh. So... they don't know where it's hosted? Or they haven't decided? That's the first
> question on our form. "Where is the server physically located and who operates it." I can't
> send a page to IT that says "to be decided."

> "What graphty does not send." No account, no file contents, no fonts or code from other sites.
> Usage statistics and crash reports -- another pink box, "Owner decision open: whether graphty
> collects any." So I don't know if it phones home either. That's the other question on the form.

> "Check it yourself. Open your browser's developer tools, choose the Network tab." Nice thought.
> IT turned off developer tools on our machines two years ago. Our ISO can do it, maybe. I can't.

> "What this page does not promise." Clearing site data or a re-image deletes projects. OK, that
> I actually appreciate -- I've lost charts to a re-image before. "Download project file" makes
> a copy I control. Good, I'd put that on the case share.

> "For organizations." Running your own copy inside your network -- pink box, decision open.
> Turning the Assistant off for everyone -- pink box, decision open. Contact -- pink box.

> So that's my answer. Is it OK to use? The design is saying all the right things. But the three
> things IT will actually ask -- where is it hosted, does it phone home, can we run it on our own
> server -- all say "decision open". Today I'd tell the moderator: I'd play with the Karate club
> sample and nothing else. No real case data until those boxes have answers. Honestly the page
> makes me trust them more because it admits what it doesn't know. But I still can't submit it.

Moderator prompt: "Suppose those boxes were filled in. Would the page be enough?"

> If it names the host and the country, says "no usage statistics", and says we can run our own
> copy -- yeah, that's most of the ticket. Add a line that the Assistant can be locked off by
> the department, not just "off until each person sets it," and I'd forward this page as is.

## Part 2 -- mid-session: did anything just leave my machine?

**Graph window at rest, Les Miserables sample open.**

> Chart's up. Dots, colors, the auto-arrange. Not what I'd call a link chart but whatever,
> that's a different session. Did anything leave? First place I look is the top left, near the
> name of the thing. "Les Miserables", and under it: padlock, "This browser. Nothing sent."
> That answers it before I asked. Good. Same words as the start screen, which matters -- if the
> words changed I'd wonder why.

> Left rail: "Assistant. Off. Nothing is sent." Also good. It's not sparkling at me. I don't
> want a sparkle button on a case chart, I'd be afraid somebody clicks it.

> I click the file chip, "miserables.json." Little popup: "This browser. Nothing sent. Projects
> are kept in this browser. Where your data goes..." Opened from: this computer. Read Sep 28,
> 10:42. OK, that's the chain-of-custody kind of info I like. Where it came from, when.

> Question though: this is a sample. I didn't open a file. Did the sample come from the
> internet? It says "Opened from this computer" -- so I guess it ships with the thing. Nothing on
> the data page says either way. Doesn't matter for case data, but I noticed.

> Also the Statistics panel over on the right -- density, degree, all computed. Where? It says
> "Nothing sent" up top so I assume here. I'll take the padlock's word for it, but that's the
> kind of thing I'd want the ISO to check once.

**Same window, Assistant switched on (the moderator shows this state).**

> Now the line under the name changed: little upload arrow, "Assistant on: sends names and
> statistics." It wrapped onto two lines and I had to read it twice, but it's there and it's in
> the same spot. Good -- it changed where I was already looking. And the rail button got its
> sparkle icon back.

> "Sends names." Names of what? The nodes? My subjects? The data page said "names and values of
> the nodes it looks up." So yes. That line should say "sends subject names" -- well, "node
> names," whatever you call them -- not just "names." Names could mean column names, which is
> nothing. Node names is a CJIS violation.

> And it says "sends" -- present tense. Did it send already, just by turning it on? The start
> screen said "nothing is sent until the Assistant is asked something" -- I only know that
> because I read the fine print on the first screen. Up here it just says "sends." If I
> accidentally switched it on, I'd want to know: has anything gone out yet, yes or no.

> Bottom line for the mid-session question: at rest, yes, I can tell nothing left, in one
> glance. With the Assistant on, I can tell something WILL leave, but not whether it already did.

## After the task

Single Ease Question (1 very hard -- 7 very easy): **5**.

> Finding the answer was easy -- it's right there before you load anything, and it's still
> there when you're working. I'm knocking it down because the answer to "can I use it at work"
> is "not yet": hosting, telemetry and self-hosting all say decision open. That's not a hard
> screen, that's an incomplete answer.

Would he use it instead of his current tool?

> Instead of i2? No. Not for this reason, anyway -- i2 is installed, it's approved, and it's on
> the job posting. Alongside it, for the analysis i2 can't do? Maybe, and this data page is the
> reason it's even a maybe. Most web tools die in my inbox the day IT asks "where's the server."
> This one at least tells you. Fill in the pink boxes, give the department a switch to lock the
> Assistant off, ideally let us run it on our own server, and I'll put the ticket in.

## Problems observed

1. **Hosting, telemetry and self-hosting are unanswered on the data page** (Where your data
   goes). The three questions an agency security review asks first all read "Owner decision
   open". Severity 4: blocks any real case data.
2. **No organisation-wide lock on the Assistant** (Where your data goes, For organizations).
   "Off until each person sets a provider" is not a control an ISO accepts. Severity 3.
3. **"Assistant on: sends names and statistics" is ambiguous and tense-unclear** (graph window,
   Assistant on). "Names" does not say node names; "sends" does not say whether anything has
   already gone. Severity 3.
4. **"Check it yourself" assumes developer tools** (Where your data goes). Locked-down agency
   browsers often disable them. Severity 1.
5. **Samples' origin is unstated** (start screen, file popover). "Opened from this computer" on
   a sample he never opened from disk; the data page does not say whether samples are fetched.
   Severity 1.
6. **The Assistant-on location line wraps to two lines** in the left panel header, pushing the
   chips down. Severity 1.

## What worked

- The lock line under "Open a graph" answers the data question before any load, unprompted.
- A forwardable, printable page written for a security reviewer, with "What this page does not
  promise" -- the admission of limits raised trust.
- "This browser. Nothing sent." persists under the project name in the same words, and changes
  in the same spot when something would leave.
- The Assistant at rest shows no sparkle and says "Off. Nothing is sent."
- The file popover's "Opened from / Read" reads like provenance.
