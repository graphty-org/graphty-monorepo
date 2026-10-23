# Grade: session r3-s11 -- Elena (first-time product manager), names on every dot, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (09.png) and the transcript. No files were saved, and
the task needs none. Not from the participant's rating (6 of 7).

## Grade: S (success)

The round 3 scoring with the "Show all labels" switch on applies, and every part holds:

1. **Label line bound to `name` on a row covering every node.** Step 5 chose "Everything" (all 77
   nodes). Step 6 opened "Add label line", and step 7 picked `name`. In 07.png the Style tab reads
   "Label: Aa Above | Abc name". Holds.
2. **Names drawn on the canvas.** 07.png shows the names above the dots, for example Blacheville,
   Fameuil, Myriel and Napoleon. Holds.
3. **Hidden count read and acted on.** In 07.png the statement reads "77 labels, 7 hidden". She read
   it and said "it says 7 are hidden, and I was asked for every character". She then clicked "Show
   all labels" (step 8). In 08.png and 09.png the box is ticked and the statement reads "77
   labels", with no hidden part. Names that were missing in 07.png now appear in the middle, such
   as Gillenormand and Mother Innocent. Holds.
4. **Claim matches the screen.** She said "every character has their name now ... 77 labels for 77
   characters" beside the statement "77 labels". Every dot in 09.png has text beside it, and the
   middle ones overlap. The answers count that overlap as the switch working, not as a defect.
   This claim is not a false "done".

- **Every name reached:** yes.
- **Build-decided:** no. **Void:** no. The coordinate click at step 6 reached the same "Add label
  line" button a person would press, and the tool named it.
- **Failure codes:** none.

## Counts

|                          | This session                                                                                  | Success path                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Commands after the start | 8 (No thanks, Les Miserables, Style, Everything, Add label line, name, Show all labels, zoom) | 6 (No thanks, then the round 3 route of 5: open, Everything, Add label line, name, Show all labels) |
| Wrong turns              | 1                                                                                             | --                                                                                                  |

- **The wrong turn:** at step 4 she opened the Graph place's Style tab (04.png). It holds Canvas
  Background, Method, Shape, Spring length and Gravity, and nothing about names. She left it at
  once for "Everything".
- **Not counted as a wrong turn:** the zoom at step 9, which checked the result after the task was
  done.
- Steps 8 / 6, about 1.3x, inside the 2x measure. She spent no wrong turns hunting for the hidden
  names. The switch replaced round 2's search, which took about 5 wrong turns per session.

## False "done"

None. The one "done" claim (step 9 and the debrief) was made while the statement read "77 labels"
with no hidden part, and every dot had a name drawn.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was seen,
so no repro was scripted.

| #   | Sev | Kind     | Problem                                                                                                                                                                                                                                                                                                                                    | Evidence                                    |
| --- | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | 2   | behavior | There are two "Style" tabs: one in the Graph place, with the background and layout, and one under "Everything", with the dots' look. A newcomer looking for "how the dots look" opens the first one. She only found the right one because "Everything" sounded like "all the dots". Seen in one participant here; confirm across sessions. | Step 4, 04.png; debrief point 1.            |
| 2   | 2   | behavior | The hidden count "77 labels, 7 hidden" is the only sign that names are missing, and it is small, gray text below the label line. She said that without reading it she "would have thought I was done when I wasn't". She did read it, so the claim held, but this is the setup for a false "done" in a less careful reader.                | Step 7, 07.png; debrief point 3.            |
| 3   | 1   | opinion  | With every name shown, the middle of the drawing is a tangle of tiny overlapping words that cannot be read without zooming a lot. Names grow with the drawing when zooming, so a small zoom does not help. She called it unusable on a slide. Held one level down.                                                                         | Steps 8-9, 08.png, 09.png; debrief point 4. |
| 4   | 1   | wording  | "Label" with a bare "+" does not say it puts names on the dots. The list's search box says "Find an attribute", a word she does not use. Seeing "name" in the list resolved it.                                                                                                                                                            | Steps 5-6, 05.png, 06.png; debrief point 2. |

**What worked:** "Everything" in the outline opened the dots' Style tab in one click. Label "+"
opened the attribute list at once, with only "id" and "name" in it. Names were drawn the moment
"name" was picked. "Show all labels", right beside the count, turned the hidden names on in one
click. The statement then changed to "77 labels", which matches the 77 characters.
