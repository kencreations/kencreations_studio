import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { Evaluator, Brush, ADDITION } from "three-bvh-csg";
import type { AppState } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { createTextGeometryWithSpacing } from "../utils/textEngine";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import {
    createDynamicBaseShape,
    createDynamicFrameShape,
} from "../utils/GeometryShapes";

interface SceneProps {
    state: AppState;
    meshRef: React.RefObject<THREE.Group | null>;
    onBoundsChange?: (bounds: { x: number; y: number; z: number }) => void;
}

const Generator2: React.FC<SceneProps> = ({
    state,
    meshRef,
    onBoundsChange,
}) => {
    // We only want ONE final, melted mesh to guarantee a perfect STL slice
    const [mergedMesh, setMergedMesh] = useState<{
        geometry: THREE.BufferGeometry;
        material: THREE.Material | THREE.Material[];
    } | null>(null);

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

                let topLine: any = null;
                let nameLine: any = null;
                let bottomLine: any = null;

                if (s.lines.length > 0) {
                    let maxIndex = 0;
                    let maxSize = s.lines[0].size;
                    for (let i = 1; i < s.lines.length; i++) {
                        if (s.lines[i].size > maxSize) {
                            maxSize = s.lines[i].size;
                            maxIndex = i;
                        }
                    }
                    nameLine = s.lines[maxIndex];
                    if (maxIndex > 0) topLine = s.lines[0];
                    if (maxIndex < s.lines.length - 1)
                        bottomLine = s.lines[maxIndex + 1];
                }

                // Helper: Adds 0.1mm overlap so the boolean math can fuse surfaces securely
                const createTextRaw = (line: any) => {
                    if (!line?.text.trim()) return null;
                    let g = createTextGeometryWithSpacing(
                        line.text,
                        fonts[line.font],
                        line.size,
                        (line.depth || 0.6) + 0.1, // Extrude 0.1mm deeper for perfect fusion
                        line.letterSpacing || 0,
                    );

                    g = BufferGeometryUtils.mergeVertices(g);
                    g.computeBoundingBox();

                    const tw = g.boundingBox!.max.x - g.boundingBox!.min.x;
                    const cx =
                        (g.boundingBox!.min.x + g.boundingBox!.max.x) / 2;
                    const cy =
                        (g.boundingBox!.min.y + g.boundingBox!.max.y) / 2;
                    return { g, tw, cx, cy, line };
                };

                const rawTop = createTextRaw(topLine);
                const rawCenter = createTextRaw(nameLine);
                const rawBottom = createTextRaw(bottomLine);

                let bw = s.shape.width || 180;
                let bh = s.shape.height || 88.8;
                let topBandH = 28;
                let botBandH = 22;
                let sideMargin = 8;
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

                    topBandH = calcTopBand;
                    botBandH = calcBotBand;

                    const maxTw = Math.max(
                        rawTop ? rawTop.tw : 0,
                        rawCenter ? rawCenter.tw : 0,
                        rawBottom ? rawBottom.tw : 0,
                    );
                    sideMargin = Math.max(8, pad);
                    bw = Math.max(s.shape.width, maxTw + sideMargin * 2);
                } else {
                    const tabHeight = s.laceHole.enabled ? 8.75 : 0;
                    bh = Math.max(10, s.shape.height - tabHeight);
                    bw = Math.max(20, s.shape.width);
                    const heightRatio = bh / 80;
                    const widthRatio = bw / 180;
                    topBandH = 28 * heightRatio;
                    botBandH = 22 * heightRatio;
                    sideMargin = 8 * widthRatio;
                }

                const cornerR = s.shape.cornerRadius || 25;
                const baseThick = s.shape.baseThickness || 3.0;
                const frameThick = s.shape.topBorder || 1.6;

                // 1. Baseplate (Z from 0 up to baseThick)
                let rawBase = new THREE.ExtrudeGeometry(
                    createDynamicBaseShape(bw, bh, cornerR),
                    {
                        depth: baseThick,
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawBase.translate(0, 0, 0);
                rawBase = BufferGeometryUtils.mergeVertices(rawBase);
                rawBase.computeVertexNormals();

                // 2. Frame (Starts 0.1mm inside baseplate to fuse perfectly)
                let rawFrame = new THREE.ExtrudeGeometry(
                    createDynamicFrameShape(
                        bw,
                        bh,
                        cornerR,
                        sideMargin,
                        topBandH,
                        botBandH,
                        s.shape.innerRadius ?? 20,
                    ),
                    {
                        depth: frameThick + 0.1,
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawFrame.translate(0, 0, baseThick - 0.1);
                rawFrame = BufferGeometryUtils.mergeVertices(rawFrame);
                rawFrame.computeVertexNormals();

                const topTextY = bh / 2 - topBandH / 2;
                const botTextY = -bh / 2 + botBandH / 2;
                const centerTextY = (botBandH - topBandH) / 2;

                // 3. Texts (Sink 0.1mm into their respective surfaces to fuse perfectly)
                if (rawTop) {
                    rawTop.g.translate(
                        -rawTop.cx,
                        topTextY - rawTop.line.size * 0.35,
                        baseThick + frameThick - 0.1,
                    );
                    rawTop.g.computeVertexNormals();
                }
                if (rawCenter) {
                    rawCenter.g.translate(
                        -rawCenter.cx,
                        centerTextY - rawCenter.cy,
                        baseThick - 0.1,
                    );
                    rawCenter.g.computeVertexNormals();
                }
                if (rawBottom) {
                    rawBottom.g.translate(
                        -rawBottom.cx,
                        botTextY - rawBottom.line.size * 0.35,
                        baseThick + frameThick - 0.1,
                    );
                    rawBottom.g.computeVertexNormals();
                }

                // --- 4. ACTUAL BOOLEAN FUSION ---
                // This is the step that was missing. It deletes all internal hidden faces.
                const ev = new Evaluator();
                ev.useGroups = true; // Keeps the material colors visible in your web app

                const matBase = new THREE.MeshStandardMaterial({
                    color: ds.baseColor || "#ffffff",
                    roughness: 0.3,
                });
                const matFrame = new THREE.MeshStandardMaterial({
                    color: ds.borderColor || "#4a3525",
                    roughness: 0.3,
                });

                // Start by brushing the Baseplate
                let finalBrush = new Brush(rawBase, matBase);
                finalBrush.updateMatrixWorld();

                // Fuse the Frame into the Baseplate
                const frameBrush = new Brush(rawFrame, matFrame);
                frameBrush.updateMatrixWorld();
                finalBrush = ev.evaluate(finalBrush, frameBrush, ADDITION);

                // Fuse the Center Text
                if (rawCenter) {
                    const matCenter = new THREE.MeshStandardMaterial({
                        color: nameLine?.color || ds.borderColor,
                        roughness: 0.25,
                        metalness: 0.05,
                    });
                    const centerBrush = new Brush(rawCenter.g, matCenter);
                    centerBrush.updateMatrixWorld();
                    finalBrush = ev.evaluate(finalBrush, centerBrush, ADDITION);
                }

                // Fuse the Top Text
                if (rawTop) {
                    const matTop = new THREE.MeshStandardMaterial({
                        color: topLine?.color || ds.baseColor,
                        roughness: 0.25,
                        metalness: 0.05,
                    });
                    const topBrush = new Brush(rawTop.g, matTop);
                    topBrush.updateMatrixWorld();
                    finalBrush = ev.evaluate(finalBrush, topBrush, ADDITION);
                }

                // Fuse the Bottom Text
                if (rawBottom) {
                    const matBot = new THREE.MeshStandardMaterial({
                        color: bottomLine?.color || ds.baseColor,
                        roughness: 0.25,
                        metalness: 0.05,
                    });
                    const botBrush = new Brush(rawBottom.g, matBot);
                    botBrush.updateMatrixWorld();
                    finalBrush = ev.evaluate(finalBrush, botBrush, ADDITION);
                }

                if (!active) return;

                // Push ONE single, fused mesh to the React state
                setMergedMesh({
                    geometry: finalBrush.geometry,
                    material: finalBrush.material,
                });

                const maxD = Math.max(...s.lines.map((l) => l.depth || 0.6));
                const tabHeight = s.laceHole.enabled ? 8.75 : 0;
                onBoundsChange?.({
                    x: bw,
                    y: bh + tabHeight,
                    z: baseThick + frameThick + maxD,
                });
            } catch (e) {
                console.error("Design2 CSG Error:", e);
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
                {mergedMesh && (
                    <mesh
                        geometry={mergedMesh.geometry}
                        material={mergedMesh.material}
                        castShadow
                        receiveShadow
                    />
                )}
            </group>
        </Center>
    );
};

const Scene2: React.FC<SceneProps> = (props) => {
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

            <mesh position={[0, 0, -0.05]} receiveShadow>
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
                position={[0, 0, 0]}
                rotation={[Math.PI / 2, 0, 0]}
            />
            <OrbitControls makeDefault minDistance={10} maxDistance={400} />
            <Environment preset="city" />
        </Canvas>
    );
};

export default Scene2;
