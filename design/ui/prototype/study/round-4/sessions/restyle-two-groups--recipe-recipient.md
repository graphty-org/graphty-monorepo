# Session: two groups in colors he cannot tell apart -- the recipe recipient (Tom)

Participant: Tom, lab manager, 52, reads files other people build and never builds them himself
(persona: `study/personas/recipe-recipient.md`). He has mild red-green color weakness. Played in
character: he reports what he expected and what happened; he does not design.

Moderator's task, as given: "Two of the groups are drawn in colors you cannot tell apart. Fix that
so a colleague can read the picture."

Screens, in the order he met them, rendered as a participant sees them (design notes hidden):

- `shots/tom-r4-restyle-frame-at-rest.png` -- the app at rest: Les Miserables, colored by group
- `shots/tom-r4-restyle-ins-group.png` -- after clicking a group in the legend (drawn on the
  protein file: Community 4 selected)
- `shots/tom-r4-restyle-cbv-cat.png` -- a color layer's editor, one color per value, with a row's
  menu open ("Change color...")
- `shots/tom-r4-restyle-sl-add.png` -- the color picker (Custom tab)
- `shots/tom-r4-restyle-sl-lib.png` -- the color picker (Libraries tab)
- `shots/tom-r4-restyle-sl-looks.png` -- the Look menu in the Style stack header (Screen, Print,
  High contrast)

Three of these are drawn on the protein file, not on Les Miserables; the mocks do not draw the
group editor on the Les Miserables screen. Where Tom's click on the Les Miserables screen would
lead, the session uses the matching protein-file state and says so.

## Transcript

**Minute 0. The first screen.**

"Les Miserables. Fine, it's a test file, I know the story. Picture's there, colors are there. Good.

"Now which two are the problem. The box at the bottom says 'Group color', then 2, 8, 4, 1, 3, 5,
0, Other. Numbers. Group 2, group 8. I don't know what group 2 is, but I don't need to, I just
need to tell them apart.

"Up at the top, the bunch around Fantine, and the bunch in the middle around Valjean and Cosette.
To me those are the same orange. The legend says 2 is one orange and 3 is another orange -- I'm
going by the order in the box, because the little squares, 2 and 3, I honestly can't tell which
is which. If a colleague like me gets this slide, they'll think Fantine's lot and Valjean's lot are
one group. That's the fix, then: 2 and 3.

"The blues, 8 and 1, I can see, one's light and one's dark. Those are fine."

**Minute 0:40. First try: the legend.**

"The box at the bottom has the colors in it. I'd click the little orange square next to 3. That's
where the color is, so that's where I'd change it."

(The mock's click on a legend entry selects that group; the state drawn is Community 4 on the
protein file.)

"OK, it went ... the right side changed. It's selected them, there's a ring on them. 'Community 4,
36 nodes, edges inside, edges out', 'Members by degree', 'Keep as set'. That's all about the group.
I didn't want to know about the group, I wanted to change its color.

"Down at the bottom, 'Appearance, top wins'. There's a row, 'Louvain ... Community 4' and a little
'color' tag at the end of it. Is that where the color is? It doesn't show me a color I can click,
it shows me the word 'color'. And 'Keep as set' is a big button right above it, and I don't know
what keeping a set does to her file, so I'm not pressing that.

"So that didn't do it. It told me things. It didn't let me change anything. Maybe I clicked the
wrong thing."

**Minute 1:30. Second try: the list on the right.**

He goes back to the screen at rest and reads the right panel.

"'Graph', 'Background: Theme', 'Layout: Force-directed'. 'Statistics' -- skip. 'Style stack'.
Under it, 'Group color', with the same little orange and blue square, and 'Base style'. Group
color, that's the thing the legend is called. I'll click that."

(The mock does not draw what that row opens on the Les Miserables screen. The nearest drawn state
is the protein file's module-color editor, opened from its layer.)

"All right, a box opened. 'Module as color', and on the right, 'writes Module color'. Writes. Writes
to what? Is that writing into her file? ... I'll leave that for now, the moderator told me to fix
it.

"'Scale: one color per value.' 'Palette: Eight distinct colors.' Then a list with every group and
its color and how many are in it. OK, this is the thing. This is the list I wanted. If this were
Les Mis it would be 2, 8, 4, and so on.

"Now I want to change the color of 3. I'd click the square next to 3."

(On the protein screen the per-row command is 'Change color...' in a row menu. How that menu is
opened is not drawn. The notes say each row's swatch is its own color control, so Tom's click on
the square is taken to open the color picker.)

"There, a color picker. Big orange-to-black square, a rainbow bar, 'Hex', 'Pick a color', 100%.
I'm not typing a hex code. Under it, a row of nine little squares. Those are the colors it
already uses, I suppose. Orange, light blue, green, dark blue, the other orange, pink, black,
yellow, grey.

"This row has the same problem as the picture. The first one and the fifth one are the two oranges
and to me they're the same. Nothing tells me which of these are safe to use side by side. I'm
picking by eye with the eye that's the problem.

"Yellow isn't used on the Les Mis picture, and it's clearly lighter than the oranges even to me.
Yellow. I click yellow."

**Minute 3. Did it do anything?**

"If it works, the Fantine group goes yellow on the picture, and the box at the bottom should say 3
is yellow now. That's what I'd check: the picture and the legend match. I'd count -- 3 had 10, it
should still say 10. If the legend still showed orange for 3, I'd think I broke something.

"(On the protein screen there's a word 'moved' next to one of the rows. I don't know what moved.
Did I move something?)"

He looks back at the editor header.

"And then, 'writes Module color'. I want to know if I just changed her file. If the postdoc opens
her file tomorrow and group 3 is yellow for her too, she's going to ask who did that. Nothing here
says 'only in your copy' or 'saved to the lab's file'. I'd close it and hope. That's not a good
feeling. I'd probably ask her about this bit."

**Minute 3:40. The Look menu (found on the protein screen, not on the Les Mis one).**

The moderator lets him look at the Style stack header on the protein screen, where there is a
'Look' control. On the Les Miserables screen that header has only 'Style stack' and a plus.

"'Look: Screen.' I click it. 'Look for the whole project.' Screen, Print, High contrast.

"Print: 'Reads in gray on white paper and for color-blind readers.' Color-blind -- that's me. But
gray. I don't want gray, the colleague is going to see it on a screen in lab meeting, and 'for the
whole project' -- that's everyone, not just my copy. High contrast: 'Every color clears 3:1 against
the canvas.' Against the canvas. My problem isn't against the canvas, it's two oranges against each
other. So neither of these says it fixes my problem.

"At the bottom, 'Colors you set by hand are kept.' So if I did the yellow thing, it stays. That's
the one line on the whole screen that told me what happens to what I did. It's in the wrong place,
though -- I only found it because I went looking at something else.

"Last time I saw one of these there was a 'Colorblind safe'. I'd have pressed that first and been
done. It's not here now."

**Minute 4:20. Would the colleague read it?**

"If the yellow worked: Fantine's lot yellow, Valjean's orange, I can tell those apart. The legend
says 3 is yellow. A colleague can read it. But the groups are still called '2' and '3', so they can
tell them apart and still not know what they are. That's her file's problem, not mine."

**End of session.**

## Single Ease Question

"Three. I got there -- I think I got there -- on the second try, and only because I guessed the
row called 'Group color' is where the colors are. The legend is where I'd look, and it didn't let
me change a color, it gave me a page about the group. When I finally had the colors in front of me,
the picker's own row of colors had the same two oranges side by side and nothing to tell me which
ones I can use. And I still don't know if I changed her file."

**Score: 3 of 7.**

## Would he use this instead of his current tool?

"My current tool is emailing her: 'I can't tell group 2 from group 3, can you change one?' She does
it in two minutes. This took me four and I'm not sure it saved where I think it did. If it had told
me 'this changes your copy, not hers' and the legend had let me click a color, I'd do it myself
next time. As it is, no -- I'd email her, and I'd ask her to send me a PNG."

## What he did and where it went wrong (observer notes)

- He found the two confused groups only by the order of the rows in the legend; with the numbers
  as names ('2', '3') and swatches he cannot tell apart, the legend is the only way he knew which
  was which.
- First try, the legend swatch: the click selects the group and fills the inspector with group
  facts ('Keep as set', members, edges in and out). No color control is offered where the color is
  shown. Counted as his first failure.
- Second try, the 'Group color' row in the Style stack: this is where the per-group colors live,
  and he found it by matching the row's name to the legend title. The Les Miserables screen does
  not draw what the row opens; the protein-file editor was used in its place.
- The per-row command 'Change color...' sits in a row menu; Tom does not right-click, so he only
  got there by clicking the swatch (assumed clickable from the notes, not visible as such).
- The picker's preset row repeats the palette with the two oranges adjacent, with no indication of
  which colors are distinguishable for a red-green reader.
- 'writes Module color' in the editor header read to him as writing into the sender's file; nothing
  on the editor says whether the change is his copy only.
- The Look menu is on the protein screen's Style stack header but not on the Les Miserables screen.
  Its Print description names color-blind readers but promises gray; High contrast promises
  contrast against the canvas, not between two colors. He found neither a fix for his problem.
  He remembered a 'Colorblind safe' look from an earlier session and noticed it was gone.
- 'Colors you set by hand are kept.' (Look menu footer) was the only statement he found about the
  fate of his change, and it is in a menu he opened for another reason.
