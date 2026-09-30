# Session: make this project look like the team's -- Explorer Elena

Participant: Explorer Elena (product manager, no graph training; uses Slides charts and her
company's analytics dashboard; has seen network pictures but has built very few).

Task as given: "Your team always draws its networks the same way, and a colleague just mailed you
the file with those colors and sizes. Make this project look like the team's."

Clock: curious afternoon (no deadline; she tolerates three or four dead ends). The mocks show a
payments network and a protein network, not her account data; the moderator asked her to treat the
open project as hers and the file her colleague sent as `fraud-team-colors.graphty`, which is the
file the screens use.

Screens seen, as a participant sees them (design notes hidden), rendered at 1440 x 900:

- An open project with the Style stack: `shots/record/r6-elena-tcf-styles-list.png`
- The Style stack's Look menu: `shots/record/r6-elena-tcf-styles-list--looks.png`
- The Style stack's + menu: `shots/record/r6-elena-tcf-styles-list--plus-menu.png`
- A layer's color popover, Libraries tab: `shots/record/r6-elena-tcf-styles-list--libraries.png`
- Update, recipe picker, fraud-team-colors choice, binding and result (one tall page):
  `shots/record/r6-elena-tcf-replace-and-recipe-full.png`
- The Data panel: `shots/record/r6-elena-tcf-data-panel.png`
- Opening the file from the email instead (recipe waiting for data, binding, applied, undone):
  `shots/record/r6-elena-tcf-recipe-apply--start.png`, `--binding.png`, `--confirmed.png`,
  `--applied.png`, `--unbound.png`, `--undone.png`

## Think-aloud

**The attachment.**

"OK, so Priya sent me the file. 'fraud-team-colors.graphty'. I don't know what a .graphty is but
I'm guessing it's the thing. Normally I'd just drag it onto the window."

(Moderator: nothing on these screens shows what dropping a file on an open project does.)

"Hm. Then I don't want to drag it, honestly -- if it opens a new thing and I lose what I have,
that's annoying. Let me look around first."

**The open project.**

"OK, picture in the middle, grey honeycomb thing, a few orange dots. Left side is lists, right
side is... numbers and a 'Style stack'. Stack of what? There are little colored squares next to
names -- 'Risk color', 'Community color', 'Mule ring', 'Base style'. So that's where the colors
live. Fine. That's the part I want to change."

"And up there it says 'Look' -- 'Look: Screen'. That's the one. I want it to *look* like the
team's."

**Look menu.**

"'Look for the whole project.' Screen, Print, High contrast. ... No. None of these is 'the team's'.
There's no 'from a file' in here. Print is grey for paper. OK, not this."

(First dead end. She closes the menu.)

**The + next to Style stack.**

"There's a plus. Plus usually means add. I don't want to add, I want to replace, but let's see."

"'Empty layer -- paints nothing until you set a property.' No. 'From a recipe or file...' --
*file*. That's me, I have a file. I don't know why it's called a recipe, it's colors, not a recipe.
But 'or file' -- OK. 'Only a recipe's styles; your data stays here.' Good, 'your data stays here',
I like that. The other two are 'suggested for this graph' -- mute categories, shape by kind -- I
don't know what those do and I'm not going to find out right now."

She clicks From a recipe or file....

**Apply recipe (the picker).**

"'Apply recipe'. A list on the left: 'mule-ring-triage', 'card-testing-sweep',
'expression-overlay'. None of those is mine. Did it not see my file? ... Oh, at the bottom,
'Open a recipe file...'. OK, it wants me to go get it from my downloads. Fine."

She opens `fraud-team-colors.graphty`.

**The fraud-team-colors dialog.**

"'A recipe that holds only styles: 4 layers, bound by attribute name.' I'm going to ignore 'bound
by attribute name'."

"Two choices. 'Use these styles... No data inside. Its 4 layers take the place of these 3 of
yours, which write the same thing:' -- Risk ramp, Risk color, Mule ring. Then 'Your other 5 stay'
and a list. Or 'Add these styles on top... 4 layers above your 8; all 8 stay.'"

"'Take the place of.' So Mule ring goes away? That's the orange dots, right? That was kind of the
point of the picture... But the task is make it look like the team's, not keep my stuff. If the
team's thing already does the ring, fine. It doesn't tell me that though."

"I kind of wish I could see it. Like a before and after. It's all words. I have no idea what 'Risk
ramp' looks like."

"Where's the button? There's only Cancel. Oh -- the two boxes *are* the buttons? OK. 'Either is one
undo step.' Good, so I can take it back. I'll take 'Use these styles', because 'on top' sounds like
it'll just pile on and I'll get a mess."

**Binding.**

"'1 layer to bind. 3 layers matched by name: Cleared accounts, Merchant hubs, Amount width.' OK,
three worked. 'Chargeback heat, reads chargeback_rate, numbers' -- dropdown says 'Leave unbound'.
'This graph has no such attribute. Ask the sender which one they meant.'"

"So one of the team's things needs a column I don't have. I probably exported my sheet
differently from them. That's on me. I'm not going to go ask Priya right now; leave it. Apply."

**The result.**

"'fraud-team-colors in use: 3 of your layers replaced; 1 missing attribute.' OK. So it worked?"

"...But the picture looks the same. Actually it looks *less* colored -- the orange dots are gone
and it's all grey. And the little box in the corner that said 'Flagged, yes, no' is gone too.
Where are the team's colors?"

"On the right there's new stuff: 'Cleared accounts', green; 'Merchant hubs', orange-yellow; 'Amount
width'; a pink one with a yellow warning and a crossed-out eye. So green is the cleared accounts --
the good ones, I guess -- and orange is the merchant hubs. But I don't see any green in the
picture. Maybe they're too small to see at this zoom. Maybe I need to zoom in? Or maybe it didn't
really do it because of the missing one."

"The pink one says 'missing attribute: chargeback_rate. Bind... in its row's menu.' I'm not touching
the one with the warning sign."

"Honestly I can't tell if it looks like the team's. I'd have to send Priya a screenshot and ask
'is this right?'. Which, if I have to do that, why did she send me the file."

(Engagement drops here: shorter answers, she scrolls the right panel up and down and stops trying
things.)

**Data panel (she wanders there on her own, a few minutes later).**

"Data... sources, versions... 'Applied recipes. None yet. A recipe is a file of styles, sets or runs,
from a colleague or another project; a file of colors and sizes is a recipe too.' Oh. OK. *That*
would have been nice to read before. So 'recipe' means my colleague's file. Nobody said that in
the menu."

"It says 'None yet' but that's the version before I did it, I suppose. There's a plus here too. Same
thing as the other plus?"

**Opening the file straight from the email instead.**

(Moderator: "What if you had double-clicked the attachment instead?")

"'Recipe waiting for data. Expression overlay.' Different file, but OK. 'Add data...' -- wait, I
already have data, it's in my project. Why does it want data? If I'd opened my colleague's file
this way I would think it's a new empty thing and I've lost my project. 'Or try it on a sample' --
no."

"The next one, 'Apply recipe Expression overlay', is a wall. '84 of 96 genes matched', a list of
twelve things that didn't match, 'looks like a spreadsheet date' -- ha, yes, Excel does that --
then 'Fold change, for color', 'Read as: below 0 is down, above 0 is up'. This is way more than
'make it look like the team's'. I'd close it."

"This one after Undo -- everything is gone. 'Expression overlay is waiting for data... Files on disk
were not changed.' OK, the files are fine, but the picture's gone. If that happened to me I would
panic. I only wanted the colors off."

## Single Ease Question

**3 of 7.**

"Finding the file option was OK once I found the plus -- I tried 'Look' first because it says
Look. The dialog was readable. But the end is the problem: it told me it worked and the picture
didn't show me that it worked. I lost my orange dots and my little legend and I couldn't see any
new color. For 'make it look like the team's' I have to be able to *see* that it looks like the
team's."

## Would I use this instead of my current tool?

"I don't really have a tool for this -- in Slides I'd just copy the colors from the team's deck by
hand, one by one, and I'd know exactly what I got. A file that does it for me is better in theory.
But I'd only use it if after I load the file the picture actually changes and there's a key that
says what the colors mean now. Right now I'd trust the Slides way more, because I can see it.
So: maybe, if it shows me."

## Problems observed

1. **The result shows no visible change.** After "fraud-team-colors in use", the canvas is the same
   grey density drawing; the orange ring marks and the on-canvas legend disappear, and none of the
   new layer colors (green Cleared accounts, orange Merchant hubs) appear anywhere in the picture.
   She could not confirm the project now looks like the team's and fell back to "send a screenshot
   and ask". Severity: high -- the task's success is judged by eye. (It may be the mock's static
   drawing, but a participant reads it as the product.)
2. **"Look" is the word she wanted, and it does not take a file.** The Style stack's Look menu
   ("Look for the whole project": Screen, Print, High contrast) was her first try. It has no way to
   bring in a team's look, and nothing in it points to the + menu. Severity: medium.
3. **"Recipe" is not her word for a colors file.** She found From a recipe or file... only because
   of "or file". The sentence that explains "a file of colors and sizes is a recipe too" is in the
   Data panel, which she reached only after the task. Severity: medium.
4. **No preview before choosing.** Use these styles lists layer names (Risk ramp, Risk color, Mule
   ring) and says they will be replaced, but gives no picture or swatch of the result; she could
   not tell whether losing Mule ring would lose the orange ring she cared about. Severity: medium.
5. **The choice cards are the buttons, and the footer has only Cancel.** She looked for an Apply
   button before realising the two boxes act. Severity: low.
6. **The recipe picker does not show the file she was just sent.** Recently opened lists other
   recipes; hers needs Open a recipe file... at the bottom of the list. Severity: low.
7. **Opening the attachment directly reads as losing her project.** "Recipe waiting for data" and
   "Add data..." suggest a fresh, empty start, and after Undo the drawing is gone. Severity: medium
   for her, because double-clicking an attachment is what she would do.
8. **Self-blame on the missing column.** "This graph has no such attribute. Ask the sender" was read
   as her export being wrong, not as the team file expecting something her data never had.
   Severity: low (the text is accurate; she simply did not act on it).
9. **Wrong reading of the new colors.** From the Style stack names alone she decided green means
   "the good ones" (Cleared accounts). Nothing on the canvas said otherwise, because no legend was
   left. Severity: medium, tied to problem 1.
10. **Dropping the file onto an open project is not shown.** Her first instinct had no answer, so
    she held back for fear of losing the project. Severity: low to medium.

## What worked

- "Your data stays here" under From a recipe or file... -- she said she liked it.
- "Either is one undo step" -- enough to make her willing to press the choice.
- Binding said plainly that three layers matched and one needs a column her data lacks, with
  "Leave unbound" already chosen; she did not have to decide anything there.
- The toast said what happened in counts ("3 of your layers replaced; 1 missing attribute") and
  offered Undo.
- "Looks like a spreadsheet date" in the gene list got a laugh of recognition.
