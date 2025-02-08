<script lang="ts">
    import { settingsState, imageState } from "../stores/state.svelte";

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
            Kernel Size:
            <input
                type="number"
                bind:value={settingsState.kernelSize}
                min="3"
                max="150"
                step="2"
            />
        </label>

        <label>
            Hardness:
            <input
                type="number"
                bind:value={settingsState.hardness}
                min="1"
                max="200"
                step="10"
            />
        </label>

        <label>
            Quality:
            <input
                type="number"
                bind:value={settingsState.q}
                min="1"
                max="50"
                step="1"
            />
        </label>
        <label>
            Alpha:
            <input
                type="number"
                bind:value={settingsState.alpha}
                min="0.1"
                max="50.1"
                step="0.5"
            />
        </label>
        <label>
            Zero-Crossing:
            <input
                type="number"
                bind:value={settingsState.zeroCrossing}
                min="0.3"
                max="1"
                step="0.01"
            />
        </label>
        <label>
            Zeta:
            <input
                type="number"
                bind:value={settingsState.zeta}
                min="0.01"
                max="1"
                step="0.01"
            />
        </label>
    </div>
</main>

<style>
    .container {
        display: flex;
        flex-direction: column;
    }
</style>
