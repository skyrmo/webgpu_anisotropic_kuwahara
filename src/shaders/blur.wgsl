struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> isHorizontal: i32;

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
    let texelSize = 1.0 / texSize;

    // Use polynomial weights instead of Gaussian
    let weights = array<f32, 5>(
        0.4,    // center
        0.25,   // offset ±1
        0.15,   // offset ±2
        0.10,   // offset ±3
        0.05    // offset ±4
    );

    var result = textureSample(inputTexture, textureSampler, texCoord) * weights[0];

    if (isHorizontal == 1) {
        for (var i = 1; i < 5; i++) {
            let offset = vec2f(texelSize.x * f32(i), 0.0);
            result += textureSample(inputTexture, textureSampler, texCoord + offset) * weights[i];
            result += textureSample(inputTexture, textureSampler, texCoord - offset) * weights[i];
        }
    } else {
        for (var i = 1; i < 5; i++) {
            let offset = vec2f(0.0, texelSize.y * f32(i));
            result += textureSample(inputTexture, textureSampler, texCoord + offset) * weights[i];
            result += textureSample(inputTexture, textureSampler, texCoord - offset) * weights[i];
        }
    }

    return result;
}
