struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f,
}

struct Settings {
    kernelSize: i32,
    n: i32,
    hardness: f32,
    q: f32,
    zeroCrossing: f32,
    zeta: f32,
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var inputTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> settings: Settings;

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
    var m: array<vec4f, 8>;
    var s: array<vec3f, 8>;

    let kernelRadius = settings.kernelSize / 2;
    let zeta = settings.zeta;
    let zeroCross = settings.zeroCrossing;
    let sinZeroCross = sin(zeroCross);
    let eta = (zeta + cos(zeroCross)) / (sinZeroCross * sinZeroCross);

    // Initialize arrays
    for (var k = 0; k < 8; k++) {
        m[k] = vec4f(0.0);
        s[k] = vec3f(0.0);
    }

    let texSize = vec2f(textureDimensions(inputTexture));
    let texelSize = 1.0 / texSize;

    // Main kernel loop
    for (var y = -kernelRadius; y <= kernelRadius; y++) {
        for (var x = -kernelRadius; x <= kernelRadius; x++) {
            let v = vec2f(f32(x), f32(y)) / f32(kernelRadius);
            let samplePos = texCoord + vec2f(f32(x), f32(y)) * texelSize;
            var c = textureSample(inputTexture, textureSampler, samplePos).rgb;

            var sum = 0.0;
            var w: array<f32, 8>;

            // Calculate polynomial weights
            let vxx = zeta - eta * v.x * v.x;
            let vyy = zeta - eta * v.y * v.y;

            var z = max(0.0, v.y + vxx);
            w[0] = z * z;
            sum += w[0];

            z = max(0.0, -v.x + vyy);
            w[2] = z * z;
            sum += w[2];

            z = max(0.0, -v.y + vxx);
            w[4] = z * z;
            sum += w[4];

            z = max(0.0, v.x + vyy);
            w[6] = z * z;
            sum += w[6];

            let v_rotated = sqrt(2.0) / 2.0 * vec2f(v.x - v.y, v.x + v.y);
            let vxx_rot = zeta - eta * v_rotated.x * v_rotated.x;
            let vyy_rot = zeta - eta * v_rotated.y * v_rotated.y;

            z = max(0.0, v_rotated.y + vxx_rot);
            w[1] = z * z;
            sum += w[1];

            z = max(0.0, -v_rotated.x + vyy_rot);
            w[3] = z * z;
            sum += w[3];

            z = max(0.0, -v_rotated.y + vxx_rot);
            w[5] = z * z;
            sum += w[5];

            z = max(0.0, v_rotated.x + vyy_rot);
            w[7] = z * z;
            sum += w[7];

            let g = exp(-3.125 * dot(v, v)) / sum;

            for (var k = 0; k < 8; k++) {
                let wk = w[k] * g;
                m[k] += vec4f(c * wk, wk);
                s[k] += c * c * wk;
            }
        }
    }

    var output = vec4f(0.0);
    for (var k = 0; k < settings.n; k++) {
        m[k] = vec4f(m[k].rgb / m[k].w, m[k].w);
        s[k] = abs(s[k] / m[k].w - m[k].rgb * m[k].rgb);

        let sigma2 = s[k].r + s[k].g + s[k].b;
        let w = 1.0 / (1.0 + pow(settings.hardness * 1000.0 * sigma2, 0.5 * settings.q));

        output += vec4f(m[k].rgb * w, w);
    }

    return vec4f(output.rgb / output.w, 1.0);
}
