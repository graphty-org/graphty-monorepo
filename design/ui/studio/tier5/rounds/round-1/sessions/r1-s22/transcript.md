# Session r1-s22 transcript (Tom, returning user)

Task: every gauge that sends its readings by itself should stand out in orange, but not the ones put in during the 1990s. Say how many gauges are orange.

## Step 1 (start)
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../design/ui/studio/tool/real.mjs --start .../r1-s22 setup:gauges-clean.txt` -> 01.png

Tom: "Right, the gauge map, same as last time. There's the table underneath. I see a 'telemetry' column with yes and no -- I take it that's 'sends its readings by itself'. And 'installed' has the dates. I can see some 1998 and 1999 and 1995 in there. I've never colored anything by hand. On the left there's 'Style layers' with a plus. I'll try the plus."

## Step 2
Command: `--step .../r1-s22 --click-at 276,122` -> 02.png ("Add a layer or a folder")

Tom: "A little menu: Layer, Folder, Hover highlight, Analyze. 'Layer' sounds like the plain one. I'll pick Layer."
-> 03.png

## Step 3
Tom: "It made 'Layer 1', and the right side shows 'Which nodes -- 11 of 11 -- All nodes'. I don't want all of them, only the ones that send by themselves. I'll click 'Which nodes'."
Command: `--step .../r1-s22 --click "Which nodes"`
-> 04.png

## Step 4
Tom: "A whole 'Which nodes' screen opened with a list of columns: lat, lon, station, installed, telemetry '2 values'. Telemetry -- that's the yes/no one. I'll pick telemetry."
Command: `--step .../r1-s22 --click "telemetry"`
(ambiguous name, nothing happened -> 05.png; retrying on the list option I pointed at)
Command: `--step .../r1-s22 --click "role=option:telemetry"`
-> 06.png

## Step 5
Tom: "Now telemetry shows 'yes 7' and 'no 4'. Seven send by themselves. I tick 'yes'."
Command: `--step .../r1-s22 --click "yes"`
-> 07.png

## Step 6
Tom: "7 of 11 now, and the table shows only 'yes' ones. But Upper Falls from 1998 is still in, and those 1990s ones shouldn't be. There's 'Condition...' and 'Or...' at the top and an 'Except' switch. I don't want 'or'. I'll try 'Condition...' to add the date bit."
Command: `--step .../r1-s22 --click "Condition..."`
-> 08.png

## Step 7
Tom: "A second line 'Value...' under 'telemetry yes', and the same column list again. I want the date one, 'installed'."
Command: `--step .../r1-s22 --click "role=option:installed"`
-> 09.png

## Step 8
Tom: "Now 'installed', 'Before', and a box for 'A date or a year'. I don't want 'before' -- I want to leave out the 1990s. Let me see what else is in that 'Before' list."
Command: `--step .../r1-s22 --click-at 1040,190`
-> 10.png

## Step 9
Tom: "Before, After, Between, Has a value, Has no value. The 1990s is 'between' 1990 and 1999. Then there's that 'Except' switch above, which I'd guess turns it round to 'not those'. I'll take Between first."
Command: `--step .../r1-s22 --click "role=option:Between"`
-> 11.png

## Step 10
Tom: "Two boxes, 'a date or a year' to 'a date or a year'. I'll put 1990 and 1999."
Command: `--step .../r1-s22 --click-at 964,216 --type "1990" --click-at 1116,216 --type "1999"`
-> 12.png

## Step 11
Tom: "2 of 11 now: Upper Falls 1998 and Lake Inlet 1999. Those are exactly the two I DON'T want. So I flip 'Except' -- I hope it flips just the date line and not the telemetry one."
Command: `--step .../r1-s22 --click "Except"`
-> 13.png

## Step 12
Tom: "5 of 11. It says 'telemetry yes' and 'Except installed 1990 to 1999'. The list: Mill Pond 2003, Fox Creek 2010, Willow Run 2012, Stone Weir 2008, Quarry Pool 2006 -- all yes, none from the nineties. Seven yeses minus the two nineties ones, five. That adds up. Press Done."
Command: `--step .../r1-s22 --click "Done"`
-> 14.png

## Step 13
Tom: "Back to the map. 'Layer 1' says 5. But nothing is orange yet -- all still blue. Right side has 'Fill' with a plus. Fill sounds like the colour. Plus."
Command: `--step .../r1-s22 --click-at 1404,433`
-> 15.png

## Step 14
Tom: "A 'Color' box appeared under Fill, empty. Still nothing orange on the map. I'll click the little square in the box -- I expect a colour chooser."
Command: `--step .../r1-s22 --click-at 1268,467`
-> 16.png

## Step 15
Tom: "A colour chooser. The little squares at the bottom have blue, grey, yellow, black -- no orange. There's a rainbow strip. Orange is just after red on the left. I'll click there."
Command: `--step .../r1-s22 --click-at 1026,744`
-> 17.png

## Step 16 (looking, no command)
Tom: "The chooser shut by itself after one click, and the box now says 'F18463' with a reddish-orange square. On the map some dots are now that colour and the rest are still blue. A little card at the top says 'Color: Layer 1 -- 5 of 11 nodes'. I count the coloured dots I can see and they match the five in the list. To my eyes it's more of a salmon than a proper orange -- I can't tell red from orange that well -- but next to the blue ones it stands out, and I wasn't going to fiddle with the rainbow again. Bottom left says 'Autosave: saved', so I'll leave it there."

## End of session (in character)

- Did I finish? Yes. Five gauges are orange: Mill Pond, Fox Creek, Willow Run, Stone Weir and Quarry Pool. Upper Falls (1998) and Lake Inlet (1999) send by themselves but were left out because they went in in the nineties.
- How easy, 1 (very difficult) to 7 (very easy): 5.
- What confused me:
  - I had to guess that "telemetry" means "sends its readings by itself". Nothing on the screen says that in plain words.
  - "Condition..." vs "Or..." -- I picked "Condition" because I didn't want "or", but I wasn't sure it meant "and also". The count dropping told me it did.
  - Leaving out the nineties: there was no "not between", so I had to find the "Except" switch. I was worried it would flip the telemetry line too. It only flipped the date line, and the count going from 2 to 5 is what reassured me, not the wording.
  - After "Done", nothing went orange. I had to find "Fill" and press its plus. I'd assumed choosing the gauges would be the colouring.
  - The colour chooser had no orange in the little squares, and it closed after one click on the rainbow, so I couldn't nudge it. What I got is reddish-orange (F18463). I'm not certain the council would call that orange.
  - I didn't see "orange" written anywhere, only the code F18463. The card that says "5 of 11 nodes" was the most useful thing. That gives me the number.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Tom: "3. Mostly calm -- the counts going down told me I was on the right track, so I never felt lost for long. The moment I was least sure was right after I pressed Done on the 'Which nodes' screen. I was back at the map and every dot was still blue. On the left, 'Layer 1' said 5, so it had kept my five gauges. On the right it repeated 'telemetry yes' and 'Except installed 1990 to 1999', and under that was a stack of headings -- Shape, Visibility, Text, Fill, Shaders -- each with just a little plus and nothing in it. Underneath the map the table still showed all eleven gauges, nineties ones included. I'd done the hard part and nothing had changed colour, and nothing said 'now pick a colour'. I had to read down that list and guess that 'Fill' meant colour. 'Shaders' I didn't touch -- no idea what that is. A second, smaller wobble was the 'Except' switch: I wasn't sure if it would flip both lines or just the date line until the number went from 2 to 5."
