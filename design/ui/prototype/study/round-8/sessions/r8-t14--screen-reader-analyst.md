# Session: save, put away and reopen the Les Miserables sample -- Morgan Reyes (screen-reader analyst)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Open it, then imagine you have worked on it for an hour and must stop for the day.
Make sure the work is kept on this computer under a name you choose, put it away as you would at
the end of the day, and then bring it back as if it were tomorrow."

All commands were run from `design/ui/prototype`. `D` stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t14--screen-reader-analyst`.
Renders are in that folder.

Caveat for the reader: this prototype is judged from screenshots. Where I say what NVDA "would"
say, that is my guess from the visible text, not something I heard.

## Step 1 -- start screen (shots/tasks/r8-t14/01.png)

Think-aloud: "Title says graphty. Three groups: Start, Recent projects, Samples. Are those headings?
They look like small gray labels; if they are not real headings, H gets me nothing and I'm arrowing
through the whole page. I'll assume I'm arrowing. 'Files are read on this computer and never
uploaded' -- good, that is the first thing I'd ask, and it's said before I ask it. 'Local only' at
the top, same thing.

There is a usage-data box at the bottom. Read it once: 'Nothing is collected until you answer.'
Fine. No thanks. I'm on an agency laptop, I'm not opting into anything on day one."

Then the sample. "Les Miserables, 77 characters. Opens with worked examples already added.
Fine, that's the one the moderator said."

## Step 2 -- decline usage data and open the sample

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t14 --click "No thanks" --click "Les Miserables"
```

Result (02.png): the project opens, named "Les Miserables" at the top left. A long list on the left
(Selection, Notes 4 items, PageRank, Louvain 6 groups, Shortest paths ...), the drawing in the
middle, and a panel on the right about PageRank.

Think-aloud: "OK, it's open. A lot of stuff pre-loaded. I'm not going to read all of that; the job
is to save and come back. The usual keystroke first."

## Step 3 -- try Ctrl+S

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --key Control+s
```

Result (03.png): a small "Saved" message near the bottom.

Think-aloud: "Saved. Saved as what, and where? It's a sample. Did I just overwrite the sample? Did
it save to some browser storage I'll never find again? 'Saved' with no name is a word, not a
fact. And it's a little pop-up -- if that's a live region I heard it once and it's gone. The task
says a name I choose, so this isn't it anyway. The name at the top has a dropdown. That's usually
where the file menu is in these web apps."

## Step 4 -- open the menu on the project name

```
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables"
```

Result (04.png): a menu -- Rename (F2), Open project or file... (Ctrl+O), Save (Ctrl+S),
Export... (Ctrl+E), Apply recipe or style file..., Version history, Save as... (Ctrl+Shift+S),
Close project.

Think-aloud: "Now this is a menu I recognize. Shortcuts listed next to each item -- I'll put those
in my keystroke file. Save as, Ctrl+Shift+S, same as everywhere else. Close project is there too,
which is what 'put it away' means to me.

Odd thing: the panel on the right changed under me when I opened the menu. It was talking about
PageRank, now it's a graph summary: 77 nodes, 254 edges, undirected, 1 connected component. That's
actually the summary I wanted in minute two -- but I didn't ask for it here, and things changing
off to the side when I open a menu is how I lose my place. Noted, not fatal."

## Step 5 -- Save as

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..."
```

Result (05.png): a dialog, "Save Les Miserables as", one field, Name, pre-filled
"Les Miserables copy", Cancel and Save.

Think-aloud: "Short dialog, one field, labeled 'Name'. Good. Pre-filled with 'copy', so I'm not
going to clobber the sample. What it doesn't tell me: WHERE. No folder, no 'on this computer', no
'in this browser'. The task says make sure it's kept on this computer, and this dialog gives me
nothing to make sure with. I'll have to trust the 'Local only' I heard at the top."

## Step 6 -- type my own name

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Morgan practice"
```

Result (06.png): the field now reads "Morgan practice".

Think-aloud: "Select all, type over. Standard edit field, behaves like one. Enter should press Save."

## Step 7 -- press Enter

```
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Morgan practice" --key Enter
```

Result (07.png): the dialog is gone, the name at the top now says "Morgan practice". No "Saved"
message on screen this time.

Think-aloud: "Enter worked, dialog closed. The title changed, so if I go back to the top I'll hear
'Morgan practice'. But nothing told me 'saved as Morgan practice in such-and-such'. Ctrl+S got a
'Saved'; Save as got silence -- or a message that already went by. Two save commands, two
different confirmations. I'd want to hear it once and then find it again somewhere. Where did
focus go when the dialog closed? I can't tell from here; if it went back to the menu button,
fine. If it went to the top of the page, I'm annoyed."

## Step 8 -- close the project

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Morgan practice" --key Enter --click "Morgan practice" --click "Close project"
```

Result (08.png): back on the start screen. Recent projects now lists "Morgan practice -- 77 nodes --
~/Documents/graphty/Mor..." with "Today 19:20", and under it "This list is kept in this browser."

Think-aloud: "THERE is the where. ~/Documents/graphty/... -- so it is a real file in my Documents
folder, not just browser storage. That's the answer I wanted in the Save as dialog, and I only get
it after I've closed the thing. It's cut off visually; a sighted colleague would see 'Mor...'. I'd
hope the screen reader gets the whole path, but nothing tells me so.

And there are two different kinds of keeping here: the project 'Morgan practice' is a file in
Documents, and the list of recent projects is 'kept in this browser'. I get the difference, but
I'll have to explain it to the junior I train: clear the browser and the list goes, the file stays.
Nobody says that the file stays."

Also: "It didn't ask me 'save changes?' when I closed. Either it knew everything was saved, or it
threw something away silently. I'll find out when I reopen."

## Step 9 -- hover the recent row for the full location

```
timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Morgan practice" --key Enter --click "Morgan practice" --click "Close project" --hover "Morgan practice"
```

Result: no tooltip. The path stays truncated.

Think-aloud: "No full path offered. I'll take whatever the screen reader reads out of that row and
check it in Explorer. Not going further on this."

## Step 10 -- bring it back "tomorrow"

```
timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Save as..." --key Control+a --type "Morgan practice" --key Enter --click "Morgan practice" --click "Close project" --click "Morgan practice"
```

Result (09.png): the project opens as "Morgan practice", with the same list of 4 notes, PageRank,
Louvain 6 groups, Shortest paths, Watchlist 5 nodes, the "For the report" folder, and so on.

Think-aloud: "It's back, under my name, with the same items, same counts. So the work came back.
One thing did not: when I closed it, the right-hand panel was on the graph summary. Now it's back on
PageRank. So it reopens where the project was set up, not where I was. For a sighted user that's a
glance. For me 'can I get back to where I was?' is half of how I judge a tool, and the answer is
'the data, yes; your place, no'. I'd also do this on a real restart -- browser closed, laptop off --
before I believed the recent list survives; I can't test that here."

## Verdict

- Did I succeed? Yes. The project is saved as "Morgan practice", it shows in Recent projects with a
  path under ~/Documents/graphty/, I closed it with Close project, and it reopened with the same
  contents.
- Single Ease Question: 5 of 7. The menu is a normal menu with the normal shortcuts, the dialog has
  one labeled field, and Enter works. What cost me: Save as never says where the file goes; the only
  place the location appears is the recent list after closing, cut off; Ctrl+S says "Saved" with no
  name while Save as says nothing; and reopening does not put me back where I was in the panels.
- Would I use this instead of my current tool? For this job, saving and reopening, it's no worse
  than Excel and it's better than most "enthusiastic" web tools -- a real Save as, a real Close, a
  real file. But saving is not why I'd switch. My scripts save themselves; they're files. This only
  matters if the rest of the tool earns its place, and this task didn't show me any of that. So: not
  instead of my scripts, not yet. "It saves like a normal program" is the minimum, and it met the
  minimum.

## Problems noted

1. Save as dialog says nothing about where the file goes ("on this computer", which folder). The
   task asked me to make sure it was kept on this computer, and the place to make sure is that
   dialog. Severity: medium.
2. The location appears only after closing, in the Recent projects row, truncated
   ("~/Documents/graphty/Mor...") with no tooltip for the rest. Severity: low-medium.
3. Ctrl+S on the untouched sample says "Saved" with no name or place -- did it overwrite the sample?
   It does not say. Save as gives no confirmation at all. Two saves, two behaviors. Severity: medium.
4. Opening the project-name menu changed the right-hand panel from PageRank to the graph summary
   without me asking. Content changing off to the side is how a screen-reader user loses their
   place. Severity: low-medium.
5. Reopening restores the content but not my place (the right panel was on the graph summary when I
   closed; it reopened on PageRank). Severity: low.
6. "This list is kept in this browser" under the recent list, next to a file in ~/Documents: two
   kinds of keeping, and nothing says the file survives if the browser list is cleared. Severity: low.
7. The start screen's group names (Start, Recent projects, Samples) look like small labels; if they
   are not headings, a heading-first reader gets nothing from H. Cannot confirm from a picture.
   Severity: unknown.
