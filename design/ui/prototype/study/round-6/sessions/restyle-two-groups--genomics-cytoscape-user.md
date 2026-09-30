# Session: two groups in colors you cannot tell apart -- Maren (genomics, Cytoscape user)

Participant: Maren, cancer genomics postdoc; uses Cytoscape two or three times a month for STRING networks. Her PI is red-green colour-blind.
Task as given: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a colleague can read the picture."
Screens seen (as a participant sees them, design notes hidden, 1440 x 900):
- `shots/record/r6-maren-restyle-frame-at-rest.png` (the network at rest, ppi dataset)
- `shots/record/r6-maren-restyle-colour-by-value-full.png` (all states: choose, numbers, size, categories, path, refused, change a color from the legend, recolor a run's group)
- `shots/record/r6-maren-restyle-styles-list-full.png`, `-libraries.png`, `-looks.png`
- `shots/record/r6-maren-restyle-inspector-full.png`

---

## 1. Which two?

**Screen: network at rest.** "OK, nine modules and a legend bottom left: Ribosome, Proteasome, Complex I, Spliceosome, MAPK signaling, DNA repair, Cell cycle, TGF-beta, Other, with counts. Good, counts."

"Which two can't I tell apart... the blues are fine, light and dark. The one that bothers me is Proteasome and DNA repair. Proteasome is that yellow-orange on the left, DNA repair is the darker orange right underneath it, and those two clusters sit next to each other. On my laptop I can see it's two oranges. My PI? I'd bet money he sees one blob. And if someone prints this in gray, two oranges is exactly what goes wrong. So that's my pair: Proteasome and DNA repair. I'll change DNA repair, it's the smaller one, 30 genes."

"I'll say this, though: it gave me colour-blind-ish colours to start with, not red-green. So the pair it picked for me is still a pair I have to fix. Fine, that happens in Cytoscape too."

## 2. Getting to the colour

**Screen: network at rest, legend.** "In Cytoscape I'd go to the Style tab, Fill Color, discrete mapping, find DNA repair in the list, click the colour cell. Here... the legend has a little square next to each name. I'll click the square next to DNA repair."

**Screen: change a color from the legend.** "Right, that opens a colour picker beside the legend. The legend row has a blue ring on the square, so it knows which one I'm editing. There's the text next to it that's a separate thing? In the picture it's Proteasome that's been changed, not DNA repair, but I get it, same thing for my row."

"I remember a tool where clicking the legend just selected the genes. If this one does that when I click the name and the colour when I click the square -- that's fine, as long as the square's big enough to hit. It's small. On my trackpad I'd probably hit the name half the time first."

## 3. Choosing the colour

**Screen: the picker, Custom tab.** "Big blue gradient square, a rainbow slider, Hex box. That's the Photoshop picker. I don't pick colours from a gradient, I'd just make something ugly. Underneath: 'Not used in this layer' with one orange square, and 'Used in this layer' with seven squares."

"So in their example Proteasome had been moved off orange, so orange is free. In my case, all eight colours are taken by my eight modules. So what's under 'Not used in this layer' for me? Nothing? Then it's just the same eight again, all used. I'd be picking a colour another module already has. That doesn't solve anything, it just moves the problem."

**Screen: Libraries tab.** "Palettes: Okabe-Ito, which I assume is what I've already got, then Orange to brown, Viridis, Blue to red. Those are gradients, for fold change. There's no second set of group colours here. Nothing like 'here are twelve colours that are safe'. So I'm back to typing a hex."

"What I'd actually do: open a new tab, google 'colour-blind safe palette', find the Paul Tol list or ColorBrewer, copy a purple hex, paste it into the Hex box. Say a reddish purple. Five minutes, and I'd still not be sure."

## 4. The warning

**Screen: change a color from the legend.** "Oh, wait. After they picked light blue for Proteasome, the legend row got a little '!' -- 'Too close to Ribosome's sky blue. Fix...' -- and a black bar at the bottom: 'Proteasome is now light blue, was orange. Too close to Ribosome. Undo'."

"That's actually good. It told me the old colour, it told me the problem in words, and there's an Undo. And the legend square itself changed to the new blue, so I don't have to wonder whether the legend follows. That was my worry last time -- a legend that says one thing and the network another. Here it moved."

"But two things. One: it knows when two colours are too close. Then why didn't it tell me Proteasome and DNA repair were too close before I even started? That's my actual problem and there's no '!' on either of them in the legend. Either it thinks they're fine, or it only checks colours I choose. If it thinks they're fine, whose eyes is it using? Mine or my PI's?"

"Two: 'Fix...'. What does Fix do? Pick a colour for me? From where? I'd click it, because it's there, but I wouldn't trust whatever it chose until I saw it. If it picks something that's safe for colour-blind people and says so, great, that's the button I wanted. If it's just a random different colour, no."

"And 'too close' -- too close how? For normal eyes? For red-green? For grayscale? That word matters to me. For my PI, orange and vermillion are 'too close'. For me they're not. It doesn't say."

## 5. The Look menu, again

**Screen: Look menu.** "Screen, Print, High contrast. Print: 'Reads in gray on white paper and for colour-blind readers.' Now that's literally what the task says -- a colleague has to read it. But 'Where a color shows a direction, a shape shows it too.' My modules aren't a direction. So for my nine modules, does Print give DNA repair a different gray from Proteasome, or a different shape, or nothing? It doesn't say. 'Colors you set by hand are kept' -- OK, so if I set DNA repair myself it stays."

"I wouldn't touch it without seeing the network in Print first. There's no preview in the menu."

## 6. Other ways I noticed

**Screen: shape picker.** "The Shape panel lets me map module to shape, nine categories. In Cytoscape I could also do that. Nine shapes in a figure is a mess though. Reviewers hate that. Colour it is."

**Screen: module as color panel.** "The value list with 'Change color...', 'Move to Other', 'Select nodes', 'Create set'. Same as last time, that's the Cytoscape discrete mapping and I'd find it. 'Move to Other' just hides the module in gray. No."

## 7. Where I end up

"So: click DNA repair's square, Custom, paste a hex I got from somewhere else, look at the network, hope no '!' appears, and if it does, try 'Fix...'. Then I'd export and send it to my PI and ask him. That's what I do in Cytoscape too -- he's my colour-blindness test."

"It's done, I think. But I'm not confident it's done for him."

---

## Single Ease Question

"How easy or difficult was this task?" (1 = very difficult, 7 = very easy)

**5.**

"Getting to the colour was easy this time: click the square in the legend, picker opens, legend updates, it tells me what it was before and I can undo. That's better than Cytoscape. The warning is the best thing here. But it didn't warn me about my actual pair, it didn't say whose eyes 'too close' is for, and it still didn't offer me a safe colour I'm not already using. The hard part -- which colour -- I still solve with Google."

## Would I use this instead of Cytoscape?

"For recolouring groups? It's a bit nicer. The undo and the 'was orange' message I'd like in Cytoscape."

"But no, not instead. The figure goes in the paper from Cytoscape because that's the lab protocol and I know how to cite it. And whether DNA repair is orange or purple doesn't change what the network shows -- the enrichment does that. I'd maybe use this to look at modules. The figure stays where it is."

---

## Observations (moderator)

1. **The legend swatch now opens the picker directly.** Her first move (click DNA repair's square) worked, where last round it selected the group. The swatch is small next to its label; on a trackpad she expects to hit the label (select) first. Severity: low.
2. **The legend follows the change, visibly.** The swatch recolours and the notice names the old color with Undo. Her earlier fear of a legend that disagrees with the network is answered on screen. Delight.
3. **The too-close check does not flag the pair she came to fix.** The default palette's orange and vermillion carry no warning, so she reads the flag as "only checks what I pick" or "thinks these are fine". Either reading undercuts trust in the flag for the task. Severity: high.
4. **"Too close" does not say for whom.** Normal vision, red-green, or gray print are different answers for her PI. Severity: medium.
5. **"Fix..." does not say what it will do.** She would click it but not trust an unexplained automatic colour. If it offered a named colour-blind-safe choice she would call it "the button I wanted". Severity: medium.
6. **No unused safe colour when all eight palette colours are taken.** With eight modules, "Not used in this layer" is empty for her; Libraries has no second categorical palette. She falls back to an outside site and a hex. Severity: high (unchanged from last round).
7. **The Print look still does not say what it does to categories**, and there is no preview. She will not switch Look blind. Severity: medium (unchanged).
8. Shape by module was seen and rejected as unreadable for nine groups; "Move to Other" rejected as hiding a module.
9. Scepticism held: easier restyling did not change her answer on switching.
