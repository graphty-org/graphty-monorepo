# A figure a reviewer can read, even in grey -- Jordan, marketing analyst

**Participant:** Jordan, a growth-marketing analyst who "does the network stuff" one or two days a
week (simulated; see `study/personas/marketing-analyst.md`). Reads legends and column headers
carefully, skims helper text, has had slides printed in greyscale and come back unreadable.

**Task as read by the moderator:** "Make the picture show which genes changed most, so a reviewer
can read it, even printed in grey."

**Screens, in order (study view, 1440 by 900):**

1. The styles list as it opens: betweenness colour on, its editor open
   (`shots/tasks/figure-for-reviewer/01-styles-list.png`).
2. A new style layer, the colour picker open on "From the data"
   (`shots/tasks/figure-for-reviewer/02-colour-by-value.png`), then the layer after she picked
   log2FoldChange (`shots/r3-jordan-fig-screens_colour-by-value_html_numbers.png`).
3. Back in the styles list: the fold change size layer, covered by degree size
   (`shots/r3-jordan-fig-styles-covered.png`); the hub labels layer
   (`shots/r3-jordan-fig-styles-top-n.png`); the Look menu (`shots/r3-jordan-fig-styles-looks.png`).
4. The export dialog, Screen look with the grey warning
   (`shots/tasks/figure-for-reviewer/03-export-dialog-figure.png`, `04-...-figure-grey.png`), after
   "Use Print look" (`shots/r3-jordan-fig-screens_export-dialog_html_figure-print.png`), and the
   same dialog with her fold change layer in the Print look
   (`shots/r3-jordan-fig-screens_export-dialog_html_figure-signed.png`).

**Outcome:** finished with difficulty. She got a figure with the key built in and a grey check,
which she liked a lot. But in the grey version the genes that went DOWN the most came out the
palest dots on the page, and the legend said "darker is higher", so a reader of the printout would
think those genes changed least. She only caught it because she reads legends. She also could not
tell whether "Top 12 by" could rank by the size of the change in either direction, so she was not
sure the labels named the biggest changers.

## Transcript

### 1. The styles list, as it opens

> OK. "Stress response study." Genes -- well, it says proteins everywhere. Fine, I'll assume
> they're the same thing for this. I'm not a biologist.
>
> So it's already coloured by... betweenness. Orange to brown. That's the "bridges" thing. Not
> what I was asked. I was asked "which changed most". Over on the right under Attributes there's
> "log2FoldChange, -2.52 to 3.15". That's the change, I'm guessing. Log two fold, that's like
> double or half, right? Our data-science guy uses it for campaign lift sometimes.

She looks at the Styles section on the left.

> Styles: Betweenness color, Hub labels, Degree size, Base style. It's a layer list, like
> Photoshop. OK, I get that. There's a plus. I'd rather add my own than mess with the one "written
> by the run" -- I'm not touching that, it's got a lock on it basically.

She clicks the plus beside Styles.

### 2. A new layer, colour from the data

> "Style layer 1." Great name. Applies to "All nodes". Fill, colour 808080. I click the little
> sliders thing next to the colour... oh, a picker. "Palette colors", and then "From the data":
> log2FoldChange, "numbers, -2.52 to 3.15". Module, categories, nine. That's nice, actually, it
> tells me what kind of thing each one is before I pick it. Gephi just gives you a dropdown of
> column names and you find out after.

She picks log2FoldChange.

> Red to blue. Red is down, blue is up, white-ish in the middle is zero. It says so, down at the
> bottom: "The palest color sits at 0. Below 0 is red, above 0 is blue." Good. And the key in the
> corner: below 0, 148; above 0, 152. So about half went down and half went up.
>
> But that doesn't tell me which changed MOST. It tells me the direction. On screen the dark red
> and dark blue ones pop, sure. Printed in grey? Dark red and dark blue are both just... dark. So
> you'd see "changed a lot" but not which way. Which is honestly maybe fine? The task said which
> changed most, not which way.
>
> The layer's still called "log2FoldChange color". Whatever, I'd rename it "Change" if I could
> find where.

"Scale: linear", "Midpoint 0", "Fix at current value" -- she skips all of it.

> I'm not touching the scale stuff. Defaults.

### 3. Making the big changers big, and naming them

> What I'd actually do for a VP: make the ones that changed most BIG, and put their names on.
> Size is the thing people read first. Can I weight them by the change? Like, the ones that moved
> most are heavier?

The moderator shows her the styles list where a fold change size layer already exists.

> OK, "Fold change size", |log2FoldChange| with the little bars around it -- I think that's
> absolute value, from school maths. And it says it in words: "By magnitude, sign not shown: 148
> went down and 152 went up. Color by log2FoldChange to show the direction." Oh, that's exactly
> it. Size is how much, colour is which way. That's the slide.
>
> But it says "paints 0 of 300 proteins" and "Covered by Degree size above". So it's doing
> nothing because the other size layer wins. That would have got me -- in Gephi I'd have just
> stared at it wondering why nothing moved. Here it says why and there's a "Move above" button.
> I'd click that. Fine. That saves me an actual argument with the software.

She looks at the hub labels layer.

> Labels: "Top 12 by degree". MAPK1, TP53, CDK1... Those are the hubs, not the changers. There's a
> dropdown on "degree". I'd switch it to log2FoldChange. But -- top 12 by log2FoldChange, is that
> the twelve highest? Because then I only get the twelve that went UP. The ones that crashed, the
> minus 2.5s, those changed the most too. Is there an absolute-value one in that dropdown, like
> the size layer had? I can't tell from here. If it's not there I'd do two label layers, top 6 up
> and... no, it only does top, not bottom. Honestly I'd export the table, sort in Excel and type
> the names on in PowerPoint. Which is what I'm trying to stop doing.

### 4. The Look, and the export

The moderator points out the small palette icon on the right, beside "Graph".

> I would not have found that. It's a tiny icon. "Look for the whole project: Default, Colorblind
> safe, Print, High contrast." Print -- "Prints well in gray: colors keep their order in
> grayscale and read on white paper." OK, that's the one. But I'd have gone to Export first, which
> is what I did in my head anyway.

She clicks "Export files..." at the top right.

> Big dialog. Scope, full graph, 300 nodes. Figures, Current view, 2x PNG. Methods text, that's
> for the reviewer, nice. "Include legend" is on. Wait, the legend is ON THE PICTURE? It's right
> there in the preview, with counts. I have been pasting keys onto Gephi screenshots in PowerPoint
> for three years. That alone -- OK. That's the thing.
>
> And this yellow bit: "Ribosome and Proteasome look the same in gray. So do DNA repair,
> Complex I and Unassigned..." It checked grey for me. Before the printer did. Our VP prints every
> deck on the office black-and-white because the colour one is "for client work", and I've had
> "what's the light grey versus the other light grey" in a meeting. So yes. "Use Print look." Click.

The Print look preview: "Checked in gray: all 9 modules print as different grays."

> Good. Green tick. Though -- that picture is the modules, the coloured blobs. Not my fold change.
> Is that because this project has a different view saved? The title says "Proteostasis screen",
> my project was "Stress response study". And the files are "proteostasis-screen_current-view.png".
> Which one am I exporting? I'd click Export and then go look in Downloads, which is not a great
> feeling.

The moderator shows the same dialog with her fold change layer, in the Print look.

> OK here's mine. "Fold change (log2). Darker is higher; 0, no change, is the middle gray." Light
> pinky-red at minus 2.52, grey in the middle, dark blue at plus 3.15. Below 0, 148, above 0, 152.
> And it says "Checked in gray: fold change runs light to dark from -2.52 to +3.15."
>
> Hang on. Darker is higher. So the ones that dropped the most are the LIGHTEST. On white paper
> the minus 2.5s are going to be the palest dots on the page -- paler than the ones that didn't
> change at all. A reviewer looks at that and goes "the dark ones changed, the pale ones didn't".
> That's backwards for half of them. The task was "show which changed most", and the biggest drops
> basically disappear.
>
> And the tick says "checked in gray". Checked what? That it goes light to dark, sure. It's
> technically true. But it's the kind of true that gets me a question from the VP I can't answer.
>
> Also, in this preview all the dots are the same size. Where's my fold change size? If I moved it
> above degree back in the styles list, does it come through? It doesn't show here, so I don't
> know. I'd export and check. If the size is there, then honestly the grey colour matters less --
> big dot equals big change, either way. That's what I'd tell the reviewer to look at.

She looks at the Methods text and the footer.

> Methods text: "log2 fold change, linear, diverging at 0, 148 below, 152 above. Print look: one
> ramp, light red (lowest) through middle gray to dark blue (highest)." At least it's honest in
> writing. "2 files go to your Downloads folder. Nothing is uploaded." Good -- I didn't even have
> to ask this time. The background is transparent by default, which for a printout is fine, for
> our dark slide template it's actually what I want.

Off-topic, while looking at the preview:

> You know what kills me, our listening suite has a "network" export and it's a JPEG with no key
> and a watermark. And we pay for it. And half the Instagram data's gone from it anyway.

## After the task

**Single Ease Question:** 4 of 7.

> The export part was easy, easier than anything I've used -- key on the picture, it warns you
> about grey, it tells you nothing's uploaded. The middle part, making it actually show "changed
> most", I needed someone to show me the size layer, I'm not sure the labels can rank by the size
> of the change, and then the grey version quietly makes the biggest drops look like no change.
> If I hadn't read the legend I'd have sent that.

**Would she use it instead of her current tool?**

> For the picture that goes in the deck, probably yes, over Gephi plus PowerPoint -- the key on
> the image and the grey warning are the two things I actually do by hand every time. For this
> kind of change-up-and-down thing I'd want the grey version to go dark at BOTH ends, or just
> tell me "use size for how much" right there in the export. And I'd still want to know what it
> costs before I bring it to my manager, because we already pay for Brandwatch.

## Problems observed

1. **Print look hides the largest decreases (severity 3).** The Print look turns a signed,
   diverging colour into one light-to-dark ramp, so the most negative values print palest -- paler
   than zero. For "which changed most" the legend's "darker is higher" is the opposite of what a
   reader needs for half the data, and the "Checked in gray" tick reassures instead of warning.
2. **No clear way to label the biggest changes in both directions (severity 3).** Labels offer
   "Top N by" a column; she could not tell if it can rank by the size of the change
   (|log2FoldChange|) rather than the signed value, so the labels might name only the biggest
   increases.
3. **The export preview did not show the size layer (severity 2).** Every node in the signed
   preview is one size, so she could not confirm that "fold change size" -- the encoding that
   works in grey -- would be in the file.
4. **Project name and file names disagree across screens (severity 2).** "Stress response study"
   in the styles list, "Proteostasis screen" and "Knockdown overlay" in the dialog, and files
   named "proteostasis-screen_..." left her unsure which figure she was exporting.
5. **The project Look lives behind a small palette icon (severity 2).** She would not have found
   Print there; she found it only in the export dialog.
6. **A covered size layer needed pointing out (severity 1).** Once shown, "Covered by Degree
   size above" and "Move above" made the fix obvious; she liked it.
7. **Generic layer name (severity 1).** "Style layer 1", then the column name; she wanted to name
   it "Change" and did not see where.

## What she liked

- The legend is on the exported picture, with counts ("I have been pasting keys onto Gephi
  screenshots in PowerPoint for three years").
- The grey check warned her before printing and offered a one-click fix.
- "Nothing is uploaded" in the export footer, without her asking.
- The size layer's "By magnitude, sign not shown ... Color by log2FoldChange to show the
  direction" -- "that's the slide".
- The colour picker saying what kind each column is (numbers with a range, categories with a
  count).
