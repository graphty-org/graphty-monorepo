# Session: label every character (Les Miserables sample) -- Nadia, level-1 alert reviewer

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t10--alert-reviewer/. Prefix for every command below:
`timeout 120 node app-b/study.mjs --try <render> task:r8-t10`

## Step by step (thinking aloud)

**01 (start screen, shots/tasks/r8-t10/01.png).** "Usage data box. No thanks, I'm not reading
that. Samples on the right -- Les Miserables, 77 characters. That's the one."

**02** `--click "No thanks" --click "Les Miserables"`
Graph opens. "OK, orange dots, about a dozen names: Valjean, Javert, Fantine, Myriel... That's
the 'only a few' part. Left side is a long list. There's a row 'Labels show... 1 node'. Labels --
that's the word I want. One node, so that's why only a few? Actually more than one name is
showing, so I don't know what the 1 means."

**03** `... --click "Labels show"`
Row highlights, a dark message at the bottom: "Labels shown anyway (this file): Valjean. Opens in
the inspector (not available yet)." "So that row is just Valjean. And 'not available yet'. Dead
end. Why are the other ten names showing then? Don't know. Moving on."

**04** `... --click "Everything"`
"Bottom of the list says 'Everything'. I want every character, so..." Right panel now says
"Everything, Built-in row, Paints 77 nodes, 254 edges". "77 -- that's all of them. And there's a
'Label' with a plus. Good."

**05** `... --click "Everything" --click "Label"`
Nothing changed. "I clicked Label. Nothing. Maybe it's the little plus."

**06** `... --click "Add label"` -> "nothing on screen is called Add label"
**07** `... --hover "Label"` -> no tooltip
**08** `... --click "+"` -> "nothing on screen is called +"
"I can't figure out what this plus is called."

**10** `... --click "Everything" --click "Tooltip"` -> nothing changed. "Same thing, clicking the
words does nothing."

**09, 11** hovering guesses: "Labels" (tooltip "Labels shown anyway (this file) Double-click to
rename"), "Show labels", "Label all", "More", "Add" (tooltip "Add to Shape" -- so the pluses are
"Add to ..."), "Options", "Menu", "Add row", "Style", "Settings".
"OK, resting on a plus says 'Add to Shape'. So the one by Label is 'Add to Label'. 'Add to'
is a strange way to say it, but fine."

**12** `... --click "Everything" --click "Add to Label"`
A small menu: "Label line" and "Show labels". "Show labels. Obviously."

**13** `... --click "Show labels"`
A "Show labels" row with an empty checkbox appears. Drawing unchanged. "It added a checkbox and
didn't tick it? So I have to tick it too."

**14** `... --click "Show labels" --click "Show labels"`
Checkbox ticked. Drawing: the same dozen names. "Ticked. Nothing happened. Same names as before.
So 'Show labels' doesn't show labels? Or it shows them but there are no names to show? I don't
know what this did. I'd be annoyed here."

**15** `... --click "Everything" --click "Add to Label" --click "Label line"`
A row "Above: Pick an attribute" and a dark list: Typed text; In use: label (Name, Label), group;
other attributes: betweenness, degree; Results: Louvain, PageRank; Notes: Latest note, Note count.
"OK, so it wants to know WHAT to write. 'label' says Name next to it. That's the name."

**16** `... --click "Label line" --click "label"`
Names on every dot. "There. Every character has a name now -- Zephine, Dahlia, MotherPlutarch,
Child1, Child2. The middle is a pile of overlapping words; I can't read anything around Valjean
and Javert. But they're there."

## Outcome

- Succeeded? Yes, I think so. Every dot has a name, but the middle cluster is unreadable
  because the names overlap.
- Single Ease Question: 3 of 7.
- Would I use this instead of my current tool? No. I don't have a graph tool and this
  isn't my job; I clear alerts in the case system. As for this task: it took me about fifteen
  tries to find a plus button, and "Show labels" showed nothing, so I can't tell what that
  checkbox did. If I had to explain this to QA, I couldn't say what "Show labels" did.

## Problems seen (in her words, with severity 1 low - 4 blocking)

- (3) "Show labels" adds an unticked checkbox, and ticking it does not change the drawing.
  The obvious option does nothing visible. The option that worked was called "Label line".
- (3) The plus by "Label" has no visible name, and clicking the word "Label" does nothing. I found
  it only by guessing that hovering a plus shows "Add to ...".
- (2) The "Labels show... 1 node" row looks like the place for labels, but it says "not
  available yet" and only lists Valjean, while about a dozen names are on the screen.
- (2) I had to guess that the "Everything" row (at the very bottom, under report folders) is where
  "all characters" lives.
- (2) After labeling everything, the center is a pile of overlapping words.
- (1) "Label line", "Above", "Pick an attribute": I don't know what "line" or "attribute" means
  here. The "Name, Label" hint next to "label" is what told me to pick it.
