# Session: the team's colors file, played by the recipe recipient (Tom)

**Task as given by the moderator:** "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like the
team's."

**Participant:** Tom, lab manager, 52, receives files and never builds them
(`study/personas/recipe-recipient.md`). Laptop at 1440 by 900, reading glasses on.

**Screens seen, as the participant sees them (design notes hidden):**
`screens/replace-and-recipe.html` states 1, 10, 11 and 12 (the project open, the file dropped on
the canvas, the one question it asks, the result), `screens/data-panel.html` (the Data rail
button), `screens/recipe-apply.html` state 2 (the recipe card, for comparison), and
`screens/styles-list.html` first state (what a legend looks like when a style is on). Renders:
`shots/r4-tom-tcf-*.png`.

The project on screen in these mocks is someone's bank-transfer review ("Mule ring review"), not a
gene network. Tom played it as the project he had open; the words he reacts to are the ones on
screen.

---

## Transcript (think-aloud)

### 1. The project is open

> "OK, so this is the project. Grey blob, a few orange dots. The little box at the bottom says
> 'Flagged, yes 14, no 3,079'. That I can read. She says our networks always look a certain way and
> this one doesn't, so I need to put her file on it."

> "Her email says 'fraud-team-colors'. It's an attachment. First thing I'd do is just drag it onto
> the window."

### 2. Dragging the file onto the picture (state 10)

He drags the attachment from the mail client onto the middle of the graph. The canvas gets a blue
outline and a small window opens titled "Dropped file".

> "Right, it took it. 'fraud-team-colors: style file'. That's the name in her email, good, so it
> knows what it is. I didn't have to find a menu."

> "Second line: '4 layers, bound by attribute name.' I don't know what that means. Skip it."

> "Two choices. The top one is already highlighted, 'Apply style file on top'. The other one says
> 'Replace style stack'. I'm not pressing anything that says Replace. Not on a project I have to
> show on Monday."

He reads the grey line under the top choice.

> "'Adds 4 style layers above the 9 already here; those stay.' Nine? Where are nine?" He looks at
> the right side. "Style stack: Risk color, Size by PageRank, Mule ring, Base style. That's four.
> It says nine. So either I'm looking in the wrong place or it's counting something I can't see.
> That's the kind of thing that makes me not trust the rest."

> "And 'those stay'. So I get her four plus whatever this project already had? I wanted hers. Her
> version. Not a mix. But the other button is 'Replace', so... on top it is."

He does not read the paragraph at the bottom of the window (it starts "Either is one undo step"),
then goes back to it only because of the word "needs".

> "'Chargeback heat needs chargeback_rate, which this graph lacks.' I don't know what chargeback
> heat is. Something's missing, apparently. It says I'll choose next. Fine."

He presses Enter.

### 3. The question it asks (state 11)

> "'Apply style file fraud-team-colors on top.' OK. '1 layer to bind.' Bind. What does bind mean?
> Is that going to change her file? I don't want to send her back something different."

> "'3 layers matched by name.' That sounds like the good news. One didn't. The box already says
> 'Leave unbound' and next to it 'no attribute fits'. So there's nothing to pick anyway. Then why
> is it asking me?"

He reads the grey text under the box: "Left unbound, Chargeback heat is kept and switched off,
marked missing attribute, with Bind... on its row."

> "So one of her four colors just won't be there. Is that bad? Is my picture wrong now, or just
> missing a bit? I'd have to ask her. I'd probably ask her about this bit."

> "Bottom says 'One undo step'. OK, at least I can take it back. Apply."

### 4. After Apply (state 12)

A dark strip near the bottom says "fraud-team-colors applied: style; 1 missing attribute", with
Undo.

> "It says applied." He looks at the picture for a while. "It looks the same. Grey blob. The same
> orange dots in the same places. I'm looking for... her colors. The right side has a green one,
> 'Cleared accounts', a yellow one, 'Merchant hubs'. I don't see any green or yellow on the
> picture. Not one dot."

> "And the key in the bottom corner still says 'Flagged, yes, no'. Exactly what it said before. If
> her colors were on here, wouldn't the key say what they are? That's the bit I read. That's what
> the PI reads."

> "So it says it did something and nothing moved. That's the thing that happened with Cytoscape
> and the expression table. 'Imported'. Nothing changed color."

He notices the fourth new row on the right, greyed, with a yellow "!" and a crossed-out eye.

> "And there's a warning sign on one of them. 'Chargeb...' something, cut off. Wait, there's a
> black label on the left of the picture: 'missing attribute: chargeback_rate. Bind... in its
> row's menu.' Menu? I don't see a menu. Anyway I'm not binding anything."

### 5. Second try: looking for proof

> "Maybe I clicked the wrong thing. Let me see if it at least kept the file." He clicks Data on the
> left strip, because the file is data to him.

On the Data panel he reads the heading and the first lines: the project name, "Nothing has been
sent from this project", the source file, its columns.

> "'Nothing has been sent from this project.' OK, good, that's something I'd want to know. It
> didn't go anywhere." He scrolls a little. "Sources, Versions, Recipes applied... it goes on. I'm
> not reading all of this. I don't see her file's name in what I can see." (The "Style files" row
> that would name it sits below the fold in this state.)

> "So: I put her file in, it said applied, and I can't see anything different and I can't find it
> listed. That's two. I'd write her an email: 'Did it work? Can you just send me a PNG of what it
> should look like?'"

### 6. What he compared it with

The moderator showed him, for comparison, the card a recipe opens with (`recipe-apply` state 2)
and the legend in the styles mock.

> "That card is better, I'll say that. It says who made it, Maren, and when. It says in plain words
> what it does: red for up, blue for down, the rest muted. It says my data stays on this computer.
> Her colors file told me none of that. It told me 'layers' and 'bound by attribute name'."

> "And that other screen, the one with the orange-brown key at the bottom, 'Color: betweenness',
> 'Size: degree', with the little dots getting bigger. That's what I expected to see after I
> dropped her file in. A key that tells me what the colors are. Then I'd know it worked."

---

## Single Ease Question

**3 of 7.**

> "Getting it in was easy, I'll give it that: I dragged it and it knew what it was, and it didn't
> push me towards the Replace button. Everything after that, no. It asked me to 'bind' something,
> told me one of her colors is off, said 'applied', and the picture didn't change. I couldn't tell
> you in lab meeting whether this is our team's look or not."

## Would he use this instead of his current tool?

> "Instead of Cytoscape? Maybe. No Java, no IT ticket, it opened in the browser, and it said
> nothing was sent anywhere. That matters to me. Instead of her sending me a PNG? Not today. With a
> PNG I know what it's supposed to look like. Here I did the steps and I still don't know if it
> worked. If it showed me her colors on the picture and a key that says what they mean, then yes,
> I'd rather do it myself than wait for her."

---

## What the session showed (observer notes, in plain terms)

1. **Applying worked mechanically, but nothing on the canvas or the legend changed.** After
   "fraud-team-colors applied" the drawing is the same grey cloud with the same
   orange dots, and the on-canvas key still reads "Flagged yes / no". The only evidence of the four
   new layers is in the right-hand Style stack, which he skims. He read it as the classic
   "applied, nothing changed" failure. The canvas key is the one place he reads, and it does not
   mention the team's colors at all.
2. **The drop dialog's count does not match what he can see.** "Adds 4 style layers above the 9
   already here" while the Style stack beside it shows four rows. After applying, the stack shows
   six rows plus "6 more" (twelve), not thirteen. He counts, and a count he cannot reconcile costs
   the whole dialog its credibility.
3. **"On top" is not what he asked for, and the only alternative is labelled Replace.** He wanted
   "the team's look", which to him means the team's look and nothing else. "Adds ... those stay"
   tells him he gets a mix; the choice that gives him only the team's look is worded as the action
   he never takes. He chose "on top" because it was the safe word, not because it matched his goal.
4. **"Bind", "bound by attribute name", "layers", "style stack", "unbound", "missing attribute"
   are all on screen and none of them are his words.** "Bind" in particular made him ask whether
   her file would be changed. Nothing in the style-file path says her file on disk is untouched.
   The recipe path says it ("Files on disk were not changed").
5. **A question with only one possible answer still stopped him.** The binding step asks about a
   layer where "no attribute fits" and the only option is "Leave unbound". He did not understand
   why he was asked, and he left believing his picture was now "missing a bit" without knowing
   whether that matters.
6. **The style file introduces itself worse than a recipe does.** The recipe card names its
   author and date, says in plain words what it colors and why, and says where data goes. The
   style file's dialog gives the file name, "4 layers" and "bound by attribute name". He knew the
   recipe card was the better introduction as soon as he saw it.
7. **What worked:** dragging the attachment onto the picture was his first move and it was
   accepted. The dialog named the file by the name in the email. The safe choice was already
   highlighted and he took it with Enter. "One undo step" reassured him. "Nothing has been sent from
   this project", at the top of the Data panel, answered his standing worry without him asking.
8. **Where he would have gone if dragging failed:** File in the main menu. The File menu has
   Open..., Add data..., Replace data... and Export..., and nothing that says colors or style. He
   would not have tried Recipes, because nobody told him the colors file is a recipe.
