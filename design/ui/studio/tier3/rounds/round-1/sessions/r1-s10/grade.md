Grade: SD
False done: no
Wrong turns: 2

# Grade: r1-s10 (task T40 B, persona Dev)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (48 tool calls) and lists no file opened
outside its own folder.
Merged: no (the file was opened from the empty start, not over a sample).

## Against the success definition

T40 B asks for yeast-galactose.graphml brought in, every gene whose name begins with GAL drawn
purple, everyone else unchanged, and the count said from the screen.

- Last screenshot `19.png`: yeast-galactose open (331 nodes, 361 edges). Layer "GAL genes" (8),
  Which nodes "name starts with GAL, 8 nodes", "8 of 331 nodes", Fill > Color `800080`. The key
  reads "Color: GAL genes, 8 of 331 nodes" with a purple swatch. Eight dark purple dots in the
  middle of the drawing; every other dot is the default indigo.
- `styles.json`: node layer "GAL genes" with the rule `data.name` starts-with `GAL`, `node.color`
  `#800080`, matched 8, painted 8. Its edge half matches all 361 ties and paints nothing.
  Everything still sets `#6366F1` (painted 323) and `darkgrey` ties (361).
- `key.json` drawn: nodes `#800080` 8, `#6366f1` 323; edges `#a9a9a9` 361.
- Asked color: `800080`, which `colorWord` names "purple" (a CSS keyword).
- Count: "8", given with the eight names. It was on screen before it was said: the find list's
  "Nodes 8" (`04.png`) and the picker's "8 of 331 nodes" (`12.png`, `19.png`).
- Stack: a layer with a text card on `name` starting with "GAL" and a purple color, which the key
  counts.

The success state was reached, but by a longer route with two detours (the find box and the
picker's hue bar, whose color was then replaced), so SD rather than S.

## Steps and wrong turns

Participant: 24 steps from `01.png` to `19.png` (open the file, Load, click the find box, type
GAL, the "+" whose click was lost, the "+" again, Layer, the name with Enter, Which nodes, Add a
condition, `name`, the match menu, Starts with, a click in the text box, `GAL`, Escape, Done, Fill
"+", the swatch, the hue bar, a wheel zoom, a click in the color box, Control+A, `purple` with
Enter). The step-14 click on "Fill" was refused by the tool as ambiguous and counts as none. The
key's path with "Starts with" is 13 steps (`answers.md`, T40 B; 15 in the step table, which also
counts the click in the text box).

Wrong turns: 2.

1. The find box (steps 3-4, `04.png`): it listed the eight and gave the count, but it colors
   nothing and was left for the layer route.
2. The picker's hue bar (steps 19-20, `16.png`, `17.png`): it gave DC63F1, which the participant
   did not trust as purple and replaced by typing `purple` (`19.png`).

The lost "+" click (step 5) is the program's, not a wrong turn (problem 1). The wheel zoom
(step 21) was a look, not a move away from the goal.

False done: no. The participant said it was done on `19.png`, and the screen, the key and the
style tree agree.

## Problems

1. **A click on the Style layers "+" while the find list is open is lost.** Severity 2, kind:
   build-defect. Step 5 (`05.png`): the find list for `GAL` pushes Style layers down to y 705;
   clicking its "+" (the pointer is on button "Add a layer or a folder") opens no menu. The list
   closes, Style layers jumps back to the top and the "+" moves to y 122, so the reader has to
   find it and click again. The participant thought "did it do anything?" Mechanism (as observed):
   the find list closes before the click completes, the section moves out from under the pointer,
   and the click lands on nothing. Repro: `rounds/round-1/repro/r1-s10/` (`commands.md`, `04.png`
   then `05.png`).
2. **One click on the color picker's hue bar sets the color and closes the picker.** Severity 2,
   kind: build-defect. Step 17 (`16.png` to `17.png`): a single click on the hue slider wrote
   DC63F1 and closed the popup, so the reader could not adjust the hue or the saturation square
   and was left with an orchid they "weren't sure counted as purple". Repro:
   `rounds/round-1/repro/r1-s10/` (`08.png` then `09.png`).
3. **Nothing says the color box takes a color word.** Severity 2, kind: behavior. Steps 15-19
   (`15.png` to `19.png`): the box shows a hex code (`6366F1`, the color every dot already has),
   and the picker's swatches hold no purple. Typing `purple` worked, but the participant "only
   tried it by luck". Seen on T39 B as well (`r1-s02`, problem 1), so confirmed as a design
   problem across two task halves.
4. **The find list does not show where its matches are.** Severity 1, kind: behavior. Step 4
   (`04.png`): "Nodes 8" lists the GAL genes but nothing in the drawing marks them, so the reader
   "couldn't see where they were until I colored them".
5. **"Fill" is not where a first-time reader looks for color.** Severity 1, kind: wording.
   Steps 4-7: the participant looked for "color" or "palette" and found the color under Style
   layers > Fill only by guessing that a layer is a rule. Inside the layer, "Which nodes / Add a
   condition / Starts with" read clearly.
6. **Eight small dark dots are hard to find, and the wheel barely zooms.** Severity 1, kind:
   behavior. Steps 18-19 (`18.png`, `19.png`): `800080` on small dots beside the default indigo
   reads as darker dots (as the key notes); a -600 wheel step changed the framing very little.
   One session; not confirmed.

Not a program problem: the Fill click at step 14 was refused by the tool as ambiguous (a group,
a heading and a span share the name "Fill"); the participant then used the "+" by position.
