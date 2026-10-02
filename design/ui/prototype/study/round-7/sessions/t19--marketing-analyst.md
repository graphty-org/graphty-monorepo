# Session: door swipes, one link per person and building, then each swipe as its own item -- Jordan (marketing network analyst)

Task as given: "You are bringing in the door swipes, and as things stand every single swipe would be drawn as its own line between a person and a building, which will make a mess. Change it so each person is linked to each building once, with how often they went in kept on that link. Then try making each swipe something you can click on by itself, and see what that does to the picture."

All commands were run from design/ui/prototype. Renders are in tmp/round-7-sessions/t19--marketing-analyst/.

## Start screen (shots/tasks/t19/01.png)

Jordan: "OK, this is the import screen. Three tables on the left: people, buildings, entries. Top line says 'person --entries (4,180 edges from 4,212 rows)--> building'. So yeah, four thousand lines between 412 people and 9 buildings. That's the hairball before I've even started. Nine buildings, so every line's going to pile up on the same nine spots.

The row of options under the header: 'Each row is a node / an edge', 'One edge per Row / Pair', and 'Weight: none (each edge counts 1)'. 'One edge per Pair' sounds like exactly what I'm being asked for. I don't love 'Pair' as a word, but 'Row' is the thing I don't want, so the other one must be it."

## Step 1 -- one link per pair

    timeout 120 node app-b/study.mjs --try .../t19--marketing-analyst/01.png task:t19 --click "Pair"

Render 01.png. Jordan: "Good. Header now says 1,306 edges from 4,180 of 4,212 rows. There's a little line, 'One row per pair: each is one edge, its count the rows it merged.' That's the sentence I needed, plain enough. Two new columns turned up: 'time (latest)' and 'count', and count is already set as 'Weight'. 1001 to B1 is 22, so that person badged into B1 twenty-two times. That's the 'how often' the task wanted, and I didn't have to do anything for it.

It also kept the time as earliest and latest instead of throwing it away. Nice. In Excel I'd have done a pivot with MIN and MAX and then lost it the next time the export changed, so that actually saves me a step.

Under the weight there's 'Higher means Stronger / Farther / Capacity'. No idea what Farther or Capacity are for here. I'm leaving it on Stronger, since that's what it picked. More visits means a stronger link, fine.

The rows whose person or building isn't in the other tables say 'left out' in count. The report at the bottom says 25 people IDs and 7 building IDs don't match. Probably badge IDs for contractors or something. I'd want that list for whoever owns the badge system, but that's a different afternoon."

Jordan thinks part one is done. Nothing was destructive, and the header count changed straight away, so she believed it.

## Step 2 -- each swipe as its own clickable thing

Jordan: "'Something you can click on by itself.' Right now a swipe is a line. You can't really click a line, or you can, but... whatever. The other choice up there is 'Each row is a node'. A node is something you click. So try that."

    timeout 120 node app-b/study.mjs --try .../t19--marketing-analyst/02.png task:t19 --click "a node"

Render 02.png. Jordan: "Header now: 'person (412) <--person_id-- entry (4,212) --building_id--> building (9)'. So every swipe is now its own dot called 'entry', with a line to the person and a line to the building. The bottom line says 4,212 entries became 4,212 entry nodes. That's what the moderator described. The column labels changed to 'Links to -> person' and 'Links to -> building', which reads OK.

One thing, though: the Pair option disappeared. It makes sense, because you can't merge swipes if every swipe is its own thing, but it went without telling me. If I flip back, do I get my count weight back or do I have to set it up again? I didn't test that. I'd be nervous about it.

Also 'Key: row number (no Key column)' and a warning that notes on entries may move if the row order changes. Fine, I don't plan to write notes on individual swipes. That's a security team's problem, not mine."

## Step 3 -- what does that do to the picture? Load both ways

Jordan: "The task says 'see what it does to the picture', and the screen isn't showing me a picture, just a table. So press Load. I'll do both versions to compare."

    timeout 120 node app-b/study.mjs --try .../t19--marketing-analyst/03.png task:t19 --click "a node" --click "Load"
    timeout 120 node app-b/study.mjs --try .../t19--marketing-analyst/04.png task:t19 --click "Pair" --click "Load"

Render 03.png (swipes as nodes): "Reading 3 tables ... 4,633 nodes, 8,392 edges", progress bar about 60%, Cancel button.
Render 04.png (one link per pair): "421 nodes, 1,306 edges", same progress bar.

Jordan: "So, swipes as dots: 4,633 dots and 8,392 lines. Merged by pair: 421 dots and 1,306 lines. Swipes as dots means ten times the dots and six times the lines. That's the answer, I guess: way worse picture, it's the hairball times ten, and the 4,212 swipe dots will all bunch up around nine buildings anyway.

But I didn't actually SEE the picture. Both times I got a loading box with a bar and then nothing. I'll grant it has a progress bar and a Cancel, which is more than Gephi ever gave me. But I was asked what it does to the picture, and what I can tell you is what it does to the counts. I'd have liked a little preview, or the same 'Makes' line saying 'this will be about ten times busier'. And honestly, the screen doesn't warn me that turning each swipe into a dot is going to blow the picture up. The import screen is perfectly happy to let me do it."

Off-topic: "This is the same with our listening exports. Every mention is a row, and the vendor's 'network' view just draws all of them. Nobody asks if you want them merged. Then my VP asks why the slide looks like a bird's nest."

Jordan stops here.

## Wrap-up

Succeeded? "The first part, yes, definitely: one link per person and building, with the count on it as the weight. The second part, I think so. I made each swipe its own dot, and from the numbers I can tell it makes the map much busier. I never actually saw either picture, so I'm taking the counts' word for it."

Single Ease Question (1-7): 6. "The Pair toggle was right where I'd look, and it did the count for me without asking. I'm taking one off because I never saw the result, and because 'Weight: Farther / Capacity' and the Pair option quietly vanishing made me second-guess things."

Would she use this instead of her current tool? "For this bit, collapsing rows into a weighted link while I import, yes. Today that's a pivot table in Excel before Gephi, and I mess it up every time the export changes. One click and it keeps first and last time too. Would I switch everything over for it? Not on its own. I'd need to see it draw the map, and I'd need the ranked-list CSV out the other end. But this screen is better than what I do now."

## Observations for the design team (in Jordan's terms)

- "One edge per Row / Pair" was found at once, and the one-line explanation that appears after clicking Pair did its job. The automatic count-as-weight and earliest/latest time were the delight.
- "Each row is a node" was found by elimination, not because the words matched "click on each swipe by itself". It worked, but she went for it because it was the only other choice.
- Switching to "a node" hides the Pair option with no note; she worried that her merge setup would be lost if she switched back.
- The "Makes" line and the load dialog give counts, but nothing before loading shows or warns how much busier the picture gets. "See what it does to the picture" could only be answered from numbers.
- "Higher means Stronger / Farther / Capacity" under the weight meant nothing to her; she accepted the default.
