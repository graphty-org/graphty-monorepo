import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import PackageHeroLockup from "./PackageHeroLockup.vue";
import "./brand-tokens.css";
import "./custom.css";

export default {
    extends: DefaultTheme,
    Layout: () => h(DefaultTheme.Layout, null, { "home-hero-info-before": () => h(PackageHeroLockup) }),
};
