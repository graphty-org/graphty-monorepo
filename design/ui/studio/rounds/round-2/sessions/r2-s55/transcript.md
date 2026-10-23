# Session r2-s55 -- Explorer Elena, task T16 (First look)

Participant: Explorer Elena (product manager, first-time graph user). Long-ish clock: curious, no deadline, but nothing makes her stay.
Task: "You have just installed this program and have a short while to decide whether it could help with your work. Try it however you like: on something that comes with it, or on friends.csv in your Downloads folder. When you have decided, tell us whether you would keep using it, and why."

Tool: `T=design/ui/studio/tool; S=rounds/round-2/sessions/r2-s55` (run from design/ui/studio).

## Step 1 -- start

Command: `node $T/real.mjs --start $S empty` -> 01.png

Saw: a dark page. "Start" with "Open project or file...", "New from data...", "or drop a file anywhere in this window". A "Samples" list on the right (Les Miserables, karate club, College football, Florentine families) with one-line descriptions. A box at the bottom asking me to share usage data.

Elena: "OK, no install, no account. Good. First, get rid of the data-sharing box -- no thanks. Then I'll just drop my running club file on it, that's closest to my stuff."

## Step 2 -- dismiss the data box

Command: `--click "No thanks"` -> 02.png (no output besides the screenshot)

Elena: "Gone. Now drag my file onto the window, like the little text says."

## Step 3 -- drop friends.csv

Command: `--drop friends.csv` -> 03.png ("dropped the file friends.csv on the middle of the window")

Saw: it just opened -- no import questions. 20 blue balls with arrows between them on a light canvas. Right panel: Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, "Edges per node 3 to 6, mean 4.1". Left: a Find box, "Selection", "Everything", and at the bottom "Analyze (flask) in the toolbar (Shift+A) to add results here". Toolbar at the bottom center: flask, a chart icon, "3D", magnifier.

Elena: "Oh nice, it just worked. 20 -- yes that's about the club. But no names on the dots, so I have no idea who is who. Density 0.1079 -- is that a lot? No clue. The upper-left one looks a bit bigger -- let me click it and see who it is."

## Step 4 -- click the biggest-looking dot

Command: `--click-at 692,157` -> 04.png ("at 692,157: node with id "Pia"")

Saw: the dot turned brown with a yellow ring. Right panel now says "Pia", Node, Summary: id Pia, Degree 4 (with a little arrow). Left says Selection 1.

Elena: "Pia! OK. 'Degree 4' -- I guess she knows 4 people? I thought she looked biggest, so she must be the most connected one." (She is wrong: all the dots are the same size; it only looked bigger because it is nearer the camera.) "But I don't want to click 20 dots one at a time. There's a little flask button at the bottom -- the hint said 'Analyze'. Let me try that."

## Step 5 -- open Analyze

Command: `--click-at 680,864` -> 05.png ("at 680,864: button "Analyze"")

Saw: a popup list, "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow... each with a grey one-line description.

Elena: "Ugh, Betweenness, Eigenvector, Katz... this is the stuff I was afraid of. But one says 'Start here' -- fine, I'll do what it says. PageRank, like Google?"
Hesitation: almost closed the list when she saw the names; the "Start here" tag is what kept her going.

## Step 6 -- pick PageRank

Command: `--click "PageRank"` -> 06.png

Saw: the popup became a PageRank form: "Damping factor 0.85", "Weight None", "Advanced", "Under a second", and a blue "Run" button.

Elena: "Damping factor? No idea, leave it. Weight -- my file had a weight column I think, but I'll leave it alone. 'Under a second' is reassuring. Run."

## Step 7 -- Run

Command: `--click "Run"` -> 07.png

Saw: all dots turned orange, some dark brown. A legend box top-left of the canvas: "Color: Influence, 0.04382 [orange-to-brown bar] 0.06608". Left panel gained a row "Influence 20". Right panel for Pia: "Results -- Influence 0.04736, #11 of 20", Degree 4.

Elena: "Ooh, colors. So it called it 'Influence', not PageRank -- that I understand. Pia is #11 of 20 -- huh, so she's right in the middle, not the top like I thought. The numbers on the legend mean nothing to me but the '#11 of 20' does. The dark brown ones must be the important ones, I think -- the bar goes light to dark. Let me click the darkest one in the middle."

## Step 8 -- click the darkest dot

Command: `--click-at 640,578` -> 08.png ("at 640,578: node with id "Ava"")

Saw: Ava selected. Influence 0.06423, #2 of 20. Degree 6.

Elena: "Ava, #2 of 20, knows 6 people. OK, that matches -- dark means important. But who's #1? I don't want to keep clicking dots. There's that 'Influence 20' row on the left -- maybe that's a list. Try it."

## Step 9 -- click "Influence" on the left

Command: `--click "Influence"` -> 09.png (tool: ambiguous, took the left-panel tree item)

Saw: the Influence row highlighted with an eye icon. The right panel switched to "Influence -- Measure from Influence, Oct 7" with a Style tab open: Nodes / Edges, Fill, Color = Influence, Shape, Effects, Label, Tooltip, each with a plus. Not a list of people.

Elena: "Hmm, that's settings. Not what I wanted. There's a 'Values' tab next to 'Style' -- values sounds like the numbers. Try that."
Hesitation: expected a ranked list; got a styling panel.

## Step 10 -- Values tab

Command: `--click "Values"` -> 10.png

Saw: a row of grey bars (a histogram, all about the same height), "0.04382 ... 0.06608", "20 of 20 have a value, ... median 0.04736". Then "Top 10": Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575, Gus 0.0547, Jada 0.0483, Theo, Sana, Ravi, Quinn. Then "Made with: Analysis PageRank, Ran Oct 7, Damping factor 0.85, Weight None".

Elena: "THERE it is. A top 10. Farah, Ava, Hana are the top three. That's the list I wanted -- this I could paste in Slack: 'Farah, Ava and Hana are the hubs of the running club.' Where is Farah on the picture though? Let me click her name."

## Step 11 -- click Farah in the Top 10

Command: `--click "Farah"` -> 11.png

Saw: a dot at the bottom (about 733,744, tucked behind another dot) got the yellow ring. Right panel: Farah, Influence 0.06608, #1 of 20, Degree 4.

Elena: "Huh. Farah is number one but she only knows 4 people -- same as Pia, who was #11. And Ava knows 6 and is #2. So 'Influence' isn't just who knows the most people... I don't really get why, but OK, I'll trust it, it said 'Start here'." (Confused: does not know why influence and number of connections disagree; nothing on screen explains it.) "She's hiding behind another dot at the bottom. What I really want for Slack is the picture with names on it. Back in that Style tab there was a 'Label' with a plus. Let me try that -- it's just a label, it can't break anything."

## Step 12 -- back to Influence

Command: `--click "Influence"` -> 12.png (ambiguous again, took the left-panel row)

Saw: the Influence panel again, on the Values tab this time (it remembered). Style tab is next to it.

Elena: "Right, Style. Then the Label plus."

## Step 13 -- Style tab

Command: `--click "Style"` -> 13.png

Saw: Nodes / Edges, Fill, Color = Influence, Shape +, Effects +, Label +, Tooltip +.

Elena: "Label, plus. Here goes."

## Step 14 -- Label plus

Command: `--click-at 1419,298` -> 14.png ("button "Add label line"")

Saw: a "Label" popup: "Find an attribute", Attributes: id; Influence: Influence, Influence rank, Influence percentile. A "Pick an attribute" box appeared under Label.

Elena: "'id'? I want the name. ...Oh wait, when I clicked Pia it said 'id Pia'. So id IS the name. Pick id."
Hesitation: "id" sounded like a database number, not a name; she only picked it because she remembered "id Pia" from step 4.

## Step 15 -- pick id

Command: `--click "id"` -> 15.png

Saw: names above every dot (small serif text): Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sara, Kofi, Theo, Jada, Ivan, Ava, Hana, Gus, Ben, Farah, Dev, Eli. The panel says "Above, Abc id" and "20 labels, 1 hidden to avoid overlap". Bottom-left cluster (Eli, Dev, Farah) is crowded; Farah's label is squashed against Dev's.

Elena: "Ooh, now it's my club! OK this is actually readable. Ava's in the middle and dark, Farah's dark at the bottom, Hana too. The top half is all lighter orange -- I bet those are the newer members." (Unsupported guess: nothing in the data says who is new.) "Now can I get this as a picture for Slack? The three-lines menu top-left usually has export."

## Step 16 -- main menu

Command: `--click-at 24,20` -> 16.png ("button "Main menu"")

Saw: a menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Elena: "Export. That's it."

## Step 17 -- Export dialog

Command: `--click "Export..."` -> 17.png

Saw: an Export dialog. Image / Data on the left. "Image -- A picture of the drawing, 2x, PNG". Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background Canvas color/Transparent. A small preview of the drawing with the legend in the corner. "Saved to this computer only; nothing is uploaded." Buttons Cancel, Copy, Export.

Elena: "'To share' -- perfect, that's literally me. The preview is tiny, the names are just specks, but it's a preview. Export."

## Step 18 -- Export

Command: `--click "Export"` -> 18.png (ambiguous: took the button). Tool: "a file was saved: friends_current-view.png, 1806 x 1720 (downloads/friends_current-view.png)".

Looked at the saved picture: the whole club with names, colored orange to dark brown, legend box "Color: Influence 0.04382 -- 0.06608" in the corner. The names are a bit fuzzy and serif, readable. Farah -- the #1 -- is still drawn with the yellow selection ring and a yellow-olive fill, not dark brown, and she sits half behind another dot; Eli and Dev overlap at the bottom left.

Elena: "Got it. It's good enough to drop in Slack. But Farah's yellow -- anyone looking will think she's special in some other way, and she's my number one, so that's backwards. I'd have to click off her first, I suppose. And the legend numbers, 0.04 to 0.06, nobody will know what that means -- I'd just write 'darker = more central' in my message."

I'm done here.

## End

Command: `node $T/real.mjs --end $S`

## Verdict (in character)

**Did I finish?** Yes. I loaded my own file, got a ranked list (Farah, Ava, Hana on top), put names on the dots and exported a picture. My Slack sentence: "Ava, Farah and Hana are the people who hold the running club together -- darker = more central."

**Would I keep using it?** Probably, for a first look at a spreadsheet like this. It opened my file with no questions, nothing to install, and the "Start here" tag and the "Top 10" list got me to an answer in a few minutes. I'd try it on the integrations export next.

**Ease: 5 of 7.**

**What confused me:**

- The dots had no names until I went into a Style panel and found "Label", and there it was called "id", not "name". I only knew id was the name because I'd clicked Pia earlier.
- The Analyze list is full of words I don't know (Betweenness, Eigenvector, Katz, HITS). Without the "Start here" tag I'd have closed it.
- It says "PageRank" in the list but "Influence" everywhere after. I liked "Influence" better but I wasn't sure it was the same thing at first.
- Farah is #1 for influence but knows only 4 people, the same as Pia at #11. Nothing told me why, so I just trusted it.
- Clicking "Influence" on the left gave me style settings, not the list. The list was behind the "Values" tab.
- The legend numbers (0.04382 to 0.06608) mean nothing to me. "#11 of 20" did.
- The selected dot stays yellow in the exported picture, which makes my top person look different from the rest.
- I thought Pia was the biggest dot (she was just closer) and that the top half of the picture was the newer members -- I had nothing to go on for either; nobody corrected me.

Where engagement dropped: none really; she ended because she had her sentence and her picture.
