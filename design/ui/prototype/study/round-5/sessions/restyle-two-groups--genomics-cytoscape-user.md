# Session: two groups in colors you cannot tell apart -- Maren (genomics Cytoscape user)

Participant: Maren, cancer genomics postdoc, the lab's Cytoscape person (persona: `study/personas/genomics-cytoscape-user.md`). Laptop, 1440 x 900.

Task as given: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a colleague can read the picture."

Screens seen, as the participant sees them (design notes hidden):

- `shots/record/r4-maren-restyle-frame-at-rest.png` -- the app at rest (a sample network, Les Miserables)
- `shots/record/r4-maren-restyle-ins-one-node.png` -- the protein network colored by module, TP53 selected
- `shots/record/r4-maren-restyle-ins-group.png` -- a community picked from the legend
- `shots/record/r4-maren-restyle-sl-dropped.png` -- the Style stack with Module color near the top
- `tmp/maren-restyle/cbv-cat.png` (crop of `shots/record/r4-maren-restyle-colour-by-value.png`, the "Module as color" popover with a value row's menu open)
- `shots/record/r4-maren-restyle-sl-add-to-selection.png`, `shots/record/r4-maren-restyle-sl-libraries.png` -- a layer for the selection and the color picker
- `shots/record/r4-maren-restyle-sl-looks.png` -- the Look menu (Screen, Print, High contrast)

---

## 1. Finding the two groups

**Screen: frame at rest (Les Miserables).** "OK, this isn't my data, it's a novel. Group color, 0 to 8. The black ones, group 0, and 'Other' in dark gray -- at this dot size I honestly can't tell those apart. But Other isn't a group, so I don't think that's what you mean."

**Screen: protein network by module, TP53 selected.** "This is more like it. Ribosome, Proteasome, Complex I, Spliceosome, DNA repair, then '4 more'. Good -- it's not red-green, that's the first thing my PI would ask. Legend on the canvas with counts. I like the counts."

"Which two can't I tell apart... Proteasome and DNA repair. Orange and a darker orange. They're sitting right next to each other in the bottom left, so you can't even use position. My PI would see one blob. The two blues, Ribosome and Spliceosome, I can just about tell -- one's light, one's dark -- but they're also neighbours on the right. I'll fix the oranges; that's the pair a colleague would get wrong."

"In Cytoscape I'd go to the Style tab, Fill Color, it's a discrete mapping on 'module', and I'd double-click the colour cell next to DNA repair. So I'm looking for the list of module values with a colour next to each."

## 2. First try: click the legend swatch

"The legend has the swatches. I'd click the DNA repair swatch."

**Screen: a group picked from the legend.** "Hm. That didn't give me a colour box. It selected the whole group -- the ring on every node, and the right side is now 'Community 4', members, edges inside, 'Keep as set'. That's actually useful for something else, but not what I wanted. I didn't change any colour."

"There's an Appearance section at the bottom with a little 'color' pill next to the layer. Is that the colour? It says the layer name and 'Community 4' -- no swatch I can click. I'm not going to guess on a pill."

"So clicking the legend picks the nodes. Fine, I'll remember that. Where are the colours kept, then?"

## 3. Second try: the Style stack

**Screen: Style stack, nothing selected.** "Right side, 'Style stack'. Module color is the second row, with the multicolour chip. 'Top wins each property it sets.' OK, whatever that means, Module color is winning, the betweenness row below says 'Covered by Module color above'. So Module color is my mapping. This is the equivalent of the Style tab."

"I'd click Module color. I'm assuming it opens the mapping, like double-clicking the mapping in Cytoscape."

**Screen: "Module as color" popover.** "Yes, this is it. 'Scale: one color per value.' 'Palette -- categorical, 8 colors: Eight distinct colors.' Then the values, largest first, with the counts: Ribosome 56, Proteasome 40, ... DNA repair 30 ... 'Other: Unassigned, moved' 26. That's the discrete mapping table. Better than Cytoscape actually, because it tells me how many genes are in each."

"There's a menu open on one of the rows: 'Change color...', 'Move to Other', 'Select nodes', 'Create set'. 'Change color...' -- that's what I want. On DNA repair."

"What would I pick? I don't trust myself with colours, that's why I use the defaults."

## 4. Picking the new colour

**Screen: the color picker (Custom and Libraries tabs).** "Assuming 'Change color...' opens this picker. A gradient square, hex field, and a row of swatches along the bottom: orange, light blue, green, blue, vermillion, pink, black, yellow, gray. That's the same eight colours already in the legend. So if I click one of those I just make DNA repair the same as some other module. That doesn't solve anything, it moves the problem."

"Libraries tab: 'Okabe-Ito, categories', then ramps -- Orange to brown, Viridis, Blue to red. One categorical palette. That's the one I'm already using. There's no 'give me a ninth safe colour'."

"So I'd type a hex. I'd go and google 'colour-blind safe purple hex', come back, paste it in. That's what I'd do in Cytoscape too, to be fair. But I thought this tool was going to know."

"Actually wait -- 'Move to Other'. Other is the gray one. If I moved DNA repair to Other it'd go dark gray with the Unassigned genes. No. That's hiding my DNA repair module, which is literally the one TP53 is in. I'd never do that for this. Good that it says 'moved' on the Unassigned row, so I can see that it happened there."

"Another idea: the Palette dropdown says 'Eight distinct colors'. Maybe there's another palette in there. Nothing shows me what's in it. I'd open it and look, but if it's only Okabe-Ito again I've wasted a click."

**What I'd end up with:** DNA repair on a hex I typed (a purple). I'd look at the canvas: Proteasome orange, DNA repair purple. "OK, now they're different. Did the legend change too?" -- the legend block is 'Module color', drawn from the same layer, so I'd expect the swatch next to DNA repair to go purple. "If the legend still says orange for DNA repair, I've made a figure that lies, and that's worse than the original."

## 5. A detour I'd probably take: the Look menu

**Screen: Look menu.** "There's a 'Look' next to the Style stack: Screen, Print, High contrast. Print: 'Reads in gray on white paper and for colour-blind readers.' Oh, that's for my PI. But: 'Where a color shows a direction, a shape shows it too.' Direction -- that's up and down, fold change. My modules aren't a direction. So would Print give Proteasome and DNA repair different shapes, or not? It doesn't say. 'High contrast: every color clears 3:1 against the canvas.' Against the canvas, not against each other. That's not my problem either."

"'Colors you set by hand are kept.' OK, good, so my purple survives if I switch Look for the paper version."

"I wouldn't switch Look now. I don't know what it does to my modules and I'd have to check every one of nine."

## 6. The other route I noticed, and would not take

**Screen: layer for the selection.** "With TP53 selected there's a '+' on Appearance that makes a new layer 'TP53 (the selection)' with its own fill and a picker. So I could select the DNA repair genes, press plus, and paint them. But that makes a second thing on top of Module color. Then the legend has Module color saying DNA repair is orange and some other block saying these 30 are purple. That's two legends for one module. For a figure, no. In Cytoscape we call that a bypass and everyone tells you not to use it for figures because it doesn't export with the style."

---

## Single Ease Question

"How easy or difficult was this task?" (1 = very difficult, 7 = very easy)

**4.**

"Finding the mapping was fine once I stopped clicking the legend -- the value list with counts is good. The part that isn't solved is the colour itself. You gave me colour-blind-safe colours, then when two of them sit side by side, the picker offers me the same eight again and a hex box. I still have to go and find a safe colour myself. And I couldn't tell for sure that the legend follows my change until I'd done it."

## Would I use this instead of Cytoscape?

"For this job -- recolouring a module -- it's about the same as Cytoscape, a bit clearer, because the counts are next to each value and it told me which layer was winning. The default being Okabe-Ito and not red-green is a real point in its favour; I'd have one less argument with my PI."

"But no, not instead. The final figure stays in Cytoscape, because that's what the lab protocol says and what reviewers recognise, and I don't know how I'd cite this. I'd maybe use it to look at the modules. And honestly, whether two modules are orange or purple doesn't change what the network proves -- the enrichment does that."

---

## Observations (moderator)

1. **The legend swatch selects, it does not recolour.** Her first and most natural move (click the swatch of the group whose colour is wrong) selected the whole group instead. She recovered, but only after reading the inspector and deciding the "color" pill was not a colour control. Severity: medium.
2. **The recolour path exists and she found it**: Style stack row -> "Module as color" value list -> row menu "Change color...". She mapped it directly to Cytoscape's discrete mapping and praised the per-value counts.
3. **The picker's swatches are the palette already in use.** For "two colours too similar", choosing any swatch just duplicates another module's colour. The only categorical palette in Libraries is the one already applied. She had to fall back to typing a hex she would look up elsewhere, which is the gap the default palette was supposed to close. Severity: high for this task.
4. **No confirmation that the legend follows a per-value change.** No screen shows the legend after a changed value colour; she named "a legend that lies" as worse than the original problem. Severity: medium.
5. **Look menu wording does not answer categorical confusion.** "Print" promises shapes "where a color shows a direction"; "High contrast" is against the canvas, not between groups. For a colour-blind reader, she could not tell whether either would separate two modules. Severity: medium.
6. **"Move to Other" read correctly as hiding a module**, and she rejected it; the "moved" tag on Unassigned was noticed and trusted.
7. **Selection-scoped layer was seen as a bypass** that splits one module across two legend blocks; she refused it for a figure.
8. Scepticism held: a good recolour path did not change her answer on switching.
