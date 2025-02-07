// Import Shaders as raw text
import kuwaharaShaderCode from "../shaders/kuwahara.wgsl?raw";
import structureTensorShaderCode from "../shaders/structure_tensor.wgsl?raw";
import blurShaderCode from "../shaders/blur.wgsl?raw";

import { settingsState } from "../stores/state.svelte";

export class WebGPUService {
    private canvas: HTMLCanvasElement | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: any = null;
    private currentTexture: GPUTexture | null = null;
    private settingsBuffer: GPUBuffer | null = null;

    private structureTensorTexture: GPUTexture | null = null;
    private blurPass1Texture: GPUTexture | null = null;
    private blurPass2Texture: GPUTexture | null = null;

    // Clean up any other resources
    destroy() {
        if (this.device) {
            this.device.destroy();
        }
    }

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
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
        });

        this.settingsBuffer = this.device.createBuffer({
            size: 48, // Must match the total size of the shader structure
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.updateSettings();

        return true;
    }

    updateSettings() {
        if (!this.device || !this.settingsBuffer) return;
        // console.log("Inside UpdateSettingsState");

        // Create buffer with the full size
        const settingsData = new ArrayBuffer(48);

        // Create views for different parts of the buffer
        const intView = new Int32Array(settingsData, 0, 4); // 4 integers (including padding)
        const floatView = new Float32Array(settingsData, 16, 8); // 8 floats (including padding)

        // Set integers
        intView[0] = settingsState.kernelSize;
        intView[1] = settingsState.n;
        intView[2] = 0; // padding
        intView[3] = 0; // padding

        // Set floats
        floatView[0] = settingsState.hardness;
        floatView[1] = settingsState.q;
        floatView[2] = settingsState.zeroCrossing;
        floatView[3] = settingsState.zeta;
        floatView[4] = settingsState.alpha;
        floatView[5] = 0.0; // padding
        floatView[6] = 0.0; // padding
        floatView[7] = 0.0; // padding

        this.device.queue.writeBuffer(this.settingsBuffer, 0, settingsData);

        if (this.currentTexture) {
            this.processKuwahara(this.currentTexture);
        }
    }

    private async createTextures(image: HTMLImageElement) {
        if (!this.device) return;

        const width = image.width;
        const height = image.height;

        const imageBitmap = await createImageBitmap(image);

        this.currentTexture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: this.currentTexture },
            [imageBitmap.width, imageBitmap.height],
        );

        // Create texture for structure tensor
        this.structureTensorTexture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC, // Add this flag
        });

        // Create textures for blur passes
        this.blurPass1Texture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC, // Add this flag
        });

        this.blurPass2Texture = this.device.createTexture({
            size: [width, height],
            format: this.canvasFormat,
            usage:
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC, // Add this flag
        });
    }

    async initImage(image: HTMLImageElement) {
        if (!this.device || !this.context || !this.canvas) {
            throw new Error("WebGPU not initialized");
        }
        // console.log("Inside init image", image);

        this.canvas.width = image.width;
        this.canvas.height = image.height;

        await this.createTextures(image);
        // console.log("textures were created.");

        if (!this.currentTexture) {
            throw Error("There was no image when you tried to render.");
        }

        this.processKuwahara(this.currentTexture);
    }

    private async applyBlur(
        inputTexture: GPUTexture,
        outputTexture: GPUTexture,
        horizontal: boolean,
    ) {
        if (!this.device) return;

        const pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.device.createShaderModule({
                    code: blurShaderCode,
                }),
                entryPoint: "vertexMain",
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: blurShaderCode,
                }),
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        // Create a uniform buffer for blur direction
        const directionBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Set horizontal or vertical direction
        const direction = new Int32Array([horizontal ? 1 : 0]);
        this.device.queue.writeBuffer(directionBuffer, 0, direction);

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: inputTexture.createView() },
                { binding: 2, resource: { buffer: directionBuffer } },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: outputTexture.createView(),
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

    private async calculateStructureTensor(inputTexture: GPUTexture) {
        if (!this.device || !this.structureTensorTexture) return;

        const pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: this.device.createShaderModule({
                    code: structureTensorShaderCode,
                }),
                entryPoint: "vertexMain",
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: structureTensorShaderCode,
                }),
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });
        console.log("Inside calculate Structure Tensor");

        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: inputTexture.createView() },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.structureTensorTexture.createView(),
                    // view: this.context!.getCurrentTexture().createView(),
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

    private async processKuwahara(inputTexture: GPUTexture) {
        if (!this.device || !this.context || !this.settingsBuffer) return;

        // Step 1: Calculate structure tensor
        await this.calculateStructureTensor(this.currentTexture!);

        // Step 2: Blur Pass 1 (Horizontal)
        await this.applyBlur(
            this.structureTensorTexture!,
            this.blurPass1Texture!,
            true,
        );

        // Step 3: Blur Pass 2 (Vertical)
        await this.applyBlur(
            this.blurPass1Texture!,
            this.blurPass2Texture!,
            false,
        );

        // // Step 3: Copy blur result to canvas
        // const commandEncoder = this.device.createCommandEncoder();
        // commandEncoder.copyTextureToTexture(
        //     { texture: this.blurPass2Texture! },
        //     { texture: this.context.getCurrentTexture() },
        //     [this.canvas!.width, this.canvas!.height],
        // );
        // this.device.queue.submit([commandEncoder.finish()]);

        // Step 4: Final Kuwahara Pass
        this.applyKuwaharaFilter(inputTexture, this.blurPass2Texture!);
    }

    // New method to apply Kuwahara filter
    private applyKuwaharaFilter(
        inputTexture: GPUTexture,
        structureTensorTexture: GPUTexture,
    ) {
        if (!this.device || !this.context || !this.settingsBuffer) return;

        // First, create the bind group layout
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "float",
                        viewDimension: "2d",
                        multisampled: false,
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "float",
                        viewDimension: "2d",
                        multisampled: false,
                    },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false,
                        minBindingSize: 48,
                    },
                },
            ],
        });

        // Create the pipeline layout
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        });

        // Create the pipeline with explicit layout
        const pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout, // Use explicit layout instead of "auto"
            vertex: {
                module: this.device.createShaderModule({
                    code: kuwaharaShaderCode,
                }),
                entryPoint: "vertexMain",
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: kuwaharaShaderCode,
                }),
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat! }],
            },
            primitive: {
                topology: "triangle-list",
            },
        });

        const sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });

        // Create bind group using the same layout
        const bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: inputTexture.createView() },
                { binding: 2, resource: structureTensorTexture.createView() },
                { binding: 3, resource: { buffer: this.settingsBuffer } },
            ],
        });

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
}
