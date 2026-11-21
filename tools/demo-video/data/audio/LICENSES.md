# Intro audio: sources and licenses

Every file is CC0 1.0 (public domain dedication): free to use in a YouTube video and a GitHub README,
commercial use included, with no payment and no credit required. The files are not in the repository:
`fetch-audio.mjs` downloads them to `<main>/tmp/demo-video/audio/dl` and writes the prepared files
(trimmed, peak-normalized, 48 kHz WAV) that cut files name as `~/audio/<name>`.

| Prepared file | What                                                         | Source                                                                                                                               | Author        | License |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------- |
| `trailer.wav` | "Adventure Theme Intro", orchestral, 0-33 s of the 37 s file | [opengameart.org/content/adventure-intro-title-cinematic-epic](https://opengameart.org/content/adventure-intro-title-cinematic-epic) | nene          | CC0 1.0 |
| `whoosh.wav`  | one pass of "Air Whoosh" (0.75-1.85 s of the file)           | [opengameart.org/content/air-whoosh](https://opengameart.org/content/air-whoosh)                                                     | pyranostudios | CC0 1.0 |
| `impact.wav`  | "Muffled Distant Explosion" as a low hit, first 1.9 s        | [opengameart.org/content/muffled-distant-explosion](https://opengameart.org/content/muffled-distant-explosion)                       | NenadSimic    | CC0 1.0 |
| `lock-on.wav` | "Sound blip echo": three rising blips, first 1.1 s           | [opengameart.org/content/sound-blip-echo](https://opengameart.org/content/sound-blip-echo)                                           | Jetxp         | CC0 1.0 |
| `riser.wav`   | a 3 s riser: noise and a rising sine, stopping dead          | synthesized by `fetch-audio.mjs` (ffmpeg `aevalsrc`)                                                                                 | ours          | ours    |

## Music

`trailer.wav`, measured (spectral-flux onsets, tempo by autocorrelation, grid fitted to the onsets),
not guessed:

- tempo 71.2 bpm, a beat every 0.843 s; the hits also fall on half beats, so cut on the 142.4 bpm
  grid (0.421 s) as well
- beat 0 at 0.78 s: in a cut, `"bpm": 71.2, "offset": 0.78` (or `"bpm": 142.4, "offset": 0.78`, beat
  numbers doubled)
- the shape: quiet strings 0-6.5 s; accents at 6.69 s (beat 7) and 7.52 s (beat 8); the build swells
  at 13.42 s (beat 15) and holds; the first big hit at 20.16 s (beat 23), the loudest at 21.43 s (beat
  24.5), more at 22.27 s (25.5) and 23.36 s; the final hit at 26.94 s (beat 31), ringing out to
  silence by about 31 s
