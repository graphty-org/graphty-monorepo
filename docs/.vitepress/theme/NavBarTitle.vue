<script setup lang="ts">
// Replaces VitePress's VPNavBarTitle (config.ts aliases it): on a package's pages the nav bar shows that
// package's lockup and links to its docs home; elsewhere it shows the graphty lockup and links to the site home.
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import { useSidebar } from "vitepress/theme";
import { packageOf } from "./package-brand";

const { page } = useData();
const { hasSidebar } = useSidebar();
const pkg = computed(() => packageOf(page.value.relativePath));
const name = computed(() => (pkg.value ? `graphty-${pkg.value}` : "graphty"));
const alt = computed(() => (pkg.value ? `graphty ${pkg.value}` : "graphty"));
const link = computed(() => withBase(pkg.value ? `/${pkg.value}/` : "/"));
</script>

<template>
    <div class="VPNavBarTitle" :class="{ 'has-sidebar': hasSidebar }">
        <a class="title" :href="link">
            <slot name="nav-bar-title-before" />
            <img class="logo lockup-on-light" :src="withBase(`/brand/${name}-lockup-color-on-light.svg`)" :alt="alt" />
            <img class="logo lockup-on-dark" :src="withBase(`/brand/${name}-lockup-color-on-dark.svg`)" :alt="alt" />
            <slot name="nav-bar-title-after" />
        </a>
    </div>
</template>

<style scoped>
.title {
    display: flex;
    align-items: center;
    border-bottom: 1px solid transparent;
    width: 100%;
    height: var(--vp-nav-height);
    transition: opacity 0.25s;
}

.title:hover {
    opacity: 0.6;
}

@media (min-width: 960px) {
    .title {
        flex-shrink: 0;
    }

    .VPNavBarTitle.has-sidebar .title {
        border-bottom-color: var(--vp-c-divider);
    }
}

.logo {
    height: var(--vp-nav-logo-height);
    min-width: 0;
    object-fit: contain;
    object-position: left;
}

/* On a phone the widest lockups would push the menu button off the screen, so the lockup gives up width first. */
@media (max-width: 767px) {
    .logo {
        /* the page's two 24 px gutters, and the search and menu buttons (48 px each) */
        max-width: calc(100vw - 144px);
    }
}
</style>
