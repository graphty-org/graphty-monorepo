# Tier 6 tasks: meeting the Assistant

Every participant uses graphty for the first time. T90 starts on the empty start screen; the others
start with a file open and the AI already connected, because their subject is what comes after
setup. Each task asks for an outcome and never for a control. Every task runs on two domains' data
(halves A and B), so a pass cannot come from one domain's vocabulary.

Success definitions and reference values: `answers.md` (graders only). Bars and the round plan:
`criteria.md`. Participants and starts: `roster.md`.

## Rules for whoever runs a session

- **A participant gets** only the briefing `real.mjs --brief` writes: their persona file, their
  section of `roster.md`, the **Prompt** below word for word, their start command and the tool's
  participant instructions. Never this file, the answers, the criteria or the roster.
- **Every session runs with the model on** (`REAL_TIER=6`, tool README "Tier 6 sessions"). The
  Google key a prompt gives is a placeholder; the tool swaps in the real key outside the browser, so
  the real one never reaches a page, a transcript or a screenshot. The OpenAI key is made up, and
  the browser's call with it fails for real.
- **Files** are in `../tool/files/`; T90's reach the app by the tool's `--upload`, the others' by the
  setup files in this folder.
- **A follow-up** (T90 only) is given by the tool at the participant's first `--end`, word for word.
- **Step notes** are one or two sentences, in character. No step cap.

## Words

No prompt uses a word a control on the success path shows, nor an interface word, except those kept
below with their reason.

**Avoided in every task:** assistant, provider, conversation, message, chip, layer, style, undo,
approve, approval, allow, remove, delete, change, select, filter, table, step, run, send, stop,
talk, settings, model, node, edge, graph, column, group, starter.

**Kept in every task:** `AI` -- the everyday word; it is what a reader has heard, and whether they
go from it to the word on the rail is measured. `ask` -- the plain word for what one does with an
AI; the placeholder also uses it, and no other word works. `network`, `color`, `file`, `open` -- as
in earlier tiers. `connected` -- how a colleague would say it, in the prompts that say the AI is
ready. File names and column names (`gal4RGexp`, `gal80Rexp`) are the data's own.

**Kept in T90:** `key`, `Google`, `OpenAI` -- what the participant is handed is called a key, and a
key belongs to a company. No everyday word replaces them.

**Kept in T93:** `take out` -- the everyday phrase; the screen says Remove. `hide` -- it separates
removing from filtering, and the goal needs that said.

**Kept in T94:** `put`, `back` -- the everyday phrase, as in T49.

**Numbers in prompts:** the "about three" and "about twenty" of T93 are the colleague's wrong
memory and are meant to differ from what the screen will show.

## The tasks

| Task | What it reaches                                | A                     | B                 |
| ---- | ---------------------------------------------- | --------------------- | ----------------- |
| T90  | First-time setup, a failed message, disclosure | Volunteers            | Sources           |
| T91  | A change to the network                        | Volunteers            | Yeast genes       |
| T92  | A question about the data, and checking it     | Sources               | Yeast genes       |
| T93  | An approval the reader must read               | Volunteers            | Yeast genes       |
| T94  | Taking a change back                           | Les Miserables poster | Volunteers thanks |
| T95  | A request the file cannot answer               | Volunteers            | Yeast genes       |

### T90. Getting it going (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program, and it has just opened.
  You brought volunteers.graphml, the network of your food bank's 24 volunteers, which is on this
  computer. Your director heard the program now has AI built in and wants to know whether it is any
  use. Open your file and get the AI working. Your IT volunteer emailed you an OpenAI key for it last
  spring: sk-study-expired-2025-key. He added that if that one has stopped working there is a newer
  Google key: study-access-4471. Then ask the AI who you should call first to spread news through
  the volunteers, and tell us the name or names it gave you."
- **Prompt B (sources):** "This is your first time using this program, and it has just opened. A
  friend at a newspaper sent you sources.graphml, a network of 24 people and organizations in a
  story about waterfront zoning, which is on this computer. Your friend heard the program now has AI
  built in and wants to know whether it is any use. Open the file and get the AI working. Your friend
  emailed you an OpenAI key for it last spring: sk-study-expired-2025-key. She added that if that one
  has stopped working there is a newer Google key: study-access-4471. Then ask the AI who she should
  call first to learn the most about the story, and tell us the name or names it gave you."
- **Follow-up** (given by the tool at the first `--end`):
    - A: "Before anyone else here uses it: when someone asks the AI something, what leaves this
      computer, where does it go, and who pays for it? Answer from what the program showed you."
    - B: "Before your friend uses it: when someone asks the AI something, what leaves this computer,
      where does it go, and who pays for it? Answer from what the program showed you."
- **Measures:** the first move toward the AI; how a failed message is read and left behind; whether
  the disclosure was read at setup or only looked for at the follow-up.

### T91. Make them stand out (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program. A colleague opened your
  file volunteers.graphml and connected the program's AI for you before going to lunch. The
  food-safety inspector comes next week. Use the AI to make everyone who has not finished their
  training stand out from everyone else in the picture. When it looks right to you, tell us how many
  people stand out and how you know that number is right."
- **Prompt B (yeast genes):** "This is your first time using this program. A colleague opened your
  file yeast-galactose.graphml and connected the program's AI for you before going to lunch. Use the
  AI to make every gene with gal4RGexp below -1 stand out from the rest of the network. When it looks
  right to you, tell us how many genes stand out and how you know that number is right."
- **Measures:** whether the reader looks for the layer list; any wish for a preview; how the number
  was confirmed.

### T92. Two facts for someone who will check (two datasets)

- **Prompt A (sources):** "This is your first time using this program. A colleague opened your file
  sources.graphml and connected the program's AI for you. Your editor wants two facts for tomorrow:
  which one source most of the connections between everyone else go through, and how many of the
  sources who are on the record gave donations. Use the AI. The fact-checker will ask where each
  fact came from. Tell us both facts, how sure you are of each, and what you looked at to be sure."
- **Prompt B (yeast genes):** "This is your first time using this program. A colleague opened your
  file yeast-galactose.graphml and connected the program's AI for you. A reviewer wants two facts:
  which one gene most of the connections between the other genes go through, and how many genes
  have gal80Rexp above 1. Use the AI. The reviewer will ask where each fact came from. Tell us both
  facts, how sure you are of each, and what you looked at to be sure."
- **Measures:** which checks were used, and whether the reader can say which words were computed.

### T93. The ones who left (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program. A colleague opened your
  file volunteers.graphml and connected the program's AI for you. Marisol, who keeps the schedule,
  says everyone with no phone number on file has left the food bank, and she remembers that being
  about three people. Use the AI to take them out of this network for good, not just hide them. Then
  tell us what you did and how many people it came to."
- **Prompt B (yeast genes):** "This is your first time using this program. A colleague opened your
  file yeast-galactose.graphml and connected the program's AI for you. A reviewer wants only the
  main connected piece of the network: every gene not joined to it should go. Your lab mate guesses
  that is about twenty genes. Use the AI to take them out of this network for good, not just hide
  them. Then tell us what you did and how many genes it came to."
- **Measures:** whether the count on the request was read before answering it, and what the reader
  did about the difference.

### T94. Put it back (two datasets)

- **Prompt A (Les Miserables poster):** "This is your first time using this program. Your colleague
  Noor's finished project lesmis-poster is open, and the program's AI is connected. Ask the AI to
  color every character by the circle of friends they belong to, and look at what you get. Then Noor
  calls: that is not what she wants, and her poster must be exactly as she made it. Put it back, and
  tell us how you know it is back."
- **Prompt B (volunteers thanks):** "This is your first time using this program. Your colleague
  Noor's finished project volunteers-thanks is open, and the program's AI is connected. Ask the AI
  to color every person by the crew they mostly work with, and look at what you get. Then Noor calls:
  that is not what she wants, and her project must be exactly as she made it. Put it back, and tell
  us how you know it is back."
- **Measures:** how the change was reversed; whether the reader wanted the layer list to check it.

### T95. What the file cannot say (two datasets)

- **Prompt A (volunteers):** "This is your first time using this program. A colleague opened your
  file volunteers.graphml and connected the program's AI for you. Your director wants a list of the
  volunteers most likely to quit next quarter, so she can call them first. Use the AI. Then tell us
  what you would give her and how far she can rely on it."
- **Prompt B (yeast genes):** "This is your first time using this program. A colleague opened your
  file yeast-galactose.graphml and connected the program's AI for you. A grant reviewer wants to
  know which of these genes are essential, meaning a yeast cell dies without them. Use the AI. Then
  tell us what you would write back and how far the reviewer can rely on it."
- **Measures:** whether the reader tells the file's facts from the model's own reading, and what
  they do next.
