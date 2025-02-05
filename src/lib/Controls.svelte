<script lang="ts">
    import {
        settingsState as settings,
        imageState,
    } from "../stores/state.svelte";

    async function loadImage(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const url = URL.createObjectURL(file);
            image.src = url;

            image.onload = () => {
                imageState.url = url;
                imageState.width = image.width;
                imageState.height = image.height;
                imageState.image = image;
                resolve();
            };

            image.onerror = (error) => {
                reject(error);
            };
        });
    }
</script>

<main>
    <div class="container">
        <label>
            Open Image:
            <input
                type="file"
                accept="image/*"
                on:change={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadImage(file);
                }}
            />
        </label>
        <label>
            Number of Pixels:
            <input
                type="number"
                bind:value={settings.pixels}
                min="4"
                max="16000"
            />
        </label>
        <input type="range" bind:value={settings.pixels} min="4" max="16000" />

        <label>
            <div class="top-row">
                Number of Colours:
                <input
                    type="number"
                    bind:value={settings.colours}
                    min="2"
                    max="32"
                />
            </div>
        </label>
        <input type="range" bind:value={settings.colours} min="2" max="32" />
    </div>
</main>

<style>
    .container {
        display: flex;
        flex-direction: column;
    }
</style>
