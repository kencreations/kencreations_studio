import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Evaluator, Brush, SUBTRACTION, ADDITION } from "three-bvh-csg";
import type { AppState } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

interface SceneProps {
    state: AppState;
    meshRef: React.RefObject<THREE.Group | null>;
    onBoundsChange?: (bounds: { x: number; y: number; z: number }) => void;
}

import { createDynamicBaseShape, createDynamicFrameShape } from "../utils/GeometryShapes";

const Generator2: React.FC<SceneProps> = ({
    state,
    meshRef,
    onBoundsChange,
}) => {
    const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
    const [frameGeo, setFrameGeo] = useState<THREE.BufferGeometry | null>(null);
    const [centerTextGeo, setCenterTextGeo] =
        useState<THREE.BufferGeometry | null>(null);
    const [bannerTextGeo, setBannerTextGeo] =
        useState<THREE.BufferGeometry | null>(null);

    const ds = useDebounce(state, 200);

    useEffect(() => {
        let active = true;
        const s = ds;

        const generate = async () => {
            const fontLoader = new FontLoader();
            const ttfLoader = new TTFLoader();

            try {
                const urls = [...new Set(s.lines.map((l) => l.font))];
                const fonts: Record<string, Font> = {};
                for (const url of urls) {
                    if (url.endsWith(".ttf")) {
                        fonts[url] = await new Promise<Font>((res, rej) =>
                            ttfLoader.load(
                                url,
                                (json) => res(fontLoader.parse(json)),
                                undefined,
                                rej,
                            ),
                        );
                    } else {
                        fonts[url] = await new Promise<Font>((res, rej) =>
                            fontLoader.load(url, res, undefined, rej),
                        );
                    }
                }
                if (!active) return;

                const ev = new Evaluator();

                // --- 1. Generate Text Geometries & Measure First ---
                let topLine: any = null;
                let nameLine: any = null;
                let bottomLine: any = null;

                if (s.lines.length > 0) {
                    // Find the index of the line with the largest font size (the main name)
                    let maxIndex = 0;
                    let maxSize = s.lines[0].size;
                    for (let i = 1; i < s.lines.length; i++) {
                        if (s.lines[i].size > maxSize) {
                            maxSize = s.lines[i].size;
                            maxIndex = i;
                        }
                    }

                    // The largest text is ALWAYS the center name line
                    nameLine = s.lines[maxIndex];

                    // Determine what to do with the other lines
                    // Anything before maxIndex goes to the top
                    // Anything after maxIndex goes to the bottom
                    if (maxIndex > 0) {
                        topLine = s.lines[0];
                    }
                    if (maxIndex < s.lines.length - 1) {
                        bottomLine = s.lines[maxIndex + 1];
                    }
                }

                const createTextRaw = (line: any) => {
                    if (!line?.text.trim()) return null;
                    const g = new TextGeometry(line.text, {
                        font: fonts[line.font],
                        size: line.size,
                        depth: line.depth || 0.6,
                        curveSegments: 4,
                        bevelEnabled: false,
                    });
                    g.computeBoundingBox();
                    const tw = g.boundingBox!.max.x - g.boundingBox!.min.x;
                    const th = g.boundingBox!.max.y - g.boundingBox!.min.y;
                    const cx = (g.boundingBox!.min.x + g.boundingBox!.max.x) / 2;
                    const cy = (g.boundingBox!.min.y + g.boundingBox!.max.y) / 2;
                    return { g, tw, th, cx, cy, line };
                };

                const rawTop = createTextRaw(topLine);
                const rawCenter = createTextRaw(nameLine);
                const rawBottom = createTextRaw(bottomLine);

                // --- 2. Calculate Dimensions & Margins ---
                let bw = s.shape.width || 180;
                let bh = s.shape.height || 88.8;
                let topBandH = 28;
                let botBandH = 22;
                let sideMargin = 8;
                let innerH = 30;

                const pad = s.shape.padding || 8;

                if (s.shape.autoSize) {
                    const topSize = rawTop ? rawTop.line.size : 0;
                    const centerSize = rawCenter ? rawCenter.line.size : 0;
                    const botSize = rawBottom ? rawBottom.line.size : 0;

                    let calcTopBand = rawTop ? topSize + pad * 2 : pad;
                    let calcBotBand = rawBottom ? botSize + pad * 2 : pad;
                    let calcInner = rawCenter ? centerSize + pad * 2 : 30;
                    
                    let calcBh = calcTopBand + calcBotBand + calcInner;
                    
                    const tabHeight = s.laceHole.enabled ? 8.75 : 0;
                    bh = Math.max(s.shape.height - tabHeight, calcBh);
                    
                    // Keep border bands strictly sized to the font + padding.
                    // Give any manually requested extra height to the inner white hole!
                    topBandH = calcTopBand;
                    botBandH = calcBotBand;
                    innerH = calcInner + (bh > calcBh ? bh - calcBh : 0);
                    
                    const wTop = rawTop ? rawTop.tw : 0;
                    const wCenter = rawCenter ? rawCenter.tw : 0;
                    const wBot = rawBottom ? rawBottom.tw : 0;
                    const maxTw = Math.max(wTop, wCenter, wBot);
                    
                    sideMargin = Math.max(8, pad);
                    let calcBw = maxTw + sideMargin * 2;
                    
                    bw = Math.max(s.shape.width, calcBw);
                    // Do not increase sideMargin if bw > calcBw. 
                    // Let the side borders stay strict to `pad`, allowing the white hole to absorb the extra width!
                } else {
                    const tabHeight = s.laceHole.enabled ? 8.75 : 0;
                    bh = Math.max(10, s.shape.height - tabHeight);
                    bw = Math.max(20, s.shape.width);
                    
                    const heightRatio = bh / 80;
                    const widthRatio = bw / 180;
                    topBandH = 28 * heightRatio;
                    botBandH = 22 * heightRatio;
                    sideMargin = 8 * widthRatio;
                    innerH = Math.max(1, bh - topBandH - botBandH);
                }

                const cornerR = s.shape.cornerRadius || 25;
                const baseThick = s.shape.baseThickness || 3.0;
                const frameThick = s.shape.topBorder || 1.6;

                // --- 3. Base Plate & Frame ---
                const rawBase = new THREE.ExtrudeGeometry(createDynamicBaseShape(bw, bh, cornerR), {
                    depth: baseThick,
                    bevelEnabled: false,
                    curveSegments: 16,
                });
                rawBase.translate(0, 0, -baseThick); // Top surface sits at Z=0
                rawBase.computeVertexNormals();
                setBaseGeo(rawBase);

                const rawFrame = new THREE.ExtrudeGeometry(
                    createDynamicFrameShape(bw, bh, cornerR, sideMargin, topBandH, botBandH, s.shape.innerRadius ?? 20),
                    {
                        depth: frameThick,
                        bevelEnabled: false,
                        curveSegments: 16,
                    }
                );
                rawFrame.translate(0, 0, 0.01); // 0.01mm micro-gap to prevent slicer layer sharing
                rawFrame.computeVertexNormals();
                setFrameGeo(rawFrame);

                // --- 4. Position Text Geometries ---
                const topTextY = bh / 2 - topBandH / 2;
                const botTextY = -bh / 2 + botBandH / 2;
                const centerTextY = (botBandH - topBandH) / 2; // Matches holeOffsetY exactly!

                if (rawTop) {
                    rawTop.g.translate(-rawTop.cx, topTextY - (rawTop.line.size * 0.35), frameThick + 0.02);
                    rawTop.g.computeVertexNormals();
                }
                if (rawCenter) {
                    rawCenter.g.translate(-rawCenter.cx, centerTextY - rawCenter.cy, 0.01);
                    rawCenter.g.computeVertexNormals();
                }
                if (rawBottom) {
                    rawBottom.g.translate(-rawBottom.cx, botTextY - (rawBottom.line.size * 0.35), frameThick + 0.02);
                    rawBottom.g.computeVertexNormals();
                }

                if (!active) return;

                // Finalize
                setCenterTextGeo(rawCenter ? rawCenter.g : null);

                const bannerGeos = [rawTop?.g, rawBottom?.g].filter(
                    (g) => !!g,
                ) as THREE.BufferGeometry[];
                if (bannerGeos.length > 0) {
                    const merged =
                        BufferGeometryUtils.mergeGeometries(bannerGeos);
                    merged.computeVertexNormals();
                    setBannerTextGeo(merged);
                } else {
                    setBannerTextGeo(null);
                }

                const maxD = Math.max(...s.lines.map((l) => l.depth || 0.6));
                const tabHeight = s.laceHole.enabled ? 8.75 : 0;
                onBoundsChange?.({
                    x: bw,
                    y: bh + tabHeight,
                    z: baseThick + frameThick + maxD,
                });
            } catch (e) {
                console.error("Design2 Error", e);
            }
        };

        generate();
        return () => {
            active = false;
        };
    }, [ds]);

    return (
        <Center disableZ>
            <group ref={meshRef}>
                {/* Layer 1: White Base Plate */}
                {baseGeo && (
                    <mesh geometry={baseGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.baseColor || "#ffffff"}
                            roughness={0.3}
                        />
                    </mesh>
                )}

                {/* Layer 2: Brown Frame */}
                {frameGeo && (
                    <mesh geometry={frameGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            roughness={0.3}
                        />
                    </mesh>
                )}

                {/* Center Text (Inside cutout, sits on white base, colored brown) */}
                {centerTextGeo && (
                    <mesh geometry={centerTextGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            roughness={0.25}
                            metalness={0.05}
                        />
                    </mesh>
                )}

                {/* Banner Texts (Sits elevated on brown frame, colored white) */}
                {bannerTextGeo && (
                    <mesh geometry={bannerTextGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.baseColor || "#ffffff"}
                            roughness={0.25}
                            metalness={0.05}
                        />
                    </mesh>
                )}
            </group>
        </Center>
    );
};

const Scene2: React.FC<SceneProps> = (props) => {
    const baseThickness = props.state.shape.baseThickness || 3.0;
    const floorZ = -baseThickness;

    return (
        <Canvas shadows camera={{ position: [0, -120, 90], fov: 40 }}>
            <color attach="background" args={["#f8f9fa"]} />
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, -10, 30]}
                intensity={1.2}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-10, 10, -10]} intensity={0.4} />

            <Generator2 {...props} />

            <mesh position={[0, 0, floorZ - 0.05]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <shadowMaterial transparent opacity={0.15} />
            </mesh>

            <Grid
                infiniteGrid
                fadeDistance={200}
                fadeStrength={1.5}
                sectionColor="#94a3b8"
                cellColor="#cbd5e1"
                sectionSize={10}
                cellSize={2}
                position={[0, 0, floorZ]}
                rotation={[Math.PI / 2, 0, 0]}
            />

            <OrbitControls makeDefault minDistance={10} maxDistance={400} />
            <Environment preset="city" />
        </Canvas>
    );
};

export default Scene2;
