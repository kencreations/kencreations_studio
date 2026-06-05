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

function createBaseShape(w: number, h: number, r: number) {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    const rSafe = Math.min(r, hw, hh);

    if (rSafe <= 0) {
        shape.moveTo(-hw, -hh);
        shape.lineTo(hw, -hh);
        shape.lineTo(hw, hh);
        shape.lineTo(-hw, hh);
        shape.lineTo(-hw, -hh);
        return shape;
    }
    shape.moveTo(-hw + rSafe, hh);
    shape.lineTo(hw - rSafe, hh);
    shape.absarc(hw - rSafe, hh - rSafe, rSafe, Math.PI / 2, 0, true);
    shape.lineTo(hw, -hh + rSafe);
    shape.absarc(hw - rSafe, -hh + rSafe, rSafe, 0, -Math.PI / 2, true);
    shape.lineTo(-hw + rSafe, -hh);
    shape.absarc(-hw + rSafe, -hh + rSafe, rSafe, -Math.PI / 2, -Math.PI, true);
    shape.lineTo(-hw, hh - rSafe);
    shape.absarc(-hw + rSafe, hh - rSafe, rSafe, -Math.PI, -Math.PI * 1.5, true);
    return shape;
}

const Generator3: React.FC<SceneProps> = ({
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
    const floorZ = -baseThickness / 2;
    
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

    const bw = bounds?.x || state.shape.width || 120;
    const bh = bounds?.y || state.shape.height || 60;
    
    const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
    const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(null);
    const [textGeos, setTextGeos] = useState<{ g: THREE.BufferGeometry; color: string }[]>([]);
    
    const debouncedState = useDebounce(state, 200);
    const surfaceEpsilon = 0.08;

    useEffect(() => {
        let active = true;
        const s = debouncedState;
        
        const generate = async () => {
            const fontLoader = new FontLoader();
            const ttfLoader = new TTFLoader();
            try {
                const fontUrls = [...new Set(s.lines.map((l) => l.font))];
                const loadedFonts: Record<string, Font> = {};
                for (const url of fontUrls) {
                    if (url.endsWith(".ttf")) {
                        loadedFonts[url] = await new Promise<Font>((res, rej) => {
                            ttfLoader.load(url, (json) => res(fontLoader.parse(json)), undefined, rej);
                        });
                    } else {
                        loadedFonts[url] = await new Promise<Font>((res, rej) =>
                            fontLoader.load(url, res, undefined, rej)
                        );
                    }
                }

                if (!active) return;
                const evaluator = new Evaluator();
                
                // 1. Calculate base bounds & text offsets
                const textGeometries: THREE.BufferGeometry[] = [];
                let maxTextWidth = 0;
                
                const lineGeometries: {
                    line: any;
                    geo: THREE.BufferGeometry;
                    tw: number;
                    minX: number;
                    maxX: number;
                    minY: number;
                    maxY: number;
                    th: number;
                }[] = [];

                for (const line of s.lines) {
                    if (!line.text.trim()) continue;
                    const geo = createTextGeometryWithSpacing(
                        line.text,
                        loadedFonts[line.font],
                        line.size,
                        line.depth,
                        line.letterSpacing || 0
                    );
                    geo.computeBoundingBox();
                    const b = geo.boundingBox!;
                    const tw = b.max.x - b.min.x;
                    const th = b.max.y - b.min.y;
                    maxTextWidth = Math.max(maxTextWidth, tw);
                    lineGeometries.push({
                        line,
                        geo,
                        tw,
                        minX: b.min.x,
                        maxX: b.max.x,
                        minY: b.min.y,
                        maxY: b.max.y,
                        th,
                    });
                }

                const totalTextHeight =
                    lineGeometries.reduce((sum, item) => sum + item.th, 0) +
                    Math.max(0, lineGeometries.length - 1) * s.lineSpacing;

                let calculatedW = s.shape.width;
                let calculatedH = s.shape.height;
                const holeOffsetRadius = s.laceHole.enabled ? s.laceHole.width / 2 : 0;
                const holeSpaceWidth = s.laceHole.enabled ? (s.laceHole.topMargin + s.laceHole.width + s.shape.padding) : 0;

                if (s.shape.autoSize) {
                    calculatedW = maxTextWidth + s.shape.padding * 2 + holeSpaceWidth;
                    calculatedH = totalTextHeight + s.shape.padding * 2;
                }

                // Center vertical alignment of text
                const textCenterY = 0;
                let currentTop = textCenterY + totalTextHeight / 2;

                // Shift texts horizontally to the right to make beautiful balanced space for the left-aligned slot!
                const textXOffset = s.laceHole.enabled ? holeSpaceWidth / 2.5 : 0;

                for (const { geo, minX, maxX, maxY, th } of lineGeometries) {
                    const offsetX = -((minX + maxX) / 2) + textXOffset;
                    const offsetY = currentTop - maxY;
                    geo.translate(
                        offsetX,
                        offsetY,
                        s.shape.baseThickness / 2 - surfaceEpsilon
                    );
                    textGeometries.push(geo);
                    currentTop -= th + s.lineSpacing;
                }

                // 2. Extrude Base Plate
                const outerShape = createBaseShape(calculatedW, calculatedH, s.shape.cornerRadius);
                const rawBaseGeo = new THREE.ExtrudeGeometry(outerShape, {
                    depth: s.shape.baseThickness,
                    bevelEnabled: false,
                    curveSegments: 32,
                });
                rawBaseGeo.translate(0, 0, -s.shape.baseThickness / 2);
                let baseBrush = new Brush(rawBaseGeo);
                baseBrush.updateMatrixWorld();

                let holeBrush: Brush | null = null;
                let borderBrush: Brush | null = null;

                // 3. Create Left Keyhole Slot
                if (s.laceHole.enabled) {
                    const hr = s.laceHole.width / 2;
                    // Centered vertically, offset from the left edge by padding + margin + custom offsets
                    const hx = -calculatedW / 2 + s.shape.padding + hr + (s.laceHole.offsetX || 0);
                    const hy = 0 + (s.laceHole.offsetY || 0);

                    // Subtract core hole from Base
                    const holePath = new THREE.Shape();
                    holePath.absarc(hx, hy, hr, 0, Math.PI * 2, false);
                    
                    const holeGeo = new THREE.ExtrudeGeometry(holePath, {
                        depth: s.shape.baseThickness * 10,
                        curveSegments: 32,
                        bevelEnabled: false,
                    });
                    holeGeo.translate(0, 0, -s.shape.baseThickness * 5);
                    holeBrush = new Brush(holeGeo);
                    holeBrush.updateMatrixWorld();

                    baseBrush = evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
                }

                // 4. Create Raised Outer Border Frame
                if (s.shape.topBorder > 0) {
                    const bWidth = s.shape.borderWidth || 2.0;
                    const innerW = Math.max(1, calculatedW - bWidth * 2);
                    const innerH = Math.max(1, calculatedH - bWidth * 2);
                    const innerR = Math.max(0, s.shape.cornerRadius - bWidth);
                    const innerShape = createBaseShape(innerW, innerH, innerR);

                    const rawBorder = new THREE.ExtrudeGeometry(outerShape, {
                        depth: s.shape.topBorder,
                        bevelEnabled: false,
                        curveSegments: 32,
                    });
                    rawBorder.translate(0, 0, s.shape.baseThickness / 2 - surfaceEpsilon);

                    const innerExtrude = new THREE.ExtrudeGeometry(innerShape, {
                        depth: s.shape.topBorder + 2,
                        bevelEnabled: false,
                        curveSegments: 32,
                    });
                    innerExtrude.translate(0, 0, s.shape.baseThickness / 2 - 1);

                    const outerB = new Brush(rawBorder);
                    const innerB = new Brush(innerExtrude);
                    outerB.updateMatrixWorld();
                    innerB.updateMatrixWorld();

                    const outerFrameBrush = evaluator.evaluate(outerB, innerB, SUBTRACTION);
                    
                    // Union frame with grommet if grommet exists
                    if (borderBrush) {
                        borderBrush = evaluator.evaluate(borderBrush, outerFrameBrush, ADDITION);
                    } else {
                        borderBrush = outerFrameBrush;
                    }
                }

                if (active) {
                    // Recompute base normals and set state
                    const finalBaseG = baseBrush.geometry.clone();
                    finalBaseG.computeVertexNormals();
                    setBaseGeo(finalBaseG);

                    if (borderBrush) {
                        // Subtract hole cylinder from the final border to keep it absolutely hollow
                        if (holeBrush) {
                            borderBrush = evaluator.evaluate(borderBrush, holeBrush, SUBTRACTION);
                        }
                        const finalBorderG = borderBrush.geometry.clone();
                        finalBorderG.computeVertexNormals();
                        setBorderGeo(finalBorderG);
                    } else {
                        setBorderGeo(null);
                    }

                    // Slice active texts and subtract hole intersection if any
                    const finalTexts: { g: THREE.BufferGeometry; color: string }[] = [];
                    const holeBounds = holeBrush ? holeBrush.geometry.boundingBox || (holeBrush.geometry.computeBoundingBox(), holeBrush.geometry.boundingBox) : null;

                    for (let i = 0; i < textGeometries.length; i++) {
                        let tb = new Brush(textGeometries[i]);
                        tb.updateMatrixWorld();
                        const textBounds = textGeometries[i].boundingBox || (textGeometries[i].computeBoundingBox(), textGeometries[i].boundingBox);
                        const intersectsHole = !!holeBounds && !!textBounds && textBounds.intersectsBox(holeBounds);
                        if (holeBrush && intersectsHole) {
                            tb = evaluator.evaluate(tb, holeBrush, SUBTRACTION);
                        }
                        const fg = tb.geometry.clone();
                        fg.computeVertexNormals();
                        finalTexts.push({
                            g: fg,
                            color: lineGeometries[i].line.color || s.textColor,
                        });
                    }
                    setTextGeos(finalTexts);

                    const maxZText = s.lines.reduce((max, l) => Math.max(max, l.depth), 0);
                    const maxZ = Math.max(s.shape.topBorder, maxZText);
                    
                    onBoundsChange?.({
                        x: calculatedW,
                        y: calculatedH,
                        z: s.shape.baseThickness + maxZ,
                    });
                }
            } catch (e) {
                console.error("Generation Error", e);
            }
        };

        generate();
        return () => {
            active = false;
        };
    }, [debouncedState]);

    const outerShape = React.useMemo(() => {
        return createBaseShape(bw, bh, state.shape.cornerRadius);
    }, [bw, bh, state.shape.cornerRadius]);

    return (
        <>
            <Center disableZ>
                <group ref={meshRef}>
                    {/* Solid Base mesh */}
                    {baseGeo && (
                        <mesh geometry={baseGeo} name="base" castShadow receiveShadow>
                            <meshStandardMaterial
                                color={debouncedState.baseColor}
                                map={striatedTexture}
                                roughness={0.35}
                                flatShading={true}
                                side={THREE.DoubleSide}
                                clippingPlanes={clippingPlanes}
                            />
                        </mesh>
                    )}

                    {/* Texts meshes */}
                    {textGeos.map((tg, i) => (
                        <mesh key={`txt-${i}`} geometry={tg.g} name="text" castShadow receiveShadow>
                            <meshStandardMaterial
                                color={tg.color}
                                map={striatedTexture}
                                roughness={0.3}
                                flatShading={true}
                                side={THREE.DoubleSide}
                                clippingPlanes={clippingPlanes}
                            />
                        </mesh>
                    ))}

                    {/* Raised borders meshes */}
                    {borderGeo && (
                        <mesh geometry={borderGeo} name="border" castShadow receiveShadow>
                            <meshStandardMaterial
                                color={debouncedState.borderColor}
                                map={striatedTexture}
                                roughness={0.35}
                                flatShading={true}
                                side={THREE.DoubleSide}
                                clippingPlanes={clippingPlanes}
                            />
                        </mesh>
                    )}

                    {/* Flat Solid Slicing cap */}
                    {activeLayer !== undefined && activeLayer < totalLayers && outerShape && (
                        <mesh position={[0, 0, cutoffZ]} receiveShadow>
                            <shapeGeometry args={[outerShape]} />
                            <meshStandardMaterial
                                map={toolpathTexture}
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
                                color={debouncedState.baseColor}
                                roughness={0.5}
                                transparent={true}
                                opacity={0.12}
                                depthWrite={false}
                                side={THREE.DoubleSide}
                                clippingPlanes={ghostClippingPlanes}
                            />
                        </mesh>
                    )}
                    {textGeos.map((tg, i) => (
                        activeLayer !== undefined && activeLayer < totalLayers && (
                            <mesh key={`txt-ghost-${i}`} geometry={tg.g} name="text-ghost">
                                <meshStandardMaterial
                                    color={tg.color}
                                    roughness={0.5}
                                    transparent={true}
                                    opacity={0.12}
                                    depthWrite={false}
                                    side={THREE.DoubleSide}
                                    clippingPlanes={ghostClippingPlanes}
                                />
                            </mesh>
                        )
                    ))}
                    {borderGeo && activeLayer !== undefined && activeLayer < totalLayers && (
                        <mesh geometry={borderGeo} name="border-ghost">
                            <meshStandardMaterial
                                color={debouncedState.borderColor}
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
        </>
    );
};

const PrintNozzle: React.FC<{
    bounds?: { x: number; y: number; z: number };
    activeLayer?: number;
    totalLayers?: number;
    slicerPathProgress?: number;
    floorZ: number;
}> = ({ bounds, activeLayer, totalLayers, slicerPathProgress, floorZ }) => {
    if (activeLayer === undefined || totalLayers === undefined) return null;

    const zHeight = bounds?.z || 4.5;
    const width = bounds?.x || 75;
    const height = bounds?.y || 40;
    const nozzleZ = floorZ + (activeLayer / totalLayers) * zHeight;
    const t = (slicerPathProgress || 100) / 100;
    
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
            {/* Cone print tip */}
            <mesh position={[0, 0, 8]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[1.5, 6, 16]} />
                <meshStandardMaterial color="#ea580c" metalness={0.8} roughness={0.2} emissive="#ea580c" emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[0, 0, 3]}>
                <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
                <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Glowing filament node at nozzle tip */}
            <mesh position={[0, 0, 1]}>
                <sphereGeometry args={[0.35, 8, 8]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
        </group>
    );
};

const Scene3: React.FC<SceneProps> = (props) => {
    const { activeLayer, totalLayers, bounds, slicerPathProgress } = props;
    const baseThickness = props.state.shape.baseThickness || 3.0;
    const floorZ = -baseThickness / 2;

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                shadows
                camera={{ position: [0, -90, 80], fov: 40 }}
                gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
                style={{ background: "radial-gradient(circle at center, #1b2030 0%, #0d0f17 100%)" }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[15, -30, 40]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-bias={-0.0001}
                />
                <directionalLight position={[-15, 30, 20]} intensity={0.4} />
                <pointLight position={[0, 0, 25]} intensity={0.5} />

                <group position={[0, 0, 0]}>
                    <Generator3 {...props} />
                    <PrintNozzle
                        bounds={bounds}
                        activeLayer={activeLayer}
                        totalLayers={totalLayers}
                        slicerPathProgress={slicerPathProgress}
                        floorZ={floorZ}
                    />
                </group>

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    minDistance={30}
                    maxDistance={250}
                />
                
                <Grid
                    position={[0, 0, floorZ - 0.05]}
                    args={[180, 180]}
                    cellSize={10}
                    cellThickness={1.0}
                    cellColor="#1e293b"
                    sectionSize={50}
                    sectionThickness={1.5}
                    sectionColor="#334155"
                    fadeDistance={180}
                    infiniteGrid
                />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

export default Scene3;
