// New structure tensor shader
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;

// Add this vertex shader implementation
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2f, 6>(
        vec2f(-1.0, -1.0),
        vec2f( 1.0, -1.0),
        vec2f(-1.0,  1.0),
        vec2f(-1.0,  1.0),
        vec2f( 1.0, -1.0),
        vec2f( 1.0,  1.0)
    );

    var texCoords = array<vec2f, 6>(
        vec2f(0.0, 1.0),
        vec2f(1.0, 1.0),
        vec2f(0.0, 0.0),
        vec2f(0.0, 0.0),
        vec2f(1.0, 1.0),
        vec2f(1.0, 0.0)
    );

    var output: VertexOutput;
    output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    output.texCoord = texCoords[vertexIndex];
    return output;
}

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
    let texSize = vec2f(textureDimensions(inputTexture));
    let d = 1.0 / texSize;

    // Sobel operators for x and y derivatives
    let Sx = (
        1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(-d.x, -d.y)).rgb +
        2.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(-d.x, 0.0)).rgb +
        1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(-d.x, d.y)).rgb +
        -1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(d.x, -d.y)).rgb +
        -2.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(d.x, 0.0)).rgb +
        -1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(d.x, d.y)).rgb
    ) / 4.0;

    let Sy = (
        1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(-d.x, -d.y)).rgb +
        2.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(0.0, -d.y)).rgb +
        1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(d.x, -d.y)).rgb +
        -1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(-d.x, d.y)).rgb +
        -2.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(0.0, d.y)).rgb +
        -1.0 * textureSample(inputTexture, textureSampler, texCoord + vec2f(d.x, d.y)).rgb
    ) / 4.0;

    return vec4f(dot(Sx, Sx), dot(Sy, Sy), dot(Sx, Sy), 1.0);
}
