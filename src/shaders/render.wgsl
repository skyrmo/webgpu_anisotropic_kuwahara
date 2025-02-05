struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

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

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
    return textureSample(myTexture, mySampler, texCoord);
}
