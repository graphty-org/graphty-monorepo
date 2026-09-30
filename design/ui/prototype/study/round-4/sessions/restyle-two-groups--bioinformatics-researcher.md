# Session: two groups are drawn in colors you cannot tell apart -- Dr. Chen (computational biologist)

Participant: Dr. Chen, a computational biologist who builds protein interaction networks in R (igraph) and
makes her figures in Cytoscape. Not color-blind herself, mild presbyopia; checks every figure for
red-green safety because co-authors and reviewers need it. Laptop on a 27-inch monitor, played at
1440 x 900.
Task given by the moderator: "Two of the groups are drawn in colors you cannot tell apart. Fix that so a
colleague can read the picture."
Screens used, in order: the protein network with nothing selected (module colors, legend in the corner,
Style stack on the right); the same network with the Style stack's module rows opened out; the
"Module as color" editor (one color per value) on the color-by-value page, with a value's menu open; the
color picker from the "add a layer for the selection" state; the Look menu (Screen, Print, High
contrast).
Renders: shots/record/r4-chen-restyle-frame-at-rest.png, r4-chen-restyle-inspector.png,
r4-chen-restyle-categories.png, r4-chen-restyle-styles-add-to-selection.png,
r4-chen-restyle-styles-looks.png, r4-chen-restyle-styles-list.png, r4-chen-restyle-colour-by-value.png.

Outcome: completed, with difficulty. She identified the pair (the near-black "MAPK signaling" module and
the dark gray "Other" bucket, with orange "Proteasome" against vermillion "DNA repair" as the runner-up for
a color-blind reader) and found the per-value "Change color..." in the module editor, but only after
going past the legend (not clickable) and a Style stack that hides both groups behind "6 more". The
picker offered no free color and no way to check the result for color-blind readers or in gray, so she
typed a hex from memory and did not trust that the fix would survive the Print look. Single Ease
Question: 4 of 7.

## Transcript (think-aloud)

**1. Which two?**

"Right, the module picture. Eight modules and an 'Other'. First thing -- that's Okabe-Ito. Sky blue,
orange, bluish green, blue, vermillion, reddish purple, yellow, black. Good, somebody read the Nature
Methods column. So it isn't the palette that's the problem, it's what they did around it.

Which two can't I tell apart... Ribosome and Spliceosome are both blue, but one's light and one's dark,
they'd survive grayscale, and they're on opposite sides of the drawing anyway. Proteasome orange and DNA
repair vermillion -- those are next to each other, bottom left, and at that dot size, for anyone with a
deutan deficiency, they'll merge. But the one *I* actually can't separate is in the middle: MAPK
signaling is black, and 'Other' is this dark charcoal. MAPK1 sits right in among the unassigned hubs --
HSP90AA1, AKT1, UBC, YWHAZ -- and I can't tell which of those dots are black and which are gray without
leaning in. Let me check the legend... yes, the Other swatch is nearly black. On a projector in a lab
meeting those are the same color.

So: MAPK signaling versus Other. The honest fix is that 'Other' shouldn't be dark at all. Unassigned is
the least interesting thing in the picture; it should be a light gray and sit back."

**2. Clicking the legend**

"Cytoscape wouldn't let me do this either, but every web chart does: I'll click 'Other' in the legend
card and expect a color swatch.

...Nothing. It's a picture of a legend, not a control. Fine. Where's the thing that writes the colors?"

**3. The Style stack**

"Right panel, 'Style stack'. 'Module color', 'Base style'. That's my discrete mapping, in Cytoscape
terms. I'll click 'Module color'.

On the other screen it's opened out -- Ribosome, Proteasome, Complex I, and then '6 more'. So the two
groups I care about, MAPK signaling and Other, are exactly the ones hidden behind '6 more'. The list is
cut by size, largest first, which is the wrong order for this job -- the small ones are the ones people
lose. I'd click '6 more'. I'd also expect that clicking the chit next to a module name opens a color,
and I can't tell from this whether it does. It isn't styled like a button.

Also: the top of this panel says 'Human protein interactions' and on the next screen my project is
'Stress response study'. Same 300 nodes, same 1,262 edges. I'll assume that's the mock, not two
projects. And on this screen the right panel runs off the edge of the window -- 'undirecte', '0.028' --
I can't read the numbers."

**4. The module editor**

"This is the page where it says 'Module as color, writes Module color'. OK, that's the thing. Scale:
'one color per value'. Good, it isn't offering me a gradient for categories -- I have reviewed papers
where somebody put module IDs on a viridis ramp. Palette: 'Eight distinct colors'. I want the name. If
this is Okabe-Ito, say Okabe-Ito, because that's what goes into the figure legend and the methods. 'Eight
distinct colors' is marketing.

'Values, largest first' -- all nine with counts. 56, 40, 35, 32, 31, 30, 29, 21, and 'Other:
Unassigned', 26, marked 'moved'. Those match the legend. Good, I'd have checked.

'Past 8 colors: fold into Other'. So there are nine groups and eight colors, and the ninth gets this
charcoal. That's where my problem comes from. 'No value: 0 nodes, not painted' -- I like that it tells
me zero.

There's a menu open: 'Change color...', 'Move to Other', 'Select nodes', 'Create set'. It's floating
off the side next to the 'Past 8 colors' line, and I'm not certain which row it belongs to -- I'll
assume the Other row, because that's the one just above it. 'Change color...' then."

**5. The picker**

"The picker is the usual one: a saturation square, a hue bar, opacity, hex. And a row of swatches: the
same eight colors plus a mid gray. Every one of those eight is already used by a module. So if I'd
picked Proteasome versus DNA repair instead, this would offer me nothing to change to -- I'd be swapping
one taken color for another. There's no 'unused' swatch, no 'this is close to MAPK signaling' warning,
no preview for deuteranopia or grayscale. I'm doing the color science in my head.

For Other I'll type a hex. BBBBBB, light gray -- no, that's close to the edge gray. CCCCCC with a darker
outline, if the base style has one. I can't see from here whether the node outline comes from 'Base
style' or not. I'll type CCCCCC and look at the canvas.

If it behaves like the legend promises, the legend updates -- the legend is drawn from the same layer,
so it should. I'd check the corner card says CCCCCC-ish for Other before I believed it."

**6. The Look menu, which I nearly used instead**

"There's a 'Look' on the Style stack. 'Print: reads in gray on white paper and for color-blind readers.'
That sounds like exactly my task, and I don't trust it. What palette does it switch my modules to? It
says 'where a color shows a direction, a shape shows it too' -- that's for fold change, up and down.
Modules don't have a direction. Nine categories in gray are not separable by lightness alone, nobody can
do that, so either it adds shapes to categories too or it quietly gives me nine grays.

And the bottom line: 'Colors you set by hand are kept.' So the CCCCCC I just typed survives the Print
look -- fine, that's what I want for Other -- but if I'd fixed orange versus vermillion by hand-picking a
color, Print would keep my hand-picked color and could make it worse, and nothing would tell me. I'd
want the Look to warn me which hand-set colors it can't vouch for.

I'm not clicking Print. It's for the whole project and there's no preview."

**7. Would a colleague read it now?**

"MAPK signaling black, Other light gray: yes, that pair is fixed. The orange/vermillion pair is still
there for a deutan reader, and the tool gave me no way to check that. In R I'd run the figure through
colorblindr or dichromat and look at it. Here, nothing -- I'd have to export and simulate outside.

What I really want for nine categories is shape as a second channel on two of them, or an outline --
the rule in every figure guide. The fill editor had 'Shape' as a section, so maybe I could add a layer
for the Proteasome set with a different shape. But that's a second layer I'd have to keep in sync with
the module mapping by hand, and it wouldn't be in the module legend. I'm not going to do that today."

## Single Ease Question

4 of 7. "The control exists and it's the right one -- one color per value, with counts. It took me four
places to find it, the two groups I needed were hidden behind '6 more', and once I was there it gave me
no help choosing a color a colleague could read."

## Would she use this instead of her current tool?

"Not for this. In ggplot this is scale_color_manual with one value changed and a colorblindr check, in a
script I can rerun. In Cytoscape it's the discrete mapping panel, one click per value, and it's no worse
than this. What would move me: name the palette so I can cite it, give 'Other' a light gray by default,
put a deuteranopia and grayscale preview next to the palette, and let me add a shape per module in the
same editor. Then it beats Cytoscape. Today it's equal at best, and the script wins because it's
reproducible."

## Observations for the designers (moderator notes)

- The legend card was her first click target; it is not interactive.
- The Style stack truncates category rows largest first ("6 more"), hiding the small groups, which are
  the ones most likely to need a color change.
- The default "Other" gray (#505050) sits next to MAPK signaling's black; the default creates the
  confusable pair the task describes.
- The value menu floats beside the list and did not clearly belong to one row.
- The picker's swatches are exactly the colors already in use; no free color, no similarity warning,
  no color-vision or grayscale preview.
- The palette is labelled "Eight distinct colors", not by its name (Okabe-Ito), which she needs for
  the figure legend and methods.
- The Print look promises color-blind safety but is project-wide, has no preview, and keeps hand-set
  colors without saying whether they still pass.
- No redundant encoding (shape) for categories inside the categories editor.
- Screen consistency: the project name differs between screens, and the inspector screen's right panel
  runs off the window at 1440 wide, clipping numbers.
