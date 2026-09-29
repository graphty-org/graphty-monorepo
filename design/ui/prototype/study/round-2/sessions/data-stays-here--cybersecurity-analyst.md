# Session: "Is this OK to use, and did anything leave my machine?" -- Priya, threat hunter at a bank

Participant: Priya, senior threat hunter on a bank's security operations team (persona:
study/personas/cybersecurity-analyst.md). Dark mode, managed Edge, about half a 1440p monitor.

Task as given by the moderator: "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run, dark), the "Where your data goes" page it links to, and
the resting frame with a graph open (the line under the project name, the Assistant rail button,
the file popover, and the Assistant-on state).

## Part 1 -- before loading anything

**Start screen, first look.**

> OK. "Open a graph." Before I look at the samples I want my three questions answered: is this
> approved, where does it run, does it phone home. ... First line under the title: "Files stay on
> this computer. graphty reads them in this browser and uploads nothing." Fine. That's where it
> runs. Second line, "Projects are kept in this browser." Also fine, that means I lose them when
> desktop support re-images me, but at least it's honest.
>
> "Uploads nothing" is a marketing sentence until I see what's behind it. There's a link, "Where
> your data goes." That's the one I'd click. I'm not clicking the samples -- les Miserables isn't
> my network.

Noticed the "Connect to data source..." row and its (i).

> Connect to data source, that's the one that would leave. The (i) says "Sends only your query, to
> the source you name." Good -- that's the Maltego problem, the query going somewhere I didn't pick.
> It says it goes to the source I name and nowhere else. I'd want that to be true for the whole
> session, not just the first click.

**"Where your data goes" page** (opens in a new tab).

> OK, this is actually the thing I'd forward to our third-party risk person. It has its own address,
> "Copy link", "Print or save as PDF". That's the right shape. Our vendor review wants a PDF with a
> date on it, and it has one: "Describes graphty 2.0. Updated September 28, 2026."
>
> "In short": files read by the browser, not uploaded, no account, no server that receives data.
> Data leaves only through two features, both off until I turn them on: Connect to data source and
> the Assistant. Projects kept in this browser. That's three lines and it answers "does it phone
> home" -- mostly.
>
> The "What leaves" table is good. Feature, what is sent, to whom, when. That's the format my
> reviewer uses. The Assistant row -- "your question, the graph's counts, each column's name with
> up to 10 of its values" -- up to ten values of a column is my account names. That's the line our
> DLP person would stop on. At least it says it, and it says it's off until I set a provider.
>
> Now here's where it falls down. "Opening graphty: where graphty is hosted" -- and there's a pink
> box: "who hosts graphty, and where. The page names the host and its country here." It's not
> decided. That is literally the first question on our vendor questionnaire. Same with "Usage
> statistics and crash reports" -- another pink box. So the two things that make it "phone home" in
> the sense I care about, hosting and telemetry, are the two things it doesn't answer. I get this
> is a prototype. But if I saw that in the real product, the review stops there.
>
> "Running your own copy inside your network" -- also pink. That's the one that would actually get
> this approved at a bank. If I could host it internally, nobody has to review a vendor. That
> should be a headline, not a footnote under "For organizations".
>
> "Check it yourself: open your browser's developer tools, choose the Network tab." I don't do
> that, and on a lot of our machines dev tools are locked by policy anyway [her belief; the persona
> does not check]. I don't want homework, I want the tool to tell me. Fine as a line for the
> reviewer though.
>
> "What this page does not promise" -- I like that. "It is a description, not a certification or a
> contract." That's honest. It's also why I still can't say "approved". Approved means someone
> signed off; this page is what I'd attach to the ticket.

**Answer to the moderator's first question:**

> Is it OK to use? For a lab file, yes, I'd load a scrubbed export into this today -- nothing
> uploads, no sign-in, and I can see what the two outbound features would send. For bank data, no:
> not until hosting and telemetry are filled in, and ideally not until I can run it inside our
> network. In a real trial I'd have stopped at the pink boxes, not because of what they said but
> because they said nothing.

## Part 2 -- mid-session

A graph is open (Les Miserables, the moderator's stand-in for her lab file). Moderator: "Did anything
just leave your machine?"

> Where would it say... Top left, under the name: "This browser. Nothing sent." That's the answer.
> Didn't have to look for it -- it's in the same place as the file name. Good.
>
> And the rail on the left, under "Assistant": "Off. Nothing is sent." Tiny grey text wrapped over
> three lines, but it's there. On hour eleven of a shift I wouldn't read that, I'd read the top-left
> line.
>
> File chip, "miserables.json", I click it. Popover: "This browser. Nothing sent. Projects are kept
> in this browser. Where your data goes..." then "Opened from this computer", "Read Sep 28, 10:42".
> OK, consistent. Same words as the start screen. That matters -- if three places said three
> different things I'd trust none of them. [The stored render of this popover is older and lacks the
> location lines; she was shown the current mock.]
>
> "Export files..." in blue top right -- export means save to disk, the data page said so, "your
> browser's save dialog". I'd still hesitate on a blue button that says "Export" in a tool I don't
> know. Some tools "export" to their cloud.

Moderator switched to the Assistant-on state.

> Now it says "Assistant on: sends names and statistics", and the Assistant icon is back in the
> rail. OK, so it flips when something is actually going out. That's the right behaviour. "Names" --
> names of what? Columns? Nodes? My account names? The data page said up to ten values per column
> and the names of nodes it looks up. The top line should say that, or at least link to it.
>
> And "sends" -- present tense. Did it send already, or will it when I ask? "Did anything just
> leave" is a past-tense question. This line tells me the current setting, not what happened. My
> notebook shows every query I ran. Where's the record of what actually went out, when, to whom?
> For a hunt that's the part I'd need if anyone ever asked.

**Answer to the moderator's second question:**

> Nothing left, as far as the screen tells me: "This browser. Nothing sent." at the top and
> "Off. Nothing is sent." on the Assistant. I believe the screen as much as I believe any screen --
> which is: I'd believe it more if the hosting line on the data page were filled in.

## After the task

**Single Ease Question: 6 of 7.**

> Finding the answer was easy, both times. The only thing I had to dig for was hosting and
> telemetry, and those weren't there to find. That's not a usability problem, that's a missing
> answer.

**Would she use it instead of her current tool?**

> It doesn't replace anything I have -- my notebook and Splunk stay. For the data question
> specifically it's better than any graph tool I've tried: Maltego I had to take on faith, Graphistry
> needed a vendor review before I saw a thing. Here I could load a lab file without asking anyone.
> For real bank data I'd need self-hosting or at least a named host and "no telemetry" in writing.
> Get those two and I'd put the data page in the review ticket myself.

## Problems observed

1. **Hosting and telemetry unanswered on the data page** (severity 3). The two rows a vendor
   review asks first -- who hosts the page and whether it collects usage or crash data -- are open
   decisions. She would stop a real trial here.
2. **Self-hosting buried and undecided** (severity 3). For a bank, "run your own copy inside your
   network" is the path to approval; it is the last section and has no answer.
3. **"Assistant on: sends names and statistics" is vague and present-tense** (severity 2). "Names"
   does not say whose, and the line reports the setting, not what actually went out.
4. **No record of what left** (severity 2). Only the current state is shown; there is no list of
   what was sent, when and to whom, which her notebook habit expects.
5. **Assistant rail caption is tiny and wraps over three lines** (severity 1). Low-contrast at the
   end of a shift; she relies on the top-left line instead.
6. **"Export files..." as a prominent blue button** (severity 1). A tool she does not yet trust
   using "Export" reads as possibly cloud-bound until she recalls the data page.
7. **"Check it yourself" asks for the browser's Network tab** (severity 1). She will not do it and
   believes it may be locked on managed laptops; fine for a reviewer, not for her.

## What worked for her

- The lock line on the start screen and its link, before anything loads.
- A forwardable page with its own address, a date, a PDF, and a "what is sent, to whom, when" table.
- "Nothing sent" in the same place, in the same words, on the start screen, under the project name
  and in the file popover.
- The line changing when the Assistant is turned on, instead of staying reassuring.
- "What this page does not promise" -- honesty she can quote.
