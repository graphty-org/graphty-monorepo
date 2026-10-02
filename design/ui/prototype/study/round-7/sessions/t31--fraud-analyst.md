# Session: turn on the Assistant and learn what it sends -- fraud analyst (Sarah)

Task as given by the moderator: "You would like to ask questions about the network in plain
words. Turn that on, and learn what it would send outside your computer if you did. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter. If that is not your line of work, treat them as your own people or things."

Mode: not mandated (her own initiative, about five minutes of patience).
Start screen: shots/tasks/t31/01.png. Renders: tmp/round-7-sessions/t31--fraud-analyst/02.png to 13.png.
All commands were run from design/ui/prototype; P below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype.

## Think-aloud

**01 (start).** "Ask questions in plain words. There's an 'Assistant' on the left rail. And
'Local only' at the top, which I like seeing. Click Assistant."

**02** -- `timeout 120 node app-b/study.mjs --try P/tmp/round-7-sessions/t31--fraud-analyst/02.png task:t31 --click "Assistant"`
Panel: "Off. Nothing is sent. Turn on in Settings."
"Good. Off by default and it says nothing is sent. That's the right default for a bank. Click
the link."

**03** -- `... 03.png task:t31 --click "Assistant" --click "Turn on in Settings"`
Settings opens on Assistant: Provider (Anthropic), Model, Key (already full of dots), Remember
keys on this device (toggle looks on), Forget all keys, Voice input language.
"'The Assistant sends your question and a summary of the graph to this provider.' So it leaves
the building. What's in 'a summary of the graph'? Names? Amounts? It doesn't say. There's
already a key in the box -- whose? And where's the On switch? The only toggle is 'Remember keys',
and its text says 'Off, keys are forgotten when you close the tab' while the switch looks on.
Which is it?"

**04** -- `... 04.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Privacy"`
Privacy page, "Where your data goes ... A plain statement you can forward to whoever asks."
Row: "The Assistant -- Only when you ask it something, it sends your question with node names
and statistics to Anthropic. Never the file." Also "What this does not promise: once the
Assistant's provider ... has what was sent, its own terms apply, not graphty's."
"There it is. Node names. In my world node names are customer names and account numbers. That's
customer data leaving the bank. At least it says so in plain words, and 'a statement you can
forward' is something I'd actually send to IT security. But the Assistant page said 'a summary
of the graph' and this says 'node names and statistics'. Two different answers to the same
question. And what are 'statistics' -- transaction amounts? Also, why is a usage-data blurb
talking about 'the author of the application and his Claude Code sessions'? That's odd in a
privacy statement."

**05** -- `... 05.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Assistant" --key Escape --click "Assistant"`
Panel still says "Off. Nothing is sent."
"I went where 'Turn on' sent me and nothing there turned anything on."

**06** -- `... 06.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Anthropic"`
-> "nothing on screen is called 'Anthropic'".
**07** -- `... 07.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Provider"`
List: OpenAI, Anthropic, Google, In this browser.
"'In this browser' -- if that runs here, that's the only one I'd be allowed to use. No 'Off'
in the list though."

**08** -- `... 08.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Provider" --click "In this browser"`
-> "nothing on screen is called 'In this browser'"; list still open.
"It's right there and clicking it does nothing. Keyboard then."

**09** -- `... 09.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Provider" --key ArrowDown --key ArrowDown --key Enter`
Provider: In this browser. "Runs a model inside this browser. No key, and nothing leaves your
computer; the first use downloads the model." Model: "Choose after the download". Key row gone.
"That's the sentence I want. Downloading a model onto a locked-down laptop is its own fight
with IT, but it's not customer data leaving."

**10** -- `... 10.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Provider" --key ArrowDown --key ArrowDown --key Enter --key Escape --click "Assistant"`
Panel: still "Off. Nothing is sent."
"I picked a provider and it's still Off. So what turns it on?"

**11** -- `... 11.png task:t31 --click "Local only"`
Opens the same Privacy page.
"'Local only' is just a link to the statement, not a switch. Fine -- good to have it one click
from the top bar, actually."

**12** -- `... 12.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Turn on"`
-> "nothing on screen is called 'Turn on'".

**13** -- `... 13.png task:t31 --click "Assistant" --click "Turn on in Settings" --click "Model"`
Only option: "Listed from Anthropic".
"That's a placeholder, not a choice. I'm done."

## Outcome

- Learn what it sends: **yes.** Question plus node names and statistics, to the provider I
  pick; nothing if I pick "In this browser". The Privacy statement is the clearest thing in the
  app. Two pages word it differently, and "statistics" is never defined.
- Turn it on: **no, as far as I can tell.** The panel said "Off. Nothing is sent." every time I
  came back, including after I chose a provider. There is no control that says On.

Did I succeed? Half. I could brief IT on the data question. I couldn't tell you whether the
thing is on.

Single Ease Question: **3 / 7.**

Would I use this instead of my current tool? "Not for this. My current tool has no assistant,
and on real customer data I'd only ever be allowed the in-browser one, after IT signs off on the
download. The Privacy statement is something I'd forward to IT as-is, and that's a point in its
favor. But if 'Turn on in Settings' takes me to a page with no on switch and the panel keeps
saying Off, I'd assume it doesn't work and go back to Excel."

## Problems she hit

1. "Turn on in Settings" lands on a page with no on/off control; the panel stays "Off" after a
   provider is chosen. She never knows whether it is on. (Severity: high -- the task's main step.)
2. The Assistant page says "a summary of the graph"; the Privacy page says "node names and
   statistics". "Statistics" is never defined -- she wants to know if amounts go out.
   (Severity: medium -- this is exactly what a compliance reviewer asks.)
3. A key is already filled in for Anthropic before she has entered one. Whose key? Is it
   already sending? (Severity: medium.)
4. "Remember keys on this device": the switch looks on while its caption reads "Off, keys are
   forgotten when you close the tab". (Severity: low-medium.)
5. Provider list has no "Off" / "None" option, so there is no way here to turn it back off
   either. (Severity: medium.)
6. Clicking an option in the open Provider list did nothing; only the keyboard worked.
   (Severity: medium.)
7. Model list for Anthropic holds only "Listed from Anthropic". (Severity: low.)
8. The usage-data blurb mentions "the author of the application and his Claude Code sessions" --
   reads oddly in a privacy statement she might forward. (Severity: low.)

## What worked for her

- Off by default, saying "Nothing is sent" in the panel itself.
- "In this browser ... nothing leaves your computer" -- the one option she could use at a bank.
- The Privacy page's "Where your data goes" table, "a plain statement you can forward", and the
  "What this does not promise" paragraph.
- "Local only" in the top bar opens that statement in one click.
