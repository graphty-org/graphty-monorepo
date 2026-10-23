# Session r1-s20: Tom, the Medici and who they married into (Florentine families)

Participant: Tom, a 52-year-old lab manager who opens files other people send him and does not
build networks himself. Task prompt: "Go to the Medici family, read what the program knows about
them, and see which families they married into. Tell us who they are and how many." Start: the
empty app. Files: none.

Commands are run from `design/ui/studio` with `T=tool/real.mjs` and
`S=rounds/round-1/sessions/r1-s20`.

## Steps

### 1. Start

`node $T --start $S empty` -> 01.png

Saw: a dark start page. "Start" with "Open project or file..." and "New from data...", a line
"Files are read on this computer and never uploaded", "Recent projects" (empty), and "Samples"
with four networks. "Florentine families -- 15 families -- Marriages between the leading families
of Renaissance Florence." At the bottom a box: "Your data is yours, but please help us", with
"Share usage data" and "No thanks".

Think-aloud: "Good, nothing to install, and it says files are never uploaded. That's the first
thing I want to know. There's the Florence one on the right. First, this box at the bottom wants
me to share data. No. I don't share anything I don't have to."

### 2. Decline the data box

`--step $S --click "No thanks"` -> 02.png

Think-aloud: "Gone. Fine."

### 3. Open the sample

`--step $S --click "Florentine families"` -> 03.png

Saw: a drawing of 15 blue balls joined by grey lines, no names on any of them. Left panel: a box
"Find nodes, edges, values", "Selection", "Everything". Right panel: "Overview -- Nodes 15, Edges
20, Undirected, from the file: directed 0, Density 0.1905, Components 1, Edges per n... 1 to 6,
mean 2.667". A toolbar at the bottom with icons only.

Think-aloud: "OK, it opened. Fifteen, that matches the '15 families' on the front page. But none
of the dots have names. Which one is the Medici? I'm not going to click fifteen dots. 'Density
0.1905', I don't know what that means and I don't need it. There's a Find box. I'll type the
name."

### 4. Search for Medici

`--step $S --click-at 180,90 --type "Medici"` -> 04.png

Saw: under the box, "Elements: Medici" and "Values: Select where name is Medici (1)".

Think-aloud: "There it is. The first one, 'Medici', that's the family. The other one sounds like a
database thing, I'll leave it."

### 5. Pick Medici

`--step $S --click-at 116,153` -> 05.png

Saw: one dot near the middle turned brown with a yellow ring. The right panel now says "Medici,
Node", "Summary: id Medici, name Medici, Degree 6". A new round button appeared above the toolbar.

Think-aloud: "So that's them, right in the middle. What does it know about them? Their name,
twice, and 'Degree 6'. I think that means six lines, six connections. That's all it knows? Fine.
Now, who are the six? I can count the lines coming off the dot, but they don't have names on the
other ends."

Hesitation: Tom read "Degree" as "probably six connections" but was not sure; nothing on screen
says what it counts.

### 6. Hover the new round button

`--step $S --hover-at 748,812` -> 06.png

Printed: tooltip "NeighborhoodG".

Think-aloud: "'Neighborhood'. Its neighbors. That sounds like what I want. The 'G' on the end, I
don't know, maybe a typo."

### 7. Click Neighborhood

`--step $S --click-at 748,812` -> 07.png

Saw: seven dots now brown with yellow rings, Medici and six around it. Right panel: "7 nodes, 0
edges, Selection. Nodes 7, Edges 0, Edges among them 7, id Acciaiuoli (1), name Acciaiuoli (1)".

Think-aloud: "Seven lit up, that's Medici plus six, which matches the 6 from before. Good. But
the list on the right only gives me one name, 'Acciaiuoli (1)'. Where are the other five? And
'Edges 0' right above 'Edges among them 7'. Is it zero or is it seven? I don't know what I'm
looking at."

Hesitation: the panel showed a count but only one name, with "(1)" after it; Tom expected a list
of the seven names.

### 8. Click "Selection" in the left panel, hoping for a list

`--step $S --click-at 121,124` -> 08.png

Saw: "Selection 7" highlighted on the left. The right panel now only says "Selection" with
nothing under it.

Think-aloud: "Seven, yes, I know there are seven. I thought clicking it would list them. Now the
right side is blank. That's the first dead end."

### 9. Try the "Data" button on the left edge

`--step $S --click-at 28,130` -> 09.png

Saw: the left panel turned into "Sources" (Florentine... 15 nodes, 20 edges; Node t... 15 rows;
Edge ... 20 rows) and "Attributes -- Nodes: id, name".

Think-aloud: "'Data'. It's a table, I'm used to tables. There's 'name'. Maybe if I click it I get
the names."

### 10. Click "name"

`--step $S --click-at 151,349` -> 10.png

Saw: right panel "name, Attribute. Summary: Table Nodes, Groups, From the file, Has a value 100%,
Distinct values 15".

Think-aloud: "No. It tells me there are fifteen different names, it doesn't tell me what they
are. Second dead end. I'm about ready to email someone. One more thing: when I picked the Medici,
its name came up on the right. If I click the lit-up dots one at a time, maybe each one tells me
its name. It's six dots, I can do six."

### 11 to 16. Click each of the six dots that had lit up

Clicked the positions Tom remembered from the lit-up picture (07.png). The yellow rings had gone
once he clicked something else, so he worked from memory.

| Step | Command                                  | Panel showed | Degree |
| ---- | ---------------------------------------- | ------------ | ------ |
| 11   | `--step $S --click-at 753,251` -> 11.png | Salviati     | 2      |
| 12   | `--step $S --click-at 571,357` -> 12.png | Acciaiuoli   | 1      |
| 13   | `--step $S --click-at 697,416` -> 13.png | Tornabuoni   | 3      |
| 14   | `--step $S --click-at 584,549` -> 14.png | Ridolfi      | 3      |
| 15   | `--step $S --click-at 791,545` -> 15.png | Barbadori    | 2      |
| 16   | `--step $S --click-at 913,603` -> 16.png | Albizzi      | 3      |

Think-aloud while doing it: "Salviati. Write that down. Acciaiuoli, that's the one from the list
before. Tornabuoni. Ridolfi. Barbadori. Albizzi. That's six. Six, and it said 6 at the start, so
I think I have them all. But I'm going off my memory of which ones were yellow, because they all
went blue again when I clicked the first one. If I misremembered a dot, I'd never know."

### 17. End

`--end $S`

## Answer given

The Medici married into six families: Salviati, Acciaiuoli, Tornabuoni, Ridolfi, Barbadori and
Albizzi. What the program knows about the Medici: their id and name (both "Medici") and "Degree
6".

## In Tom's words, at the end

- **Did you finish?** "Yes, I think so. Six families, and I have the six names. I'd want someone
  to check them, because I got them by clicking dots one at a time from memory, not from a list."
- **How hard was it (1 = very easy, 7 = very hard)?** 5. "Finding the Medici was easy, the search
  box worked first time. Getting the names of who they married was the hard part."
- **What confused you?**
    - "None of the dots have names on them. It's a picture of families with no family names."
    - "When I lit up the neighbors it told me there were seven, but it only showed one name,
      'Acciaiuoli (1)'. I wanted the list."
    - "'Edges 0' and right under it 'Edges among them 7'. Which is it?"
    - "'Degree 6'. I guessed it means six marriages. Nothing said so."
    - "I clicked 'Selection' expecting the list and the right side went blank."
    - "Under Data, 'name' told me there are 15 different names but not what they are."
    - "The moment I clicked one of the lit-up dots, all the others went back to blue, so I had to
      remember where they were."
    - "The tooltip said 'NeighborhoodG'. I don't know what the G is."
