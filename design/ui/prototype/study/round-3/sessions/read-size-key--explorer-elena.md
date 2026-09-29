# Reading the size key -- Explorer Elena

**Participant:** Explorer Elena, a product manager with no graph training (simulated; persona in
`study/personas/explorer-elena.md`).
**Task as given by the moderator:** "You added sizing to the drawing. Say what a bigger dot means."
**Screens:** the main window at rest with size added (`screens/frame-at-rest.html#s9`, render
`shots/screens__frame-at-rest-s9.png`), then the styles list on the protein study
(`screens/styles-list.html`, render `shots/screens__styles-list-meanings.png`).
**Outcome:** success, quickly, on the first screen. A wording mismatch on the second screen shook
her confidence a little.
**Single Ease Question:** 6 of 7.

## Transcript (think-aloud, in her words)

**On the at-rest window, before the sizing.** "OK, Les Miserables. Coloured dots, grey lines, a
little box bottom left that says Group color, 2, 8, 4, 1... I have no idea what group 2 is, but
fine, that's not what you asked me."

**Size added.** "Right, now some dots are bigger. Valjean is the big yellow one in the middle,
Marius and Gavroche are bigger too. My eye goes to Valjean first, which -- yes, he's the main
character, so that already feels right before I've read anything."

"Where would it tell me what size means... Left side, under Styles, there's a new line on top:
'Size: number of connections', with a little small-dot big-dot icon. And the box bottom left grew
a second part, same title, 'Size: number of connections', three grey circles with 1, 10 and 36
under them."

"So: a bigger dot means that character is connected to more other characters. Valjean is about
36, the tiny ones out on the edges are 1. That was easy. I didn't have to open anything."

**Poking at it.** "What's a 'connection' here though? The graph is called 'Co-appearances', so I'm
guessing a line means two people are in a scene together, and number of connections is how many
different people you share a scene with. That's my guess. It doesn't actually say 'other
characters' anywhere, I'm filling that in."

"On the right it says 'undirected, weight: value'. Weight? Does a big dot mean lots of different
people or lots of scenes? I would assume different people, because it says 'number'. If it's
counting scenes I'd be wrong in my meeting and I wouldn't know."

*Clicks the "Size: number of connections" row in the Styles list, expecting it to open and
explain itself or let her change it. In the mock nothing opens.* "Hm. Nothing. I'd want to click
this and see... I don't know, the setting. Or hover a dot and see 'Valjean, 36 connections'. Right
now I can't check any single dot. Is Marius 10? 15? The key only has three sizes, and on the
drawing I honestly can't tell a 5 from a 10, they look the same."

"The key circles are grey and the dots are coloured. That's fine, I get that the grey one is just
'size', the colour is the other thing. Took me half a second."

**On the styles list (protein study).** "Different data, same idea. Legend at the bottom: 'Size:
number of connections (degree)' and five sizes, 0-1, 2-3, 4-7, 8-16, 17-34. OK, buckets this time,
that's actually easier to read than the three on the other screen."

"But the list on the left calls it 'Degree size'. Degree? Like temperature? Like a college degree?
The legend puts 'degree' in brackets after number of connections so I guess degree IS number of
connections, it's the nerd word. But on the first screen the row said 'Size: number of
connections' and here the row says 'Degree size'. Is that the same thing or a different setting?
If I'd only seen this screen I'd have had to go read the legend to decode my own sidebar."

"And on the right panel there's a chart just titled 'degree' with no explanation next to it. So
the word is everywhere here. Somebody on my team would ask me 'what's degree' and I'd say 'the
number of connections, I think'."

**Her answer to the task.** "A bigger dot is a character, or protein, that's linked to more of the
others. Valjean has the most, around 36. The small ones hang off by one line."

## After the task

**SEQ:** 6. "It told me right there, twice -- in the list and in the key. I lose a point because I
couldn't check one dot's number and because the second screen suddenly called it 'degree'."

**Would she use this instead of her current tool?** "My current tool is a Slides chart, and a
Slides chart can't do this at all, so yes, for this. What I like is it wrote the meaning in plain
English next to the picture -- I could screenshot that corner and the key comes with it, nobody
has to ask me. Gephi made me pick the size myself and never told anyone what it meant. What would
stop me: if I put this in a deck and someone asks 'is that people or scenes', I need to be able
to answer, and right now I'm guessing."

## Problems observed

1. **The same size layer has two names.** At rest the Styles row reads "Size: number of
   connections"; on the styles list it reads "Degree size", and the legend there says "number of
   connections (degree)". She could not tell whether they were the same setting. Severity 2.
   Quote: "Degree? Like temperature? ... Is that the same thing or a different setting?"
2. **No way to read one dot's value.** The key shows three sample sizes (1, 10, 36); on the
   drawing mid-sized dots are indistinguishable, and neither hovering a dot nor clicking the Styles
   row shows a number. Severity 2. Quote: "I honestly can't tell a 5 from a 10, they look the same."
3. **"Connections" is not defined against the weighted edges.** The graph is weighted ("weight:
   value"), and the key does not say whether size counts distinct neighbours or sums the weight.
   She guessed distinct neighbours. Severity 2. Quote: "Does a big dot mean lots of different
   people or lots of scenes? ... I'd be wrong in my meeting and I wouldn't know."
4. **The three-step key on the at-rest screen is coarser than the five-bucket key on the styles
   list.** She found the buckets easier to read and the continuous 1 / 10 / 36 harder to map onto
   dots. Severity 1.

## What worked

- The meaning is written in plain words in two places at once: the Styles row and the on-canvas
  key. She answered without opening anything.
- The key sits on the drawing, so a screenshot of the canvas carries its own explanation -- her
  "take a picture to a meeting" job.
- The biggest dot matched what she already knew (Valjean is the main character), which made her
  trust the encoding.
