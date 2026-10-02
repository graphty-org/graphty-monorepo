# Session: t31, Explorer Elena

Task as given: "You would like to ask questions about the network in plain words. Turn that on, and
learn what it would send outside your computer if you did. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not
your line of work, treat them as your own people or things."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t31--explorer-elena/.

## Steps

**01 (start screen, shots/tasks/t31/01.png).** "Ask questions in plain words... there's
'Assistant' on the left with a little robot on it. That sounds like it."

**02.** `timeout 120 node app-b/study.mjs --try .../02.png task:t31 --click "Assistant"`
Panel reads "Off. Nothing is sent. Turn on in Settings." "OK, that's clear. It's off, nothing goes
anywhere. Click the link."

**03.** `... --try .../03.png task:t31 --click "Assistant" --click "Turn on in Settings"`
Settings opens on Assistant: Provider (Anthropic), Model, Key (already dots), Remember keys toggle
(on), Forget all keys, Voice input language. "Anthropic, the Claude people. There's a key already
filled in -- I didn't put a key in. There's no big On switch. The only switch is 'Remember keys',
and that's already on. It says it sends 'your question and a summary of the graph'. Summary of
what, the names?"

**04.** `... --click "Assistant" --click "Turn on in Settings" --click "Privacy"`
Privacy page, "Where your data goes" table. "This is the part I was asked about. 'The Assistant:
only when you ask it something, it sends your question with node names and statistics to
Anthropic. Never the file.' Node names -- I guess that's the names on the dots, like Valjean.
Statistics, not sure which ones. And 'What this does not promise': once Anthropic has it, their
rules apply. OK, that's honest, I could paste that to our security person. But I still haven't
turned anything on."

**05.** `... --click "Assistant" --click "Turn on in Settings" --key Escape`
Settings closes and I'm on the Graph list, not the Assistant. "It bounced me back."

**06.** `... --click "Assistant" --click "Turn on in Settings" --key Escape --click "Assistant"`
Still "Off. Nothing is sent. Turn on in Settings." "So nothing I saw in there turned it on. Maybe
I have to change the Provider box -- maybe there's an 'Off' option in it."

**07.** `... --click "Anthropic"` -> "nothing on screen is called Anthropic". Retried with
`--click "Provider"`: the list opens with OpenAI, Anthropic, Google, In this browser. "No 'Off'.
'In this browser' -- does that mean it stays on my laptop? That'd be the safe one for work."

**08.** `... --click "Provider" --click "In this browser"` -> "nothing on screen is called In this
browser". "It didn't take my click. Fine, leave it on Anthropic."

**09.** `... --click "Model"` -> one choice, "Listed from Anthropic". "That's not a model name,
that's nothing. And the key -- I don't have a key, and somebody already put dots in there. I don't
know what more it wants."

**10.** `... --click "Assistant" --click "Turn on in Settings" --click "Close" --click "Assistant"`
Still "Off. Nothing is sent." "Yeah. OK." (Stopped here.)

## Outcome

- **Learned what would be sent:** yes, from the Privacy page -- my question plus the dot names and
  some statistics, to Anthropic, only when I ask, never the file. I only found that because I went
  looking in Privacy; the Assistant settings page just says "a summary of the graph".
- **Turned it on:** no. The link says "Turn on in Settings", but the Assistant settings page has no
  on switch I could find. A key was already there, the provider was already chosen, and the panel
  still said Off every time I went back. I don't know if I needed a key of my own, or if I missed
  a button.
- **Succeeded?** Half. I know what it sends. I could not turn it on.
- **Single Ease Question:** 2 of 7.
- **Would I use this instead of my current tool?** Not for this. In our analytics dashboard the AI
  thing is just a box you type in. Here I was sent to Settings to turn it on, and Settings didn't
  have an on. The privacy page is better than anything our tools have, I'd forward that table --
  but I'd ask IT to set it up for me, and I probably wouldn't bother.
