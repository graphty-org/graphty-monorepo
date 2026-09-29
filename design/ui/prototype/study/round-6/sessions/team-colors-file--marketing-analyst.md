# Session: make this project look like the team's -- Jordan, marketing network analyst

Task as read aloud by the moderator: "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like the
team's."

Screens seen, in the order she reached them: the styles list (Style stack "+" menu), the Data
panel, the update-and-recipe screens (the file dropped on the canvas, its binding step, the
result), and the recipe screen for a recipe that expects data (for comparison). The mocks show a
fraud-transfer network and a protein network rather than a mention network; she was told to
treat them as her own project.

## Think-aloud

**1. Where does a style file go?**

"OK, so I've got the attachment. My first instinct is just drag it onto the map, that's what I'd
do in anything. But let's say I look first. This is about how it looks, so... the right side, the
Style stack thing. That's the colors, right? There's a plus."

(Styles list, the "+" menu open.)

"Empty layer, no. 'From a recipe or file... Only a recipe's styles; your data stays here.' Recipe?
I don't have a recipe, I have Sam's colors file. But 'or file' -- fine, that's me. And 'your data
stays here', good, because that was going to be my next question. I'd click that."

"The two suggested ones underneath -- 'Mute categories under this scale' -- I don't know what
that means and it's not what I'm doing. Ignore."

**2. Checking the Data panel on the way**

(Data panel.)

"Oh, down here too: 'Applied recipes. None yet. A recipe is a file of styles, sets or runs, from a
colleague or another project; a file of colors and sizes is a recipe too.' OK, so they're telling
me my colors file is a 'recipe'. That's literally my sentence, so somebody's been listening. But
I'd never have looked in 'Data' for colors -- this is at the bottom, in grey, under Versions. I
only saw it because I was poking around."

"And wait -- on this screen the Style stack on the right is empty and there's no plus on it.
So if I'd started from a fresh project, the place I went first has nothing to click. Hm."

**3. Dropping the file**

(The file dropped on the canvas; the Apply dialog, "Apply recipe fraud-team-colors".)

"Right, I dragged it on. 'A recipe that holds only styles: 4 layers, bound by attribute name.'
Bound by attribute name, whatever -- I'll take 'holds only styles' as 'this is just the look'.
Good."

"Two choices. 'Use these styles... Its 4 layers take the place of these 3 of yours, which write
the same thing: Risk ramp, Risk color, Mule ring.' And 'Add these styles on top... all 8 stay.'"

"I want it to look like the team's, so 'Use these'. But hang on. It's throwing out Mule ring? The
ring is the thing I flagged, that's my actual finding. I want the team's colors, I don't want to
lose my highlight. And which of the four new ones replaces which of my three? It says four take
the place of three. I can't tell from this. Is Amount width replacing my ring? That's not even a
color."

"If I pick 'Add on top' instead, do I actually end up looking like the team, or is my old stuff
bleeding through underneath? It doesn't say. So neither option is exactly 'make it look like
Sam's and keep my ring'. I'll go with Use these because that's the task, and I'll hope Undo is
real."

"Also, weird: behind the dialog, the list on the right already has 'recipe' layers in it --
Watchlist ring, Pass-through edges, Risk ramp -- before I've chosen anything. Did it already
apply? Or were those from some earlier file? I didn't put them there. That makes me nervous about
what 'your 3' even means."

"At least it says 'Nothing commits until one is chosen' -- no, actually, it doesn't say that on
the dialog, it just has Cancel. Fine, Cancel is there."

**4. The binding step**

(Bind attributes: fraud-team-colors.)

"'1 layer to bind.' Bind. OK. 'Chargeback heat reads chargeback_rate, numbers. This graph has no
such attribute. Ask the sender which one they meant.' That, I get. Sam's data had a column I
don't have. Plain English, thank you. The dropdown says 'Leave unbound' and the note says it'll
be kept and switched off. Fine, leave it. I'm not going to go digging for what chargeback means
in my data -- in my world that'd be, like, an engagement rate column Sam has and I don't. I'd
Slack Sam."

"'3 layers matched by name: Cleared accounts, Merchant hubs, Amount width.' Matched means it found
my columns with the same names. Good. That's what I'd want to check, and it told me without
making me map anything."

"Apply."

**5. The result**

(The team's styles in use.)

"Toast: 'fraud-team-colors in use: 3 of your layers replaced; 1 missing attribute. Undo.' Good,
Undo right there."

"Right side: four new ones at the top marked 'new', Chargeback greyed with a warning and an
eye-slash. Hovering it says 'missing attribute: chargeback_rate. Bind... in its row's menu'.
Clear enough."

"But... the map. The map is still the grey honeycomb. Where are the team's colors? The whole
point is it should look like the team's deck. Before I applied it I at least had orange dots for
the ring and a little key in the corner saying Flagged yes/no. Now the orange is gone, the key is
gone, and nothing on the map looks like anything. If I were sitting here for real, I'd assume it
didn't work and hit Undo."

"And I can't check it against Sam's version. There's no 'this is what it looked like when Sam
made it' picture, no legend showing me the team palette. How do I know it matches? I'd end up
screenshotting both and eyeballing them side by side in a slide. That's what I do now."

"Where did the file end up, by the way? It's listed under Data, 'Applied recipes: fraud-team-colors,
Colors and sizes only, no data. Applied Apr 20.' OK, nice that there's a record. My manager will
ask 'is this the current team template' and at least I can say which file and when."

**6. Comparing with a full recipe**

(Recipe screen, a recipe that expects data; the binding step with 84 of 96 matched.)

"This other one, 'Expression overlay', is a whole analysis -- it wants a table, it matches genes,
it asks which column is the fold change. That's a lot more. Mine was just colors, and I'm glad
mine didn't make me do all that. Though both being called 'recipe' makes me think the colors
thing is heavier than it is. The 'Data stays on this computer' box on that one is nice; I didn't
see that big a statement on mine, only the one line in the menu."

## Single Ease Question

**4 out of 7.**

"Getting the file in was easy -- I dragged it, it knew it was just styles, it told me my data
wasn't going anywhere, and it asked me one question about a column I don't have in words I
understood. That part's better than I expected. What drags it down: it threw out my flagged ring
to make room, it didn't tell me which new layer replaced which of mine, and then the map didn't
visibly change, so I couldn't tell whether I'd succeeded. I'm not giving a task a high score when I
can't see if I did it."

## Would she use this instead of her current tool?

"For this specific job -- yes, probably, if the map actually changes. In Gephi, making it look like
the team's means opening the old project, reading the hex codes out of the Appearance panel and
typing them in again every single time, and sizes by hand. A file you drop on and it just matches
by column name -- that's a real step saved, and I'd push the team to all use one file. But I'd
still keep the screenshot of Sam's version open to check it, because nothing here shows me what
'the team's look' is supposed to be. And I'd want it to leave my own highlights alone. If it eats
my ring every time I apply the team colors, I'm redoing work, which is exactly what the file was
supposed to save."

## What she stumbled on (moderator notes, in her terms)

1. After Apply, the canvas showed no visible change (grey honeycomb, no legend), and the orange
   ring she had flagged disappeared. She would have undone it believing it failed. Severity: high.
2. "Use these styles" replaces her own highlight (Mule ring) along with the look. She wanted the
   team look and her finding; neither choice says it gives both, and "Add on top" does not say
   whether the result would match the team's look. Severity: high.
3. "4 layers take the place of these 3 of yours" does not pair new layers with old ones, and one
   replacement (Amount width, an edge width) did not look like it wrote "the same thing" as a node
   color. Severity: medium.
4. No reference for what the team look should be: no thumbnail or key of the colleague's version
   in the dialog or after. She would verify against a screenshot outside the tool. Severity:
   medium.
5. Recipe layers already listed in the Style stack behind the dialog, before she had chosen
   anything, made her unsure whether the file had already applied. Severity: medium.
6. With an empty Style stack (Data panel screen), the stack header had no "+", so her first
   place to look offered nothing. The Data panel line "a file of colors and sizes is a recipe too"
   matches her words but sits at the bottom of a panel she would not open for colors. Severity:
   medium.
7. "Recipe" for a colors-only file still reads as heavier than it is; "or file" in the menu and
   the Data panel line rescued it. "Bind" and "unbound" are jargon, but the sentence next to them
   explained them. Severity: low.

## What worked for her

- Dragging the file onto the map was accepted and recognised as styles only.
- "Your data stays here" in the menu answered her data question before she asked it.
- The one missing-column question was in plain words and told her to ask the sender.
- Matching the other layers by column name with no mapping step.
- Undo in the result toast, and a dated record of the applied file under Data.
