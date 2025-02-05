import shaderModuleCode from "../shaders/render.wgsl?raw";

export class WebGPUService {
    private canvas: HTMLCanvasElement | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private canvasFormat: any = null;

    async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
        this.canvas = canvas;
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

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
        });

        console.log("WebGPU Initiated");

        return true;
    }

    async processImage(image: HTMLImageElement) {
        if (!this.device || !this.context || !this.canvas) {
            throw new Error("WebGPU not initialized");
        }

        this.canvas.width = image.width;
        this.canvas.height = image.height;

        const imageBitmap = await createImageBitmap(image);

        const inputTexture = this.device.createTexture({
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
            { texture: inputTexture },
            [imageBitmap.width, imageBitmap.height],
        );

        // RENDER FUNCTIONS
        const shaderModule = this.device.createShaderModule({
            code: shaderModuleCode,
        });

        const sampler = this.device.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
        });

        const renderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shaderModule,
                entryPoint: "vertexMain",
            },
            fragment: {
                module: shaderModule,
                entryPoint: "fragmentMain",
                targets: [{ format: this.canvasFormat }],
            },
            primitive: {
                topology: "triangle-list",
            },
            multisample: {
                count: 1,
            },
        });

        const renderBindGroup = this.device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: inputTexture.createView() },
            ],
        });

        let commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                    storeOp: "store",
                },
            ],
        });
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setBindGroup(0, renderBindGroup);
        passEncoder.draw(6);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}
