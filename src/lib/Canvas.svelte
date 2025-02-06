<script lang="ts">
    import { imageState, settingsState } from "../stores/state.svelte";
    import { WebGPUService } from "../services/wgpu.svelte";

    let canvasWGPU: HTMLCanvasElement;
    const wgpuService = new WebGPUService();

    $effect(() => {
        if (canvasWGPU) {
            wgpuService.initialize(canvasWGPU);
        }
    });

    $effect(() => {
        if (imageState.image) {
            wgpuService.processImage(imageState.image);
        }
    });

    // Watch for settings changes and trigger re-render
    $effect(() => {
        if (wgpuService && imageState.image) {
            // Create a dependency on all settings values
            const { kernelSize, n, hardness, q, zeroCrossing, zeta } =
                settingsState;
            wgpuService.updateSettings();
        }
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
