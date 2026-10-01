// Screen 113: the view-mode button and its menu (round-4/revision-round-4.md
// section 3.4). Screen 3's state (Karate Club, Group 2 selected) in 3D. The
// one button at the toolbar's right end reads the current mode, "3D"; a click
// opened its menu: 2D and 3D with the 5 key (a check on 3D), VR dimmed
// because no headset is connected (its reason in the tooltip), AR with
// "Showing >". Two other moments, tagged: the VR row's "Showing" submenu when
// a headset is connected, and a tool group's dropdown (Select's chevron:
// Select, Hand), the only other kind of menu on the bar.
import { STATE } from "./screen-3.mjs";

export default {
  id: 113,
  title: "The view-mode button and its menu",
  theme: "light",
  ...STATE,
  canvas: { ...STATE.canvas, camera: { pitch: 50 } },
  toolbar: { active: "select", mode: "3D", modeMenu: true, disabledTools: { VR: "no headset connected" } },
  tooltips: [{ lines: ["VR cannot start", "No headset is connected.", "Connect one and put it on, then try again."], anchor: { el: "mode-VR", side: "left", align: "center", dx: -8 } }],
  menus: [
    {
      tag: "Also: VR > Showing, with a headset connected", left: 256, top: 16, width: 232,
      rows: [
        { heading: "Enter VR showing" },
        { label: "Everything", note: "34 nodes" },
        { divider: true },
        { label: "Degree > 8", note: "5 nodes" },
        { label: "Group 1", note: "12 nodes" },
        { label: "Group 2", note: "11 nodes", highlighted: true },
        { label: "Group 3", note: "6 nodes" },
        { label: "Group 4", note: "5 nodes" },
      ],
    },
    {
      tag: "Also: a tool's dropdown (Select's chevron)", left: 936, top: 16, width: 240,
      rows: [
        { label: "Select", key: "V", icon: "cursor", checked: true },
        { label: "Hand", key: "H", icon: "hand", checked: false },
      ],
    },
  ],
  inspector: { ...STATE.inspector, framing: "Isometric" },
  status: { ...STATE.status, zoom: "Isometric" },
  caption: {
    title: "Screen 113: the view-mode button, its menu open in 3D.",
    text: "The way in: the last button on the toolbar, whose face is the current mode (\"3D\"); a click opens this menu, and the 5 key flips 2D and 3D without it. Look at: the check on 3D; VR dimmed, its tooltip giving the reason and the fix; AR with \"Showing >\"; the button drawn open. First inset: with a headset connected, VR's submenu picks what to take into the headset (Everything, then each Set and Group with its count); a plain click on VR takes what is showing; in the headset the face reads \"VR\" in blue and the menu's first row is \"Exit VR\". Second inset: every other control with a dropdown opens the same kind of menu from its chevron; Select's lists Select (V) and Hand (H). At rest the bar has no words but this button's two characters.",
  },
};
