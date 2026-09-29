# Session: "Is this OK to use with case data?" -- Marcus, criminal intelligence analyst

Participant: Marcus, criminal intelligence analyst at a state fusion center (simulated; persona in
`../../personas/intelligence-analyst.md`).

Screens used: the start screen (first run, the "browser is not saving" warning, recent projects,
a recipe waiting for data, a file being dragged in, and the state where an Assistant provider is
set) and the frame with a graph open (at rest, the file popover, the "not saved" menu).

Task as the moderator gave it: "Before you load anything: your organisation is strict about where
data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

## Part 1 -- before loading anything

**Start screen, first run.**

> OK. "Open a graph." Four sample pictures -- karate club, Les Miserables, proteins, bank
> transfers. Not mine, skip. What I'm looking for is the fine print about where my stuff goes,
> and... there it is, right under the title, with a little padlock. "Your files stay on this
> computer. graphty reads them in this browser and uploads nothing."

He reads the line twice, out loud the second time.

> That's the right sentence. That's the first thing I'd ask and it's the first thing on the page,
> I'll give them that. Most of these web tools, you've got to dig into a privacy policy written
> by a lawyer to find out they keep a copy "to improve the service".
>
> But here's my problem. It's a sentence. It's the website telling me about the website. I'm in a
> browser. This page came from somewhere. Whose server is it on? If I go to IT and say "the page
> says it uploads nothing", the first thing they ask is "who runs it, and is it CJIS-compliant,
> and where's the paperwork". There's nothing here I can hand them. No "about", no "runs on your
> own server", no link that says "how this works" for the IT guy.

He hovers the (i) on the Les Miserables tile by accident, gets the description, ignores it.

> "Connect to data source..." -- "sends only your query, to the source you name." Alright, so
> that one does send something. At least it says so. I'm not touching that. I don't have a
> database it'd connect to anyway, it'd be the RMS and nobody's letting a website at the RMS.

**The "not saving" warning (state 2).**

> "This browser is not saving projects." Hover... "site data is blocked or this is a private
> window. Download project file keeps your work." Huh. So normally it DOES save -- in the
> browser. That's news to me. The padlock line says files stay on this computer, and fine, but
> now I'm learning it keeps a copy of my case in Edge's storage somewhere. On an agency laptop.
> Who else logs into this laptop? Does IT wipe that? I'd want that said up top next to the
> padlock, not discovered from a warning.
>
> Honestly, blocked site data and a warning like this -- that's probably what I'd actually get
> on our machines. IT locks that down. So I'd be downloading the project file every time.
> That's fine, actually, that's how I work with .anb files anyway. It goes on the case share.

**Recent projects (state 3).**

> Recent projects. "Mule ring review, Transfers April, 3,093 accounts." OK so that's the saved
> stuff. Case names right there on the front page. If I've got this up on the projector in the
> briefing room and I open it, everybody sees the names of my last four cases. Not a huge deal
> for us, it's all the same task force, but somebody from outside the unit sits in, that's a
> problem. I'd want a way to hide that or clear it.

**A recipe waiting for data (state 4).**

> Somebody sent a "recipe". "Saved by Maren Holt." Don't know her. "Your data stays on this
> computer. This recipe names no server, so graphty contacts none." OK -- that's actually a good
> line. It tells me something specific: the file doesn't phone home. I'd want that same kind of
> specific sentence about the app itself. "This page contacts nobody" -- does it? Fonts, crash
> reports, usage stats? Every free tool has usage stats.

**Dragging a file in (state 5).**

> I drag my tolls in -- "Drop to open as a new project. The columns are checked before anything
> loads." Checked by who? Checked here, I assume, since it said it doesn't upload. I'd let it.
> I'd let it with a scrubbed copy first, not the real return.

**Moderator: so, is it OK to use?**

> It says the right thing, in the right place, and in plain English. That's more than the last
> three vendors did. But "is it OK to use" isn't my call, it's IT's and the ISO's, and there's
> nothing on this screen I could forward to them. If this is a website on somebody else's server,
> the answer from IT is no, full stop, no matter what the padlock says. If the department can run
> it on its own box and there's a one-page "what this sends and to whom", maybe. As it stands:
> I'd try it with sample data or a scrubbed CSV. Not a live case.

## Part 2 -- mid-session, with a graph open

He is shown the frame with Les Miserables open (standing in for his chart) and asked, a few
minutes in: "Did anything just leave your machine?"

> ...I don't know. That's the honest answer. The padlock line is gone. It was on the front page
> and now I'm in the chart and there's nothing that says "still offline" or "nothing sent".

He scans the screen.

> Top left, "miserables.json" in a little pill. Click it. "Opened from this computer. Read Sep
> 28, 10:42. Replace data." OK, so it tells me where the data CAME from. That's not what you
> asked. You asked if anything went OUT.
>
> Left rail. Graph, "Assistant" -- greyed out, with the sparkle thing. That's AI. Every tool's got
> the AI sparkle now. Why is it grey? Is it off? Is it loading? Is it greyed out because my IT
> blocked it, or because it's thinking about my data in the background? It doesn't say. I would
> hover it and hope for a tooltip. If it said "Off. Nothing is sent." I'd be happy. Grey with
> no words, I assume the worst, because that's my job.

The moderator shows him the start screen in the state where an Assistant provider has been set.

> "The Assistant sends what you ask it about to Anthropic." Well, there it is. At least they
> said it. That's a hard no for case data -- I wouldn't even ask it a question with a name in it.
> But I'd want that sentence in the chart, next to the Assistant, when I'm actually about to use
> it, not only on the start page I saw an hour ago. And I'd want IT to be able to turn it off for
> the whole office so I don't have to trust myself at five o'clock.
>
> Big blue "Export..." top right. That's going to be a download, I'd guess. If it said "Share"
> or "Publish" I'd never touch it. "Export" I'll click. I'd want to see it save to my disk and
> not to a link.
>
> The "Not saved" one -- "this browser's storage is full, Download project file". That one's fine.
> Tells me what happened and what to do. I'd read that to IT word for word if I had to.

**Moderator: so, did anything leave?**

> Going by what's on the screen, I'd say probably not, because the front page promised it
> doesn't upload and I didn't turn on the Assistant and I didn't connect a source. But "probably"
> is the word I'd get torn apart for on the stand. There's no light, no line, nothing in the
> chart itself that says "nothing has left this computer". I'd have to take the front page's
> word and remember it.

## Single Ease Question

> Four. Easy to find the first answer -- it's right there, first line. Hard to get the second
> one. I had to go looking and I still ended up guessing.

SEQ: 4 of 7.

## Would he use it instead of his current tool?

> Not instead of i2, no. Not today. The padlock line got me further than most -- I'd actually
> try it, which I don't say much. But IT has to sign off, and to do that I need something that
> says "runs on your own server, here's what it contacts, here's how to switch the AI off for
> everyone". And in the chart, I need it to keep telling me nothing's going out, especially next
> to that Assistant button. Give me that and I'd run a scrubbed phone dump through it to see if
> it beats my Excel pivot. That's the real test.

## What happened, in short

- He found the "files stay on this computer" line immediately and trusted its wording. It
  answered his first question before he asked it.
- He could not turn that line into an answer to "is it OK to use", because nothing on the start
  screen says who hosts the app, what the app itself contacts (fonts, crash reports, usage
  counts), or where to point IT for a data-handling statement.
- He learned only from a warning that projects are normally kept in the browser's storage, and
  wanted that said beside the padlock line.
- Recent case names are shown on the front page, which worries him for projected or shared
  screens.
- Once a graph was open he could not answer "did anything leave". The reassurance lives only on
  the start screen; the file popover says where data came from, not whether anything went out.
- The greyed Assistant item, with an AI sparkle and no words, read as a possible leak rather
  than as "off". The sentence naming where Assistant questions go appears only on the start
  screen, not next to the Assistant itself.
- The "Not saved" message and the recipe's "names no server, so graphty contacts none" were
  both clear and specific, and he held them up as the model for everything else.
