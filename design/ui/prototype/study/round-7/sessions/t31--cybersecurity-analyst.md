# Session: t31, cybersecurity analyst (Priya, SOC threat hunter)

Task as given: "You would like to ask questions about the network in plain words. Turn that on,
and learn what it would send outside your computer if you did. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter. If that is
not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t31/01.png. Renders: tmp/round-7-sessions/t31--cybersecurity-analyst/.
All commands run from design/ui/prototype.

## Steps, thinking aloud

0. (start screen) "Ask in plain words" means the chat thing. There is an "Assistant" icon on the
   left. I normally do not click anything called Assistant -- that is how things leak. But first,
   the top bar says "Local only". That is my "does it phone home" question. Click that first.

1. `timeout 120 node app-b/study.mjs --try .../01.png task:t31 --click "Local only"`
   Settings opens on Privacy. Good -- this is the page I wanted before loading anything. "Where
   your data goes ... a plain statement you can forward to whoever asks." I like that line; that
   is literally what my third-party risk reviewer will ask for. Files: read on this computer,
   never uploaded. Assistant: "Only when you ask it something, it sends your question with node
   names and statistics to Anthropic. Never the file." Usage data: off.
   Problem: "node names". In my world node names ARE the sensitive part -- hostnames and account
   names. And "statistics" -- which ones? Degree? Everything in the Data panel? It does not say.
   The "What this does not promise" paragraph is honest, I'll give it that.

2. `... 02.png task:t31 --click "Local only" --click "Assistant"`
   Assistant settings. Provider: Anthropic. Model: "Listed from Anthropic". Key: already full of
   dots. I never pasted a key -- whose key is that? "Remember keys on this device" is ON by
   default; I would want that off. No on/off switch for the Assistant itself.
   Also: this page says it sends "a summary of the graph". The Privacy page said "node names and
   statistics". Two descriptions of the same payload. Which one is true?

3. `... 03.png ... --click "Anthropic"` -> "nothing on screen is called Anthropic".
   `... 03.png ... --click "Provider"` -> list opens: OpenAI, Anthropic, Google, In this browser.
   "In this browser" is the only option I could ever use at the bank. Pick it.

4. `... 04.png ... --click "Provider" --click "In this browser"` -> nothing on screen is called
   "In this browser".
   `... 04.png ... --click "Assistant" --click "In this browser"` -> same.
   It is listed but I cannot pick it. And nothing tells me what "In this browser" would send
   (presumably nothing) -- I would want that said next to it.

5. `... 05.png task:t31 --click "Assistant"` (left rail)
   Panel: "Off. Nothing is sent. Turn on in Settings." Clear, and off by default -- correct.

6. `... 06.png ... --click "Assistant" --click "Turn on in Settings"`
   Same Assistant settings page as before. The link says "turn on" and lands me on a page with no
   "on".

7. `... 07.png ... --key Escape` -> back to the Graph list, not the Assistant panel.
8. `... 08.png ... --key Escape --click "Assistant"` -> still "Off. Nothing is sent."
   So the key that is already there did not turn it on, and visiting the page did not either.

9. `... 09.png ... --click "General"` -> name, theme, number format. No Assistant switch.

10. `... 10.png ... --click "Model"` -> one option, "Listed from Anthropic". Placeholder. Dead end.

Stopped here. That is my 90 seconds on one control, several times over.

## Did I succeed?

Half. I learned what it says it would send: my question, node names and "statistics" (or "a
summary of the graph" -- the two pages disagree), to the provider, never the file. I could NOT
turn it on. The link that says "Turn on in Settings" goes to a page with no switch, and the
in-browser provider -- the one choice I could defend -- would not select.

Single Ease Question: 2 / 7.

## Would I use this instead of my current tool?

For the plain-words questions: no. Not at the bank. Node names are hostnames and accounts, and
sending them to a cloud model is a data-handling incident, not a feature. If "In this browser"
really works and the page says in one line "nothing leaves this machine", I would try it on lab
data. What I would actually take away from this session is the Privacy page: "Where your data
goes, a plain statement you can forward" is the best thing I have seen in a graph tool for getting
past a vendor review. Make the two descriptions of the payload agree, list exactly which
statistics go out, put an actual on/off where the link sends me, and do not pre-fill a key or
default "remember keys" to on.
