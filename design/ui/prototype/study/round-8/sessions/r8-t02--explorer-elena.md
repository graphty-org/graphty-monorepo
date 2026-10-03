# Session: try the program on a sample before your own data -- Explorer Elena

Task given by the moderator: "You have just installed this program to see whether it could help
with your work, but your own data is not ready yet. Before you spend time on your own file, you
would like to see the program working on something. Get something onto the screen to try it on,
and tell us what it is."

Participant: Explorer Elena (product manager, first time with graph tools). Clock: first contact.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t02--explorer-elena/.

## Start screen (shots/tasks/r8-t02/01.png)

Elena: "OK. Big box at the bottom about my data. 'We will never see the data you analyze' -- fine,
I'm not reading all that. No thanks."

"Left side is Open, New from data, drop a file. My file isn't ready, so not that. Right side says
Samples -- that's what I want. Little pictures, good."

"Les Miserables, 77 characters, 'good for a first look'. Card and transfer transactions, 3,000
accounts -- that one is more my size, honestly, but 'finding rings and comparing months' sounds
like fraud stuff. The first one literally says first look. I'll take that."

## Step 1 -- dismiss the banner, open the first sample

```
timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--explorer-elena/01.png task:r8-t02 --click "No thanks" --click "Les Miserables"
```

Render 01: the graph opens straight away -- orange dots with names on some of them (Valjean,
Javert, Cosette, Marius, Fantine), gray lines between them. A left list with a lot of rows
(PageRank, Louvain, Shortest paths, Density, Link prediction, Watchlist, For the report...). A
small box on the picture: "Color: PageRank 0.00330 to 0.0754". A right panel about "PageRank".

Elena: "Ooh, OK, it's just there. No setup. That's nice."

"So it's the Les Miserables people -- the characters, and lines between ones who are in the same
chapter, I think that's what the sample card said. Valjean is right in the middle with all the
lines, makes sense, he's the main guy."

"The colors... 'PageRank, 0.00330 to 0.0754'. No idea. Is that a lot? Darker is more something.
Valjean is the dark one so dark must be the important ones."

"And the list on the left -- Louvain, Link prediction, Betweenness -- I don't know these words.
Somebody already did a bunch of stuff to this. I'm not touching that."

## Step 2 -- click the dot in the middle (what she tries first on any picture)

```
timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--explorer-elena/02.png task:r8-t02 --click "No thanks" --click "Les Miserables" --click "Valjean"
```

Render 02: Valjean gets a ring around him; a small label under the picture says "Valjean, 36
connections"; a row of icon buttons appears; the right panel says "Valjean, Node" and "Why this
look" with a list (Notes, PageRank, Degree, Group 2, Selection, Everything).

Elena: "Valjean, 36 connections. OK, that I understand. He's the biggest one -- he's in the most
chapters with other people." (She reads "connections" as "chapters he is in"; the picture does
not say that.)

"Right side says 'Node' and 'Why this look'... I'll skip that. Icons popped up, I don't know what
they do, not clicking them."

"Fine. I've got something on the screen, it works. Done."

## Answer to the moderator

"It's the Les Miserables sample -- the characters from the book, with lines between the ones who
show up together. Valjean is in the middle with 36 connections."

## Wrap-up

- Did she succeed? Yes. "Yes, that took like ten seconds."
- Single Ease Question (1-7): 6. "Finding it was easy. It lost a point because the first screen
  has that big privacy box, and once it opened there's a pile of stuff on the left I didn't ask
  for."
- Would she use this instead of her current tool? "Not yet. I don't have a current tool for this,
  it's Sheets. This beat Gephi already because it opened. But the sample came with all these
  things I don't understand already switched on -- PageRank, Louvain -- and the colors have a
  number range with no meaning for me. I'd want to see it on my own spreadsheet with nothing
  switched on before I'd say yes. And I'd want the 3,000 one to see if it's still readable at my
  size."

## Observations for the study team

- Path: No thanks -> Les Miserables. Two clicks, no wrong turns. The Samples column with
  thumbnails and "Good for a first look" did the work; she chose by that phrase, not by name.
- She briefly considered "Card and transfer transactions" because 3,000 matched her own size,
  then backed off because its description sounded specialist.
- On opening, the sample arrives pre-loaded with many analysis rows (PageRank, Louvain, Shortest
  paths, Link prediction, Betweenness, Watchlist, report groups). She read these as "somebody
  else's work, do not touch" and as words she does not know.
- Misreading: the color legend "PageRank 0.00330 to 0.0754" meant nothing; she concluded dark =
  important. She also read "36 connections" as "chapters he appears in".
- The consent banner was dismissed unread with "No thanks".
