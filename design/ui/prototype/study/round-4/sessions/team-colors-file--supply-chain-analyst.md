# Session: make the project look like the team's -- Dana Okafor, supply chain risk analyst

Task as read to the participant: "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like
the team's."

Screens the participant saw, in order, as she would see them: the rebuilt navigation page (the
rail and the right panel at rest), the Data panel after a first load (screens/data-panel.html),
the main menu open on File (screens/replace-and-recipe.html, frame 1), the Apply recipe picker
(same page, frame 7), a style file dropped on the canvas, its one-layer binding step, and the
result (frames 10 to 12), and the style stack and the color picker's Libraries tab
(screens/styles-list.html, frames 1 and 9). The mocks carry a fraud team's transfer data and a
protein network, not supplier data; the colleague's file in the mock is "fraud-team-colors".
Full-page renders: shots/r4-dana-teamfile-*.png.

Outcome: success with difficulty. She got the team's file applied by dragging it onto the
picture, which worked. She was not sure the picture had changed, she did not know whether she
had a "recipe" or a "style file", and one step used words she did not know.

## Transcript

**Step 1 -- where do files go in.**

"OK, Priya mailed me the file. It's an attachment. First thing, I look for Open or Import."

(The main menu, top left, File: Open..., Add data..., Add as another graph..., Join...,
Replace data..., Connect to data source..., Load set collection..., Export...)

"Open... -- no, that'll open a whole project and I'll lose mine. Add data -- it's not data, it's
colors. Join, Replace data, Load set collection... none of these is 'the colors file'. There's
no Import at all. Hm."

"There's a Recipes one above Help. Recipes. I don't cook. I don't know what a recipe is here.
Is the colors file a recipe? Priya said 'the style', or 'the template', I think. I wouldn't
click Recipes, it's not a word I'd connect with colors."

**Step 2 -- the Data panel.**

(She clicks Data on the left rail. The panel lists the source file, its columns, Versions,
"Recipes applied +", "Style files +", and "Sent and saved from this project".)

"Oh, here: 'Style files', with a plus. That's probably it -- the colleague's file is a style
file? I'd guess so. It's in grey, though, and small, down under Versions. I nearly scrolled
past it. And it's under Data, which is odd, colors aren't data. But fine, it's where the files
are."

"And again, 'Recipes applied' right above it. So there are two kinds of these files and I have
to know which one I got. I don't. Can't it look at the file and tell me?"

"Honestly -- what I'd really do is drag the attachment out of Outlook onto the picture. That's
what I do with everything."

**Step 3 -- dropping the file on the picture.**

(The canvas gets a blue outline as a drop target. A box opens: "Dropped file --
fraud-team-colors: style file. 4 layers, bound by attribute name." Two choices: "Apply style
file on top... Adds 4 style layers above the 9 already here; those stay." and "Replace style
stack with style file... The 9 style layers here are removed; the file's 4 remain." Under them:
"Either is one undo step. 1 layer, Chargeback heat, needs chargeback_rate, which this graph
lacks: you choose next whether to leave it off.")

"OK, good, it knew what it was. 'Style file'. So that answers the recipe thing -- for this
file. That's nice, I didn't have to pick."

"Now: 'on top' or 'replace'. The task is make it look like the team's. So... Replace? That's
what I want, the team's look, full stop. But 'the 9 style layers here are removed' -- what are
my 9? I've got four things listed on the right: Risk color, Size by PageRank, Mule ring, Base
style. That's four, not nine. Where are the other five? That already bugs me. It's like the
pivot that says 1,400 suppliers when the sheet has 1,396."

"'Layers'. OK, like PowerPoint layers, I get that roughly. 'Bound by attribute name' -- no
idea. Skip."

"'Either is one undo step' -- good. That's the line I actually care about. I'll do the safe
one, 'on top', since it's highlighted and it says mine stay. If it looks wrong I undo."

**Step 4 -- the step with one layer "to bind".**

(A second box: "1 layer to bind. 3 layers matched by name: Cleared accounts, Merchant hubs,
Amount width." Row: "Chargeback heat, reads chargeback_rate, numbers" with a dropdown "Leave
unbound" and "no attribute fits". Below: "Left unbound, Chargeback heat is kept and switched
off, marked missing attribute, with Bind... on its row." Buttons Cancel, Apply.)

"'Bind'. I don't know what that means. 'Leave unbound.' I'm guessing it's the column matching,
like when Power Query can't find a column after someone renames it in SAP. Chargeback_rate --
we don't have that. So it wants a column for it, there's none, it says 'no attribute fits'.
Fine, leave it. At least it told me instead of just quietly dropping it. That I like -- that's
the thing Gephi never did."

"In my real case this is where it'd bite. The team's file will say 'Tier' and my SAP export
says 'SUPPLIER_TIER', and the legacy ERP says 'Tier Lvl'. Does it match those or does it put
everything in 'unbound'? If three out of four go unbound every Monday I'm doing this by hand
again."

"Apply."

**Step 5 -- did it work?**

(Frame 12. On the right, Style stack: Cleared accounts, Merchant hubs, Amount width, each
"style file" with a blue "new"; a faded "Chargeb..." row with a yellow warning and an eye
crossed out; then Watchlist ring and Risk ramp, "recipe"; "6 more". A tooltip on the left of the
picture: "missing attribute: chargeback_rate. Bind... in its row's menu". Bottom: "fraud-team-
colors applied: style; 1 missing attribute", Undo.)

"The list on the right changed, it says 'new' on three of them. OK. But look at the picture.
It's the same grey honeycomb with the orange dots I had before. I don't see green, I don't see
yellow. The key at the bottom left still says 'Flagged, yes 14, no 3,079' -- that's the old
key. The team's colors are green for cleared and yellow for merchant hubs, according to the
little squares in the list. Where are they on the picture?"

"So either it didn't do anything, or it did it somewhere I can't see. Now I don't trust it. If
I'd shown this to my manager and said 'this is our standard look', she'd say 'that's not our
standard look'."

"And the list -- Risk color and Mule ring, my own ones, where did they go? Behind '6 more'
probably. And now there's Watchlist ring and Risk ramp, marked 'recipe', that I don't remember
ever having. Where did those come from? I didn't apply a recipe."

"'Chargeb...' is cut off. And the grey words, 'style file', 'recipe', 'new' -- they're tiny. On
my laptop I'd be leaning into the screen. I'd zoom to 125 and hope the panel survives."

"The black bar at the bottom with Undo is good. That's the most useful thing on this screen for
me right now."

**Step 6 -- going back to check it's in the project.**

(Data panel: the Style files section lists what was applied, each with a verb to show what it
added. The color picker, reached from a selected thing's appearance on the right, has a
Libraries tab listing palettes and "Style layers, from <file>".)

"OK, under Data, Style files, the colleague's file is listed now. Good -- so next week it's
still there, I don't have to drop it again? I'd assume so. Nothing says 'saved with this
project', but it's in the list."

"This color picker thing with 'Libraries' -- I'd never find that. I don't click on a dot and
open a color picker to get the team's standard. The team's standard is a file, I dropped it,
done. If that's where they live afterwards, fine, but I wouldn't go looking there."

**Step 7 -- the questions she always asks.**

"Couple of things before I say anything nice. One: that file came by email from Priya. Does it
have supplier data in it? The recipe box on the other screen said in plain words 'Carries no
data'. The style file box didn't say that. For a recipe I'd believe it; for this one I don't
know. If our supplier list is in there, that's an NDA problem and IT will ask."

"Two: does any of this go to Power BI? The colors, the key? Because if the VP's dashboard is
in Power BI with the Power BI colors and this is in team colors, I've got two standards and
nobody trusts either."

"Three: Resilinc has a company color scheme already, set by an admin. I don't do anything,
it's just there. Here I have to drop a file on every project. It's not a lot, but it's a
thing."

## Single Ease Question

**4 out of 7.**

"The drop worked first try, it told me what the file was, and it told me what it couldn't
match. That's more than Gephi ever did. But I had to guess between recipes and style files,
'bind' means nothing to me, the numbers didn't add up -- nine layers, I saw four -- and at the
end the picture didn't look any different. I'd have undone it and asked Priya what I did
wrong. That's not a 6."

## Would she use this instead of her current tool?

"No, not instead. For this job there's nothing to replace -- in Power BI I import the team's
theme JSON once and every report has it. This is fine as a side tool if the team colors come
along when I export the picture for the deck. If it only works when every column name
matches, it's back to Excel. And it has to say out loud that the colors file has none of our
supplier data in it, or IT won't let me pass it around."

## What the moderator saw

1. **The main menu has no way in for a colors file under a word she knows.** File lists Open,
   Add data, Replace data, Join, Load set collection, Export; the only candidate is a top-level
   Recipes menu, and "recipe" did not mean colors to her. She found the way in only through the
   Data panel's small "Style files +" header, low on the panel under Versions, and then chose
   dragging onto the canvas anyway.
2. **Recipe versus style file is a distinction she cannot make before the file tells her.** Two
   neighboring sections, "Recipes applied" and "Style files", each with its own "+", ask her to
   know which kind of file she was sent. The drop box answered it by reading the file -- that
   is the part that worked -- but the "+" routes ask her to know first.
3. **The count in the drop box disagreed with the screen.** "The 9 style layers here" while the
   Style stack beside it showed four rows. For a user whose frustrations center on numbers she
   cannot reconcile, this cost trust before she had applied anything.
4. **After Apply, the picture did not visibly change.** The stack showed three "new" layers with
   green and yellow swatches, but the canvas stayed grey with the same orange ring and the
   legend still read "Flagged". She concluded the apply either failed or went somewhere she
   could not see. (It may be a limit of the mock; to her it was the outcome.)
5. **Her own layers dropped out of sight and unexplained recipe layers appeared.** After
   applying "on top", Risk color and Mule ring were hidden under "6 more", and Watchlist ring and
   Risk ramp (marked "recipe") were visible though she had applied no recipe in her session.
6. **"Bind", "unbound", "bound by attribute name" are words she does not know.** She guessed
   correctly from Power Query experience that it means column matching. The consequence line
   ("kept and switched off, marked missing attribute") was clear and she valued it.
7. **She could not tell whether "Replace" was the right answer to "make it look like the
   team's".** Replace matched the task, but "the 9 style layers here are removed" with an
   unexplained 9 pushed her to the highlighted "on top" default, which does not make the
   project look like the team's where her own layers win.
8. **The style file box never says the file holds no data.** The recipe picker says "Carries no
   data"; the style file drop box does not. For a colleague's email attachment this is her
   IT and NDA question.
9. **Small secondary text and truncation.** "Chargeb..." cut off in the stack; origin words
   ("style file", "recipe", "new") in small grey type.
10. **What worked:** the drop target and the box that named the file's kind; stating before
    Apply what could not be matched; one undo step, said before the choice and offered in the
    toast; the file listed afterward under Data.
