<script lang="ts">
    import { imageState } from "../stores/state.svelte";
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
</script>

<main>
    <!-- <p>Canvas</p> -->
    <!-- <img src={imageState.url} alt="" /> -->
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
