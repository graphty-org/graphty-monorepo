// Frame timing for the screencast (no imports, so lib/path.test.mjs can check it).

/**
 * Puts the screencast's frames on the constant-rate grid: each frame goes to the slot nearest its
 * own timestamp; when two frames fall in one slot (the screencast's jitter) and the next slot is
 * still empty, the second moves into it, so a paced source keeps a new frame in every slot instead
 * of a repeat followed by a double jump. A frame more than one slot late is dropped, and an empty
 * slot shows the frame before it.
 *
 * The slots become a numbered image sequence read at exactly `fps`: an ffconcat list of JPEGs is
 * read through a 1/25 s time base, which silently dropped every sixth frame of a 30 fps film.
 * @param frames - { file, t } in time order, t in epoch ms
 * @param T0 - the epoch ms of slot 0 (the first frame always takes it)
 * @param t1 - the epoch ms the film ends
 * @param fps - the grid's rate
 * @returns the file shown in each slot, and how many slots got a frame of their own
 */
export function gridSlots(frames, T0, t1, fps) {
    const slots = Math.max(1, Math.round(((t1 - T0) * fps) / 1000));
    const shown = Array.from({ length: slots }, () => null);
    let last = -1;
    let filled = 0;
    for (const f of frames) {
        const want = Math.round(((f.t - T0) * fps) / 1000);
        const slot = last < 0 ? 0 : Math.max(want, last + 1);
        if (slot - want > 1 || slot >= slots) continue;
        shown[slot] = f.file;
        last = slot;
        filled++;
    }
    for (let i = 1; i < slots; i++) shown[i] ??= shown[i - 1];
    return { files: shown, filled };
}
