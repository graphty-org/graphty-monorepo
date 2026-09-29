# Session: restyle two groups -- Dr. Chen, computational biologist

Task as read by the moderator: "Two of the groups are drawn in colors you cannot tell apart. Fix that
so a colleague can read the picture."

Screens seen, in the order she looked at them (participant view, design notes hidden):

- `screens/frame-at-rest.html` -- shots/r6-chen-restyle-frame-at-rest.png
- `screens/inspector.html` -- shots/r6-chen-restyle-inspector.png
- `screens/colour-by-value.html` (states 4, 7 and 8) -- shots/r6-chen-restyle-colour-by-value.png,
  shots/r6-chen-restyle-cbv-categories.png, shots/r6-chen-restyle-cbv-legend.png,
  shots/r6-chen-restyle-cbv-run-colors.png
- `screens/styles-list.html` (default, Looks menu, Libraries tab) -- shots/r6-chen-restyle-styles-list.png,
  shots/r6-chen-restyle-sl-looks.png, shots/r6-chen-restyle-sl-libraries.png

## Think-aloud

**Frame at rest.** "This is Les Miserables. That's not my network. Fine, it's the demo. Groups 0 to 8,
Okabe-Ito order -- orange, sky blue, green, blue, vermilion, pink, black. Other is a light gray now and
the legend says what's in it, 'Groups 6, 7 and 10'. Good, that was my complaint last time. Group 2 and
group 3, orange and vermilion, are the pair I'd worry about for a deuteranope -- they're both at the top
left and they touch. But I'm not going to restyle a novel. Where's my protein network?"

**Inspector.** "Right, Human protein interactions, modules. Now the pair is obvious: Proteasome is
orange, DNA repair is vermilion, and they sit side by side under TP53. My colleague on the review panel
is deutan; those two will be the same muddy tan to him. Proteasome and TGF-beta, orange and yellow, are
the second risk. That's the task.

The right panel still runs off the edge -- 'confidence, not used y...', '0.028', the counts on the module
rows are cut. The Style stack still shows three modules and '6 more'. DNA repair is hidden in the stack.
It IS visible in the canvas legend this time, fifth row, so I'll go there. And the project is called
something different on every screen -- 'Stress response study', 'Human protein interactions'. It's the
same 300 nodes, 1,262 edges, so I'll assume it's one network."

**Clicking the legend.** "Last time the legend was dead. Let me click the DNA repair swatch." (Views the
legend state.) "OK -- the swatch opens a picker right beside the legend. That's what I wanted in round
five. Custom and Libraries tabs. It reads the color back in words -- 'Light blue, picked for
Proteasome' -- and every chip has a name, Vermilion, Sky blue. I can put those names in a figure legend.

Hm, the example here is someone who made it worse: they turned Proteasome light blue and it's flagged,
'Too close to Ribosome's sky blue. Fix...'. And there's a notice with Undo. Fine, that's a sensible
guard.

But then -- why is nothing flagged BEFORE anyone touched it? Orange next to vermilion is the pair I
would have flagged. So either the check thinks they are fine, or it only checks colors I pick by hand.
Which vision model is it measuring distance in? Normal trichromat? Deutan? It doesn't say. Light blue
versus sky blue is a clash for anybody; that's not the case I care about. If the check is run for normal
vision only, it's useless for my task, and if it's run for deutan it should have caught orange and
vermilion already. I can't tell which, so I can't trust a clean legend to mean 'safe'."

**The picker's colors.** "'Not used in this layer' -- one orange chip, because the example freed it.
In my real case I have eight named modules and eight palette colors. Nothing would be free. The picker
would offer me zero unused colors and seven used ones. So the 'unused first' idea runs out exactly when
I need it, at eight groups. I'd have to type a hex. What hex? I'd pull up a colorblind-safe extension
like Paul Tol's in another tab, copy one, paste it here, and hope. The tool doesn't help me choose a
ninth color that is far from all eight for a deuteranope."

**What would Fix... do?** "I click Fix..." (It does nothing in the mock.) "I'd guess it proposes the
nearest color that clears the check. If it did that in deutan space and showed me a before-and-after,
that is the whole task in one click. Right now it's a link that goes nowhere, so I can't score it."

**The run's layer (Louvain).** "Here somebody recolored Community 8 from yellow to dark gold, and it's
kept on a re-run with the same seed. Good -- re-runs keeping my colors matters, I re-run everything.
But look: dark gold, sitting two rows under Community 1's orange. Same hue, a bit darker. To a
deuteranope that is exactly the pair from my task, and there is no flag on it. So the flag missed the
one pick in these screens that I'd have flagged. That confirms my suspicion: it is not checking for
color-vision deficiency, or the threshold is loose."

**The categories editor.** "'Values, largest first', all eight listed, counts beside them. The row menu
has Change color..., Move to Other, Select nodes, Create set. Change color is the same picker, I assume.
Move to Other -- no, DNA repair is not 'Other', it's the module with TP53 in it. The palette still says
'Eight distinct colors' here, but in the Libraries tab the same palette is called Okabe-Ito. Say
Okabe-Ito in both places; I'm citing it."

**Looks menu.** "Print: 'Reads in gray on white paper and for color-blind readers. Where a color shows
a direction, a shape shows it too.' Modules don't have a direction, so shape won't kick in for me. And
'Colors you set by hand are kept' -- so if I hand-pick a color for DNA repair, Print leaves it alone and
doesn't tell me whether it still passes. It's project-wide and there's no preview. I'm not switching my
whole project to find out."

**Where she stops.** "What I would actually do: click DNA repair's swatch, type a dark purple or a
reddish purple that isn't Cell cycle's, apply. Then export and run it through a deuteranopia simulator
outside, because nothing here shows me what my colleague sees. And I'd still want a second channel --
a shape or an outline for DNA repair -- because I don't trust nine categories to color alone. The shape
exists as a separate layer, but it isn't in this editor and it won't be in the module legend."

## Single Ease Question

**5 of 7.** "Changing one group's color is now two clicks from the legend, which is where I look first,
and the color has a name I can quote. That's real progress. What keeps it from a 6 or 7 is that the
task isn't 'change a color', it's 'make it readable for a colleague who is color-blind', and the tool
gives me no way to see that: no deutan preview, a too-close check that stays silent on the default
orange-vermilion pair and on the dark gold next to orange, no free color once eight modules have used the
palette, and a Fix button I couldn't try."

## Would she use this instead of her current tool?

"For this job, about even with Cytoscape and still behind my script. In ggplot it's one value in
scale_color_manual and a colorblindr check I can rerun; in Cytoscape it's the discrete mapping, one
click per value. This is now as quick as Cytoscape, and the named colors and the re-run keeping my picks
are better. What would move me over: a deuteranopia and grayscale preview beside the picker or in the
legend; a too-close check that is explicitly measured for color-vision deficiency and runs on the
defaults too, not just my picks; when the palette is exhausted, suggest a ninth color that clears all
eight; and a shape per category in the same editor so it lands in the same legend. With that I'd do the
module figure here instead of in R."

## Observations for the designers (moderator notes)

- Found the control quickly this round: the legend swatch was her first click and it now opens the
  picker. The shift from 4 to 5 comes from this.
- The too-close flag does not say which vision model it measures, and it fires only on hand picks. She
  read the silence on orange (Proteasome) versus vermilion (DNA repair) as either "the check thinks this
  is fine" or "the check doesn't look", and trusted neither.
- The run's-layer example shows a picked dark gold (#B8860B) two rows from orange (#E69F00) with no flag;
  she took this as evidence the check does not model deuteranopia.
- With 8 named modules and an 8-color palette, "Not used in this layer" would be empty; the picker's
  help ends exactly at the palette size, which is the common case for her.
- "Fix..." is not wired; she guessed it proposes a nearest passing color and said a deutan before/after
  would make it the whole task.
- Palette naming is inconsistent: "Eight distinct colors" in the categories editor, "Okabe-Ito" in the
  picker's Libraries tab.
- The Print look keeps hand-set colors and does not say whether they still pass; shape only applies to
  direction, not to categories.
- No shape or outline control inside the categories editor, so a redundant encoding would be a separate
  layer outside the module legend.
- Screen consistency: the project name differs between screens ("Les Miserables", "Stress response
  study", "Human protein interactions"); the inspector screen's right panel is still clipped at 1440
  wide; the Style stack still truncates modules to three plus "6 more", hiding DNA repair there.
