<script lang="ts">
    import { imageState, settingsState } from "../stores/state.svelte";
    import { WebGPUService } from "../services/wgpu.svelte";
    import { onDestroy } from "svelte";

    let canvasWGPU: HTMLCanvasElement;
    const wgpuService = new WebGPUService();

    $effect(() => {
        if (canvasWGPU) {
            wgpuService.initialize(canvasWGPU);
        }
    });

    $effect(() => {
        if (imageState.image) {
            wgpuService.initImage(imageState.image);
        }
    });

    // Watch for settings changes and trigger re-render
    $effect(() => {
        // if (wgpuService && imageState.image) {
        // Create a dependency on all settings values. Need to find a better way to do thiss
        const { kernelSize, hardness, q, alpha, zeroCrossing, zeta } =
            settingsState;
        wgpuService.updateSettings();
        // }
    });

    onDestroy(() => {
        wgpuService.destroy();
    });
</script>

<main>
    <canvas bind:this={canvasWGPU} class="canvas-wgpu"></canvas>
</main>

<style>
    main {
        height: 100vh;
    }

    canvas {
        width: 100%;
        max-height: 100%;
    }
</style>
