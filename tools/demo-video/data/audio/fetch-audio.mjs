#!/usr/bin/env node
/**
 * The intro's music and sound effects: downloads the CC0 files LICENSES.md lists into
 * <main>/tmp/demo-video/audio/dl (never into the repository), checks each decodes as audio, and
 * writes the prepared files cut files name as "~/audio/<name>": each trimmed so its sound starts at
 * 0 s (the whoosh peaks at 0.5 s), peak-normalized to -1 dB (a plain gain: the music keeps its build),
 * 48 kHz stereo WAV; the riser is synthesized here.
 *
 *   node tools/demo-video/data/audio/fetch-audio.mjs
 *
 * The beat grid of the music is in LICENSES.md ("Music").
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mkdirp, OUT } from "../../lib/env.mjs";
import { duration, run } from "../../lib/ffmpeg.mjs";

const OGA = "https://opengameart.org/sites/default/files/";
const DL = mkdirp(join(OUT, "audio/dl"));
const AUDIO = join(OUT, "audio");

// name -> [download, file in dl/, trim start s, length s]
const FILES = {
    "trailer.wav": [`${OGA}Adventure%20Theme%20Intro.wav`, "adventure-intro.wav", 0, 33],
    "whoosh.wav": [`${OGA}whoosh2_0.wav`, "air-whoosh.wav", 0.75, 1.1],
    "impact.wav": [`${OGA}NenadSimic%20-%20Muffled%20Distant%20Explosion.wav`, "muffled-impact.wav", 0, 1.9],
    "lock-on.wav": [`${OGA}imagestartvfx_0.ogg`, "blip-echo.ogg", 0, 1.1],
};

const OUT_FMT = ["-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le"];

for (const [name, [url, file, from, len]] of Object.entries(FILES)) {
    const src = join(DL, file);
    if (!existsSync(src)) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    }
    // a download is untrusted: the span used must decode as audio; its loudest sample sets the gain
    const probe = ["-ss", String(from), "-t", String(len), "-i", src, "-vn"];
    const log = await run([...probe, "-af", "volumedetect", "-f", "null", "-"], { quiet: false });
    const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(log)?.[1]);
    if (!Number.isFinite(peak)) throw new Error(`${src}: not audio`);
    const fade = Math.max(0.05, Math.min(0.5, len / 4));
    await run([
        ...probe,
        "-af",
        `volume=${(-1 - peak).toFixed(2)}dB,afade=out:st=${(len - fade).toFixed(3)}:d=${fade}`,
        ...OUT_FMT,
        join(AUDIO, name),
    ]);
}

// the riser: 3 s of noise and a sine sweeping 180 -> 1400 Hz, swelling to a sudden stop (the hit lands on its end)
const RISE = 3;
await run([
    "-f",
    "lavfi",
    "-i",
    `aevalsrc='(0.45*sin(2*PI*(180*t+${(1220 / (2 * RISE)).toFixed(2)}*t*t))+0.35*(random(0)*2-1))*pow(t/${RISE},2.2)':s=48000:d=${RISE}`,
    "-af",
    "highpass=f=120,afade=out:st=2.94:d=0.06,volume=0.9",
    ...OUT_FMT,
    join(AUDIO, "riser.wav"),
]);

for (const name of [...Object.keys(FILES), "riser.wav"])
    console.log(`${join(AUDIO, name)}: ${(await duration(join(AUDIO, name))).toFixed(2)} s`);
