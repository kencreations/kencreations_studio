import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { Evaluator, Brush, SUBTRACTION, ADDITION } from "three-bvh-csg";
import { createTextGeometryWithSpacing } from "../utils/textEngine";
import type { AppState } from "../types";
import { useDebounce } from "../hooks/useDebounce";

interface SceneProps {
    state: AppState;
    meshRef: React.RefObject<THREE.Group | null>;
    onBoundsChange?: (bounds: { x: number; y: number; z: number }) => void;
    activeLayer?: number;
    totalLayers?: number;
    bounds?: { x: number; y: number; z: number };
    slicerPathProgress?: number;
}

function createBaseShape(
    w: number,
    h: number,
    r: number,
    amp: number,
    wl: number,
    skipTopWave: boolean = false,
    excludeTabWidth: number = 0,
) {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    const rSafe = Math.min(r, hw, hh);

    if (amp <= 0 || wl <= 0) {
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
        shape.absarc(
            -hw + rSafe,
            -hh + rSafe,
            rSafe,
            -Math.PI / 2,
            -Math.PI,
            true,
        );
        shape.lineTo(-hw, hh - rSafe);
        shape.absarc(
            -hw + rSafe,
            hh - rSafe,
            rSafe,
            -Math.PI,
            -Math.PI * 1.5,
            true,
        );
        return shape;
    }

    // Wavy path with integer sine correction
    const resolution = 2; // segments per unit

    shape.moveTo(-hw + rSafe, hh);

    // Top Edge
    const topDist = w - 2 * rSafe;
    if (topDist > 0) {
        if (skipTopWave) {
            shape.lineTo(hw - rSafe, hh);
        } else {
            const numWaves = Math.max(1, Math.round(topDist / wl));
            const actWl = topDist / numWaves;
            const steps = Math.max(2, Math.ceil(topDist * resolution));
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const x = -hw + rSafe + topDist * t;
                let wave =
                    Math.sin(((topDist * t) / actWl) * Math.PI * 2) * amp;
                if (excludeTabWidth > 0) {
                    const halfTab = excludeTabWidth / 2;
                    const fadeZone = 3.0; // 3mm smooth transition zone
                    const absX = Math.abs(x);
                    if (absX < halfTab) {
                        wave = 0;
                    } else if (absX < halfTab + fadeZone) {
                        const factor = (absX - halfTab) / fadeZone;
                        wave *= factor;
                    }
                }
                shape.lineTo(x, hh + wave);
            }
        }
    }

    // Top Right Corner
    if (rSafe > 0)
        shape.absarc(hw - rSafe, hh - rSafe, rSafe, Math.PI / 2, 0, true);

    // Right Edge
    const rightDist = h - 2 * rSafe;
    if (rightDist > 0) {
        const numWaves = Math.max(1, Math.round(rightDist / wl));
        const actWl = rightDist / numWaves;
        const steps = Math.max(2, Math.ceil(rightDist * resolution));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const y = hh - rSafe - rightDist * t;
            const wave =
                Math.sin(((rightDist * t) / actWl) * Math.PI * 2) * amp;
            shape.lineTo(hw + wave, y);
        }
    }

    // Bottom Right Corner
    if (rSafe > 0)
        shape.absarc(hw - rSafe, -hh + rSafe, rSafe, 0, -Math.PI / 2, true);

    // Bottom Edge
    if (topDist > 0) {
        const numWaves = Math.max(1, Math.round(topDist / wl));
        const actWl = topDist / numWaves;
        const steps = Math.max(2, Math.ceil(topDist * resolution));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = hw - rSafe - topDist * t;
            const wave = Math.sin(((topDist * t) / actWl) * Math.PI * 2) * amp;
            shape.lineTo(x, -hh - wave);
        }
    }

    // Bottom Left Corner
    if (rSafe > 0)
        shape.absarc(
            -hw + rSafe,
            -hh + rSafe,
            rSafe,
            -Math.PI / 2,
            -Math.PI,
            true,
        );

    // Left Edge
    if (rightDist > 0) {
        const numWaves = Math.max(1, Math.round(rightDist / wl));
        const actWl = rightDist / numWaves;
        const steps = Math.max(2, Math.ceil(rightDist * resolution));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const y = -hh + rSafe + rightDist * t;
            const wave =
                Math.sin(((rightDist * t) / actWl) * Math.PI * 2) * amp;
            shape.lineTo(-hw - wave, y);
        }
    }

    // Top Left Corner
    if (rSafe > 0)
        shape.absarc(
            -hw + rSafe,
            hh - rSafe,
            rSafe,
            -Math.PI,
            -Math.PI * 1.5,
            true,
        );

    return shape;
}

import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

const Generator: React.FC<SceneProps> = ({
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
        if (
            activeLayer === undefined ||
            totalLayers === undefined ||
            activeLayer >= totalLayers
        ) {
            return [];
        }
        return [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutoffZ)];
    }, [activeLayer, totalLayers, cutoffZ]);

    const ghostClippingPlanes = React.useMemo(() => {
        if (
            activeLayer === undefined ||
            totalLayers === undefined ||
            activeLayer >= totalLayers
        ) {
            return [];
        }
        return [new THREE.Plane(new THREE.Vector3(0, 0, 1), -cutoffZ)];
    }, [activeLayer, totalLayers, cutoffZ]);

    const striatedTexture = React.useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1, 26);
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(0, 26, 1, 6);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 100);
        return texture;
    }, []);

    const toolpathTexture = React.useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, 512, 512);

        const progressVal =
            slicerPathProgress !== undefined ? slicerPathProgress / 100 : 1.0;

        // 1. Outer Red Perimeter (drawn between 0.0 and 0.15 progress)
        if (progressVal > 0) {
            const p1 = Math.min(1.0, progressVal / 0.15);
            ctx.strokeStyle = "#ef4444";
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
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 8;

            if (p2 >= 0.5) {
                ctx.strokeRect(28, 28, 456, 456);
            } else {
                ctx.beginPath();
                const totalLen = 456 * 4;
                const drawLen = totalLen * (p2 * 2);
                ctx.moveTo(28, 28);
                let cur = 0;
                if (cur + 456 <= drawLen) {
                    ctx.lineTo(484, 28);
                    cur += 456;
                } else {
                    ctx.lineTo(28 + (drawLen - cur), 28);
                    cur = drawLen;
                }
                if (cur < drawLen) {
                    if (cur + 456 <= drawLen) {
                        ctx.lineTo(484, 484);
                        cur += 456;
                    } else {
                        ctx.lineTo(484, 28 + (drawLen - cur));
                        cur = drawLen;
                    }
                }
                if (cur < drawLen) {
                    if (cur + 456 <= drawLen) {
                        ctx.lineTo(28, 484);
                        cur += 456;
                    } else {
                        ctx.lineTo(484 - (drawLen - cur), 484);
                        cur = drawLen;
                    }
                }
                if (cur < drawLen) {
                    ctx.lineTo(28, 484 - (drawLen - cur));
                }
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
                if (cur + 440 <= drawLen) {
                    ctx.lineTo(476, 36);
                    cur += 440;
                } else {
                    ctx.lineTo(36 + (drawLen - cur), 36);
                    cur = drawLen;
                }
                if (cur < drawLen) {
                    if (cur + 440 <= drawLen) {
                        ctx.lineTo(476, 476);
                        cur += 440;
                    } else {
                        ctx.lineTo(476, 36 + (drawLen - cur));
                        cur = drawLen;
                    }
                }
                if (cur < drawLen) {
                    if (cur + 440 <= drawLen) {
                        ctx.lineTo(36, 476);
                        cur += 440;
                    } else {
                        ctx.lineTo(476 - (drawLen - cur), 476);
                        cur = drawLen;
                    }
                }
                if (cur < drawLen) {
                    ctx.lineTo(36, 476 - (drawLen - cur));
                }
                ctx.stroke();
            }
        }

        // 3. Orange Infill (drawn between 0.30 and 1.0 progress)
        if (progressVal > 0.3) {
            const infillP = Math.min(1.0, (progressVal - 0.3) / 0.7);
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 4;

            const infillPattern =
                state.slicerSettings?.infillPattern || "Gyroid";
            if (infillPattern === "Gyroid") {
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
                        const wave = Math.sin(x / 30 + y / 30) * 15;
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
                    gridLines.push({ type: "v", val: i });
                    gridLines.push({ type: "h", val: i });
                }
                const drawCount = Math.ceil(gridLines.length * infillP);
                for (let idx = 0; idx < drawCount; idx++) {
                    const line = gridLines[idx];
                    ctx.beginPath();
                    if (line.type === "v") {
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

    const laceHoleType = state.laceHole.type || "default";
    const hasLoopTab = state.laceHole.enabled && laceHoleType === "loop";
    const tabW = Math.max(state.laceHole.width + 5, 12);
    const excludeTabWidth = hasLoopTab ? tabW : 0;
    const skipTopWave = false;

    const outerShape = React.useMemo(() => {
        return createBaseShape(
            bw,
            bh,
            state.shape.cornerRadius,
            state.shape.amplitude,
            state.shape.wavelength,
            skipTopWave,
            excludeTabWidth,
        );
    }, [
        bw,
        bh,
        state.shape.cornerRadius,
        state.shape.amplitude,
        state.shape.wavelength,
        skipTopWave,
        excludeTabWidth,
    ]);

    const surfaceEpsilon = 0.08;
    const [textGeos, setTextGeos] = useState<
        { g: THREE.BufferGeometry; color: string }[]
    >([]);
    const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
    const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(
        null,
    );

    const debouncedState = useDebounce(state, 200);

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
                        loadedFonts[url] = await new Promise<Font>(
                            (res, rej) => {
                                ttfLoader.load(
                                    url,
                                    (json) => res(fontLoader.parse(json)),
                                    undefined,
                                    rej,
                                );
                            },
                        );
                    } else {
                        loadedFonts[url] = await new Promise<Font>((res, rej) =>
                            fontLoader.load(url, res, undefined, rej),
                        );
                    }
                }

                if (!active) return;
                const evaluator = new Evaluator();
                const laceHoleType = s.laceHole.type || "default";
                const hasDefaultSlot =
                    s.laceHole.enabled && laceHoleType === "default";
                const hasLoopTab =
                    s.laceHole.enabled && laceHoleType === "loop";
                const skipTopWave = false;
                const tabW = Math.max(s.laceHole.width + 5, 12);
                const excludeTabWidth = hasLoopTab ? tabW : 0;

                // 1. Text Geometries (Merged securely via BufferGeometryUtils)
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

                // NEW: Define max width for auto-scaling
                const maxAllowedWidth = s.shape.width - s.shape.padding * 2;

                for (const line of s.lines) {
                    if (!line.text.trim()) continue;
                    const geo = createTextGeometryWithSpacing(
                        line.text,
                        loadedFonts[line.font],
                        line.size,
                        line.depth,
                        line.letterSpacing || 0,
                    );
                    geo.computeBoundingBox();
                    let bounds = geo.boundingBox!;
                    let tw = bounds.max.x - bounds.min.x;
                    let th = bounds.max.y - bounds.min.y;

                    // --- AUTO-SCALE LOGIC FOR MASS CREATION ---
                    if (s.massCreation?.enabled && tw > maxAllowedWidth) {
                        const scaleFactor = maxAllowedWidth / tw;
                        geo.scale(scaleFactor, scaleFactor, 1);
                        geo.computeBoundingBox(); // Recompute new bounds
                        bounds = geo.boundingBox!;
                        tw = bounds.max.x - bounds.min.x;
                        th = bounds.max.y - bounds.min.y;
                    }
                    // ------------------------------------------

                    maxTextWidth = Math.max(maxTextWidth, tw);
                    lineGeometries.push({
                        line,
                        geo,
                        tw,
                        minX: bounds.min.x,
                        maxX: bounds.max.x,
                        minY: bounds.min.y,
                        maxY: bounds.max.y,
                        th,
                    });
                }

                const totalTextHeight =
                    lineGeometries.reduce((sum, item) => sum + item.th, 0) +
                    Math.max(0, lineGeometries.length - 1) * s.lineSpacing;

                let bw = s.shape.width;
                let bh = s.shape.height;
                const holeSpace = s.laceHole.topMargin + s.laceHole.height;

                // --- PREVENT RESIZING DURING MASS CREATION ---
                if (s.shape.autoSize && !s.massCreation?.enabled) {
                    bw = maxTextWidth + s.shape.padding * 2;
                    bh = totalTextHeight + s.shape.padding * 2;

                    if (hasDefaultSlot) {
                        bh += holeSpace;
                        bw = Math.max(
                            bw,
                            s.laceHole.width + s.shape.padding * 2,
                        );
                    }
                    if (hasLoopTab) {
                        bw = Math.max(
                            bw,
                            s.laceHole.width + s.shape.padding * 2 + 8,
                        );
                    }
                }

                const reservedTop = hasDefaultSlot ? holeSpace : 0;
                const textAreaTop = bh / 2 - reservedTop;
                const textAreaBottom = -bh / 2;
                const textCenterY = (textAreaTop + textAreaBottom) / 2;
                let currentTop = textCenterY + totalTextHeight / 2;

                for (const { geo, minX, maxX, maxY, th } of lineGeometries) {
                    const offsetX = -((minX + maxX) / 2);
                    const offsetY = currentTop - maxY;
                    geo.translate(
                        offsetX,
                        offsetY,
                        s.shape.baseThickness / 2 - surfaceEpsilon,
                    );
                    textGeometries.push(geo);
                    currentTop -= th + s.lineSpacing;
                }

                // 2. Base Plate & Border

                const outerShape = createBaseShape(
                    bw,
                    bh,
                    s.shape.cornerRadius,
                    s.shape.amplitude,
                    s.shape.wavelength,
                    skipTopWave,
                    excludeTabWidth,
                );

                // Base Plate: Fully solid block from bottom to middle (Layer 1 Color)
                const rawBaseGeo = new THREE.ExtrudeGeometry(outerShape, {
                    depth: s.shape.baseThickness,
                    bevelEnabled: false,
                    curveSegments: 16,
                });
                rawBaseGeo.translate(0, 0, -s.shape.baseThickness / 2);
                let baseBrush = new Brush(rawBaseGeo);
                baseBrush.updateMatrixWorld();

                let borderBrush: Brush | null = null;
                if (s.shape.topBorder > 0) {
                    // Border: Extruded starting exactly from the top of the Base Plate! (Layer 2 Color)
                    const bWidth =
                        s.shape.borderWidth !== undefined
                            ? s.shape.borderWidth
                            : 2.0;
                    const innerW = Math.max(1, bw - bWidth * 2);
                    const innerH = Math.max(1, bh - bWidth * 2);
                    const innerR = Math.max(0, s.shape.cornerRadius - bWidth);
                    const innerShape = createBaseShape(
                        innerW,
                        innerH,
                        innerR,
                        s.shape.amplitude,
                        s.shape.wavelength,
                        skipTopWave,
                        excludeTabWidth,
                    );

                    const rawBorder = new THREE.ExtrudeGeometry(outerShape, {
                        depth: s.shape.topBorder,
                        bevelEnabled: false,
                        curveSegments: 16,
                    });
                    rawBorder.translate(
                        0,
                        0,
                        s.shape.baseThickness / 2 - surfaceEpsilon,
                    );

                    const innerExtrude = new THREE.ExtrudeGeometry(innerShape, {
                        depth: s.shape.topBorder + 2,
                        bevelEnabled: false,
                        curveSegments: 16,
                    });
                    innerExtrude.translate(0, 0, s.shape.baseThickness / 2 - 1);

                    const outerB = new Brush(rawBorder);
                    const innerB = new Brush(innerExtrude);
                    outerB.updateMatrixWorld();
                    innerB.updateMatrixWorld();

                    borderBrush = evaluator.evaluate(
                        outerB,
                        innerB,
                        SUBTRACTION,
                    );
                }

                let holeBrush: Brush | null = null;
                const exportBrush = new Brush(rawBaseGeo.clone());
                exportBrush.updateMatrixWorld();

                if (borderBrush) {
                    exportBrush.geometry = baseBrush.geometry.clone();
                }

                if (hasDefaultSlot) {
                    const hw = s.laceHole.width;
                    const hh = s.laceHole.height;
                    const hr = hh / 2;
                    const holeShape = createBaseShape(hw, hh, hr, 0, 0);
                    const holeGeo = new THREE.ExtrudeGeometry(holeShape, {
                        depth: s.shape.baseThickness * 10,
                        curveSegments: 16,
                        bevelEnabled: false,
                    });

                    const hy = bh / 2 - s.laceHole.topMargin - hr;
                    holeGeo.translate(0, hy, -s.shape.baseThickness * 5);

                    holeBrush = new Brush(holeGeo);
                    holeBrush.updateMatrixWorld();

                    baseBrush = evaluator.evaluate(
                        baseBrush,
                        holeBrush,
                        SUBTRACTION,
                    );
                    exportBrush.geometry = evaluator.evaluate(
                        exportBrush,
                        holeBrush,
                        SUBTRACTION,
                    ).geometry;
                }

                if (hasLoopTab) {
                    const tabW = Math.max(s.laceHole.width + 5, 12);
                    const tabH = Math.max(s.laceHole.height + 2.5, 5.5);
                    const tabR = Math.min(tabH * 0.28, 1.6);
                    const overlap = Math.max(1.2, s.shape.baseThickness * 0.6);

                    const tabShape = createBaseShape(tabW, tabH, tabR, 0, 0);
                    const tabGeo = new THREE.ExtrudeGeometry(tabShape, {
                        depth: s.shape.baseThickness,
                        bevelEnabled: false,
                        curveSegments: 16,
                    });
                    // Force meaningful overlap with the main body to avoid non-manifold seam edges.
                    const tabY = bh / 2 + tabH / 2 - overlap;
                    tabGeo.translate(
                        0,
                        tabY,
                        -s.shape.baseThickness / 2 + surfaceEpsilon,
                    );

                    const tabBrush = new Brush(tabGeo);
                    tabBrush.updateMatrixWorld();
                    baseBrush = evaluator.evaluate(
                        baseBrush,
                        tabBrush,
                        ADDITION,
                    );
                    const exportTab = new Brush(tabGeo.clone());
                    exportTab.updateMatrixWorld();
                    exportBrush.geometry = evaluator.evaluate(
                        exportBrush,
                        exportTab,
                        ADDITION,
                    ).geometry;

                    const slotW = Math.min(s.laceHole.width, tabW - 3.2);
                    const slotH = Math.max(
                        1.2,
                        Math.min(s.laceHole.height, tabH * 0.38),
                    );
                    const slotR = slotH / 2;
                    const slotShape = createBaseShape(
                        slotW,
                        slotH,
                        slotR,
                        0,
                        0,
                    );
                    const slotGeo = new THREE.ExtrudeGeometry(slotShape, {
                        depth: s.shape.baseThickness * 10,
                        curveSegments: 16,
                        bevelEnabled: false,
                    });
                    const slotY = tabY + tabH * 0.08;
                    slotGeo.translate(0, slotY, -s.shape.baseThickness * 5);

                    slotGeo.translate(0, 0, 0);
                    holeBrush = new Brush(slotGeo);
                    holeBrush.updateMatrixWorld();

                    baseBrush = evaluator.evaluate(
                        baseBrush,
                        holeBrush,
                        SUBTRACTION,
                    );
                    exportBrush.geometry = evaluator.evaluate(
                        exportBrush,
                        holeBrush,
                        SUBTRACTION,
                    ).geometry;

                    const tabTop = tabY + tabH / 2;
                    bh = Math.max(bh, tabTop * 2);
                }

                if (active) {
                    // Recompute normals to ensure perfect rendering after CSG operations
                    const finalBaseG = baseBrush.geometry.clone();
                    finalBaseG.computeVertexNormals();
                    setBaseGeo(finalBaseG);

                    if (borderBrush) {
                        const finalBorderG = borderBrush.geometry.clone();
                        finalBorderG.computeVertexNormals();
                        setBorderGeo(finalBorderG);
                    } else {
                        setBorderGeo(null);
                    }

                    const finalTexts: {
                        g: THREE.BufferGeometry;
                        color: string;
                    }[] = [];
                    const holeBounds = holeBrush
                        ? holeBrush.geometry.boundingBox ||
                          (holeBrush.geometry.computeBoundingBox(),
                          holeBrush.geometry.boundingBox)
                        : null;
                    for (let i = 0; i < textGeometries.length; i++) {
                        let tb = new Brush(textGeometries[i]);
                        tb.updateMatrixWorld();
                        const textBounds =
                            textGeometries[i].boundingBox ||
                            (textGeometries[i].computeBoundingBox(),
                            textGeometries[i].boundingBox);
                        const intersectsHole =
                            !!holeBounds &&
                            !!textBounds &&
                            textBounds.intersectsBox(holeBounds);
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

                    const maxZText = s.lines.reduce(
                        (max, l) => Math.max(max, l.depth),
                        0,
                    );
                    const maxZ = Math.max(s.shape.topBorder, maxZText);
                    onBoundsChange?.({
                        x: bw,
                        y: bh,
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

    return (
        <>
            <Center disableZ>
                <group ref={meshRef}>
                    {/* 1. Main Clipped Meshes with Striated layer lines */}
                    {baseGeo && (
                        <mesh geometry={baseGeo} castShadow receiveShadow>
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
                    {textGeos.map((tg, i) => (
                        <mesh
                            key={`txt-${i}`}
                            geometry={tg.g}
                            castShadow
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color={tg.color}
                                map={striatedTexture}
                                roughness={0.3}
                                metalness={0.05}
                                flatShading={true}
                                side={THREE.DoubleSide}
                                clippingPlanes={clippingPlanes}
                            />
                        </mesh>
                    ))}
                    {borderGeo && (
                        <mesh geometry={borderGeo} castShadow receiveShadow>
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

                    {/* 2. Flat Solid Caps on Slicing cutoffZ Plane */}
                    {activeLayer !== undefined &&
                        activeLayer < totalLayers &&
                        outerShape && (
                            <mesh
                                position={[0, 0, cutoffZ]}
                                rotation={[0, 0, 0]}
                                receiveShadow
                            >
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
                    {baseGeo &&
                        activeLayer !== undefined &&
                        activeLayer < totalLayers && (
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
                    {textGeos.map(
                        (tg, i) =>
                            activeLayer !== undefined &&
                            activeLayer < totalLayers && (
                                <mesh
                                    key={`txt-ghost-${i}`}
                                    geometry={tg.g}
                                    name="text-ghost"
                                >
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
                            ),
                    )}
                    {borderGeo &&
                        activeLayer !== undefined &&
                        activeLayer < totalLayers && (
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
        const currentX =
            -width / 2 + (scanIndex / Math.max(1, numScans - 1)) * width;
        const startY = -height / 2;
        const endY = height / 2;

        nozzleX = currentX;
        nozzleY =
            scanIndex % 2 === 0
                ? startY + scanLineT * (endY - startY)
                : endY - scanLineT * (endY - startY);
    }

    return (
        <group position={[nozzleX, nozzleY, nozzleZ]}>
            {/* The heated print head tip (cone) */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 8]}>
                <coneGeometry args={[3, 16, 16]} />
                <meshStandardMaterial
                    color="#475569"
                    roughness={0.5}
                    metalness={0.8}
                />
            </mesh>
            {/* Glowing brass tip */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 0.5]}>
                <coneGeometry args={[0.8, 1, 12]} />
                <meshStandardMaterial
                    color="#ca8a04"
                    roughness={0.2}
                    metalness={0.9}
                    emissive="#caca24"
                    emissiveIntensity={0.6}
                />
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

const Scene: React.FC<SceneProps> = (props) => {
    const floorZ = -props.state.shape.baseThickness / 2;

    return (
        <Canvas
            shadows
            camera={{ position: [0, -60, 60], fov: 45 }}
            gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
        >
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, -10, 30]}
                intensity={1.2}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-10, 10, -10]} intensity={0.4} />

            <Generator {...props} />

            {props.activeLayer !== undefined &&
                props.totalLayers !== undefined && (
                    <PrintNozzle
                        bounds={props.bounds}
                        activeLayer={props.activeLayer}
                        totalLayers={props.totalLayers}
                        slicerPathProgress={props.slicerPathProgress}
                        floorZ={floorZ}
                    />
                )}

            {/* Floor to receive shadow, placed slightly below the grid to avoid z-fighting */}
            <mesh position={[0, 0, floorZ - 0.05]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <shadowMaterial transparent opacity={0.15} />
            </mesh>

            {/* Modern Grid - tweaked to fix visibility */}
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

            <OrbitControls makeDefault minDistance={10} maxDistance={150} />
            <Environment preset="city" />
        </Canvas>
    );
};

export { Generator };
export default Scene;
