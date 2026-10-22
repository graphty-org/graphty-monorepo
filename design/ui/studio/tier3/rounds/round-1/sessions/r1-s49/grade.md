Grade: S
False done: no
Wrong turns: 1
Read from: rule

# Grade: r1-s49 (task T50 A, persona Tom)

Participant model: claude-opus-5-5 (the participant log records Opus in all 37 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (14 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page with "Open a file").

## Against the success definition

T50 A asks for lesmis-poster.graphty.json opened, the orange characters named, and what they have
in common said, read from the layer's conditions.

- The project opened with its look: three orange nodes, the key "Color: Poster" with "3 of 77
  nodes", and the layers Hovered, Selected, Poster (3) and Everything (77) (`02.png`).
- The rule was read from the layer's conditions before any name was seen: step 3 opened Poster and
  read the chip "name contains Mlle, 3 nodes" (`03.png`); the names came only at step 6.
- The three names: the find box with `Mlle` lists Nodes 3, MlleBaptistine, MlleGillenormand,
  MlleVaubois (`06.png`), the ids of Mlle Baptistine, Mlle Gillenormand and Mlle Vaubois. The
  participant named all three and checked the count against the key's "3 of 77".
- The color: the drawn value is `#ffa500` (3 nodes, `key.json`); `colorWord` gives "orange" (the
  CSS keyword).
- Final screen (`06.png`): Poster open on Style with its rule "name contains Mlle, 3 nodes" and
  Color FFA500, the find results beside it. Nothing changed: `styles.json` `changes.changed` is
  empty (the `gone`/`added` lists are the demo look replaced by the project's own layers at the
  open). The closing claim matches the screen.

## Steps

5 steps against the key's 3: "Open a file" with the upload (1), the Poster layer (2), the rule chip
(3, the wrong turn), Escape (4, part of backing out of it), the find box with `Mlle` typed (5, the
names; the key's Values tab or the find box both reach them, so this is the answer step, not a
detour).

One wrong turn: the chip opened the condition card (Contains, Mlle, Match case, Add a condition,
Done) where the participant expected the matched names; Escape kept the card open, as `decided.md`
(2026-10-19) settles. Nothing was typed into the card, so the rule was not rewritten. Graded S, not
SD: the rule was right on the first reading, and the detour changed nothing.

## Problems

1. Severity 2, behavior. The drawing names no node, so three orange dots identify no one; names
   come only from a click on each dot, the Values tab or the find box. The participant said a slide
   of it "would mean nothing" (step 2, `02.png`; known on this build, `answers.md` T50).
2. Severity 2, opinion. The collapsed rule chip shows a count ("3 nodes") but the chip opens an
   editing card with no list of the matched nodes; a reader who wants to see "which" lands in an
   editor of a colleague's project and fears changing it. The Values tab, which lists the members,
   was not noticed (steps 3-4, `04.png`, `05.png`).
3. Severity 1, behavior. Escape in the opened card leaves it open with nothing visible changing, so
   the participant could not tell whether backing out had worked; only "Autosave: saved"
   reassured them. This is the settled behavior (`decided.md` 2026-10-19), recorded for the
   design, not as a defect (step 4, `05.png`).
4. Severity 1, wording. The Color line shows only the hex code "FFA500", which meant nothing to a
   newcomer; the color's name is not on screen (step 3, `03.png`).
5. Severity 0, opinion. The layer name "Poster" told the participant nothing about why the nodes
   were picked; the name is the colleague's choice, not the product's (step 3, `03.png`).

No build defect: everything the participant met matches what the key says this build does, so no
repro was scripted.
