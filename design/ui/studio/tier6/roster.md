# Tier 6 participants: readers meeting the Assistant

Simulated participants: each session is a fresh agent playing one persona, with no memory of any
other session. Most sessions are a **first** meeting with graphty. Three are **returning** readers
who know the program and have never used its AI (T91 A, T94 A, T94 B): their history is below, and
their start reflects it. No real person is portrayed; the persona files are composites built from
public sources.

Paths: `S/` = `design/ui/studio/personas/`; `P/` = `design/ui/studio/personas/` (the same folder:
every file below is under `S/`, and the tool's briefing expects both names).

## Who takes part, and why these five

- **Grace** (nonprofit data person): has never used an AI tool. She takes the first-time setup,
  where a newcomer to AI has most to lose, and the request the file cannot answer, where nothing in
  her history tells her to doubt. As Grace-returning she takes back a change on her sector's own data.
- **Maren** (genomics researcher, `genomics-cytoscape-user.md`): the domain expert who doubts AI
  output, on yeast data she can judge. She takes the change and the question, where the point is
  whether a reader who wants to check can.
- **Sam** (keyboard only): every pointer step is refused. He takes the setup and the approval, the
  two places where focus has furthest to travel.
- **Dev** (student): uses AI tools every week and tends to take what they say. He is the check on
  the doubters: the question with a selection left behind, the approval, and the request the file
  cannot answer.
- **Ruth** (reporter): knows AI tools and has a rule about them; every claim must be checkable. She
  has used this program for weeks, so she is the one who can miss her usual list. She takes the
  change and the taking back, both as a returning reader.

**Not in this study:** the screen-reader persona, whose path the accessibility expert walks with the
tool's reading of each state. Twelve sessions cannot hold a sixth persona and two halves of each task.

## What each participant is told about their experience

Each section below is given to its participant word for word, after the persona file. A first-time
section names no place or control of the app; a returning history names only places that persona
has used, and ends "Anything you have not done before is as new to you as it was the first day." The
money line is what keeps a session's model use bounded, and it is
true of the product: the reader's own key pays. The last line is about the study tool, which shows
one picture at a time where a person would simply watch.

### Grace -- nonprofit data person, no AI experience

Files: `S/nonprofit-operations-analyst.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You have never used an AI tool of any kind: no chatbot, nothing. You have
only heard people mention them. Everything you ask an AI costs your organization money, so you leave it once the job is done, and you ask it no
more than about eight things. An AI can take a while to answer: if
the picture shows it is still working, take a step of `--wait 10000` and look again."

### Maren -- genomics researcher who doubts AI output

Files: `S/genomics-cytoscape-user.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You know Cytoscape, but not this program. You have tried AI chatbots and
caught them inventing gene functions and citations, so you believe nothing from one about your
biology until you have seen where it came from. Everything you ask an AI costs your lab money, so you leave it once the job is done, and you ask it no
more than about eight things. An AI can take a while to
answer: if the picture shows it is still working, take a step of `--wait 10000` and look again."

### Sam -- keyboard-only analyst

Files: `S/keyboard-only-sam.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You use only the keyboard: in this session the mouse does nothing. You use an
AI coding helper at work now and then, and you find it handy but check what it writes. Everything you ask an AI costs your team money, so you leave it once the job is done, and you ask it no
more than about eight things. An AI can take a while to answer: if the picture shows it is still working, take a step
of `--wait 10000` and look again."

### Dev -- student who uses AI every week

Files: `S/class-project-student.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You use AI chatbots every week for coursework, and they are usually good
enough that you take what they say and move on. Everything you ask an AI costs money on the key you were lent, so you leave it once the job is done, and
you ask it no more than about eight things. An AI can
take a while to answer: if the picture shows it is still working, take a step of `--wait 10000` and
look again."

### Ruth -- reporter, weeks into using the program

Files: `S/data-journalist.md`, then `S/returning-data-journalist.md`.

"Earlier sessions: three, over the last month. You opened your contacts sheet from the start screen,
typed a name into the find box to jump to a person, and read on the right-hand side who they are
tied to. You had the program rank who matters most, and you colored and sized the dots by that
ranking yourself, from the panel on the right; the list on the left under Graph shows what you
added. You saved the project and reopened it from Recent projects. You have tried AI chatbots at
work, and your newsroom's rule is that nothing from one goes in print until a person has confirmed
it. You have never used this program's AI. The names in today's files are placeholders for a
training exercise, so you do not mind them leaving this computer. Everything you ask an AI costs your
newsroom money, so you leave it once the job is done, and you ask it no more than about eight things.
An AI can take a while to answer: if the picture shows it is still working, take a step of
`--wait 10000` and look again. Anything you have not done before is as new to you as it was the
first day."

### Grace-returning -- nonprofit data person, next quarter

Files: `S/nonprofit-operations-analyst.md`, then `S/returning-nonprofit-analyst.md`.

"Earlier sessions: three, from July to September, the last about six weeks ago. You opened a list a
volunteer had sent from the start screen and had the program rank who matters most; you made the
important people's dots bigger from the panel on the right and put everyone's name on, and the list
on the left under Graph shows what you added. You saved the project and opened it again from Recent
projects the next morning; everything was there. You have never used an AI tool of any kind: no
chatbot, nothing, and that includes this program's AI. Everything you ask an AI costs your
organization money, so you leave it once the job is done, and you ask it no more than about eight
things. An AI can take a while to answer: if the picture shows it is still working, take a step of
`--wait 10000` and look again. Anything you have not done before is as new to you as it was the first
day."

## Where each session starts

Setups leave the file open, the Assistant connected to Google, its panel closed and the Graph place
showing, so the participant still walks to it. T90 is about starting fresh, so it starts empty. A
returning reader starts from work that reflects their history: T91 A from the file ranked, colored
and sized by the ranking, as Ruth left it; T94 from a saved project with its own look. Each of Sam's
sessions adds `--keys`.

| Task | A starts from                  | B starts from                   | Why                                                       |
| ---- | ------------------------------ | ------------------------------- | --------------------------------------------------------- |
| T90  | empty                          | empty                           | First-time setup is the task.                             |
| T91  | connected-volunteers-sized.txt | connected-yeast.txt             | The task is the change, on top of A's saved work.         |
| T92  | connected-sources-open.txt     | connected-yeast.txt             | As T91; A leaves a selection the reader did not make.     |
| T93  | connected-volunteers.txt       | connected-yeast.txt             | As T91.                                                   |
| T94  | connected-lesmis-poster.txt    | connected-volunteers-thanks.txt | The colleague's finished look must be there at the start. |
| T95  | connected-volunteers.txt       | connected-yeast.txt             | As T91.                                                   |

## Who takes which task

12 sessions, one per task half. No persona takes both halves of one task.

| Task half                                       | Participant     | Start                                   |
| ----------------------------------------------- | --------------- | --------------------------------------- |
| T90 A getting it going, volunteers              | Grace           | `empty`                                 |
| T90 B getting it going, sources                 | Sam             | `empty --keys`                          |
| T91 A a change, volunteers                      | Ruth            | `setup:connected-volunteers-sized.txt`  |
| T91 B a change, yeast genes                     | Maren           | `setup:connected-yeast.txt`             |
| T92 A a question, sources                       | Dev             | `setup:connected-sources-open.txt`      |
| T92 B a question, yeast genes                   | Maren           | `setup:connected-yeast.txt`             |
| T93 A taking people out, volunteers             | Dev             | `setup:connected-volunteers.txt`        |
| T93 B taking genes out, yeast genes             | Sam             | `setup:connected-yeast.txt --keys`      |
| T94 A put it back, Les Miserables poster        | Ruth            | `setup:connected-lesmis-poster.txt`     |
| T94 B put it back, volunteers thank-you project | Grace-returning | `setup:connected-volunteers-thanks.txt` |
| T95 A what the file cannot say, volunteers      | Grace           | `setup:connected-volunteers.txt`        |
| T95 B what the file cannot say, yeast genes     | Dev             | `setup:connected-yeast.txt`             |

Sessions per persona: Grace 3 (one returning), Dev 3, Maren 2, Sam 2, Ruth 2.

Run order: T90 first, then the rest; at most 4 sessions at once.

## Change log

- 2026-11-05: written before any session.
- 2026-11-05: T91 A, T94 A and T94 B became returning readers, with histories and a saved start,
  because someone who never met the layer list cannot miss it. T92 A, T93 A and T95 went to the
  readers with no standing doubt (Dev, Grace), because three of the four sessions behind bar 5 were
  briefed to doubt. Avoided words came out of the briefing lines.
