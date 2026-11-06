# Session r1-s02 -- Tom, returning user (gauge map)

Task: 1990s gauges in orange; gauges that do not send readings by themselves out of the picture (not deleted); say how many gauges remain and how many are orange.

S=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s02
All commands: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node design/ui/studio/tool/real.mjs ...

## Step 1 -- start
Command: --start $S setup:gauges-clean.txt -> 01.png
Notes: Good, that's our gauge project, 11 gauges, the table open underneath. I can see an "installed" column with dates and a "telemetry" column with yes/no. "Telemetry no" I take to mean the gauge does not send its readings by itself. Bottom right says "Local only", which I like.

## Step 2
Command: --step $S --click Data -> 02.png
Notes: Data place shows the two files and, at the bottom, "Filters" with a plus. That's where I narrowed it last month.

## Step 3
Command: --step $S --click-at 276,434 (button "Add filter") -> 03.png
Notes: A "New filter" screen with a list of the columns open on the right. "telemetry 2 values" is the one.

## Step 4
Command: --step $S --click-at 1195,388 (option "telemetry, 2 values") -> 04.png
Notes: Shows yes 7, no 4 with tick boxes. Top says 11 of 11 nodes. I'll keep the ones that send readings: tick "yes".

## Step 5
Command: --step $S --click-at 1143,183 (input "yes, 7 nodes") -> 05.png
Notes: Top bar now says "7 of 11 nodes, 3 of 13 edges". Four dots fade out. Good, nothing deleted. Press Done.

## Step 6
Command: --step $S --click Done -> 06.png
Notes: "Nodes showing 7 of 11" on the right, the table shows 7 gauges (Shown). The other four are just not drawn. Now the orange part, which I've never done. Back to Graph, where I saw "Style layers" and a plus.

## Step 7
Command: --step $S --click Graph -> 07.png
Notes: Style layers list: Hovered, Selected, Pinned, Everything (7). A plus next to "Style layers". I'll press that plus to add the orange.

## Step 8
Command: --step $S --click-at 276,122 (button "Add a layer or a folder") -> 08.png
Notes: Menu: Layer, Folder, Hover highlight, Analyze. I'll take "Layer".

## Step 9
Command: --step $S --click-at 178,158 (menuitem "Layer") -> 09.png
Notes: "Layer 1" added. Right side: "Which nodes 7 of 7, All nodes", then Shape, Visibility, Text, Fill. I only want the 1990s ones, so "Which nodes" first.

## Step 10
Command: --step $S --click "Which nodes" -> 10.png
Notes: Same column list as the filter. Pick "installed".

## Step 11
Command: --step $S --click-at 953,340 (option "installed") -> 11.png
Notes: Now "installed", "Before", and a box "A date or a year". I want the 1990s; look at what else the "Before" box offers.

## Step 12
Command: --step $S --click-at 1040,190 (combobox "installed: how to match") -> 12.png
Notes: Before, After, Between, Has a value, Has no value. "Between" is the 1990s. Pick it.

## Step 13
Command: --step $S --click-at 943,238 (option "Between") -> 13.png
Notes: Two boxes "A date or a year" to "A date or a year". Type 1990 and 1999.

## Step 14
Command: --step $S --click-at 964,216 --type "1990" --click-at 1116,216 --type "1999" -> 14.png
Notes: Header says "2 of 7". Table shows Upper Falls (May 12, 1998) and Lake Inlet (Oct 11, 1999). "No match 5". Good, it took the late-1999 one too. Done, then the color.

## Step 15
Command: --step $S --click Done -> 15.png
Notes: Layer 1 shows 2, "installed 1990 to 1999". Nothing orange yet. "Fill" sounds like the color: its plus.

## Step 16
Command: --step $S --click-at 1404,401 (button "Add to node fill") -> 16.png
Notes: A "Color" box appeared, empty. Click the little square in it.

## Step 17
Command: --step $S --click-at 1269,435 (button "Pick node color") -> 17.png
Notes: A color picker with a big square, a rainbow strip, "Hex 6366F1" and six little squares: purple, two greys, blue, yellow, black. No orange square. I'll click where the rainbow strip is orange.

## Step 18
Command: --step $S --click-at 1027,712 (slider "Hue") -> 18.png
Notes: The picker closed by itself after one click. Two dots are now a pale salmon color, the box says "F18963". A little legend appeared top left: "Color: Layer 1 -- 2 of 7 nodes". It's more salmon than orange; next to blue I can tell it apart, but the council will call it pink. I'll open the color again and try the strong corner of the big square.

## Step 19
Command: --step $S --click-at 1269,435 (button "Pick node color") -> 19.png
Notes: Picker open again; the big square now runs pale to a strong orange-red. Click the strong top-right corner.

## Step 20
Command: --step $S --click-at 1178,490 (slider "Saturation and brightness") -> 20.png
Notes: Stronger now, F84807, but it's leaning red; with my eyes red and orange are close, so I want it more plainly orange. The picker stayed open this time. Nudge the strip a touch toward yellow.

## Step 21
Command: --step $S --click-at 1034,712 (slider "Hue") -> 21.png
Notes: F88707 -- that is orange. The two dots and the legend square are orange. Close the color box with its X.

## Step 22
Command: --step $S --click-at 1180,448 (button "Close panel") -> 22.png
Notes: Color box closed. Two orange dots, the rest blue. Top bar still "7 of 11 nodes, 3 of 13 edges"; the little legend says "Color: Layer 1 -- 2 of 7 nodes"; Autosave says saved. That's what I was asked for. I stop here.

## At the end (in character)

Did I finish? Yes. Seven gauges are still in the picture (the top bar says "7 of 11 nodes"; the four that don't send their readings by themselves, telemetry "no", are left out by a filter, not deleted -- the full graph still says 11). Two of those seven are orange: Upper Falls (installed May 1998) and Lake Inlet (installed October 1999).

How easy: 5 out of 7.

What went fine: the filter was where I remembered it, and it told me "yes 7, no 4" before I ticked anything, so I knew what I'd get. The "Between 1990 to 1999" part showed me the two gauges and their dates in a table straight away, so I could check it took the October 1999 one.

What confused or annoyed me:
- The color. There's no orange in the little row of colors, so I had to aim at a rainbow strip. My first click gave me a washed-out salmon (F18963), and the color box closed itself after that one click, so I didn't get a chance to adjust it before the dots changed. I had to open it again, click the corner of the big square, and nudge the strip, three goes in all. With my eyes the second try (F84807) looked nearly red. I'd not have known what "Hex" meant if I'd needed to type one.
- The new layer is called "Layer 1", and the little legend on the picture says "Color: Layer 1". The council won't know what "Layer 1" is; I'd want it to say it's the 1990s gauges. I didn't see where to change that and I didn't go looking.
- "Fill" and "Shaders" and "Which nodes" -- I guessed "Fill" was the color. It was, but it was a guess.
- I wasn't sure whether my filter and my orange are now saved into the river project for everyone who opens it, or only on my screen. "Autosave: saved" suggests it's in the project. I'd probably ask her about that before the visit.

## Follow-up

Question (facilitator): "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: what did you notice the drawing do while you were choosing which gauges go in orange, and what did you take it to mean? Would you rather it had shown something else?"

Answer (Tom, after looking at 05.png, 10.png, 11.png and 14.png again):

3. Mostly I knew the next step: the filter was where I'd left it, and the "Which nodes" screen used the same column list, so I wasn't lost. It never got near walking away.

Least sure: the color, steps 17 and 18. On screen was a color box with a big shaded square, a rainbow strip, "Hex 6366F1" and six little squares -- purple, two greys, blue, yellow, black. No orange. I didn't know whether I was supposed to type something in "Hex", pick a square, or aim at the strip. I aimed at the strip, it closed on me after one click, and my dots went salmon. Then I had to open it again and guess twice more. That was the only part where I was poking rather than doing.

The drawing while I chose the gauges: once I'd typed 1990 to 1999, two dots stayed green and the other five went pale lilac, almost see-through. The table under it showed the same two, Upper Falls and Lake Inlet, and "No match 5". I took it to mean "these two get the orange, these five don't". But that pale is exactly what the drawing did a few minutes earlier when I made the filter and four gauges went out of the picture. So for a second I thought: am I hiding these five as well? I checked the top bar, it still said 7 of 11, so I decided no, it was only showing me which ones I'd picked. I'd probably ask her about that bit.

Would I rather it had shown something else? I'd have wanted to know from the drawing that this step was about which ones get colored, not which ones go away. How it should look, I don't know -- that's her job. And the two I picked were still green the whole time, so I couldn't tell yet what orange was going to look like on them until I got to the color box.
