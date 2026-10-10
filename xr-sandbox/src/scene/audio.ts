// Audio clicks (design section 5.6): hands have no haptics, so presses, arena decisions and commits
// make a short click. Synthesized with WebAudio; nothing is fetched.

let ctx: AudioContext | null = null;

/**
 * Play a short click. The audio context is created on first use, which a user gesture
 * (Enter VR) precedes.
 * @param freq - pitch in Hz; higher for a commit, lower for a cancel
 */
export function click(freq = 880): void {
    try {
        ctx ??= new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
    } catch {
        // no audio output: clicks are a convenience
    }
}
