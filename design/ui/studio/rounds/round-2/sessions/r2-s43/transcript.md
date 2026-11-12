# Session r2-s43 -- Tom (recipe recipient), task T5 "A file that will not read"

Dataset: club-members.graphml (in my Downloads). Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s43 empty`

Saw (01.png): a dark start page. "Start" with "Open project or file..." and "New from data...", a line saying files are read on this computer and never uploaded (good -- that is exactly what I worry about), recent projects empty, some samples on the right. A box at the bottom asks to collect usage data.
Next: I do not want anything collected from the lab's computer, so "No thanks" first, then "Open project or file...".

## Step 2 -- decline usage data, open the file

Command: `--step --click "No thanks" --click "Open project or file..." --upload club-members.graphml`

Saw (02.png): nothing opened. A dark bar near the bottom says: "club-members could not be opened: the file is incomplete or damaged near line 9, so nothing was read. Ask for the file again." The text is small-ish and low on the screen, but readable; it has an X to close it. It tells me what is wrong (incomplete or damaged), where (near line 9) and what to do (ask again). That is more than Cytoscape ever told me.
Hesitation: I trust the postdoc more than a program I have never used. Before I email him saying his file is broken, I want to be sure it is not just me using the wrong button. I will try the other way in, "New from data...", once.

## Step 3 -- try the other entry, "New from data..."

Command: `--step --click "New from data..."`

Saw (03.png): a page "Open as a new graph" with "Tables", a plus, "Drop a file here, or choose a file...", a "Direction: As the file says" box, and Cancel / Load (Load greyed, "Choose a file first"). The previous error bar is gone. The tiny grey writing here is hard on my eyes.
Next: "choose a file..." and give it the same club-members file, to see if this way reads it.

## Step 4 -- choose the same file here

Command: `--step --click "choose a file..." --upload club-members.graphml`

Saw (04.png): a red box: "club-members.graphml could not be read as GraphML. Check the file, or pick another format in File settings." Load stays greyed, "The file could not be read". So this way fails too -- two different doors, same file, both refuse. That convinces me the problem is the file, not my clicking.
Hesitation: this second message says LESS than the first one. No "incomplete", no "line 9". And "pick another format" makes me wonder if the file is fine and I just need a different setting -- which would be the opposite of the first message. I do not know what a format is here beyond the ending of the file name. I will peek at "File settings" once, just to see whether it says anything more.

## Step 5 -- peek at File settings

Command: `--step --click "File settings"`

Saw (05.png): a small "File settings" box: "Format: Auto" and "Error limit -- Bad rows read past before the file is refused: 100". Nothing more about my file. I am not going to start changing formats and error limits on a file I did not make; that is the postdoc's job, and the first message already told me the file is cut short. "Bad rows read past" sounds like it could let a broken file through half-read, which is the last thing I want to put in front of the PI.
Decision: stop. I know what to tell my coworker.

## Step 6 -- end

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s43`

## In character, at the end

**Did I finish?** Yes. I could not carry on working with the file, but I know exactly what to tell
my coworker: "club-members.graphml will not open -- the program says it is incomplete or damaged
near line 9 and nothing was read. Can you send it again (maybe it got cut off when you saved or
attached it)?" Both ways of opening it refused it, so I am confident it is the file and not me.

**How easy was it?** 6 out of 7. The first try gave me a plain-English answer in one step, and it
said nothing had been read, so I was not left with a half-loaded network I might trust by mistake.

**What confused me:**

- The two ways in gave two different messages for the same file. "Open project or file..." said
  "incomplete or damaged near line 9 ... Ask for the file again." "New from data..." said only
  "could not be read as GraphML. Check the file, or pick another format in File settings." The
  second drops the useful part (where, and that it is cut off) and its advice points the other
  way: it hints the file might be fine and I just chose the wrong format. Had I gone there first
  I would have been less sure what to tell the postdoc.
- "File settings" offers an "Error limit" of "bad rows read past before the file is refused". I
  did not touch it, but it is not clear whether raising it would load a broken file part way, and
  whether the program would then tell me what was left out.
- The first message sits low on the screen in smallish text and goes away when I move on; I would
  have liked to be able to copy it into my email, or see it again.
- Small grey text throughout ("Drop a file here", "Choose a file first", "The file could not be
  read") is hard to read at my eyesight.
