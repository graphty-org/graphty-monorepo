<script setup lang="ts">
// On a package's docs home page, the package lockup is the hero's title (VitePress's hero-info slot, index.ts).
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import { packageOf } from "./package-brand";

const { page } = useData();
const pkg = computed(() => packageOf(page.value.relativePath));
</script>

<template>
    <div v-if="pkg" class="package-hero-lockup">
        <img
            class="lockup-on-light"
            :src="withBase(`/brand/graphty-${pkg}-lockup-color-on-light.svg`)"
            :alt="`graphty ${pkg}`"
        />
        <img
            class="lockup-on-dark"
            :src="withBase(`/brand/graphty-${pkg}-lockup-color-on-dark.svg`)"
            :alt="`graphty ${pkg}`"
        />
    </div>
</template>

<style scoped>
/* the height of the hero's text title at each width, never wider than the page (24 px minimum on a phone) */
.package-hero-lockup {
    padding-bottom: 8px;
}

img {
    height: 32px;
    max-width: 100%;
    object-fit: contain;
    object-position: left;
    vertical-align: top;
}

@media (min-width: 640px) {
    img {
        height: 48px;
    }
}

@media (min-width: 960px) {
    img {
        height: 56px;
    }
}
</style>
