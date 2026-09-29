# Session: make this project look like the team's -- Jordan, marketing network analyst

Participant: Jordan (study/personas/marketing-analyst.md), a growth-marketing analyst who does "the network stuff" one or two days a week. She has been told a colleague mailed her the team's file of colors and sizes; she has never heard the words "style file" or "recipe" in this tool.

Task as given: "Your team always draws its networks the same way, and a colleague just mailed you the file with those colors and sizes. Make this project look like the team's."

Out of her domain: the mocks show a payments network with a mule ring, and the mailed file is called fraud-team-colors. She was asked to treat it as her team's file.

Screens used, in the order she reached them, all at 1440 by 900 (her laptop): the Data panel (shots/r4-jordan-teamfile-data-panel.png), the main menu with File open (the first frame of shots/r4-jordan-teamfile-replace-and-recipe.png), the Apply recipe picker (same page, frame 7), the file dropped on the canvas and its choice (frame 10), the one-layer binding step (frame 11), the result (frame 12), the style stack and the color picker's Libraries tab (shots/r4-jordan-teamfile-styles-list.png, frames 1 and 9), the recipe Export dialog (shots/r4-jordan-teamfile-recipe-apply.png, frame 1), and the navigation comparison page (shots/r4-jordan-teamfile-navigation.png).

## Think-aloud

**1. Where does a colors file go?** "OK, so Priya mailed me the file. First thing I'd do is what I do with everything: drag it out of Outlook onto the map. But let me see if there's an obvious button first, because I don't know if dragging a colors file onto a graph means 'add these colors' or 'open this as a new thing'."

"The hamburger. File: Open..., Add data..., Add as another graph..., Join..., Replace data..., Connect to data source..., Load set collection..., Export... Nothing about colors or styles. 'Open...' -- would that open the colors file as a project and throw my graph away? I wouldn't risk it. 'Add data...' -- no, it's not data. So File is out."

"There's a 'Recipes' in the menu too. Recipes? Like a cooking thing? My colleague didn't send me a recipe, she sent me colors. I wouldn't look there. Maybe Edit or View? I can't see those open in any of the pictures, so I don't know. If I was in the real app I'd be hovering over each one now."

**2. The Data panel.** "Clicked 'Data' on the left because that's the only other word that sounds like files. It lists the CSV, its columns, versions, then 'Recipes applied' with a plus, then 'Style files' with a plus. Huh. 'Style files'. OK -- is what Priya sent me a 'style file'? It's colors and sizes, so... probably? The plus says 'Apply a style file...'. I'd try that. It's a bit hidden, it's under Versions and the grey header looks disabled, but the word is right."

"Funny that it lives under Data when it's not data. If I hadn't wandered in here looking for 'files' I'd never have looked here for colors. I'd have expected it next to the colors themselves, on the right, where it says Style stack."

"Also, 'Sent: nothing' at the bottom. Fine. It's a colors file, I'm not worried about that one. If it was the CRM I'd care."

**3. The recipe picker, by accident.** "I peeked at Recipes, Apply recipe... anyway, because I'm nosy. It's a list: Mule ring triage, Card-testing sweep, 'Open a recipe file...'. And on the right it says what it carries: 3 sets, 2 runs, 3 style layers, 1 note. So a recipe is... a bigger thing with colors inside it? Now I genuinely don't know which one Priya sent me. If she sent a recipe and I use 'Style files', does that break? If she sent a style file and I use 'Open a recipe file', does that break? The email just says 'here's our team template'. I'd have to write back and ask her, and I hate doing that."

**4. I drag it in.** "Forget it, I'm dragging it onto the map like I wanted to in the first place. The whole map gets a blue outline -- good, that tells me it'll take it. Then a little box: 'Dropped file. fraud-team-colors: style file. 4 layers, bound by attribute name.' OK so it IS a style file. The tool told me, I didn't have to know. That's the right way round."

"'Bound by attribute name' -- skipped that. Two choices. 'Apply style file on top... Adds 4 style layers above the 9 already here; those stay.' And 'Replace style stack with style file... The 9 style layers here are removed; the file's 4 remain.'"

"Wait, 9? On the right it says Style stack: Risk color, Size by PageRank, Mule ring, Base style. That's four. Where are the other five? Is it counting something I can't see? This is the thing that gets me every time -- the screen says 4, the popup says 9. Which one's right? I'm already a bit suspicious of the whole thing now."

"Which do I want? The task is 'make it look like the team's'. Honestly that sounds like Replace -- I want it to look like theirs, not like mine with theirs on top. But 'removed' -- no. I don't click things that say removed. Then I see 'Either is one undo step' at the bottom. OK, that helps, I'd feel better knowing I can undo. But I'd still take the top one, the blue one with 'Enter' on it, because the tool is clearly suggesting it and it doesn't delete anything."

"What I don't get is: if I put theirs on top, does mine still show through anywhere? Like, their file does colors and edge widths -- does my old 'Size by PageRank' still size the nodes? I think so? Then it doesn't look like the team's, it looks like a mix. The box doesn't say."

**5. One thing it asks.** "Next screen: '1 layer to bind. 3 layers matched by name: Cleared accounts, Merchant hubs, Amount width.' Then Chargeback heat 'reads chargeback_rate, numbers', a dropdown saying 'Leave unbound', 'no attribute fits'. So their file colors something by a column I don't have. Fine, that happens -- our team files always have the columns from whoever made them. 'Left unbound, Chargeback heat is kept and switched off.' OK. Apply. I didn't have to do anything, the default was right."

"I like 'One undo step' on the bottom again. Didn't read the rest."

**6. Did anything happen?** "Applied. Little black bar: 'fraud-team-colors applied: style; 1 missing attribute. Undo.' 'Applied: style' -- that's a weird sentence but OK."

"Now I look at the map. And... it looks the same? Grey hexagon blob, the orange dots with rings. Their layers are called Cleared accounts -- green swatch -- and Merchant hubs -- yellow swatch. I don't see a single green or yellow node. The legend in the corner still says 'Flagged: yes 14, no 3,079'. Nothing about cleared accounts or merchant hubs."

"So either nothing changed, or those groups aren't in my data, or they're hidden under the hexagons, or it's still drawing. I can't tell which. The right side says 'new' in blue on four rows, so the tool thinks it did something. But my job was 'make it LOOK like the team's' and I'm looking at it and it looks like what I had. If I were really doing this I'd screenshot it and send it to Priya asking 'is this right?', which defeats the whole point of her sending me the file."

"Also the stack: Cleared accounts, Merchant hubs, Amount width, 'Chargeb...' cut off, then Watchlist ring and Risk ramp -- where did those come from, I never added them -- and '6 more'. My Risk color and Mule ring have gone below the fold. OK, they're 'underneath', the team's are on top. That at least matches what it said."

"'Chargeb...' has a yellow warning and a crossed-out eye. I hovered: 'missing attribute: chargeback_rate. Bind... in its row's menu.' Fine. I'd leave it. I don't have chargeback rate. The warning will sit there forever though, and my manager will ask what the yellow thing is."

**7. Afterwards.** "In the Data panel, Style files now has 'fraud-team-colors, Applied on top, Apr 20' with a little filter icon to show what it added. Good, at least there's a record of where the colors came from. If someone asks 'why is this green', I can point at that."

"In the color picker there's a Libraries tab that lists palettes and 'Style layers, from stress-response.graphty-style'. So once it's in, I could pick the team's colors one by one for other things. Nice, but I wouldn't find it unless someone showed me -- you open a color swatch and then a tab. Also, that's a file extension, '.graphty-style'. So if Priya's attachment ends in that, that's the clue. Nobody told me that up front."

"Does this carry to my NEXT project? Like, can I make this the team default so I don't do this every time? I didn't see anything that says so. Every week I'd be dragging the same file in again."

**8. Off on a tangent.** "Honestly the reason we have a team file at all is because our VP complained that every deck had different colors for the same segments. Brandwatch lets you pick one theme per workspace and it still resets half the time. And then the deck gets printed in black and white and the yellow -- and this team file uses yellow for Merchant hubs, look -- the yellow just disappears on light grey. I'd bet money nobody on our team checked that. Not the tool's fault. Well. Maybe a little, it could warn me."

**9. Laptop check.** "At 1440 the map gets the middle, the panels are fine, the dialogs are in the middle of the map. Nothing squeezed. Fine."

## Her answer to the task

"I dragged the file onto the map, took the default 'on top', left the one layer it couldn't use switched off, and hit Apply. The tool says four team layers are on. But looking at the map, I can't see that it looks any different, and my old sizes are probably still in there underneath. So: done, I think, but I'd send a screenshot to my colleague to check before I put it in a deck."

## Single Ease Question

4 out of 7. "The drag worked and the tool told me what the file was, which I didn't know. But I couldn't find a menu for it, I had to guess between 'on top' and 'replace', the count said 9 when I could see 4, and at the end the map didn't look like anything had happened. That last one is the one that matters: the whole task was 'make it look like'."

## Would she use this instead of her current tool?

"Not instead. Alongside, maybe. In Gephi I do this by hand every time from a list of hex codes Priya keeps in a Google doc, so a file you just drop in is genuinely better than what I do -- that saves me ten minutes a week and gets rid of the 'your green is the wrong green' messages. But it's not a reason to switch on its own; Brandwatch does our clusters and I'm not moving that. If the map visibly changed to our colors and I could make it the default for every project, I'd tell the team about it."

## Problems observed

1. **No menu path she could see for a colors file.** The File menu has Open, Add data, Replace data and more, but nothing for styles; the Recipes submenu, which is meant to hold "Apply style file on top..." and "Replace style stack with style file...", is not drawn open anywhere, and she would not look under "Recipes" for colors. She found "Style files +" in the Data panel only because she was hunting for the word "files". Severity 3.
   Quote: "My colleague didn't send me a recipe, she sent me colors. I wouldn't look there."
2. **She could not tell a style file from a recipe before dropping it.** The recipe picker's "Open a recipe file..." and the Data panel's "Apply a style file..." look like two doors for what she thinks of as one "team template"; nothing says which kind of file she has until after the drop. Severity 2.
   Quote: "Now I genuinely don't know which one Priya sent me."
3. **The count of layers in the choice does not match the style stack on screen.** The drop choice says "the 9 already here", while the Style stack beside it lists four rows and no "more" line. For her, mismatched numbers undermine trust in the whole tool. Severity 3.
   Quote: "The screen says 4, the popup says 9. Which one's right?"
4. **After Apply, the map looks unchanged.** Frame 12's canvas shows the same grey hexagons and orange-ringed nodes; no green (Cleared accounts) or yellow (Merchant hubs) node is visible, and the canvas legend still shows only "Flagged". The only evidence is the "new" badges in the stack. The task was "make it look like the team's", so she could not confirm she had finished. Severity 4.
   Quote: "My job was 'make it LOOK like the team's' and I'm looking at it and it looks like what I had."
5. **"On top" versus "Replace" does not say what she will see.** She wanted the result to look like the team's, which sounds like Replace, but "removed" scared her off; "on top" does not say which of her own properties (for example Size by PageRank) will still show through, so she expects a mix. "Either is one undo step" reassured her a little. Severity 3.
   Quote: "If I put theirs on top, does mine still show through anywhere?"
6. **The canvas legend does not pick up the team's layers.** After Apply the legend still reads only "Flagged", so a VP would still ask what green and yellow mean. Severity 3.
   Quote: "My manager will ask what the yellow thing is."
7. **No way to make the team's look the default for new projects.** She expects to drop the same file in every week. Severity 2.
   Quote: "Every week I'd be dragging the same file in again."
8. **Wording she tripped on or skipped.** "Bound by attribute name" (skipped), "applied: style;" in the confirmation bar (odd), a truncated "Chargeb..." row, and the "Style files" header in grey ink, which looked disabled to her. Severity 1.
   Quote: "'Applied: style' -- that's a weird sentence but OK."
9. **The team's yellow may disappear in greyscale print, and nothing warns her.** The file brings a yellow layer onto light grey; her decks get printed in black and white. Severity 2.
   Quote: "The yellow just disappears on light grey."
10. **Layers she never added appeared in the stack.** "Watchlist ring" and "Risk ramp", from an earlier recipe, showed up beside the team's layers and she could not tell where they came from. Severity 2.
    Quote: "Where did those come from, I never added them."

## What she liked

- Dragging the file onto the map worked, the whole canvas lit up as a drop target, and the tool named the file's kind ("style file, 4 layers") so she did not need to know the term.
- "Either is one undo step" and "One undo step: Apply style file..." on both dialogs: she would not have clicked Apply without it.
- The unmatched layer defaulted to "Leave unbound" and said what that does; she did not have to decide anything.
- The Data panel keeps a record ("fraud-team-colors, Applied on top") she can point to when someone asks where the colors came from.
