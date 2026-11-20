// Chapter 7, clip 4: a placeholder. The plan's "Line > Blending On, and the densest parts glow"
// cannot be filmed: blending is already on by default, and on the light canvas overlapping lines
// darken rather than glow. Tried instead on the real 50,000-node drawing: Line > Opacity at 20, 10
// and 5 percent only makes the lines vanish behind the nodes; nothing "glows". A glow needs a dark
// canvas (Graph settings > Background) and light lines, which has not been tried.
export default {
    id: "blend-glow",
    chapter: 7,
    caption: "Blend the lines, and the busiest parts glow.",
    placeholder: "Dense parts glowing on a dark canvas -- not filmed yet",
    seconds: 5,
};
