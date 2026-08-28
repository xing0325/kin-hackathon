import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import GUI from "lil-gui";
import Orchestrator from "./Orchestrator.js";
import MouseTrail from "./Effects/MouseTrail.js";

export default class Stage {
    constructor() {
        this.orchestrator = new Orchestrator();
        this.scene = this.orchestrator.scene;

        this.gridSize = 40;
        this.cubeWidth = 0.8;
        this.cubeHeight = 3;
        this.params = {
            gap: 0.03,
            waveAmplitude: 0.58,
            waveSpeed: 6.0, // world units / second
            waveFrequency: 1.2, // radians / world unit (spatial oscillation)
            waveWidth: 1.65, // narrower envelope keeps small gestures local
            waveJitter: 0.2,
            waveMaxHeight: 0.58,
            // Graphite keeps the KIN palette dark without crushing the face lighting.
            colorBase: "#3b424b",
            colorHigh: "#ff5a1f",
        };
        // Dark negative space separates the cells; bevelled faces carry the
        // readable highlights instead of relying on a background line.
        this.backgroundColor = "#0b0d10";
        this.scene.background = new THREE.Color(this.backgroundColor);

        this.lightingParams = {
            ambientColor: "#ffffff",
            ambientIntensity: 0.58,
            directionalColor: "#ffffff",
            directionalIntensity: 4.6,
            directional2Color: "#ffffff",
            directional2Intensity: 2.0,
        };

        // Physical world-unit footprint of the grid (centre-to-centre span).
        this.bounds = this.gridSize * (this.cubeWidth + this.params.gap);

        this.shaderRef = null;

        this.setLighting();
        this.setGrid();
        this.mouseTrail = new MouseTrail(this.bounds);
        this.setGUI();
    }

    setLighting() {
        const lp = this.lightingParams;

        this.ambientLight = new THREE.AmbientLight(
            lp.ambientColor,
            lp.ambientIntensity,
        );
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(
            lp.directionalColor,
            lp.directionalIntensity,
        );
        this.directionalLight.position.set(-20, 10, 6);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.set(1024, 1024);
        this.directionalLight.shadow.radius = 6;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 60;
        this.directionalLight.shadow.camera.left = -22;
        this.directionalLight.shadow.camera.right = 22;
        this.directionalLight.shadow.camera.top = 22;
        this.directionalLight.shadow.camera.bottom = -22;
        this.directionalLight.shadow.bias = 0.0001;
        this.scene.add(this.directionalLight);

        this.directionalLight2 = new THREE.DirectionalLight(
            lp.directional2Color,
            lp.directional2Intensity,
        );
        this.directionalLight2.position.set(10, 5, -3);
        this.directionalLight2.castShadow = false;
        this.scene.add(this.directionalLight2);

        // Add camera helper to visualize shadow camera frustum
        this.shadowCameraHelper = new THREE.CameraHelper(
            this.directionalLight.shadow.camera,
        );
        this.shadowCameraHelper.visible = false;
        this.scene.add(this.shadowCameraHelper);
    }

    // This is shared between the main shader and the depth shader to ensure consistent wave deformation in both passes.
    overrideVertexShader(vertexShader) {
        return vertexShader
            .replace(
                "#include <common>",
                `#include <common>
                varying float vHeight;
                varying float vColorStrength;
                attribute vec2 aOffset;
                uniform sampler2D uTrailTexture;
                uniform int       uTrailCount;
                uniform float     uWaveSpeed;
                uniform float     uWaveFreq;
                uniform float     uWaveWidth;
                uniform float     uFadeTime;
                uniform float     uAmplitude;
                uniform float     uJitter;
                uniform float     uMaxHeight;

                // Deterministic per-instance hash → two values in [-0.5, 0.5].
                // Stable across frames; depends only on world position.
                vec2 hash2( vec2 p ) {
                    p = vec2(
                        dot( p, vec2( 127.1, 311.7 ) ),
                        dot( p, vec2( 269.5, 183.3 ) )
                    );
                    return fract( sin( p ) * 43758.5453123 ) - 0.5;
                }`,
            )
            .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>

                vHeight = 0.0;
                vColorStrength = 0.0;

                if ( position.y > 0.0 ) {
                    vec2 jitter  = hash2( aOffset ) * uJitter;
                    vec2 worldXZ = aOffset + jitter;
                    float waveHeight  = 0.0;
                    float totalWeight = 0.0;
                    float weightedAge = 0.0;

                    for ( int i = 0; i < uTrailCount; i++ ) {
                        // texel layout: (worldX, worldZ, age, distDelta)
                        vec4 td = texture2D(
                            uTrailTexture,
                            vec2( ( float(i) + 0.5 ) / 128.0, 0.5 )
                        );
                        float dist      = length( worldXZ - td.rg );
                        float wavefront = uWaveSpeed * td.b;
                        float relDist   = dist - wavefront;

                        // Gaussian envelope centred on the expanding wavefront
                        float window = exp( -( relDist * relDist ) / ( uWaveWidth * uWaveWidth ) );
                        // Exponential time-fade + distance attenuation
                        float fade   = exp( -td.b / uFadeTime );
                        float atten  = 1.0 / ( 1.0 + dist * 0.1 );
                        float weight = fade * window * atten * td.a; // td.a is distDelta, used to weaken waves from closely spaced trail points

                        waveHeight  += weight * cos( uWaveFreq * relDist );
                        totalWeight += weight;
                        weightedAge += weight * td.b;
                    }

                    // Weighted average: overlapping waves average rather than stack,
                    // cancelling chaotic superposition while preserving single-wave peaks.
                    waveHeight /= max( totalWeight, 1.0 );

                    float displacement = clamp( waveHeight * uAmplitude, -uMaxHeight, uMaxHeight );
                    transformed.y += displacement;
                    vHeight = displacement;

                    // Unlike geometry displacement, color keeps the upstream
                    // time/distance attenuation. The fresh disturbance center
                    // is saturated, while an expanding ring fades into graphite.
                    float averageAge = weightedAge / max( totalWeight, 0.0001 );
                    float ageColorFade = exp( -averageAge / max( uFadeTime * 1.6, 0.0001 ) );
                    float localInfluence = clamp( totalWeight, 0.0, 1.0 );
                    float normalizedHeight = abs( displacement ) / max( uMaxHeight, 0.0001 );
                    vColorStrength = clamp(
                        normalizedHeight * ageColorFade * ( 0.6 + 0.4 * localInfluence ),
                        0.0,
                        1.0
                    );
                }`,
            );
    }

    setGrid() {
        const count = this.gridSize * this.gridSize;
        const geometry = new RoundedBoxGeometry(
            this.cubeWidth,
            this.cubeHeight,
            this.cubeWidth,
            2,
            0.045,
        );

        // Per-instance XZ world position passed to the vertex shader
        this.offsetAttribute = new THREE.InstancedBufferAttribute(
            new Float32Array(count * 2),
            2,
        );
        geometry.setAttribute("aOffset", this.offsetAttribute);

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.04,
            clearcoat: 0.16,
            clearcoatRoughness: 0.7,
        });

        material.onBeforeCompile = (shader) => {
            // Attach trail-wave uniforms by reference so MouseTrail.update()
            // mutations are automatically reflected each frame without extra work here.
            const mu = this.mouseTrail.uniforms;
            shader.uniforms.uTrailTexture = mu.uTrailTexture;
            shader.uniforms.uTrailCount = mu.uTrailCount;
            shader.uniforms.uFadeTime = mu.uFadeTime;
            shader.uniforms.uWaveSpeed = { value: this.params.waveSpeed };
            shader.uniforms.uWaveFreq = { value: this.params.waveFrequency };
            shader.uniforms.uWaveWidth = { value: this.params.waveWidth };
            shader.uniforms.uAmplitude = { value: this.params.waveAmplitude };
            shader.uniforms.uJitter = { value: this.params.waveJitter };
            shader.uniforms.uMaxHeight = { value: this.params.waveMaxHeight };
            shader.uniforms.uColorBase = {
                value: new THREE.Color(this.params.colorBase),
            };
            shader.uniforms.uColorHigh = {
                value: new THREE.Color(this.params.colorHigh),
            };

            shader.vertexShader = this.overrideVertexShader(
                shader.vertexShader,
            );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    "#include <common>",
                    `#include <common>
                    varying float vHeight;
                    varying float vColorStrength;
                    uniform vec3  uColorBase;
                    uniform vec3  uColorHigh;
                    uniform float uMaxHeight;`,
                )
                .replace(
                    "#include <color_fragment>",
                    `#include <color_fragment>
                    float t = smoothstep( 0.04, 0.85, pow( vColorStrength, 1.15 ) );
                    diffuseColor.rgb = mix( uColorBase, uColorHigh, t );`,
                )
                .replace(
                    "#include <emissivemap_fragment>",
                    `#include <emissivemap_fragment>
                    totalEmissiveRadiance += uColorHigh * t * 0.08;`,
                )
                .replace(
                    "#include <opaque_fragment>",
                    `#include <opaque_fragment>
                    gl_FragColor.rgb = mix( gl_FragColor.rgb, uColorHigh, t * 0.65 );`,
                );

            this.shaderRef = shader;
        };

        const depthMaterial = new THREE.MeshDepthMaterial();

        depthMaterial.onBeforeCompile = (shader) => {
            const mu = this.mouseTrail.uniforms;
            shader.uniforms.uTrailTexture = mu.uTrailTexture;
            shader.uniforms.uTrailCount = mu.uTrailCount;
            shader.uniforms.uFadeTime = mu.uFadeTime;
            shader.uniforms.uWaveSpeed = { value: this.params.waveSpeed };
            shader.uniforms.uWaveFreq = { value: this.params.waveFrequency };
            shader.uniforms.uWaveWidth = { value: this.params.waveWidth };
            shader.uniforms.uAmplitude = { value: this.params.waveAmplitude };
            shader.uniforms.uJitter = { value: this.params.waveJitter };
            shader.uniforms.uMaxHeight = { value: this.params.waveMaxHeight };

            shader.vertexShader = this.overrideVertexShader(
                shader.vertexShader,
            );
        };

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        this.instancedMesh.customDepthMaterial = depthMaterial;
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.scene.add(this.instancedMesh);
        this.updateGrid();
    }

    updateGrid() {
        const dummy = new THREE.Object3D();
        const spacing = this.cubeWidth + this.params.gap;
        const offset = ((this.gridSize - 1) * spacing) / 2;

        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const index = i * this.gridSize + j;
                const x = i * spacing - offset;
                const z = j * spacing - offset;
                dummy.position.set(x, 0, z);
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(index, dummy.matrix);
                this.offsetAttribute.setXY(index, x, z);
            }
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.offsetAttribute.needsUpdate = true;
    }

    setGUI() {
        this.gui = this.orchestrator.debug.ui;
        if (!this.gui) return;

        this.gui
            .add(this.params, "gap", 0, 1, 0.01)
            .name("Gap")
            .onChange(() => this.updateGrid());

        this.gui
            .add(this.params, "waveAmplitude", 0, 10, 0.01)
            .name("Wave Amplitude")
            .onChange(() => {
                if (this.shaderRef)
                    this.shaderRef.uniforms.uAmplitude.value =
                        this.params.waveAmplitude;
            });

        this.gui
            .add(this.params, "waveSpeed", 1, 20, 0.1)
            .name("Wave Speed")
            .onChange((v) => {
                if (this.shaderRef) {
                    this.shaderRef.uniforms.uWaveSpeed.value = v;
                }
            });

        this.gui
            .add(this.params, "waveFrequency", 0.1, 5, 0.05)
            .name("Wave Frequency")
            .onChange((v) => {
                if (this.shaderRef) {
                    this.shaderRef.uniforms.uWaveFreq.value = v;
                }
            });

        this.gui
            .add(this.params, "waveWidth", 0.5, 10, 0.1)
            .name("Wave Width")
            .onChange((v) => {
                if (this.shaderRef) {
                    this.shaderRef.uniforms.uWaveWidth.value = v;
                }
            });

        this.gui
            .add(this.params, "waveMaxHeight", 0, this.cubeHeight, 0.05)
            .name("Wave Max Height")
            .onChange(() => {
                if (this.shaderRef)
                    this.shaderRef.uniforms.uMaxHeight.value =
                        this.params.waveMaxHeight;
            });

        this.gui
            .add(this.params, "waveJitter", 0, 2, 0.01)
            .name("Wave Jitter")
            .onChange(() => {
                if (this.shaderRef)
                    this.shaderRef.uniforms.uJitter.value =
                        this.params.waveJitter;
            });

        this.gui
            .addColor(this.params, "colorBase")
            .name("Base Color")
            .onChange((v) => {
                if (this.shaderRef)
                    this.shaderRef.uniforms.uColorBase.value.set(v);
                this.scene.background = new THREE.Color(this.backgroundColor);
            });

        this.gui
            .addColor(this.params, "colorHigh")
            .name("Wave Color")
            .onChange((v) => {
                if (this.shaderRef)
                    this.shaderRef.uniforms.uColorHigh.value.set(v);
            });

        // ── Trail wave controls ───────────────────────────────────────────────
        const trailFolder = this.gui.addFolder("Trail");
        const mw = this.mouseTrail;
        const mu = mw.uniforms;

        trailFolder
            .add(mw.params, "fadeTime", 0.2, 6, 0.1)
            .name("Fade Time")
            .onChange((v) => {
                mu.uFadeTime.value = v;
            });

        trailFolder
            .add(mw.params, "trailSpacing", 0.1, 3, 0.05)
            .name("Trail Spacing");

        trailFolder.open();

        // ── Lighting controls ─────────────────────────────────────────────────
        const lightingFolder = this.gui.addFolder("Lighting");
        const lp = this.lightingParams;

        lightingFolder
            .addColor(lp, "ambientColor")
            .name("Ambient Color")
            .onChange((v) => this.ambientLight.color.set(v));

        lightingFolder
            .add(lp, "ambientIntensity", 0.1, 5, 0.01)
            .name("Ambient Intensity")
            .onChange((v) => {
                this.ambientLight.intensity = v;
            });

        lightingFolder
            .addColor(lp, "directionalColor")
            .name("Key Light Color")
            .onChange((v) => this.directionalLight.color.set(v));

        lightingFolder
            .add(lp, "directionalIntensity", 0.1, 10, 0.01)
            .name("Key Light Intensity")
            .onChange((v) => {
                this.directionalLight.intensity = v;
            });

        lightingFolder
            .addColor(lp, "directional2Color")
            .name("Fill Light Color")
            .onChange((v) => this.directionalLight2.color.set(v));

        lightingFolder
            .add(lp, "directional2Intensity", 0.1, 10, 0.01)
            .name("Fill Light Intensity")
            .onChange((v) => {
                this.directionalLight2.intensity = v;
            });

        lightingFolder
            .add(this.shadowCameraHelper, "visible")
            .name("Show Shadow Camera");
    }

    update(delta) {
        this.mouseTrail.update(delta);
    }
}
