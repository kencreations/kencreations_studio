import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Evaluator, Brush, SUBTRACTION, ADDITION } from "three-bvh-csg";
import type { AppState } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { createTextGeometryWithSpacing } from "../utils/textEngine";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

interface SceneProps {
    state: AppState;
    meshRef: React.RefObject<THREE.Group | null>;
    onBoundsChange?: (bounds: { x: number; y: number; z: number }) => void;
    activeLayer?: number;
    totalLayers?: number;
    bounds?: { x: number; y: number; z: number };
    slicerPathProgress?: number;
}

import {
    createDynamicBaseShape,
    createDynamicFrameShape,
} from "../utils/GeometryShapes";

const Generator2: React.FC<SceneProps> = ({
    state,
    meshRef,
    onBoundsChange,
    activeLayer,
    totalLayers,
    bounds,
    slicerPathProgress,
}) => {
    const baseThickness = state.shape.baseThickness || 3.0;
    const zHeight = bounds?.z || 6.0;
    const floorZ = -baseThickness;
    
    const cutoffZ = React.useMemo(() => {
        if (activeLayer === undefined || totalLayers === undefined) return 0;
        return floorZ + (activeLayer / totalLayers) * zHeight;
    }, [activeLayer, totalLayers, floorZ, zHeight]);

    const clippingPlanes = React.useMemo(() => {
        if (activeLayer === undefined || totalLayers === undefined || activeLayer >= totalLayers) {
            return [];
        }
        return [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutoffZ)];
    }, [activeLayer, totalLayers, cutoffZ]);

    const ghostClippingPlanes = React.useMemo(() => {
        if (activeLayer === undefined || totalLayers === undefined || activeLayer >= totalLayers) {
            return [];
        }
        return [new THREE.Plane(new THREE.Vector3(0, 0, 1), -cutoffZ)];
    }, [activeLayer, totalLayers, cutoffZ]);

    const striatedTexture = React.useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1, 26);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 26, 1, 6);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 100);
        return texture;
    }, []);

    const toolpathTexture = React.useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 512);
        
        const progressVal = slicerPathProgress !== undefined ? slicerPathProgress / 100 : 1.0;
        
        // 1. Outer Red Perimeter (drawn between 0.0 and 0.15 progress)
        if (progressVal > 0) {
            const p1 = Math.min(1.0, progressVal / 0.15);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 10;
            if (p1 >= 1.0) {
                ctx.strokeRect(16, 16, 480, 480);
            } else {
                ctx.beginPath();
                const totalLen = 480 * 4;
                const drawLen = totalLen * p1;
                ctx.moveTo(16, 16);
                let currentLen = 0;
                if (currentLen + 480 <= drawLen) {
                    ctx.lineTo(496, 16);
                    currentLen += 480;
                } else {
                    ctx.lineTo(16 + (drawLen - currentLen), 16);
                    currentLen = drawLen;
                }
                if (currentLen < drawLen) {
                    if (currentLen + 480 <= drawLen) {
                        ctx.lineTo(496, 496);
                        currentLen += 480;
                    } else {
                        ctx.lineTo(496, 16 + (drawLen - currentLen));
                        currentLen = drawLen;
                    }
                }
                if (currentLen < drawLen) {
                    if (currentLen + 480 <= drawLen) {
                        ctx.lineTo(16, 496);
                        currentLen += 480;
                    } else {
                        ctx.lineTo(496 - (drawLen - currentLen), 496);
                        currentLen = drawLen;
                    }
                }
                if (currentLen < drawLen) {
                    ctx.lineTo(16, 496 - (drawLen - currentLen));
                }
                ctx.stroke();
            }
        }
        
        // 2. Inner Green Perimeters (drawn between 0.15 and 0.30 progress)
        if (progressVal > 0.15) {
            const p2 = Math.min(1.0, (progressVal - 0.15) / 0.15);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 8;
            
            if (p2 >= 0.5) {
                ctx.strokeRect(28, 28, 456, 456);
            } else {
                ctx.beginPath();
                const totalLen = 456 * 4;
                const drawLen = totalLen * (p2 * 2);
                ctx.moveTo(28, 28);
                let cur = 0;
                if (cur + 456 <= drawLen) { ctx.lineTo(484, 28); cur += 456; } else { ctx.lineTo(28 + (drawLen - cur), 28); cur = drawLen; }
                if (cur < drawLen) { if (cur + 456 <= drawLen) { ctx.lineTo(484, 484); cur += 456; } else { ctx.lineTo(484, 28 + (drawLen - cur)); cur = drawLen; } }
                if (cur < drawLen) { if (cur + 456 <= drawLen) { ctx.lineTo(28, 484); cur += 456; } else { ctx.lineTo(484 - (drawLen - cur), 484); cur = drawLen; } }
                if (cur < drawLen) { ctx.lineTo(28, 484 - (drawLen - cur)); }
                ctx.stroke();
            }
            
            if (p2 >= 1.0) {
                ctx.strokeRect(36, 36, 440, 440);
            } else if (p2 > 0.5) {
                const subP = (p2 - 0.5) * 2;
                ctx.beginPath();
                const totalLen = 440 * 4;
                const drawLen = totalLen * subP;
                ctx.moveTo(36, 36);
                let cur = 0;
                if (cur + 440 <= drawLen) { ctx.lineTo(476, 36); cur += 440; } else { ctx.lineTo(36 + (drawLen - cur), 36); cur = drawLen; }
                if (cur < drawLen) { if (cur + 440 <= drawLen) { ctx.lineTo(476, 476); cur += 440; } else { ctx.lineTo(476, 36 + (drawLen - cur)); cur = drawLen; } }
                if (cur < drawLen) { if (cur + 440 <= drawLen) { ctx.lineTo(36, 476); cur += 440; } else { ctx.lineTo(476 - (drawLen - cur), 476); cur = drawLen; } }
                if (cur < drawLen) { ctx.lineTo(36, 476 - (drawLen - cur)); }
                ctx.stroke();
            }
        }
        
        // 3. Orange Infill (drawn between 0.30 and 1.0 progress)
        if (progressVal > 0.30) {
            const infillP = Math.min(1.0, (progressVal - 0.30) / 0.70);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            
            const infillPattern = state.slicerSettings?.infillPattern || 'Gyroid';
            if (infillPattern === 'Gyroid') {
                const yLines = [];
                for (let y = 50; y < 460; y += 40) {
                    yLines.push(y);
                }
                const totalInfillPoints = yLines.length * 28;
                const drawPointsCount = Math.ceil(totalInfillPoints * infillP);
                
                let currentPointIdx = 0;
                for (let y of yLines) {
                    if (currentPointIdx >= drawPointsCount) break;
                    ctx.beginPath();
                    let isFirst = true;
                    for (let x = 50; x <= 455; x += 15) {
                        if (currentPointIdx >= drawPointsCount) break;
                        const wave = Math.sin((x / 30) + (y / 30)) * 15;
                        if (isFirst) {
                            ctx.moveTo(x, y + wave);
                            isFirst = false;
                        } else {
                            ctx.lineTo(x, y + wave);
                        }
                        currentPointIdx++;
                    }
                    ctx.stroke();
                }
            } else {
                const gridLines = [];
                for (let i = 50; i < 460; i += 50) {
                    gridLines.push({ type: 'v', val: i });
                    gridLines.push({ type: 'h', val: i });
                }
                const drawCount = Math.ceil(gridLines.length * infillP);
                for (let idx = 0; idx < drawCount; idx++) {
                    const line = gridLines[idx];
                    ctx.beginPath();
                    if (line.type === 'v') {
                        ctx.moveTo(line.val, 50);
                        ctx.lineTo(line.val, 460);
                    } else {
                        ctx.moveTo(50, line.val);
                        ctx.lineTo(460, line.val);
                    }
                    ctx.stroke();
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }, [state.slicerSettings?.infillPattern, slicerPathProgress]);

    const bw = bounds?.x || state.shape.width || 180;
    const tabHeight = state.laceHole.enabled ? 8.75 : 0;
    const bh = (bounds?.y ? bounds.y - tabHeight : state.shape.height - tabHeight) || 88.8;
    const cornerR = state.shape.cornerRadius || 25;
    
    const baseShape = React.useMemo(() => {
        return createDynamicBaseShape(bw, bh, cornerR);
    }, [bw, bh, cornerR]);

    const frameShape = React.useMemo(() => {
        let topBandH = 28;
        let botBandH = 22;
        let sideMargin = 8;
        const pad = state.shape.padding || 8;

        if (state.shape.autoSize) {
            let calcTopBand = pad + 15;
            let calcBotBand = pad + 15;
            topBandH = calcTopBand;
            botBandH = calcBotBand;
            sideMargin = pad;
        } else {
            const heightRatio = bh / 80;
            const widthRatio = bw / 180;
            topBandH = 28 * heightRatio;
            botBandH = 22 * heightRatio;
            sideMargin = 8 * widthRatio;
        }

        return createDynamicFrameShape(
            bw,
            bh,
            cornerR,
            sideMargin,
            topBandH,
            botBandH,
            state.shape.innerRadius ?? 20,
        );
    }, [bw, bh, cornerR, state.shape.padding, state.shape.autoSize, state.shape.innerRadius]);
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
                    const g = createTextGeometryWithSpacing(
                        line.text,
                        fonts[line.font],
                        line.size,
                        line.depth || 0.6,
                        line.letterSpacing || 0,
                    );
                    g.computeBoundingBox();
                    const tw = g.boundingBox!.max.x - g.boundingBox!.min.x;
                    const th = g.boundingBox!.max.y - g.boundingBox!.min.y;
                    const cx =
                        (g.boundingBox!.min.x + g.boundingBox!.max.x) / 2;
                    const cy =
                        (g.boundingBox!.min.y + g.boundingBox!.max.y) / 2;
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
                const rawBase = new THREE.ExtrudeGeometry(
                    createDynamicBaseShape(bw, bh, cornerR),
                    {
                        depth: baseThick,
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawBase.translate(0, 0, -baseThick); // Top surface sits at Z=0
                rawBase.computeVertexNormals();
                setBaseGeo(rawBase);

                const rawFrame = new THREE.ExtrudeGeometry(
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
                        depth: frameThick,
                        bevelEnabled: false,
                        curveSegments: 16,
                    },
                );
                rawFrame.translate(0, 0, -0.1); // Enforce 0.1mm physical overlap with the base plate to prevent slicer gaps
                rawFrame.computeVertexNormals();
                setFrameGeo(rawFrame);

                // --- 4. Position Text Geometries ---
                const topTextY = bh / 2 - topBandH / 2;
                const botTextY = -bh / 2 + botBandH / 2;
                const centerTextY = (botBandH - topBandH) / 2; // Matches holeOffsetY exactly!

                if (rawTop) {
                    rawTop.g.translate(
                        -rawTop.cx,
                        topTextY - rawTop.line.size * 0.35,
                        frameThick - 0.2, // Enforce 0.1mm physical overlap with the top frame
                    );
                    rawTop.g.computeVertexNormals();
                }
                if (rawCenter) {
                    rawCenter.g.translate(
                        -rawCenter.cx,
                        centerTextY - rawCenter.cy,
                        -0.1, // Enforce 0.1mm physical overlap with the base plate
                    );
                    rawCenter.g.computeVertexNormals();
                }
                if (rawBottom) {
                    rawBottom.g.translate(
                        -rawBottom.cx,
                        botTextY - rawBottom.line.size * 0.35,
                        frameThick - 0.2, // Enforce 0.1mm physical overlap with the bottom frame
                    );
                    rawBottom.g.computeVertexNormals();
                }

                if (!active) return;

                // Finalize
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
                {/* 1. Main Sliced (Clipped) Model with Striated layers */}
                {baseGeo && (
                    <mesh geometry={baseGeo} name="base" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.baseColor || "#ffffff"}
                            map={striatedTexture}
                            roughness={0.35}
                            flatShading={true}
                            side={THREE.DoubleSide}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {frameGeo && (
                    <mesh geometry={frameGeo} name="border" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            map={striatedTexture}
                            roughness={0.35}
                            flatShading={true}
                            side={THREE.DoubleSide}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {centerText && (
                    <mesh geometry={centerText.g} name="text" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={centerText.color}
                            map={striatedTexture}
                            roughness={0.3}
                            metalness={0.05}
                            flatShading={true}
                            side={THREE.DoubleSide}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {topText && (
                    <mesh geometry={topText.g} name="text" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={topText.color}
                            map={striatedTexture}
                            roughness={0.3}
                            metalness={0.05}
                            flatShading={true}
                            side={THREE.DoubleSide}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {bottomText && (
                    <mesh geometry={bottomText.g} name="text" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={bottomText.color}
                            map={striatedTexture}
                            roughness={0.3}
                            metalness={0.05}
                            flatShading={true}
                            side={THREE.DoubleSide}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {/* 2. Flat Solid Caps on Slicing cutoffZ Plane */}
                {activeLayer !== undefined && activeLayer < totalLayers && baseShape && (
                    <mesh position={[0, 0, cutoffZ]} rotation={[0, 0, 0]} receiveShadow>
                        <shapeGeometry args={[baseShape]} />
                        <meshStandardMaterial
                            map={toolpathTexture}
                            roughness={0.4}
                            metalness={0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}

                {activeLayer !== undefined && activeLayer < totalLayers && frameShape && cutoffZ > -0.1 && (
                    <mesh position={[0, 0, cutoffZ]} rotation={[0, 0, 0]} castShadow>
                        <shapeGeometry args={[frameShape]} />
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            roughness={0.4}
                            metalness={0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}

                {/* 3. Ghosted Upper Part (Translucent silhouette above cutoffZ) */}
                {baseGeo && activeLayer !== undefined && activeLayer < totalLayers && (
                    <mesh geometry={baseGeo} name="base-ghost">
                        <meshStandardMaterial
                            color={ds.baseColor || "#ffffff"}
                            roughness={0.5}
                            transparent={true}
                            opacity={0.12}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            clippingPlanes={ghostClippingPlanes}
                        />
                    </mesh>
                )}

                {frameGeo && activeLayer !== undefined && activeLayer < totalLayers && (
                    <mesh geometry={frameGeo} name="border-ghost">
                        <meshStandardMaterial
                            color={ds.borderColor || "#4a3525"}
                            roughness={0.5}
                            transparent={true}
                            opacity={0.12}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            clippingPlanes={ghostClippingPlanes}
                        />
                    </mesh>
                )}

                {centerText && activeLayer !== undefined && activeLayer < totalLayers && (
                    <mesh geometry={centerText.g} name="text-ghost">
                        <meshStandardMaterial
                            color={centerText.color}
                            roughness={0.5}
                            transparent={true}
                            opacity={0.12}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            clippingPlanes={ghostClippingPlanes}
                        />
                    </mesh>
                )}

                {topText && activeLayer !== undefined && activeLayer < totalLayers && (
                    <mesh geometry={topText.g} name="text-ghost">
                        <meshStandardMaterial
                            color={topText.color}
                            roughness={0.5}
                            transparent={true}
                            opacity={0.12}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            clippingPlanes={ghostClippingPlanes}
                        />
                    </mesh>
                )}

                {bottomText && activeLayer !== undefined && activeLayer < totalLayers && (
                    <mesh geometry={bottomText.g} name="text-ghost">
                        <meshStandardMaterial
                            color={bottomText.color}
                            roughness={0.5}
                            transparent={true}
                            opacity={0.12}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                            clippingPlanes={ghostClippingPlanes}
                        />
                    </mesh>
                )}
            </group>
        </Center>
    );
};

interface NozzleProps {
    bounds?: { x: number; y: number; z: number };
    activeLayer?: number;
    totalLayers?: number;
    slicerPathProgress?: number;
    floorZ: number;
}

const PrintNozzle: React.FC<NozzleProps> = ({
    bounds,
    activeLayer,
    totalLayers,
    slicerPathProgress,
    floorZ,
}) => {
    if (activeLayer === undefined || totalLayers === undefined) return null;

    const zHeight = bounds?.z || 4.5;
    const width = bounds?.x || 75;
    const height = bounds?.y || 40;
    
    const nozzleZ = floorZ + (activeLayer / totalLayers) * zHeight;
    const t = (slicerPathProgress || 100) / 100;
    
    // FDM Toolpath Path Generation: 30% outer shell, 70% infill raster
    let nozzleX = 0;
    let nozzleY = 0;
    
    if (t < 0.3) {
        const perimeterT = t / 0.3;
        const angle = perimeterT * Math.PI * 2;
        nozzleX = (Math.cos(angle) * width) / 2;
        nozzleY = (Math.sin(angle) * height) / 2;
    } else {
        const infillT = (t - 0.3) / 0.7;
        const numScans = 10;
        const scanIndex = Math.floor(infillT * numScans);
        const scanLineT = (infillT * numScans) % 1;
        const currentX = -width / 2 + (scanIndex / Math.max(1, numScans - 1)) * width;
        const startY = -height / 2;
        const endY = height / 2;
        
        nozzleX = currentX;
        nozzleY = scanIndex % 2 === 0 ? startY + scanLineT * (endY - startY) : endY - scanLineT * (endY - startY);
    }

    return (
        <group position={[nozzleX, nozzleY, nozzleZ]}>
            {/* The heated print head tip (cone) */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 8]}>
                <coneGeometry args={[3, 16, 16]} />
                <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
            </mesh>
            {/* Glowing brass tip */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0.5]}>
                <coneGeometry args={[0.8, 1, 12]} />
                <meshStandardMaterial color="#ca8a04" roughness={0.2} metalness={0.9} emissive="#caca24" emissiveIntensity={0.6} />
            </mesh>
            {/* Extremely hot heated filament node */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.4, 8, 8]} />
                <meshBasicMaterial color="#ff7800" />
            </mesh>
            {/* Tip point light to illuminate the layered plastic */}
            <pointLight distance={15} intensity={2.0} color="#ffaa00" />
        </group>
    );
};

const Scene2: React.FC<SceneProps> = (props) => {
    const baseThickness = props.state.shape.baseThickness || 3.0;
    const floorZ = -baseThickness;

    return (
        <Canvas shadows camera={{ position: [0, -120, 90], fov: 40 }} gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}>
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

            {props.activeLayer !== undefined && props.totalLayers !== undefined && (
                <PrintNozzle
                    bounds={props.bounds}
                    activeLayer={props.activeLayer}
                    totalLayers={props.totalLayers}
                    slicerPathProgress={props.slicerPathProgress}
                    floorZ={floorZ}
                />
            )}

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
