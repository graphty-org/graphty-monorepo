# Tier 6 participants: readers meeting the Assistant

Simulated participants: each session is a fresh agent playing one persona, with no memory of any
other session. Every persona uses graphty for the **first time** in every session. No real person is
portrayed; the persona files are composites built from public sources.

Paths: `S/` = `design/ui/studio/personas/`; `P/` = `design/ui/studio/personas/` (the same folder:
every file below is under `S/`, and the tool's briefing expects both names).

## Who takes part, and why these five

- **Grace** (nonprofit data person): has never used an AI tool. She takes the first-time setup, the
  approval and the taking back, where a newcomer to AI has most to lose.
- **Maren** (genomics researcher, `genomics-cytoscape-user.md`): the domain expert who doubts AI
  output, on yeast data she can judge. She takes the change, the question and the request the file
  cannot answer.
- **Sam** (keyboard only): every pointer step is refused. He takes the setup and the approval, the
  two places where focus has furthest to travel.
- **Dev** (student): uses AI tools every week and tends to take what they say. He is the check on
  the doubters, on the change and on the request the file cannot answer.
- **Ruth** (reporter): knows AI tools and has a rule about them; every claim must be checkable.
  She takes the question and the taking back.

**Not in this study:** the screen-reader persona, whose path the accessibility expert walks with the
tool's reading of each state. Twelve sessions cannot hold a sixth persona and two halves of each task.

## What each participant is told about their experience

Each section below is given to its participant word for word, after the persona file. It names no
place or control of the app. The money line is what keeps a session's model use bounded, and it is
true of the product: the reader's own key pays. The last line is about the study tool, which shows
one picture at a time where a person would simply watch.

### Grace -- nonprofit data person, no AI experience

Files: `S/nonprofit-operations-analyst.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You have never used an AI tool of any kind: no chatbot, nothing. You have
only heard people talk about them. Every message to an AI costs your organization money, so you stop
once the job is done, and you do not send more than about eight. An AI can take a while to answer: if
the picture shows it is still working, take a step of `--wait 10000` and look again."

### Maren -- genomics researcher who doubts AI output

Files: `S/genomics-cytoscape-user.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You know Cytoscape, but not this program. You have tried AI chatbots and
caught them inventing gene functions and citations, so you believe nothing from one about your
biology until you have seen where it came from. Every message to an AI costs your lab money, so you
stop once the job is done, and you do not send more than about eight. An AI can take a while to
answer: if the picture shows it is still working, take a step of `--wait 10000` and look again."

### Sam -- keyboard-only analyst

Files: `S/keyboard-only-sam.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You use only the keyboard: in this session the mouse does nothing. You use an
AI coding helper at work now and then, and you find it handy but check what it writes. Every message
to an AI costs your team money, so you stop once the job is done, and you do not send more than
about eight. An AI can take a while to answer: if the picture shows it is still working, take a step
of `--wait 10000` and look again."

### Dev -- student who uses AI every week

Files: `S/class-project-student.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You use AI chatbots every week for coursework, and they are usually good
enough that you take what they say and move on. Every message to an AI costs money on the key you
were lent, so you stop once the job is done, and you do not send more than about eight. An AI can
take a while to answer: if the picture shows it is still working, take a step of `--wait 10000` and
look again."

### Ruth -- reporter

Files: `S/data-journalist.md`.

"This is your first time using this program. You have never seen it before today, and nobody has
shown you how it works. You have tried AI chatbots at work, and your newsroom's rule is that nothing
from one goes in print until a person has confirmed it. The names in today's files are placeholders
for a training exercise, so you do not mind them leaving this computer. Every message to an AI costs
your newsroom money, so you stop once the job is done, and you do not send more than about eight. An
AI can take a while to answer: if the picture shows it is still working, take a step of
`--wait 10000` and look again."

## Where each session starts

Setups leave the file open, the Assistant connected to Google, its panel closed and the Graph place
showing, so the participant still walks to it. T90 is the setup, so it starts empty. Each of Sam's
sessions adds `--keys`.

| Task | A starts from               | B starts from                   | Why                                                       |
| ---- | --------------------------- | ------------------------------- | --------------------------------------------------------- |
| T90  | empty                       | empty                           | First-time setup is the task.                             |
| T91  | connected-volunteers.txt    | connected-yeast.txt             | The task is the change, not the setup.                    |
| T92  | connected-sources.txt       | connected-yeast.txt             | As T91.                                                   |
| T93  | connected-volunteers.txt    | connected-yeast.txt             | As T91.                                                   |
| T94  | connected-lesmis-poster.txt | connected-volunteers-thanks.txt | The colleague's finished look must be there at the start. |
| T95  | connected-volunteers.txt    | connected-yeast.txt             | As T91.                                                   |

## Who takes which task

12 sessions, one per task half. No persona takes both halves of one task.

| Task half                                       | Participant | Start                                   |
| ----------------------------------------------- | ----------- | --------------------------------------- |
| T90 A getting it going, volunteers              | Grace       | `empty`                                 |
| T90 B getting it going, sources                 | Sam         | `empty --keys`                          |
| T91 A a change, volunteers                      | Dev         | `setup:connected-volunteers.txt`        |
| T91 B a change, yeast genes                     | Maren       | `setup:connected-yeast.txt`             |
| T92 A a question, sources                       | Ruth        | `setup:connected-sources.txt`           |
| T92 B a question, yeast genes                   | Maren       | `setup:connected-yeast.txt`             |
| T93 A taking people out, volunteers             | Grace       | `setup:connected-volunteers.txt`        |
| T93 B taking genes out, yeast genes             | Sam         | `setup:connected-yeast.txt --keys`      |
| T94 A put it back, Les Miserables poster        | Ruth        | `setup:connected-lesmis-poster.txt`     |
| T94 B put it back, volunteers thank-you project | Grace       | `setup:connected-volunteers-thanks.txt` |
| T95 A what the file cannot say, volunteers      | Dev         | `setup:connected-volunteers.txt`        |
| T95 B what the file cannot say, yeast genes     | Maren       | `setup:connected-yeast.txt`             |

Sessions per persona: Grace 3, Maren 3, Sam 2, Dev 2, Ruth 2.

Run order: T90 first, then the rest; at most 4 sessions at once.

## Change log

- 2026-11-05: written before any session.
