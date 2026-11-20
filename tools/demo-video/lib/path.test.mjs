// Self-check of the hand's path math: node --test tools/demo-video/lib/path.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

import { gridSlots } from "./grid.mjs";
import { aimPoint, fittsMs, inInner, minJerk, MOVE, planMove, rng, TYPE, typingDelays } from "./path.mjs";

test("the same seed gives the same numbers", () => {
    const a = rng("clip-a");
    const b = rng("clip-a");
    for (let i = 0; i < 20; i++) assert.equal(a(), b());
    assert.notEqual(rng("clip-a")(), rng("clip-b")());
});

test("aim points fall inside the target's inner area and are not all the center", () => {
    const r = rng(1);
    const box = { x: 100, y: 200, width: 120, height: 32 };
    const pts = Array.from({ length: 500 }, () => aimPoint(box, r));
    for (const p of pts) assert.ok(inInner(p, box), JSON.stringify(p));
    assert.ok(new Set(pts.map((p) => Math.round(p.x))).size > 20);
});

test("moves end on the aim point, progress never goes back, and durations stay in bounds", () => {
    const r = rng(7);
    let overshoots = 0;
    for (let i = 0; i < 300; i++) {
        const from = { x: r.range(0, 1920), y: r.range(0, 1080) };
        const to = { x: r.range(0, 1920), y: r.range(0, 1080) };
        const m = planMove(from, to, r.range(16, 200), r);
        const end = m.at(m.ms);
        assert.ok(Math.hypot(end.x - to.x, end.y - to.y) < 1e-6, "ends on the aim point");
        const start = m.at(0);
        assert.ok(Math.hypot(start.x - from.x, start.y - from.y) < 1e-6, "starts where the hand is");
        let last = -1;
        for (let t = 0; t <= m.ms; t += 1000 / 60) {
            const p = m.at(t);
            assert.ok(p.s >= last - 1e-9, "progress is monotonic");
            last = p.s;
        }
        if (m.segments.length > 1) overshoots++;
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        if (dist >= 2) {
            assert.ok(m.ms >= MOVE.min && m.ms <= MOVE.max + 300, `duration ${m.ms} for ${dist}`);
        }
    }
    assert.ok(overshoots > 5 && overshoots < 120, `some long moves overshoot (${overshoots})`);
});

test("Fitts: farther or smaller takes longer", () => {
    assert.ok(fittsMs(800, 30) > fittsMs(200, 30));
    assert.ok(fittsMs(500, 20) > fittsMs(500, 200));
    assert.equal(fittsMs(0, 30), 0);
});

test("minimum jerk starts and stops smoothly", () => {
    assert.equal(minJerk(0), 0);
    assert.equal(minJerk(1), 1);
    assert.ok(minJerk(0.05) < 0.002 && minJerk(0.95) > 0.998);
    for (let s = 0; s < 1; s += 0.01) assert.ok(minJerk(s + 0.01) >= minJerk(s));
});

test("typing runs about 8-12 characters a second, slower after spaces", () => {
    const r = rng(3);
    const text = "find groups of characters who link to each other ".repeat(20);
    const d = typingDelays(text, r);
    const cps = (1000 * d.length) / d.reduce((a, b) => a + b, 0);
    assert.ok(cps > 8 && cps < 12, `cps ${cps}`);
    for (const ms of d) assert.ok(ms >= TYPE.min && ms <= TYPE.max);
    const after = d.filter((_, i) => text[i - 1] === " ");
    const other = d.filter((_, i) => i > 0 && text[i - 1] !== " ");
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    assert.ok(mean(after) > mean(other));
});

test("a move near the top edge stays on screen, and long moves bend", () => {
    const r = rng(11);
    const bounds = { x0: 4, y0: 4, x1: 1916, y1: 1076 };
    for (let i = 0; i < 300; i++) {
        const from = { x: r.range(20, 1900), y: r.range(5, 40) };
        const to = { x: r.range(20, 1900), y: r.range(5, 40) };
        const m = planMove(from, to, 30, r, { bounds });
        for (let t = 0; t <= m.ms; t += 1000 / 60) {
            const p = m.at(t);
            assert.ok(p.y >= 4 - 1e-6 && p.y <= 1076 && p.x >= 4 - 1e-6 && p.x <= 1916, JSON.stringify(p));
        }
    }
    let straight = 0;
    for (let i = 0; i < 300; i++) {
        const from = { x: r.range(100, 800), y: r.range(200, 900) };
        const to = { x: from.x + r.range(300, 1000), y: r.range(200, 900) };
        const m = planMove(from, to, 30, r, { bounds });
        let len = 0;
        let last = m.at(0);
        for (let t = 1000 / 60; t <= m.ms + 1; t += 1000 / 60) {
            const p = m.at(t);
            len += Math.hypot(p.x - last.x, p.y - last.y);
            last = p;
        }
        if (len / Math.hypot(to.x - from.x, to.y - from.y) < 1.004) straight++;
    }
    assert.equal(straight, 0, "no long move is dead straight");
});

test("a move to a point off screen may leave the screen (the hand going out of shot)", () => {
    const r = rng(5);
    const m = planMove({ x: 600, y: 500 }, { x: -40, y: 520 }, 2, r, { bounds: { x0: 4, y0: 4, x1: 1916, y1: 1076 } });
    assert.ok(Math.abs(m.at(m.ms).x + 40) < 1e-6);
});

test("jittered frames at 30 a second fill every grid slot once: no repeat followed by a double jump", () => {
    const r = rng(9);
    const frames = Array.from({ length: 300 }, (_, i) => ({
        file: `f${i}`,
        t: 1000 + i * (1000 / 30) + r.range(-12, 12),
    }));
    const { files, filled } = gridSlots(frames, 1000, 1000 + 10_000, 30);
    assert.equal(files.length, 300);
    assert.ok(filled >= 297, `${filled} of 300 slots have a frame of their own`);
    assert.ok(files.every(Boolean), "every slot shows a frame");
    let repeats = 0;
    for (let i = 1; i < files.length; i++) if (files[i] === files[i - 1]) repeats++;
    assert.ok(repeats <= 3, `${repeats} repeated slots`);
});
