import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
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
    const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
    const [frameGeo, setFrameGeo] = useState<THREE.BufferGeometry | null>(null);
    const [topText, setTopText] = useState<{
        g: THREE.BufferGeometry;
        color: string;
    } | null>(null);
    const [centerText, setCenterText] = useState<{
        g: THREE.BufferGeometry;
        color: string;
    } | null>(null);
    const [bottomText, setBottomText] = useState<{
        g: THREE.BufferGeometry;
        color: string;
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

                // FIX 1: Exact geometry depth, NO overlaps.
                const createTextRaw = (line: any) => {
                    if (!line?.text.trim()) return null;
                    let g = createTextGeometryWithSpacing(
                        line.text,
                        fonts[line.font],
                        line.size,
                        line.depth || 0.6, // Exact depth, no +0.1mm overlap
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

                // --- Calculate Dimensions ---
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

                // FIX 2: Exact Extrusions, perfectly flush
                let rawBase = new THREE.ExtrudeGeometry(
                    createDynamicBaseShape(bw, bh, cornerR),
                    {
                        depth: baseThick,
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawBase.translate(0, 0, -baseThick); // Sits beneath Z=0
                rawBase = BufferGeometryUtils.mergeVertices(rawBase);
                rawBase.computeVertexNormals();
                setBaseGeo(rawBase);

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
                        depth: frameThick, // Exact thickness
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawFrame.translate(0, 0, 0); // Sits exactly flush on top of Baseplate (Z=0)
                rawFrame = BufferGeometryUtils.mergeVertices(rawFrame);
                rawFrame.computeVertexNormals();
                setFrameGeo(rawFrame);

                const topTextY = bh / 2 - topBandH / 2;
                const botTextY = -bh / 2 + botBandH / 2;
                const centerTextY = (botBandH - topBandH) / 2;

                // FIX 3: Place text exactly on the surfaces, no sinking.
                if (rawTop) {
                    rawTop.g.translate(
                        -rawTop.cx,
                        topTextY - rawTop.line.size * 0.35,
                        frameThick,
                    ); // Flush on Frame
                    rawTop.g.computeVertexNormals();
                }
                if (rawCenter) {
                    rawCenter.g.translate(
                        -rawCenter.cx,
                        centerTextY - rawCenter.cy,
                        0,
                    ); // Flush on Baseplate
                    rawCenter.g.computeVertexNormals();
                }
                if (rawBottom) {
                    rawBottom.g.translate(
                        -rawBottom.cx,
                        botTextY - rawBottom.line.size * 0.35,
                        frameThick,
                    ); // Flush on Frame
                    rawBottom.g.computeVertexNormals();
                }

                if (!active) return;

                setTopText(
                    rawTop
                        ? { g: rawTop.g, color: topLine?.color || ds.baseColor }
                        : null,
                );
                setCenterText(
                    rawCenter
                        ? {
                              g: rawCenter.g,
                              color: nameLine?.color || ds.borderColor,
                          }
                        : null,
                );
                setBottomText(
                    rawBottom
                        ? {
                              g: rawBottom.g,
                              color: bottomLine?.color || ds.baseColor,
                          }
                        : null,
                );

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
                {/* FIX 4: Explicit names so Bambu Studio labels them correctly */}
                {baseGeo && (
                    <mesh
                        name="Baseplate"
                        geometry={baseGeo}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={ds.baseColor || "#ffffff"}
                            roughness={0.3}
                        />
                    </mesh>
                )}
                {frameGeo && (
                    <mesh
                        name="Frame"
                        geometry={frameGeo}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            roughness={0.3}
                        />
                    </mesh>
                )}
                {centerText && (
                    <mesh
                        name="Center_Text"
                        geometry={centerText.g}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={centerText.color}
                            roughness={0.25}
                            metalness={0.05}
                        />
                    </mesh>
                )}
                {topText && (
                    <mesh
                        name="Top_Text"
                        geometry={topText.g}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={topText.color}
                            roughness={0.25}
                            metalness={0.05}
                        />
                    </mesh>
                )}
                {bottomText && (
                    <mesh
                        name="Bottom_Text"
                        geometry={bottomText.g}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={bottomText.color}
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
