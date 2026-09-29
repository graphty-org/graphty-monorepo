# Session: make the project look like the team's -- Dana Okafor, supply chain risk analyst

Task as read to the participant: "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like
the team's."

Screens the participant saw, in order, as she would see them (study view, design notes hidden):
the Data panel after a first load (screens/data-panel.html), the style stack and its "+" menu
and the color picker's Libraries tab (screens/styles-list.html, at rest and the plus-menu and
libraries states), the main menu open on File and the Apply recipe picker
(screens/replace-and-recipe.html, frames 1 and 7), a style file dropped on the canvas, its
one-layer binding step and the result (same page, frames 10 to 12), and the Apply dialog of
the recipe page (screens/recipe-apply.html: start, binding, unbound, applied). The mocks carry a
fraud team's transfer data and a protein network, not supplier data; the colleague's file in
the mock is "fraud-team-colors". Renders: shots/r6-dana-tcf-*.png.

## Think-aloud

**1. Where does a file go? (Data panel)**

"OK, a colleague mailed me a file. First thing, I look for import. Left side says Data,
there's the CSV that's loaded, 'Update with new data...', 'Add a table...'. Neither of those is
a colors file. Scrolling... 'Applied recipes. None yet. A recipe is a file of styles, sets or
runs, from a colleague or another project; a file of colors and sizes is a recipe too.'

Recipe. Fine, weird word, but it literally says 'a file of colors and sizes is a recipe too'
and 'from a colleague'. That's my situation in one sentence. I'd have skipped it if the
heading was the only thing, but the line under it caught me. There's a plus. I'd click the
plus."

(The "+" opens the Apply dialog.)

**2. The style stack and its "+" (right panel)**

"Before I click anything let me look at the right side, because that's where the colors seem
to live. 'Style stack. Top wins each property it sets.' I don't know what a style stack is,
I'd call these 'formatting rules' like conditional formatting in Excel. Actually -- that's
what it is, isn't it? Top rule wins. OK, I get that, I've fought conditional formatting order
for years.

Plus menu: 'Empty layer', 'From a recipe or file... Only a recipe's styles; your data stays
here.' 'Your data stays here' -- good, that's the first thing IT asks. So there are two doors
to the same thing, the Data side and this side. That's fine, I found one of them without
trying.

The other two, 'Mute categories under this scale', 'Shape by kind: module' -- not mine, I'm
ignoring them."

"Libraries tab in the color picker -- 'Okabe-Ito', 'Viridis'. No idea what those are. Below,
'Style layers from the recipe Stress response.' So once I've loaded the team file, its colors
would show up here too? Nice if I just want one color out of it. Not what I'm doing today."

**3. File menu (replace-and-recipe, frame 1)**

"If I'd gone to the hamburger instead: File -- Open, Add data, Join... no 'Import styles'.
There's a 'Recipes' item in the main menu, one level up. I'd probably have hovered File for a
while first because that's where 'import' lives in everything else I use. Found it second
try. Not a disaster."

**4. The recipe picker (frame 7)**

"'Apply recipe.' Left side, recent files, 'Open a recipe file...' -- that's where my email
attachment goes. The right side shows a different file, mule-ring-triage, which carries sets
and runs and a note. 'Carries no data.' Good. I don't have this one, mine is only colors, so
most of this doesn't apply to me. 'It needs: amount (numbers, weight: flow)...' -- I'd stop
reading there. 'Weight: flow'? No."

**5. Actually what I'd do: drag the attachment onto the picture (frame 10)**

"Honestly, I'd drag it out of Outlook straight onto the screen. Let's say I did.

'Apply recipe fraud-team-colors. A recipe that holds only styles: 4 layers, bound by attribute
name.' First line I read: only styles. OK. 'No data inside.' Good -- if the colleague's file
had our supplier list in it I'd want to know, and it says it doesn't.

Two choices. 'Use these styles... Its 4 layers take the place of these 3 of yours, which write
the same thing: Risk ramp, Risk color, Mule ring.' Then 'Your other 5 stay: Community color
(from an algorithm, never replaced), Size by PageRank, Watchlist ring, Pass-through edges, Base
style.'

Second: 'Add these styles on top... 4 layers above your 8; all 8 stay.'

The task is 'make it look like the team's'. So 'Use these styles' -- that's the one that
sounds like 'use the team's'. I pick that. But wait. Five of mine stay. Size by PageRank stays.
If the team sizes by something else and mine sizes by PageRank, which one wins? It says 'which
write the same thing', so I think it's saying the team file doesn't do size, only color, so my
size is untouched. OK -- I think. That's a guess. I'd want it to just say 'the team file sets
color only; your size and outline are not touched' in words, not make me compare two lists.

And 'Community color (from an algorithm, never replaced)'. So if my project has one of those
algorithm colors, the team look never fully takes over? Then it won't look like the team's. I
don't know what I'd do about that. I'd leave it."

"The line at the bottom is small grey: 'Either is one undo step. 1 layer, Chargeback heat,
needs chargeback_rate, which this graph lacks: you choose next whether to leave it off.' I
only caught 'one undo step'. That's the important bit anyway."

**6. The binding step (frame 11)**

"'Bind attributes: fraud-team-colors.' Bind. I don't know that word here. 'Attributes' -- I
guess columns? '1 layer to bind. 3 layers matched by name.' So three of the team's rules
found their columns in my data and one didn't. 'Chargeback heat reads chargeback_rate,
numbers.' Dropdown says 'Leave unbound'. Next to it: 'This graph has no such attribute. Ask the
sender which one they meant.'

That's actually the most useful line on the screen. Plain, tells me what to do. In my world
this would be something like the team coloring by 'days of cover' and my export calling it
'DOC' or 'cover_days'. I'd open the dropdown and look for anything that looks like it. If
nothing does, leave it off, email Priya. Fine.

It also says left unbound it's 'kept and switched off, marked missing attribute'. OK, so it
doesn't vanish. Apply."

**7. After Apply (frame 12)**

"Toast: 'fraud-team-colors in use: 3 of your layers replaced; 1 missing attribute. Undo.'
Good, Undo right there.

Right side: Cleared accounts, Merchant hubs, Amount width, all 'recipe' and 'new', Chargeback
one greyed with a warning and an eye crossed out. That's clear enough: three new rules on,
one off.

But the picture. The picture is still all grey hexagons. I just applied the team's colors
and nothing on the screen changed that I can see. Green for 'Cleared accounts', amber for
'Merchant hubs' -- where are they? Maybe the hexagons are a zoomed-out summary and you only
see colors when you zoom in, I don't know. If I did this for real and the picture stayed
grey, I'd assume it didn't work and hit Undo. That's the moment I'd lose trust. The whole
point of the task is 'look like the team's' -- I need to SEE it look like the team's, or
at least a line saying 'colors show when you zoom in' or whatever the reason is.

Also the legend at the bottom still says 'Flagged / yes 14' from before. Where's the team's
legend? When I paste this on a slide, the legend is half the reason the team uses a standard
look -- so the VP reads the same color the same way every week."

**8. The recipe page (recipe-apply), for comparison**

"This other one -- 'Recipe waiting for data, Expression overlay' -- is somebody opening the
recipe with no project. 'Data stays on this computer. This recipe names no server, so graphty
contacts none. Files you add are read in this browser and are not uploaded.' That paragraph I
would screenshot and send to IT. Honestly that's worth more to me than the colors.

The Apply dialog here is the same idea but much busier: genes matched, '12 did not match',
'7-Sep, 2-Mar, looks like a spreadsheet date'. Ha. That's the Excel date bug eating part
numbers. That happens to us with part numbers too. That line would win me over in a real
data import. Not today's job though.

'Fold change, for color. Choose a column. Two columns could be the fold change.' It stops and
makes you pick instead of guessing. Good. If it guessed wrong silently I'd stop trusting it.

After Apply: the picture IS colored, there's a legend with the colors and counts, and a
table underneath. That's what I expected the team-colors one to look like afterwards."

**9. Would the team's look survive next Monday?**

"Data panel with the recipe in it: 'fraud-team-colors. Colors and sizes only, no data. Applied
Apr 20.' OK, so it's remembered on the project. When I load next week's supplier export with
'Update with new data', do the team colors stay? The page with the update says 'keeps styles,
sets and notes'. Fine, I'll believe it until it doesn't."

## Single Ease Question

**5 out of 7.**

"Getting the file in was easy -- drag it in, pick 'Use these styles', leave the missing one
off, Apply. Four clicks. It told me before I clicked that it carries no data, and it told me
what didn't match and who to ask. That's better than any tool I've used; Power BI themes
silently ignore what they don't understand. What cost points: I had to compare two lists to
work out whether my own sizes and the algorithm color would still fight the team look, the
words 'bind', 'attribute' and 'layer' are not mine, and at the end the picture didn't visibly
change, which is exactly what I was trying to do. If the screen had gone green and amber I'd
have said 6."

## Would she use this instead of her current tool?

"No, not instead of. For this job specifically -- getting a network to look the same as the
team's -- yes, it beats what I have, because in Gephi I rebuilt the colors by hand every
time and in Power BI the network visual doesn't take a theme properly. But nobody on my team
draws networks today, so 'the team's file' is hypothetical for me. What I'd actually use is
the part where it says the data stays on my laptop, and the matching report that catches
Excel-mangled ids. The same questions stand as always: will IT approve it, and can I get the
picture and the table into Power BI for Monday. Until someone says yes to those, it's a side
tool."

## Findings (moderator's summary of what she said)

1. **After applying the team's styles the picture did not visibly change.** The result frame
   shows new layers in the stack and a toast, but the canvas stays grey and the old legend
   ("Flagged") remains. For a task whose goal is a look, this is where she would have hit Undo
   and concluded it failed. The recipe page's applied frame, which colors the canvas and shows
   the new legend, is what she expected.
2. **"Use these styles" is the right choice, but what stays is left for her to deduce.** "Your
   other 5 stay" lists layers she then had to compare against the replaced ones to work out
   whether her size and the algorithm's color would still override the team's look. She wanted
   one sentence naming which properties the file sets (color only here) and which it leaves
   alone, and whether the result will fully match the team's.
3. **"Community color (from an algorithm, never replaced)" read as "it can never fully look
   like the team's".** She did not know what to do about it and left it.
4. **Vocabulary: "bind", "attribute", "layer", "recipe".** "Recipe" worked only because the
   Data panel's empty line says "a file of colors and sizes is a recipe too, from a colleague".
   "Bind attributes" as a dialog title meant nothing; she read it as "match columns".
5. **The best line was the plain instruction on the unmatched layer:** "This graph has no such
   attribute. Ask the sender which one they meant."
6. **"No data inside" on the drop dialog and "your data stays here" in the + menu answered her
   IT question before she asked it.** The recipe page's "Data stays on this computer" paragraph
   is the one she would forward to IT.
7. **The File menu has no import-styles entry.** She looked under File first; Recipes sits one
   level up in the main menu. She found it on the second try; the drop and the Data panel's
   "+" found it faster.
8. **Small grey secondary text.** The footer line of the drop dialog ("Either is one undo step.
   1 layer, Chargeback heat, needs ...") and the "recipe"/"run"/"new" tags in the stack were
   skimmed or missed; "Chargebac..." and "Pass-through ed..." are truncated in the stack.
9. **What worked:** dropping the file straight onto the canvas; the dialog stating the file's
   kind and that it holds no data; the missing attribute kept but switched off with a warning
   rather than silently dropped; one undo step, said before the choice and offered in the toast;
   the applied file listed under Applied recipes in the Data panel.
