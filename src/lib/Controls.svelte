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
            <label>
                Kernel Size:
                <input
                    type="number"
                    bind:value={settings.kernelSize}
                    min="3"
                    max="150"
                    step="2"
                />
            </label>

            <label>
                Hardness:
                <input
                    type="range"
                    bind:value={settings.hardness}
                    min="1"
                    max="100"
                    step="0.5"
                />
            </label>

            <label>
                Quality:
                <input
                    type="range"
                    bind:value={settings.q}
                    min="1"
                    max="160"
                    step="0.5"
                />
            </label>
        </label>
    </div>
</main>

<style>
    .container {
        display: flex;
        flex-direction: column;
    }
</style>
