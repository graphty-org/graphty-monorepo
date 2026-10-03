# Session: the reporter with a contacts sheet, first-run privacy choice

Participant: the data journalist persona ("Ruth"), a reporter whose sheet holds unpublished names.
Task as given: "You are opening this program for the first time, on a work laptop. Before you put
any data into it, decide whether you are comfortable with what it may send back to its makers, and
make that choice."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t15--data-journalist/.

## Start screen (shots/tasks/r8-t15/01.png)

Think-aloud: "There's a box at the bottom: 'Your data is yours, but please help us.' It says they
will never see my data, but they'd like to know how I use the app, and that it'll be used by 'the
author of the application and his Claude Code sessions.' Claude Code is an AI thing, right? So an
AI will be looking at it. Before I press anything I want to see what they actually collect. There's
a 'What is collected' link, so I'll open that first. I also like the line on the left: 'Files are
read on this computer and never uploaded.' And 'Local only' is in the corner."

## Step 1: open "What is collected"

    timeout 120 node app-b/study.mjs --try .../r8-t15--data-journalist/01.png task:r8-t15 --click "What is collected"

Saw: the list opens inside the box. It says: a replay of each session, with every node name,
attribute value, label and file content masked; anonymous task events with timings; errors and
performance; a feedback widget. Then, in bold: "No file contents ever leave your computer."

Think-aloud: "A replay of each session. So it's a recording of what I do on screen. They say the
names are masked, and I'd have to take their word for that. And what about what I type? If I put a
source's name in the search box, or write a note on a tie, is that masked? The list names node
names, attribute values, labels and file contents. It doesn't say notes, and it doesn't say
search. For a story with unpublished names on a work laptop, I'm already leaning no. But first
I'll look at the settings page it mentions, in case it says more."

## Step 2: follow the "Settings > Privacy" link in the box

    timeout 120 node app-b/study.mjs --try .../r8-t15--data-journalist/02.png task:r8-t15 --click "Settings > Privacy"

Saw: a Settings window open at Privacy. The "Share usage data" switch is off. Below it is "Where
your data goes. A plain statement you can forward to whoever asks": files you open are read on
this computer and never uploaded; your project is saved where you save it; assistant keys are kept
in this browser only while "Remember keys" is on; usage data is "Off. Nothing is sent."; exports
are saved where you choose and never sent. BEHIND the window, a whole project called "Les
Miserables" is now open, with a graph, a long list on the left and numbers on the right.

Think-aloud: "Wait, why is there a project open? I clicked a link about privacy, not a sample. Did
it load something by itself? That's a bit unnerving when the whole question is what this thing
does without asking me. The page itself is good, though. 'Where your data goes,' something I could
paste into an email to our IT person, I like that a lot. 'Usage data: Off. Nothing is sent.' But
'Assistant keys'? There's an assistant? Does the assistant send my names somewhere? This page
doesn't tell me where the assistant sends things, only where the keys are kept."

## Step 3: close the settings window

    timeout 120 node app-b/study.mjs --try .../r8-t15--data-journalist/03.png task:r8-t15 --click "Settings > Privacy" --key Escape

Saw: the Les Miserables graph fills the screen. The question box from the start screen is gone.

Think-aloud: "So did I answer or not? The box asking me is gone, but I never pressed 'No thanks.'
The switch was off, but off because I chose it, or off because nobody has chosen yet? I don't
trust a default I didn't set myself. And now I'm in a sample I didn't open."

## Step 4: try to read the Assistant settings

    timeout 120 node app-b/study.mjs --try .../r8-t15--data-journalist/04.png task:r8-t15 --click "Settings > Privacy" --click "Assistant"

Tool output: `ambiguous: "Assistant" matches 2 controls (button "Assistant", tab "Assistant");
clicked the first` / `could not click "Assistant": ... Timeout`.

Saw: the same Privacy page; nothing changed.

Think-aloud: "I clicked 'Assistant' in the list on the left of the settings window and nothing
happened. Fine, whatever. I'm not using an assistant anyway. I'll just start over and answer the
question properly."

## Step 5: start again and press "No thanks"

    timeout 120 node app-b/study.mjs --try .../r8-t15--data-journalist/05.png task:r8-t15 --click "No thanks"

Saw: the start screen, with no sample open. A small dark note at the bottom: "Usage data stays
off." with a "Settings" button.

Think-aloud: "'Usage data stays off.' Good, that's what I wanted, in plain words, and I'm still on
the start screen with nothing loaded. 'Local only' is up in the corner. I'm done. I'd still want to
know what the assistant does before I ever touch it."

## After the task

- Succeeded? Yes. I said no to usage data and the app confirmed it. I'm fairly confident nothing
  goes out except through the assistant, which I won't use.
- Single Ease Question (1 = very difficult, 7 = very easy): 5. Saying no was one click. Taking a
  detour to read before deciding, I ended up inside a project I never opened, with the question
  box gone and no sign of whether I had answered.
- Would I use this instead of my current tool? Maybe, for this reason: it is the first tool I've
  tried that hands me a "where your data goes" statement I can forward to my editor and IT. But
  the session-replay wording worries me (are notes and search masked?), and so does an assistant
  whose data path I couldn't find. Unpublished names are the whole job. I would want those two
  answered in writing before I loaded the real sheet.

## Observations for the designers (participant's own words, summarized)

1. Following "Settings > Privacy" from the consent box opened a sample project (Les Miserables)
   behind the Settings window, and closing Settings left me in that project with the consent box
   gone. For a privacy-sensitive first run this reads as "the app did something on its own."
2. After that detour there was no sign whether my consent was recorded. The switch was off, but
   nothing said "you have not answered yet" or "you chose no."
3. "What is collected" lists what the replay masks (node names, attribute values, labels, file
   contents) but not notes, search text or anything typed. A reporter assumes anything not listed
   is not masked.
4. "His Claude Code sessions" names an AI tool as a recipient without saying what it is. This
   alarms a reader who is not a developer.
5. The Privacy page lists where assistant keys are kept, but not where assistant requests (and the
   names in them) go. "Where your data goes" should cover that, since it is the only path out.
6. Strong points: "Files are read on this computer and never uploaded" on the start screen; the
   "Local only" chip; the forwardable "Where your data goes" statement; the plain "Usage data stays
   off." confirmation.
