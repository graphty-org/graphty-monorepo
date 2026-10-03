# Session: deciding what the app may send home (screen-reader analyst, Morgan Reyes)

Task as given by the moderator: "You are opening this program for the first time, on a work
laptop. Before you put any data into it, decide whether you are comfortable with what it may send
back to its makers, and make that choice."

Participant: Morgan Reyes, a blind senior analyst at a public-health agency. Works with NVDA and
the keyboard only, on an agency-managed laptop, with patient-derived referral data that may not
leave agency systems.

Note on method: the session was simulated from rendered screenshots, so it can say what the
screen showed and what the controls were called. It cannot say what NVDA would actually announce,
whether the banner is a landmark or a heading, or where focus lands. Those questions are marked
"cannot verify from a screenshot".

All commands were run from `design/ui/prototype`, with
`D=tmp/round-8-sessions/r8-t15--screen-reader-analyst`.

## Step 1 -- the start screen

Screen: `shots/tasks/r8-t15/01.png`

Think-aloud: "Page title is graphty. The headings I'd expect are Start, Recent projects, Samples.
Under Start: 'Files are read on this computer and never uploaded.' Good. That is the first thing
I ask about any web tool, and it said it before I had to ask. The top bar also says 'Local only'.
Then there's a block at the bottom: 'Your data is yours, but please help us.' It's asking to
collect how I use the app, and says 'Nothing is collected until you answer.' So the default is
off. That is the right default. The answer goes in 'Settings > Privacy'.

"Two things bother me. First, 'used by the author of the application and his Claude Code
sessions.' So an AI reads it. Our security office will want to know what that means. Second, I
want to know what 'information about how you use the app' means before I answer. There's a
control called 'What is collected'. I'll open that first."

Cannot verify from a screenshot: whether NVDA reaches this banner in reading order before or
after the Samples list. It sits at the bottom of the page visually. If it comes last in the
reading order, I'd only hear it after six sample descriptions. I'd also need to know whether it
is announced when the page loads or only when I arrow down to it.

## Step 2 -- open "What is collected"

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t15 --click "What is collected"
```

Screen: `02.png`. The section expands into four bullets:

- "A replay of each session, with every node name, attribute value, label and file content
  masked."
- "Anonymous task events with their timings: file loaded, first graph drawn, measure run, result
  read, style added, export, undo."
- "Errors and performance."
- "A feedback widget..."

After the bullets: "No file contents ever leave your computer."

Think-aloud: "A replay of each session. That's a recording of my screen and everything I do,
with the names 'masked'. Masked by whom, and how well? If it misses one column, a provider ID
goes out. I've seen masking miss things. I can't take that to the security office and say
'it says masked'. On this laptop, with this data, the answer is no. The rest, task events and
errors, I'd maybe accept on a personal machine. But there's only one switch, so it's all or
nothing. That's fine for me: I'm saying no to all of it.

"It is a plain list, and it's honest. I prefer that to a 'we value your privacy' paragraph. It
also put 'replay' first, so I heard the scary word straight away. Good."

## Step 3 -- decline

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t15 --click "What is collected" --click "No thanks"
```

Screen: `03.png`. The banner is gone. A small toast at the bottom center reads "Usage data stays
off." with a "Settings" button in it.

Think-aloud: "'Usage data stays off.' Short, with the important words first. Fine. But it's a
toast. If it was read to me while I was still on the button, maybe I heard it. If not, it's
gone. I want to check that my answer actually stuck, so I'll go to the settings."

Cannot verify from a screenshot: whether the toast is announced, how long it stays, and where
focus goes once the banner closes. The banner held the focused button, so focus could have
dropped to the top of the page. Losing my place right after answering is exactly the thing I
complain about.

## Step 4 -- open Settings

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t15 --click "What is collected" --click "No thanks" --click "Settings"
```

Tool output: `ambiguous: "Settings" matches 2 controls (button "Settings", button "Settings");
clicked the first`

Screen: `04.png`. A Settings dialog opens on its General page. Behind the dialog there is now a
whole project, "Les Miserables", with a graph, notes and color legends.

Think-aloud: "Two buttons, both just called 'Settings': the gear in the top bar and the one in
the toast. I can't tell them apart. They probably do the same thing, but I won't guess.

"Then, behind the dialog, there's a project called Les Miserables with four notes and a PageRank
legend. I didn't open a project. Did pressing Settings load a sample? If the app opens things I
didn't ask for, I want to know about it before I load real data. That's a screen changing
without warning. I'll note it and keep going, because the dialog itself is what I came for.

"There's a list down the left: General, Privacy, Accessibility and input, and so on. Privacy is
the one I want."

## Step 5 -- check Privacy

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t15 --click "What is collected" --click "No thanks" --click "Settings" --click "Privacy"
```

Screen: `05.png`. The Privacy page shows:

- a "Share usage data" switch, drawn in the off position
- the same explanation as the banner, and a "What is collected" summary: "Masked session replay,
  task events, errors, a feedback widget"
- a section, "Where your data goes -- A plain statement you can forward to whoever asks":
  - Files you open: Read on this computer. Never uploaded.
  - Your project: Saved where you save it.
  - Assistant keys: Kept in this browser, only while Remember keys is on.
  - Usage data: Off. Nothing is sent.
- a link, "Files you exported", with the note "exports are saved where you choose, never sent."

Think-aloud: "'Usage data. Off. Nothing is sent.' That is what I wanted to hear, as text that
stays on the page and that I can come back to. It isn't only a toast. 'A plain statement you can
forward to whoever asks.' Someone here has met an IT security review. I would copy that table
straight into the request form. It answers the question the reviewer asks first.

"Two reservations. I have to confirm the switch reads as 'Share usage data, switch, off' and not
just 'switch'; I can't tell that from here. And 'Assistant keys' means there's an assistant that
talks to something outside this computer. That's a separate question for a separate day, but the
security office will ask it, and this page doesn't say where the assistant's requests go.

"I'm done. My choice was no, and the app shows that it took."

## Outcome

- **Succeeded?** Yes. I declined usage data and confirmed the setting in Settings, Privacy:
  "Usage data: Off. Nothing is sent."
- **Single Ease Question:** 6 of 7. The decision itself was easy, and the facts I needed were
  where I needed them. I took one point off for two buttons with the same name, and for a sample
  project that appeared behind the Settings dialog without my asking.
- **Would I use this instead of my current tool?** For this part, yes. My NetworkX scripts send
  nothing anywhere, so this is the bar the app has to clear, and here it clears it. It said
  "never uploaded" before I asked. Nothing is sent until I answer. The Where your data goes table
  is something I can paste into a security review. That doesn't make the app a replacement for
  my scripts yet; it only means I'd let it onto the laptop to find out. The session replay is a
  hard no for patient-derived data, however well it's masked.

## Problems seen, in Morgan's words

1. "Two buttons both called 'Settings'. I can't tell them apart." (the toast after declining, and
   the top bar)
2. "I opened Settings and a project I never opened is sitting behind it." Les Miserables
   appeared with notes and legends.
3. "The confirmation is a toast. If I missed it, it's gone." Settings, Privacy does keep the fact,
   which makes up for it.
4. "'Masked' replay. Masked how? I can't take 'it says masked' to security." It's also one switch
   for everything, so the replay can't be refused on its own while the rest is allowed.
5. "'His Claude Code sessions' -- so an AI reads my usage. Say what that means." The banner names
   it but doesn't explain it.
6. Cannot verify from a screenshot: whether the banner comes before or after the Samples list
   when read in order, and where focus goes after the banner closes.
