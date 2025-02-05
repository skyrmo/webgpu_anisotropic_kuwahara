<script lang="ts">
    import { imageState } from "../stores/state.svelte";
</script>

<main>
    <p>Canvas</p>
    <img src={imageState.url} alt="" />
</main>

<style>
</style>
