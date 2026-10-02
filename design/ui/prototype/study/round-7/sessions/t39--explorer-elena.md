# Session: leave a note on the Valjean-to-Javert chain -- Explorer Elena

Participant: Explorer Elena (first-time graph user, product manager, no graph vocabulary).

Task as given: "Your team already worked out the chain of characters linking Valjean to Javert with
as few go-betweens as possible. Leave a reminder attached to that chain as a whole -- not to either
man -- saying it should be checked against the book. You have never typed your name into this
program. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter."

Start screen: shots/tasks/t39/01.png. Renders: tmp/round-7-sessions/t39--explorer-elena/02.png to 06.png
(under design/ui/prototype/).

## Step 1 -- looking at the start screen (01.png)

"OK, Les Miserables. Lots of orange dots, the big dark one in the middle says Valjean, so I guess
he's the most important one. Javert is sitting right next to him. On the left there's a list...
'Shortest paths', and under it 'Valjean to Jav...' -- that's got to be the chain my team made.
'As few go-betweens as possible', shortest path, yeah, same thing. I'll click that."

(Wrong reading, stated with confidence: she takes the darkest, biggest dot as "the most
important"; the legend says color is PageRank and size is degree, which she did not read.)

    timeout 120 node app-b/study.mjs --try .../t39--explorer-elena/02.png task:t39 --click "Valjean to Jav"

## Step 2 -- the chain is selected (02.png)

"The right side changed. It says 'Valjean to Javert', 'Path'. Summary: '2 nodes, 1 edge'... I don't
know what nodes are. From Valjean, To Javert. Members: Valjean, Javert. So there's nobody in the
middle? They're just directly connected? Huh. I thought a chain would have more people in it. Maybe
that's why it says to check it against the book. Whatever, my team made it, not me."

"At the bottom: 'Notes. No notes. Add note.' That's what I want. And it's on this chain thing,
not on Valjean, because the top says Valjean to Javert."

    timeout 120 node app-b/study.mjs --try .../t39--explorer-elena/03.png task:t39 --click "Valjean to Jav" --click "Add note"

## Step 3 -- the note box opens (03.png)

"Oh, the left side jumped to a Notes list. That's a bit of a jump, but OK. There's a box at the top
with a little orange tag 'Valjean to Javert' and 'Write a note'. One tag, not two men -- good, that
is what they asked for. Underneath are other people's notes. One says 'Javert follows Valjean
through the whole book' and it has two separate tags, Valjean and Javert. So that one's on the men,
and mine's on the chain. I think. They look almost the same, just one tag versus two."

"The right side still says 'No notes'. I guess it'll change when I save."

"It never asked me my name. Will my note just say nobody wrote it? None of the other notes show a
name either, so maybe that's normal here."

    timeout 120 node app-b/study.mjs --try .../t39--explorer-elena/04.png task:t39 --click "Valjean to Jav" --click "Add note" --type "Check this chain against the book" --click "Save"
    -> nothing on screen is called "Save"

## Step 4 -- trying to type and save (04.png)

"I typed 'Check this chain against the book' and hit Save... the box is still empty and Save is
gray. Did I not click in the box? Probably my fault."

    timeout 120 node app-b/study.mjs --try .../t39--explorer-elena/05.png task:t39 --click "Valjean to Jav" --click "Add note" --click "Write a note" --type "Check this chain against the book"
    -> nothing on screen is called "Write a note"

## Step 5 -- clicking into the box (05.png)

"I clicked where it says 'Write a note' and it still has nothing in it."

    timeout 120 node app-b/study.mjs --try .../t39--explorer-elena/06.png task:t39 --click "Valjean to Jav" --click "Add note" --type "Check this chain against the book" --key Control+Enter

## Step 6 -- the keyboard shortcut (06.png)

"It says Ctrl+Enter next to Save, so I tried that. Same thing. Empty box, gray Save. ...OK."

She stops here. The text could not be entered in this click-through, so the note was composed
against the right thing but never saved on screen.

## After the task

Did she succeed? "I think so? I got to the box, and it was stuck on the chain, not on either guy.
I just couldn't get my words in. If the typing works in the real thing, it's two clicks, that's
fine."

Single Ease Question (1-7): 5. "Finding it was easy -- the chain was right there in the list and
the 'Add note' link was right there. The typing not working and the '2 nodes, 1 edge' confusion
knock it down."

Would she use this instead of her current tool? "For leaving a note on a group of things, maybe.
In our dashboard I can't attach a comment to a group at all, I'd paste a screenshot in Slack.
But I'd want to see my note sitting on that chain afterward, and I'd want my name on it, before I
trust it."

## Observations for the study (moderator)

- Path to the compose box was direct: list row "Valjean to Jav..." -> "Add note" in the right
  panel's Notes section. No dead ends to get there.
- The compose box carried exactly one chip, "Valjean to Javert", so the attachment target was
  right without any extra step. She noticed it was one chip and not two.
- She nearly confused her chain note with an existing note tagged "Valjean" and "Javert" as two
  separate chips; the only difference she could see was the chip count.
- "2 nodes, 1 edge" with Members "Valjean, Javert" read to her as "there is no chain, they are
  directly linked", which made her doubt the team's work. "nodes" and "edge" are not her words.
- Opening the note moved the left panel from the graph list to Notes without warning; she called
  it "a bit of a jump".
- The right panel kept saying "No notes" while the draft was open.
- Nothing asked for her name, though the task said she had never entered one; she wondered who
  the note would be credited to. Whether a name prompt appears on Save could not be seen.
- Text entry could not be carried out in the click-through, so saving and the after-save state
  were not observed.
