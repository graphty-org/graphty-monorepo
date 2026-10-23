function h(t) {
    const s = t.fps ?? 30,
        c = t.width ?? 1920,
        r = t.height ?? 1080,
        i = Math.floor((t.duration / 1e3) * s),
        o = c * r,
        a = o > 2073600,
        l = s > 30,
        n = a && l,
        e = { totalFrames: i, likelyToDropFrames: n };
    n && ((e.recommendedFps = 30), (e.recommendedResolution = "1920x1080"));
    const m = i * o * 0.15;
    return ((e.estimatedFileSize = Math.ceil(m / 8)), e);
}
export { h as estimateAnimationCapture };
//# sourceMappingURL=estimation-DYygjeNf.js.map
