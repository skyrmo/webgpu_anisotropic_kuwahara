import kuwaharaShaderCode from "../shaders/kuwahara.wgsl?raw";
import { settingsState } from "../stores/state.svelte";

export class WebGPUService {
    private canvas: HTMLCanvasElement | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: any = null;
    private currentTexture: GPUTexture | null = null;
    private settingsBuffer: GPUBuffer | null = null;

    async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        this.canvas = canvas;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found");
        }

        this.device = await adapter.requestDevice();
        this.context = canvas.getContext("webgpu") as GPUCanvasContext;

        if (!this.context) {
            throw new Error("Could not get WebGPU context");
        }

        this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.canvasFormat,
            alphaMode: "premultiplied",
        });

        // Create settings buffer
        this.settingsBuffer = this.device.createBuffer({
            size: 24,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.updateSettings(settingsState);

        return true;
    }

    updateSettings() {
        if (!this.device || !this.settingsBuffer) return;
        console.log(
            "Update fn was fired. Values are: ",
            settingsState.kernelSize,
            settingsState.n,
            settingsState.hardness,
            settingsState.q,
            settingsState.zeroCrossing,
            settingsState.zeta,
        );

        const settingsData = new ArrayBuffer(24);
        const intView = new Int32Array(settingsData, 0, 2);
        const floatView = new Float32Array(settingsData, 8, 4);

        // Use values from the store
        intView[0] = settingsState.kernelSize;
        intView[1] = settingsState.n;
        floatView[0] = settingsState.hardness;
        floatView[1] = settingsState.q;
        floatView[2] = settingsState.zeroCrossing;
        floatView[3] = settingsState.zeta;

        this.device.queue.writeBuffer(this.settingsBuffer, 0, settingsData);

        if (this.currentTexture) {
            this.applyKuwahara(this.currentTexture);
        }
    }

    // Clean up any other resources
    destroy() {
        if (this.device) {
            this.device.destroy();
        }
    }

    async processImage(image: HTMLImageElement) {
        if (!this.device || !this.context || !this.canvas) {
            throw new Error("WebGPU not initialized");
        }

        this.canvas.width = image.width;
        this.canvas.height = image.height;

        this.currentTexture = await this.createTextureFromImage(image);

        this.applyKuwahara(this.currentTexture);
    }

    // New method to apply Kuwahara filter
    private applyKuwahara(inputTexture: GPUTexture) {
        if (!this.device || !this.context || !this.settingsBuffer) return;

        // Create pipeline
        const shaderModule = this.device.createShaderModule({
            code: kuwaharaShaderCode,
        });

        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        const pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat! }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: inputTexture.createView() },
                { binding: 2, resource: { buffer: this.settingsBuffer } },
            ],
        });

        // Render
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(6);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    async createTextureFromImage(image: HTMLImageElement): Promise<GPUTexture> {
        if (!this.device || !this.context || !this.canvas) {
            throw new Error("WebGPU not initialized");
        }

        const imageBitmap = await createImageBitmap(image);

        const texture = this.device.createTexture({
            size: [imageBitmap.width, imageBitmap.height],
            format: "rgba8unorm",
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture },
            [imageBitmap.width, imageBitmap.height],
        );

        return texture;
    }
}
