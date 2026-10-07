# Session r2-s13 -- Grace (nonprofit operations analyst), task T10 Prompt A (Les Miserables)

Goal: get every character's name written next to its dot, using the sample Les Miserables network.

## Step 1
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s13 empty`
Saw: a start page. Left: "Open project or file...", "New from data...", a note "Files are read on this computer and never uploaded" (good, I like that). Right: Samples, with "Les Miserables -- 77 characters" first. At the bottom, a box asking to share usage data.
Thinking: "Okay, the sample is right there. I don't want to share anything, so No thanks first, then the Les Miserables sample."

## Step 2
Command: `--step --click "No thanks" --click "Les Miserables"`
Saw: the drawing of blue dots and gray lines, no names anywhere. Right panel says Nodes 77, Edges 254 -- matches the 77 characters on the sample card. Two tabs on the right: "Style" and "Values" (Values is selected).
Thinking: "77, good, that's everyone. No names on the dots. Names are how it looks, so I'll try the Style tab."

## Step 3
Command: `--step --click "Style"`
Saw: Style for the "Graph": background color, Method "Force - Recommended", Shape 3D/2D, spring length, gravity. Nothing about names or labels.
Hesitation: "This is about the whole page and how it's arranged, not the dots." On the left there is "Selection" and "Everything".
Thinking: "Maybe I need to pick the dots first. 'Everything' sounds like all of them -- I'll click that and see if the right side changes to dot settings."

## Step 4
Command: `--step --click "Everything"`
Saw: the right side now says "Everything" with Nodes/Edges, Fill color, Shape, Effects, and a "Label" row with a plus sign. That's it.
Thinking: "Label -- that's the name. I'll press the plus next to Label."

## Step 5
Command: `--step --click-at 1419,362` (the + on the Label row)
Printed: `at 1419,362: button "Add label line"`
Saw: a small "Label" box opened, "Find an attribute", with two choices: "id" and "name". A row "Pick an attribute" appeared under Label.
Thinking: "'name' is obviously what I want -- the character's name. Clicking name."

## Step 6
Command: `--step --click "name"`
Saw: names appeared next to the dots right away (Blacheville, Fameuil, Myriel, Napoleon...). They're small but readable at the edges; in the crowded middle they overlap. Under Label the panel now reads "Aa Above | Abc name" and a gray note: "77 labels, 7 hidden to avoid overlap".
Thinking: "Nice, that was quick. But the task is EVERY name, and it says 7 are hidden. I want all 77. Maybe the 'Aa' / 'Above' part has a setting for that. I'll click 'Above'."

## Step 7
Command: `--step --click "Above"`
Saw: nothing changed. "Above" doesn't seem to do anything when clicked.
Thinking: "Hm. Maybe the little 'Aa' is the button for text settings. Trying that."

## Step 8
Command: `--step --click-at 1219,392` (the "Aa")
Printed: `at 1219,392: button "Label position"`
Saw: a "Label position" box with a 3x3 grid of dots -- just where the name sits relative to the dot. Nothing about showing hidden names.
Thinking: "Not it. '7 hidden to avoid overlap' -- maybe if I zoom in, there's room and they show up. I'll close this and zoom into the crowded middle."

## Step 9
Command: `--step --key Escape --wheel 700,420,-600`
Saw: zoomed in a bit; names are a touch bigger. Note still says "77 labels, 7 hidden to avoid overlap". I can spot dots without a name (one at about 607,502 below the cluster, one at 913,410 next to Bamatabois, and Valjean's center area is a jumble).
Thinking: "Zoom more into the middle where it's crowded, see if the hidden ones come back."

## Step 10
Command: `--step --wheel 680,420,-1500`
Saw: zoomed further; the note now says "77 labels, 5 hidden to avoid overlap" -- so zooming does bring names back, two more appeared (Gillenormand, Mlle Gillenormand now visible). Still dots without names, e.g. next to Bamatabois (937,401) and near Valjean (790,436).
Thinking: "So it's hiding names on purpose when they'd overlap. I'd rather choose that myself. Is there a way to say 'show all of them anyway'? Let me hover over that gray note to see if it explains."

## Step 11
Command: `--step --hover "77 labels, 5 hidden to avoid overlap"`
Printed: `tooltip: null`. No explanation on hover.
Thinking: "Maybe the 'Abc name' box opens more text settings -- size, overlap, something. Clicking it."

## Step 12
Command: `--step --click "Abc name"`
Saw: just the same attribute picker again (name in use, id). No size or overlap setting.
Thinking: "No 'show all' switch that I can find. Zooming did bring names back, so I'll zoom right into the packed middle and count what's still missing."

## Step 13
Command: `--step --key Escape --wheel 700,400,-2500`
Saw: zoomed in more, names are bigger and easier to read. But the note went BACK to "77 labels, 7 hidden to avoid overlap" -- more zoom didn't help this time. Dots still without names: next to Bamatabois (965,391), two big ones in the middle (733,339 and 698,379), one beside Mme Magloire (660,630), and "Mme..." at 828,625 is cut off by Labarre.
Hesitation: "That's confusing -- it went 7, 5, then 7 again. I don't know what makes it decide."
Thinking: "It's in 3D, so dots sit behind each other. The toolbar at the bottom says '3D' with a little arrow. Maybe flat (2D) spreads them out so the names fit."

## Step 14
Command: `--step --click "3D"`
Printed: `nothing on screen is called "3D"`. I'll point at it instead.

## Step 15
Command: `--step --click-at 767,864`
Printed: `at 767,864: button "View"`
Saw: a View menu: 2D, 3D (checked), VR/AR (not available), Fit, Front/Side/Top/Isometric, Show Legend / Table.
Thinking: "2D, flat like a slide. I'll pick that."

## Step 16
Command: `--step --click "2D"`
Saw: the drawing redid itself flat and spread out wider. The note now says "77 labels, 0 hidden to avoid overlap". Every dot I look at has a name next to it (Myriel, Napoleon, Valjean, Javert, Child 1, Child 2, Jondrette...). The names are very small, though -- at this size I can barely read them.
Thinking: "0 hidden -- that's all 77. Let me zoom in on the middle just to check I can actually read them."

## Step 17
Command: `--step --wheel 720,500,-1500`
Saw: zoomed only a little; the note still says "77 labels, 0 hidden to avoid overlap". Every dot has its name above it. The names stay tiny compared with the dots -- zooming makes the picture bigger but I still have to squint, and on a slide they'd be hard to read from the back of a room. I didn't see a text-size control in the Label row.
Thinking: "The task was every name next to its dot, and the app itself says 0 hidden. That's done. Text size would be my next fight for a real slide, but that's another day."

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s13`

## In character: how it went

**Did I finish?** Yes. All 77 characters have their names next to their dots: the panel says "77 labels, 0 hidden to avoid overlap" in the flat (2D) view.

**How easy, 1 (very difficult) to 7 (very easy):** 5.

The first part was quick and obvious: click "Everything" on the left, then the plus next to "Label" on the right, pick "name". That took three clicks and the names were there. I'd have given that a 7.

What cost me time was the last few names:
- It quietly left some names off ("7 hidden to avoid overlap"). Good that it told me, but it didn't tell me what to do about it. Hovering the note gave nothing, and the label settings ("Aa" = position only, "Abc name" = which column) had no "show all anyway" choice.
- Zooming in changed the count from 7 to 5 and then back to 7, which made no sense to me -- I couldn't tell what it was waiting for.
- I only got to 0 hidden by guessing that the 3D view stacks dots behind each other and switching the View menu to 2D. Nothing pointed me there; I'd tell a colleague "switch it to 2D" as a trick, not because the app said so.
- I had to find "Everything" before any dot settings appeared. At first the Style tab showed page settings (background, layout method, gravity), and "Label" wasn't there. It worked, but "Everything" doesn't sound like "settings for the dots".
- The names are very small next to the dots, even zoomed in. For the board slide I'd need bigger text, and I didn't see a size setting for the names.
- Small thing: the toolbar control reads "3D" but its name is "View", so I first tried to click "3D" and missed.

What I liked: "Files are read on this computer and never uploaded" on the first screen, the node count (77) matching the sample card, and the plain word "Label" with a plain "name" choice -- no jargon.
