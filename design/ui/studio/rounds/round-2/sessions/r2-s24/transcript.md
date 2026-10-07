# Session r2-s24 -- Nadia (level-1 alert reviewer), task T12 prompt B (Florentine families)

Task as given: practice on the ready-made Florentine families network; go to the Medici family,
read what the program knows about them, and see which families they married into. Tell us who
they are and how many.

## Step 1
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s24 empty`
Saw (01.png): a start page. Left: Open project or file, New from data. Right: Samples, with
"Florentine families -- 15 families". A data-sharing banner at the bottom.
Thinking: "Says the sample is right there. No thanks to the data thing, then click Florentine families."

## Step 2
Command: `--step --click "No thanks" --click "Florentine families"`
Saw (02.png): 15 blue dots with lines, no names on any of them. Right panel says Nodes 15,
Edges 20. Left has a search box "Find nodes, edges, values".
Thinking: "No names on the dots. Whatever -- I type the name in the search box like I would an
account number."

## Step 3
Command: `--step --click "Find nodes, edges, values" --type "Medici"` -- tool: nothing is called that
(the text is only a placeholder), so nothing was typed. (Tool miss, not a person's miss; a person
would just click in the box.)
Next: click directly in the box at 176,90 and type.

## Step 4
Command: `--step --click-at 176,90 --type "Medici"`
Saw (04.png): the box shows a dropdown: under "Elements" a row "Medici", under "Values" a row
"Select where name is Medici (1)". Graph unchanged.
Thinking: "Two choices that look like the same thing. The plain 'Medici' one looks like the
record itself -- that's the one I'd open for an account."

## Step 5
Command: `--step --click-at 116,153` (the "Medici" row under Elements)
Saw (05.png): one dot in the middle turned gold with a yellow ring; the camera moved a bit. The
right panel now says "Medici -- Node", Summary: id Medici, name Medici, Degree 6 with a little
arrow. Selection on the left shows 1.
Thinking: "So that's all it knows: the name and 'Degree 6'. Degree -- I'm guessing that's six
marriages? It has an arrow, so it probably opens something. Six lines come off the gold dot, I
can count them, but no names. Click the Degree row."

## Step 6
Command: `--step --click-at 1320,236` (the "Degree 6" row)
Saw (06.png): the right panel changed to "Medici -- Neighborhood", heading "Medici's 6
connections", and a list: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. On the
canvas seven dots are now gold-ringed (Medici plus six). The Selection counter on the left went
from 1 to 7.
Thinking: "There it is -- six names, a list I could copy straight into the file. That's the
answer. Small thing: the panel says 6 but Selection on the left says 7. I assume the 7 is
Medici plus the six, but I had to work that out -- QA would ask me which number is right."
Part done: the Medici record read (id, name, Degree 6) and the married-into families listed.

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s24`

## Debrief (in character)
- Finished: yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni.
- What the program knows about the Medici: id "Medici", name "Medici", Degree 6. That is all.
- Ease: 6 out of 7. Four clicks from the start page to the list -- under a minute, inside my
  five-to-ten.
- What confused me:
  - The dots have no names on them, so the picture alone tells me nothing; without the search box
    I would have been stuck clicking dots at random.
  - The search offered two rows for one name ("Medici" and "Select where name is Medici (1)").
    I guessed the first; I could not tell what the second would do differently.
  - "Degree 6" is jargon. I guessed it meant six links, and only knew because clicking it said
    "6 connections". Nothing says connections here are marriages.
  - The counts disagree: the list says 6, the Selection counter says 7. I worked out it includes
    the Medici themselves, but I would not want to write the wrong one down.
  - Clicking "Degree" also changed the selection on the canvas (1 to 7). I did not expect a
    details row to change what is selected; was that view only or did I change something?
- Did not try: getting the list and picture out for an alert file.
