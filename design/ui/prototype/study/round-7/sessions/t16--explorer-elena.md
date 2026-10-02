# Session: picture of the drawing for Friday's slides -- Explorer Elena

Participant: Explorer Elena (first-time graph user, product manager). Task given by the moderator:
"You need a picture of the drawing as it looks right now, sharp enough to paste into Friday's
slides. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter. If that is not your line of work, treat them as your own people or
things."

Start screen: shots/tasks/t16/01.png. Renders: tmp/round-7-sessions/t16--explorer-elena/01.png to 03.png.
All commands run from design/ui/prototype.

## Step 0 -- looking at the start screen

"OK, a bunch of orange dots with lines. The big brown one in the middle, Valjean, that's the main
guy, I guess the darker it is the more important. I just need a picture of this. On a Mac I'd just
screenshot it, but they said sharp, and a screenshot of my laptop never looks good on the big
screen. There's no Export button anywhere obvious. Usually the file stuff lives under the name of
the file, like in Google Slides. Let me click 'Les Miserables' up top."

```
timeout 120 node app-b/study.mjs --try .../tmp/round-7-sessions/t16--explorer-elena/01.png task:t16 --click "Les Miserables"
```

## Step 1 -- the file menu (01.png)

"Yep, there it is. Rename, Save, Save as, Export. 'Export...' -- that's the one. Version history,
nice, so I probably can't break anything."

```
timeout 120 node app-b/study.mjs --try .../tmp/round-7-sessions/t16--explorer-elena/02.png task:t16 --click "Les Miserables" --click "Export..."
```

## Step 2 -- the Export window (02.png)

"Image is already picked on the left. 'To share -- PNG, 2x.' To share, that's me. 2x, I think
that means it's sharp, double size, good. 1,802 by 1,638, fine, that's big. Current camera, so
it's what I'm looking at. Background canvas color. 'Advanced' -- not touching that."

"There's a little preview, it looks like my picture, it's cut off at the bottom but whatever, it's
the same thing."

(She does not read the gray line under the heading, "Full graph - legend not drawn". She does not
scroll the preview.)

"There's Copy and Export. Copy might actually be easier for slides... but I'd rather have a file I
can find again. Export."

```
timeout 120 node app-b/study.mjs --try .../tmp/round-7-sessions/t16--explorer-elena/03.png task:t16 --click "Les Miserables" --click "Export..." --click "Export"
```

## Step 3 -- after Export (03.png)

"'Exported les-miserables.png to Downloads.' Great. Done. I'd drag that into the slide."

"Honestly that was easy. Same place it is in every other app."

(Moderator note: the file she exported has no legend -- the dialog said so in its subtitle line,
which she skipped. On Friday her slide will show orange-to-brown dots with no key for what the
color or size means. She does not know this; she believes the picture matches her screen,
including the color and size box in the top-left corner.)

## Wrap-up

- **Did she think she succeeded?** Yes, fully. "It said it saved to Downloads, it's 2x, done."
  Observed: she got a sharp PNG of the current view in three clicks, but without the legend she
  saw on screen, which she did not notice.
- **Single Ease Question (1-7):** 7. "It was where I'd look. File name, Export, Export."
- **Would she use this instead of her current tool?** "For this part, yes -- it's better than a
  screenshot of my laptop, which always looks fuzzy on the projector. But I'd want to see the
  actual file before Friday. If the little color key isn't in it, people are going to ask me what
  brown means." (She raises this only as a general worry, not because she spotted the legend line.)

## Observations for the study

1. The file-name menu was her first guess and it held: three clicks, no dead ends.
2. The preset name "To share -- PNG, 2x" did the deciding for her; she never opened Size, Format
   or Advanced.
3. "Legend not drawn" sits in a small gray subtitle she skipped. The on-screen key is the one
   thing that makes this picture readable to a room, and the default leaves it out without
   anything she would read saying so. Likely to surface on Friday, not today.
4. The preview was cut off below the dialog fold, so it could not have shown her the missing key
   even if she had compared.
5. She considered Copy for pasting into slides but chose Export to "have a file"; both seemed
   reasonable to her.
