# Grade: session r1-s54 -- Alex, the weekly operations analyst, reads the Station-Stadium bus link and makes its two stops stand out (bus stops)

**Grade: S** (success). Alex answered 4 minutes, the answer key's value, read from the screen:
the edge inspector "Station -> Stadium" (subtitle "Edge") shows From Station, To Stadium,
minutes 4, with a blue band on the line and the left panel's Selection row at 1 (`02.png`). He
then selected exactly the two ends with "Select endpoints" (`04.png`: yellow rings on Station and
Stadium only, "2 nodes selected", Nodes 2, "Edges joining these nodes 1", Selection 2), which
meets the key's S line at that point. He went on to give that selection a Fill color, which made
a style layer named "2 nodes" (6366F1), and clicked empty canvas to clear the selection. On the
last screen (`08.png`) Station and Stadium are blue-purple and the other eight stops keep their
PageRank orange.

**On the end state.** The key's S line names "exactly the two ends selected at the end"; the last
screen has nothing selected. The grade is S because the key grades other routes by the end state,
and the tier 2 failure code `not-marked` counts a color that separates exactly the elements asked
for as marked. Here the color separates exactly Station and Stadium and lasts past a click
elsewhere. The extra steps were his choice of a lasting mark after S was already met, not a
detour. This is the same end state, and the same reading, as in sessions r1-s51 and r1-s52; the
key's S line should name a color on exactly the two ends.

Build seen: `946256efb876 graphty@0.8.56` (session.json), 1440 x 900, no uncommitted changes:
the frozen build the criteria name. The setup `bus-stops-ranked-names.txt` ran to its documented
end (PageRank run, size and color by it, every name shown); the file chooser line in setup.log is
the setup's own upload. Every step's screenshot matches its command. The session is not void.

## What the last screen shows (`08.png`)

- Station and Stadium filled blue-purple; every other stop in the PageRank orange to brown. No
  selection ring.
- Left panel: Selection (no count), "2 nodes", PageRank 10, Everything.
- Canvas legend: "Color: 2 nodes" with a purple swatch, above Size: PageRank and Color: PageRank.
  The legend now covers the top of the "Depot" label.
- Inspector back on Graph, Values: Nodes 10, Edges 17, Directed.

## Measures

- **Clicked the line itself:** yes, first try (`--click-at 752,165`; the tool printed edge id 15,
  the key's edge).
- **How he got from "the two on this tie" to "Select endpoints":** he opened the inspector's
  three-dot menu to "see what's in there" and read "endpoints" as "the two stops on either end",
  calling the word "a bit developer-y".
- **Steps:** 7 after the start. The success path takes 3 (line, Edge actions, Select endpoints);
  the other 4 (Style tab, add Fill, Color, click on empty canvas) made the mark last.
- **Wrong turns: 0.**
- **False "done": none.** His claim, "Station and Stadium are now colored blue-purple on their
  own; every other stop keeps the PageRank orange", matches `08.png`. truth-on-screen: no wrong
  claim.
- **Self-rating** (6 of 7): not used in grading.

## Problems

Severity 0 to 4 (Nielsen). Problems 1 and 2 are how the build draws things, not wording; they also
appeared in session r1-s52 on the same steps, so each is now seen in two participants.

1. **Severity 2 -- while the two stops are selected, the new fill color does not show as itself.**
   Right after Color was chosen, Station and Stadium were drawn a dull gray-tan inside their yellow
   rings, not the 6366F1 purple in the swatch and the legend (`07.png`). The purple appeared only
   after the selection was cleared (`08.png`). Alex: "I couldn't see what color I'd actually given
   them until I clicked away." A user cannot check a color on the very elements it was given to.
2. **Severity 2 -- the canvas legend grows over a node label.** Adding "Color: 2 nodes" made the
   legend taller, and it now covers the top of the "Depot" label (`07.png`, `08.png`; whole in
   `02.png`). Alex noticed it; it spoils the picture he would put on a slide.
3. **Severity 1 -- the new layer and its legend row are named "2 nodes", not after what they
   hold.** On a slide the legend says only "2 nodes", not which two; Alex wanted "Station, Stadium"
   or a way to name it there (`07.png`, `08.png`, debrief).
4. **Severity 1 -- "Select endpoints" is not the user's word and sits behind the three-dot menu.**
   He found it "only because I poke at menus"; "select both stops" would read faster (step 2,
   debrief). Expected by the answer key.
5. **Severity 1 -- nothing says whether a selection is enough to make things stand out.** The rings
   already marked the two stops, but he knew a selection goes on the next click and spent four more
   steps on a color (step 3, debrief). It did not hurt the result.

What worked: the line could be clicked on the first try; the inspector showed the file's own column
name ("minutes") with its value; "Select endpoints" selected exactly the two stops; a Fill color on
a selection made a lasting layer that touched only those two.

## Did the participant hit implementation issues?

Yes, two, both rendering defects rather than questions about what the user needs: the selection
tint hides a just-chosen fill color, and the legend grows over a node label. Neither cost the task;
they cost a moment of doubt and a flawed picture. They are the kind a dry run before the study is
meant to clear, and with r1-s52 they now show up in two of the bus-stops sessions on the same steps.
As a returning user, Alex was helped by his history: he colors things from the Style tab every
week, which is why he reached for a color that lasts.
