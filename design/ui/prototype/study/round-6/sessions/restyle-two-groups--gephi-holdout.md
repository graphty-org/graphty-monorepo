# Session: two groups drawn in colors you cannot tell apart -- Mara (Gephi holdout)

**Participant:** Dr. Mara Lindqvist (fictional), associate professor, Gephi user since 0.8, teaches
it every year. Not color-blind; teaches students who are. She did this task once before on earlier
screens, and says so.
**Task as given:** "Two of the groups are drawn in colors you cannot tell apart. Fix that so a
colleague can read the picture."
**Screens worked through:** the app at rest on Les Miserables, the Styles list, Color or size by a
value, the Inspector.
**Renders she looked at** (all in `shots/`, as a participant sees them, design notes hidden):
`r6-mara-restyle-frame-at-rest.png`, `r6-mara-restyle-colour-by-value-legend.png`,
`r6-mara-restyle-colour-by-value-categories.png`, `r6-mara-restyle-colour-by-value-run-colors.png`,
`r6-mara-restyle-colour-by-value.png`, `r6-mara-restyle-styles-list.png`,
`r6-mara-restyle-styles-list-add-to-selection.png`, `r6-mara-restyle-styles-list-libraries.png`,
`r6-mara-restyle-styles-list-looks.png`, `r6-mara-restyle-inspector.png`,
`r6-mara-restyle-inspector-one-node.png`.

---

## 1. The app at rest (Les Miserables)

> "Les Miserables again. Nodes 77, edges 254. Still matches, good."

> "Legend bottom left. 'Group color': 2, 8, 4, 1, 3, 5, 0, and then Other -- and Other is a light
> grey now, with 'Groups 6, 7 and 10' written under it. Last time Other was a charcoal that sat
> right next to the black of group 0 and I could not tell them apart on the canvas. Now the five
> Other nodes on the right, out past Gavroche, are pale grey and the black ones at the top are
> black. That pair is fixed, and it says which classes went into Other. That is two of my
> complaints from last time gone. Fine. Somebody listened."

> "So which two can I not tell apart today? I look at the canvas, not the legend. The legend puts
> the squares in a column with labels, of course they look different there."

> "Group 2 is the orange around Valjean. Group 3 is the red-orange up at the top, the Fantine
> cluster. Up there on their own, fine. But where they meet -- the orange nodes that sit just
> under Fantine's cluster, around the 'Fantine' label and down toward Valjean -- I have to lean in.
> On the projector at 1280 by 800, with the students at the back, orange and vermilion at this dot
> size are one color. That is the Okabe-Ito weak pair; I said so last time. And the default puts
> them on two clusters that touch."

> "Second candidate: 1 and 8, the dark blue at Myriel and the sky blue at Marius. Different
> lightness, a reader can tell those apart, even in grey. No. It is 2 and 3."

**Decision:** recolor group 3 (vermilion) to something that cannot be mistaken for the orange of
group 2.

**First move:** she clicks the vermilion square next to "3" in the legend on the canvas.

> "Same reflex as last time: click the little square, like the partition list in Gephi. Does this
> picture tell me it is clickable? ... No. It is a square and a number. No hover, no outline, no
> little pencil. I click it anyway."

(The at-rest screen does not show what the click does. She looks at the next screen to find out.)

---

## 2. What clicking the swatch does (Color or size by a value, "Change a color from the legend")

> "Different network again -- the proteins. I will pretend it is my Les Mis legend."

> "OK. The swatch next to 'Proteasome' has an outline, so that is the one that was clicked, and a
> picker opened beside it. Custom and Libraries. Square picker, hue bar, 'Hex' with a box -- 4AA3DF
> -- and a percent box, that is opacity. Under the hex: 'Light blue, picked for Proteasome'. It
> names the color in words. For my color-blind students that line is worth something."

> "Then 'Not used in this layer' -- one swatch, orange. And 'Used in this layer' with all the
> rest. That is sensible: show me what is free first. On Les Mis the free one would be yellow,
> because the legend uses seven of the eight and yellow is the one missing. Hmm. Yellow on that
> light grey canvas. It will be faint on a projector. I would not pick it for a group of ten
> characters."

> "And look what this person did: they gave Proteasome a light blue, and the legend now says,
> right under that row, '! Too close to Ribosome's sky blue. Fix...'. And a black bar at the bottom:
> 'Proteasome is now light blue, was orange. Too close to Ribosome.' With Undo. So it checks my
> pick against the other colors in the layer. Good. That is the check I do by squinting."

> "Undo. There is an Undo on a color change. I cannot tell you how many times I have recolored a
> partition in Gephi, hated it, and had to remember what it was before. I would try Ctrl+Z as well,
> right away, to see if it is the same thing. The bar says Undo; I assume Ctrl+Z does it too.
> Nothing here says so."

> "'Fix...' -- what does Fix do? Pick for me? Put it back? Open the picker again? I do not click
> things that fix things for me before I know what they change. I would just pick another color
> myself."

**What she does in her head on Les Mis:** clicks the square for 3, ignores the yellow suggestion,
types a hex she uses in her own figures -- a purple -- into the Hex box.

> "I type 7B3294. Purple next to orange, pink five is close-ish to purple... no, pink is light,
> purple is dark, fine in grey too. If it were too close to something, this flag would tell me.
> That is the point of the flag. Done, I think. The canvas and the legend follow, because the
> legend is drawn from the same layer. I would check by looking."

---

## 3. But why did I have to find it myself?

> "Here is what bothers me. The flag fires on MY light blue. It has a function that knows two
> colors are too close. Then why does it not fire on its own orange and vermilion? It clearly
> measured something to put that flag there. If the app can tell that light blue and sky blue are
> too close, it can tell that orange and vermilion on two touching clusters are close. The task
> was: I have to find the problem by leaning into the screen. The software already knew."

> "Maybe the default palette is supposed to be good enough that it never needs the flag. Then
> 2 and 3 should not be orange and vermilion side by side. Either fix the default or tell me.
> Last time I said I should not have to fix a default. Black and grey got fixed. Orange and
> vermilion did not."

---

## 4. The list of values (Categories)

> "Other door: 'Module as color', one color per value, 'Eight distinct colors', every value with
> its count. That is my partition list, same as last time. A menu on a row: 'Change color...',
> 'Move to Other', 'Select nodes', 'Create set'. The highlighted item is still 'Move to Other', not
> 'Change color...'. My eye still goes to the blue bar first. Minor."

> "'Other: Unassigned moved' -- still has the little 'moved' tag. Good."

> "I do not need this door now. The legend square is one click. This is three -- stack row, the
> sliders icon, the row menu. For this task the legend wins. For a partition with twenty values
> I would come here, because I want to see them all in one list with counts."

---

## 5. The same thing on a Louvain run (Recolor a group on a run's layer)

> "Now the question I asked last time. A community from a run. 'Louvain color', Communities 1 to
> 8, then Other, 'Communities 9 and 10'. Someone changed Community 8. The bar says: 'Community 8 is
> now dark gold, was yellow. Kept when Louvain runs again.' And in the right panel: 'A color you
> pick in it is kept for its community, and a re-run keeps it.'"

> "Good -- it answers the question. But 'kept for its community' after a re-run. Louvain gives me
> different class numbers every run. Reviewer two asked me why community 7 became community 4.
> So how does the next run know which community is 'its' community? By overlap with the old one?
> Most members in common? What if it splits in two? If the answer is 'by the number', then it is
> wrong, and quietly wrong, which is the worst kind. It says it is kept; it does not say how it
> finds it again. I would want one line: matched by which rule."

> "And look at the colors on this very screen. Community 1 orange, Community 8 dark gold. Dark
> gold and orange. On the canvas, the orange cluster on the right and the gold one at the bottom
> left -- in grey on paper those two are going to be very close, and in color they are cousins.
> The person who picked dark gold made exactly the problem this task is about. And there is no
> flag on Community 8. On the other screen the flag fired for light blue against sky blue. Here it
> does not fire for dark gold against orange. So either dark gold and orange are 'far enough' by
> its rule -- which I would not agree with -- or the flag does not work on run layers. I cannot
> tell which from the picture, and I would not trust the flag after seeing this."

> "Also, Community 7 is a purple that is not in Okabe-Ito. Fine, it has more than eight. I only
> note it."

---

## 6. The Styles list and the Look

> "The Style stack is in the right panel now, 'Top wins each property it sets'. Betweenness color,
> Hub labels, Size: degree, Base style. Fine, that is my Appearance panel with an order. Not needed
> for this task."

> "Adding a color for the selection: a picker with the swatches along the bottom -- orange, sky
> blue, green, blue, vermilion, pink, black, yellow, grey. Libraries: Okabe-Ito, Orange to brown,
> Viridis, Blue to red. Palettes I know. If the whole palette were wrong I would swap it there."

> "The Look menu. Screen, Print, High contrast. 'Colors you set by hand are kept.' So my purple
> stays if I switch to Print. Print: 'Reads in gray on white paper and for color-blind readers.
> Where a color shows a direction, a shape shows it too.' Would Print have fixed my task? Maybe --
> if Print re-picks the palette so each class reads in grey, orange and vermilion would have to
> come apart. It does not say it does that for categories. High contrast: 'every color clears 3:1
> against the canvas' -- against the canvas, not against each other. Same as last time: not the
> fix for two groups that look alike."

---

## 7. Inspector detour

> "The first inspector screen I was shown is cut off on the right -- 'Change..', '0.028',
> 'undirecte'. The whole picture is shifted. Something is broken in that render. I skip it."

> "One protein selected: Appearance, top wins, 'Module color -- DNA repair -- color'. So if I had
> clicked one of the nodes I could not read, it would tell me which group it is in and which layer
> paints it. For a student who cannot tell orange from vermilion, clicking the dot and reading
> 'group 3' is the honest answer. I like that as a second route. And the attribute row has a
> little color square next to 'module' -- is that clickable too? Probably it opens the same picker.
> It does not say."

---

## Single Ease Question

**5 out of 7.**

> "Better than last time. The legend square opens the picker -- that is the Gephi reflex and it
> works now. The picker has a hex box, names the color, shows me what is free, and there is Undo
> on a color change, which Gephi still does not have after ten years. Other is light grey and says
> what it holds. Those are real."

> "Not higher, because: nothing on the canvas legend tells you it can be clicked -- I clicked on
> faith. The one free color it offers me on my own data is yellow, which is the worst one on a
> light canvas. The tool can measure 'too close' but only turns that on my picks, not on its own
> orange and vermilion, which is the actual problem I was handed. 'Fix...' does not say what it
> does. And on the Louvain screen the dark gold next to orange got no flag, so now I do not know
> what the flag checks. The screens still jump between my Les Mis and somebody's proteins."

## Would she use this instead of Gephi?

> "For recoloring two groups? No. It is table stakes; Gephi does it in one panel and my handout
> already has the screenshots. Nothing here is a reason to rewrite the lab."

> "What would get a second session: undo on appearance, which I would actually test with Ctrl+Z the
> minute I sat down, and a hand color that survives a Louvain rerun -- IF it tells me how it finds
> the same community again. That is a thing Gephi gets wrong and I have written response letters
> about it. And whether my colors come back out in the GEXF to my coauthors, which I still have not
> seen. Today: I'd stay on Gephi, but I would open this again when it can show me those two."

---

## What she tripped on (for the designers)

1. **The default palette still puts two close colors on touching clusters.** On Les Miserables,
   group 2 (orange) and group 3 (vermilion) meet around Fantine and Valjean; at node size, on a
   projector, they read as one color. The black and dark grey pair from last time is fixed; this
   pair is the next one.
2. **The too-close check never fires on the default palette's own pairs.** It flags a color the
   reader picked, so the tool can measure closeness, yet it stays silent on the pair that caused
   the task. She had to find the problem by eye.
3. **The canvas legend shows no sign that its swatches are clickable** (no hover, outline or icon
   in the at-rest render). She clicked from Gephi habit; a new user may not.
4. **The only "not used" color offered on her data would be yellow,** which is faint on the light
   canvas. She typed a hex instead.
5. **"Fix..." on the too-close flag does not say what it will do,** so she would not click it.
6. **On the Louvain screen, a picked dark gold (#B8860B) sits next to Community 1's orange
   (#E69F00) with no flag,** while the other screen flags light blue against sky blue. She
   concluded she cannot tell what the flag checks, and stopped trusting it.
7. **"Kept when Louvain runs again" does not say how the re-run finds the same community**
   (overlap, majority of members, or the number). With Louvain's arbitrary numbering this decides
   whether the figure stays right.
8. **Undo on the color-change toast is shown, but nothing says whether Ctrl+Z does the same.**
9. **The row menu in the value list still highlights "Move to Other" rather than "Change
   color...".**
10. **The inspector's first render is shifted and clipped on the right** ("Change..", "0.028",
    "undirecte").
11. **The screens switch datasets** (Les Miserables at rest; proteins everywhere else).

## What she liked

- Other is light grey and lists its members ("Groups 6, 7 and 10"); last round's black and
  charcoal clash is gone.
- One click from the legend swatch to a picker, with a hex field and the color named in words.
- "Not used in this layer" listed first in the picker.
- The too-close flag on a picked color, and the toast that names old and new color with Undo.
- A picked color on a run's layer is said to survive a re-run.
- The inspector's Appearance rows, as a way for a student to find which group a dot is in.
