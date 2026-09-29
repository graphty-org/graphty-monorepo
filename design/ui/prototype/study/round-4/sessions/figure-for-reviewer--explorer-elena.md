# Session: a figure a reviewer can read in gray -- Elena, first-time graph user

Participant: Elena (fictional; persona: study/personas/explorer-elena.md), a product manager with
no graph training who uses network pictures occasionally and voluntarily. Played on the long clock
("curious afternoon"): no deadline, three or four dead ends tolerated. Laptop width, 1440 by 900,
trackpad.

Task, as the moderator gave it: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Screens, in order: the app at rest and its project-name menu (navigation page, the new layout), the
Style stack with its Look menu (styles-list page), the Color popover choosing a value and the
fold-change layer it makes (colour-by-value page), the Export dialog (the project menu opening it,
the figure in the Screen look, the same figure in the Print look, the written state). The export
flow page was opened last and closed almost at once.

Renders she looked at (all in shots/): r4-elena-grayfig-nav-new.png,
r4-elena-grayfig-nav-new-menu.png, tasks/figure-for-reviewer/01-styles-list.png,
r4-elena-grayfig-styles-list-html-task-figure-for-reviewer-looks.png,
tasks/figure-for-reviewer/02-colour-by-value.png,
r4-elena-grayfig-colour-by-value-html-task-figure-for-reviewer-numbers.png,
r4-elena-grayfig-export-dialog-html-task-figure-for-reviewer-ways-in-menu.png,
tasks/figure-for-reviewer/03-export-dialog-figure.png,
tasks/figure-for-reviewer/04-export-dialog-figure-grey.png,
r4-elena-grayfig-export-dialog-html-task-figure-for-reviewer-done.png, flows__export.png.

The open project is a 300-protein "Stress response study", not her own data. The navigation
screens show a different sample project (Les Miserables); the moderator told her to treat that as
the same app with a different file open.

---

## Think-aloud transcript

**Reading the task.** "A reviewer." OK -- in my world that's whoever is going through my deck
before the leadership review. And "printed in gray" -- yeah, people print my stuff on the
black-and-white printer by the kitchen and then my red and green bars are the same blob. So I need
a picture file, and it has to still make sense without color. "Get it to them" -- I'll download it
and drop it in Slack or email. I don't expect this thing to send it.

**The app at rest.** Dots and lines, colored groups, a little color key bottom left, a table
underneath. Nice, it isn't a hairball. Top right... "100%". That's it? No Share, no Download, no
Export. That's where I look in literally every tool. Hm.

I tried the canvas first -- right-click on the picture. On my trackpad that's a two-finger tap and
honestly I never know if it worked. Nothing I could see. Next: the three lines top left, that's
always the menu. It says the menu has File, Edit, View and so on. I'd hover File and look for
Export or Download or Save as image. The mock doesn't show me what's under File, so I don't
actually know if it's there. (Moderator: "That menu isn't drawn in this mock.") OK.

Then I noticed the little arrow next to the project name. I didn't read that as a button at
first -- I thought it was just the title. Click: Export..., Update with new data..., Download
project file, Version history, Project info, Rename, Duplicate, Close. "Export..." is right at the
top and highlighted. There we go. "Download project file" also made me pause -- is that the
picture? No, "project file" sounds like the whole thing, the working file. I went with Export.

**Detour before exporting: the colors.** Before I hit Export I wanted to check the picture itself,
because it's supposed to work in gray. On the style screen the dots were orange-to-dark-brown,
with a key saying "Color: betweenness". I don't know what betweenness is. On the next screen the
dots were all gray and there was a "Style layer 1" box open with "Color: apply a color or a value"
and a list -- log2FoldChange, module, degree, betweenness, closeness. And then after that they were
red and blue. Wait, did I do that? I don't remember changing it. I probably clicked something in
that list. OK, whatever, red and blue is what it is now.

The key under it says "log2FoldChange color, -2.52 to 3.15... Below 0: 148, Above 0: 152". So
red is below zero and blue is above zero. Red means bad, blue means fine -- I'd say that's the
down-in-stress ones in red, those are the problem ones. (She did not read the note in the popover
that red and blue can be swapped with Reverse, and that the colors only mean the sign.)

There's also a "Look: Screen" dropdown in the right panel. I saw it but I didn't open it; it's a
settings-looking thing and I wasn't told there was anything in there for me. (Later, when the
moderator asked what it did, she opened it: "Print -- reads in gray on white paper and for
color-blind readers." "Oh. Well that's exactly it. I'd never have opened that on my own though.
And 'look for the whole project' -- does that change it for everyone? I'd leave it alone.")

**The Export dialog, first look.** Big box. Left side: Figures -- "Figure (.svg)" ticked,
"Image (.png)" not. Rows, Table (.csv). Report. Graph data. Share the setup.

SVG. I don't know what an SVG is. I know PNG, I paste PNGs into Slides all day. The line under it
says "Vector, with real text. For a paper or slides." and PNG says "Pixels, for a web page or a
chat". So... the slides one is SVG? Will Slides even take an SVG? I ticked Image (.png) as well, so
I'd get both and could send whichever opens. (The preview did not change to show her the PNG,
and nothing said whether the PNG gets the gray treatment too. She did not ask; she assumed it
would match.)

Then a block of settings: View "Current view", Width "174 mm, two columns", Background White,
Legend "Beside, right", Labels "Top N by this layer's value", N 10. I don't know what "two
columns" means for a picture, I just left all of it. The defaults look like someone thought about
it. "2 labels hidden to avoid overlap: show list" -- fine, I don't need every name.

**The preview.** The picture with the key to the right: "log2 fold change. Red: down. Blue: up.
White: 0." -- OK so it IS down and up. Then "Degree, node size: number of interactions" with little
dots getting bigger. So the big dots are the big ones -- the ones everything connects to. That
lines up with what I thought; the big red one near the middle, that's the most important one and
it's in trouble.

And then a paragraph: "Degree: exact, not normalized, on the full graph... Weight: confidence not
used yet; no measure here reads a weight." I have no idea. I skipped that. If my reviewer asks me
what "not normalized" means I'm going to have to say I don't know, which is not great.

**The yellow warning.** Under the preview: a little yellow "!" and "Values just above and below 0
print as the same gray." and a button, "Use Print look". Normally a warning icon makes me back off,
but this one is literally my task. It told me the problem in plain words and gave me one button.
Clicked it.

**Print look.** Now there are two pictures side by side: "The file, as written" and "Printed in
gray, the same file". Oh, that's really nice. That's exactly the kitchen printer. The dots turned
into little triangles -- up triangles and down triangles -- and a small circle for "no change".
And there's a check mark underneath: "Increases and decreases stay apart in gray (120 below 0, 133
above; 47 within 0.25 of 0 drawn as no change)."

I leaned in because the two pictures are small now -- "Shown at 76% of print size" -- and the key
text is tiny. I can make out "up", "down", "no change", the triangles. I can't read the small
paragraph at the bottom of the key at all at this size. I zoomed the browser to 110 percent like I
do in the afternoon and it was still small.

Wait -- before it said 148 below and 152 above, now it says 120 and 133 and 47. Did some of them
disappear? ... Oh, "47 within 0.25 of 0 drawn as no change". So the ones near zero got their own
circle. 120 plus 133 plus 47 -- yeah, that's 300. OK. Fine. I did the sum in my head, which I
shouldn't have to, but fine.

My read of it: up triangles are the good ones, down triangles are the bad ones, and darker means
more important. So the dark down triangles are what the reviewer should worry about. (The legend
says darker means a larger change; nothing on it says good or bad.)

**Files.** At the bottom right it says "2 files go to your Downloads folder. Nothing is uploaded."
Good, nothing goes anywhere without me. But which two? The list says figure.svg and
figure-methods.txt. I ticked PNG too -- shouldn't that be three? (The render she was shown is the
dialog with only Figure ticked; the moderator told her the count would follow what she ticked.)
And the methods .txt -- there's a grey box with it on the right, "Figure: ... 174 mm wide, text 8
pt... Color: log2FoldChange... linear, diverging at 0..." I'm not sending a text file full of that
to a VP. I'd send the picture. If the reviewer is a science person maybe they'd want it. I'd just
not attach it.

Clicked "Export 2 files".

**After.** Back in the app. Black bar at the bottom: "Exported stress-response-study_figure.svg and
its methods file, in the Print look". On the left under "Sent and saved" there's the file with
"Print look. Today 19:12, to Downloads". That's reassuring -- it tells me where it went.

But the picture in the app is still red and blue. For a second I thought it hadn't worked. Then I
read "in the Print look" in the black bar, so I guess the gray version is only in the file, and
my screen stays colorful. OK. I kind of like that, actually. I just needed the bar to tell me.

"Get it to them": I'd go to Downloads, open it, and if it opens I'd drag it into Slack to the
reviewer with "gray-safe version -- triangles up are up, down are down". In our dashboard there's
a "copy image" I can paste straight into Slack; here it's download, find, drag. It's one extra
step, not a big deal.

**The export flow page.** The moderator showed me this page at the end. It's a big diagram with
boxes and arrows and tables. That's not for me. I closed it.

---

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 = very difficult, 7 = very easy)

**5.** "Once I was in the Export box it was honestly easy -- the yellow line told me the gray
problem and gave me the button, and the side-by-side gray preview is the best part. Getting to
Export was the annoying part: I looked top right, then the three lines, and only then the little
arrow by the name. And I still don't know if my PNG is the gray one, or what half the words on the
key mean."

## Would she use this instead of her current tool?

"For a network picture, yes -- I don't have a current tool for that, I'd be asking the comms person
to do it in Flourish. And for this job specifically -- a picture that survives the black-and-white
printer -- none of my tools even warn me about that. Google Slides doesn't. So yes for the
picture. But I'd be nervous sending it to a reviewer who might ask me what 'log2 fold change' or
'not normalized' means, because I couldn't answer. On my own data, with my own column names, I'd
probably be fine."

---

## Moderator notes

- **Where engagement dropped:** at the paragraph under the legend ("Degree: exact, not normalized
  ... Weight: confidence not used yet") and again at the methods text box. Her answers got short
  ("I skipped that", "I'd just not attach it") and she moved on without trying to understand.
- **Misreadings she stated confidently:** red means bad and blue means fine; the big dot in the
  middle is the most important one; up triangles are good, down triangles are bad; darker means
  more important. The legend says only the direction and the size of the change; nothing on
  screen contradicted her, because nothing on screen says it is not a good/bad scale.
- **Missed control:** the Look menu in the Style stack, which describes her exact task ("Print:
  reads in gray on white paper"). She saw the dropdown and did not open it, as she avoids settings.
  The dialog's own warning and "Use Print look" button carried her instead, so the miss cost
  nothing here.
- **Self-blame:** the color changing between screens (orange-brown betweenness, then gray, then
  red and blue fold change) she took as something she must have clicked. Those are three screens
  of the mock starting in different states, not an action of hers.
