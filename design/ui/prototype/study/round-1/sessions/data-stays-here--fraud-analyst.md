# Session: does my data stay here? -- Sarah, fraud investigator

Participant: Sarah, level-2 financial crime investigator at a mid-size bank (composite persona,
study/personas/fraud-analyst.md). Mode: first impression, not mandated by her manager.

Task as given by the moderator: "Before you load anything: your organisation is strict about
where data goes. Is this OK to use? Later, mid-session: did anything just leave your machine?"

Screens used: the start screen (first run, then the version with recent projects, then the
version where the browser is not saving) and the main window with a graph open (at rest, the
file popover, and the "Not saved" menu). Renders read as PNGs; the HTML read only to learn what
a click would do.

## Part 1 -- before loading anything

**Looks at the start screen.** "Okay. 'Open a graph.' Four pictures -- karate club, Les
Miserables, proteins, bank transfers. So the bank one is the one they think I care about. Three
thousand accounts. Fine."

**Finds the lock line.** "Right under the title: 'Your files stay on this computer. graphty reads
them in this browser and uploads nothing.' Good -- that's the first thing I'd ask and it's the
first thing it says. I'll give them that. Most vendors bury that in a PDF from their security
team."

**Then the doubt.** "But I'm looking at this in a browser. There's a web address up there
somewhere. So it's a website that says it doesn't upload. Who's saying that -- the website? I
can't take 'uploads nothing' to IT security. They'll ask me: is it hosted by us, is it hosted by
them, does it phone home, is there analytics, does it load anything from the internet. That
sentence answers one of those. I'd want a link right there -- 'how do we know' or 'for your IT
team' -- something I can forward. There's no link. The lock icon isn't clickable either, as far
as I can tell."

**Reads "Connect to data source... sends only your query, to the source you name."** "Okay, so
that one does send something. 'Only your query.' What's my query? If I type an account number to
search in our database, that account number is my query, and that IS customer data. It goes to
'the source you name' -- fine, if the source is our own server. But I wouldn't touch that button
without asking. Honestly I like that it says it at all. Most tools don't."

**Hovers the (i) on Bank transfers.** "It's a sample. Is this real data? Fake, I assume --
3,000 accounts, grey blob. I wouldn't open it for this question anyway."

**Notices "Reads CSV, JSON, GraphML ... Neo4j exports."** "CSV. Good. That's what I've got."

**Looks at the recent-projects version.** "'Mule ring review, Transfers April, 3,093 accounts,
today 09:14.' Hang on. Where is that kept? If it's in my list, it's saved somewhere. On this
computer? In the browser? If the browser syncs to my Google account at home -- no, we don't have
that, corporate Chrome -- but the question stands. 'Files stay on this computer' -- does the
PROJECT stay on this computer? Does it keep a copy of the data, or just a pointer to my file?
It doesn't say. I'd assume it keeps a copy, and then I've got customer data sitting in a
browser cache that nobody at the bank knows about. That's a records-retention problem, not just
a privacy one."

**Looks at the "This browser is not saving projects" state.** "Interesting -- so it does save in
the browser normally. That's the answer to my last question, sort of, only I found it from a
warning. 'Download project file (File menu) keeps your work.' Fine. A file I can put on the case
drive is what I'd actually want. That's the good news in all this."

**Moderator: so, is it OK to use?** "My answer: it's OK for me to *want* to use it. It's not OK
for me to *use* it on real customer data until IT says so, and this screen gives me one
sentence to show them. I'd believe the sentence more than I'd believe most vendors, because it's
specific -- 'in this browser', 'uploads nothing' -- and because the one thing that does send
data, the connect button, owns up to it. But I'd put the samples in first and nothing of ours."

## Part 2 -- mid-session, a graph is open

**Looks at the main window.** "Les Miserables open. Coloured groups, legend bottom left, numbers
on the right -- 77, 254. Okay."

**Moderator: did anything just leave your machine?** "...I don't know. Nothing on this screen
tells me. The lock line was on the start page; it's gone now. I'm looking for the same lock, or
'offline', or 'local' -- anywhere. Top: 'Les Miserables', the file name chip. Right: Export,
statistics. Nothing."

**Spots "Assistant" in the left rail, greyed, with a sparkle icon.** "Now that worries me more
than anything. Sparkles means AI. AI means it goes to somebody's model. It's greyed out -- does
that mean it's off, or it's loading, or I'm not allowed? If a colleague switched it on, would I
know? If it's on, what does it read -- the whole chart? I'd want to see, right there, 'off --
nothing is sent'. Greyed out isn't a sentence." (From the HTML: it is off until someone sets a
provider in Preferences, and then the start screen would add a line naming where questions go.
Sarah does not see this -- she is on the main window, and that line is on the start screen.)

**Clicks the file chip "miserables.json".** "'Opened from this computer. Read Sep 28, 10:42.'
Okay, that's something -- it tells me where it came from. It doesn't tell me where it's gone. It
could say 'Not sent anywhere' right under that and I'd be happy."

**Opens the title menu (the "Not saved" state).** "'Not saved: this browser's storage is full.
Download project file. Project info...' So it's writing to the browser in the background -- the
autosave. Local, I think? I'd assume. 'Project info' might tell me. Can't tell from here."

**Looks at the big blue Export... button.** "Export -- to where? A file on my disk, I hope,
not a 'share link'. If it's a download, fine. If there's anything in there that says link,
publish, share, cloud -- I'm closing it."

**Moderator: so, did anything leave?** "My honest answer is: probably not, because the first
screen said so and I haven't clicked the connect thing. But I'm answering from memory of one
sentence, not from anything on the screen in front of me. If my manager walked past and asked,
I'd have to say 'I think not'. 'I think not' is not what you say to an auditor."

## After the task

**Single Ease Question: 4 of 7.** "The first half was easy -- it told me straight away. The
second half I couldn't answer at all without guessing."

**Would you use this instead of your current tool?** "Instead of Excel, no -- nothing replaces
the pivot for most of my cases. Instead of i2 for the big ones, maybe, and the local-only part
is the best reason, because then it might get through IT without a six-month vendor review.
But that only works if I can hand IT something more than a line of grey text on a start page,
and if the tool shows me, while I'm working, that nothing has gone anywhere -- especially with
an AI button sitting in the corner."

## Problems observed

1. Main window: no standing indicator that the session is local; the privacy promise lives only
   on the start screen, so mid-session the question "did anything leave?" cannot be answered
   from the screen. (Severity 3)
2. Main window: the greyed-out Assistant with a sparkle icon reads as "AI that may be sending
   data"; greyed does not say off, why, or what it would send. (Severity 3)
3. Start screen: "uploads nothing" is an unsupported claim with no link or detail for an IT or
   security reviewer (hosting, analytics, calls home, external resources). (Severity 3)
4. Start screen: recent projects show case names and account counts but nothing says where the
   project and its data are kept (browser storage? a copy of the data?); she learned it only
   from the "not saving" warning. (Severity 2)
5. Start screen: "sends only your query" -- she reads the query as containing customer
   identifiers, so "only" does not reassure; unclear what counts as the query. (Severity 2)
6. Main window: the file popover says where the file came from but not that it has not been
   sent anywhere; the natural place for that answer. (Severity 2)
7. Main window: Export... does not signal that it is a local download rather than a share link.
   (Severity 1)

## What worked

- The privacy line is the first sentence under the title and names the mechanism ("in this
  browser"), not a vague "secure".
- The one thing that does send data (connect to a data source) says so on the start screen.
- "Download project file" offers a file she could keep on the case drive.
