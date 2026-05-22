import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import { Brush, Evaluator, SUBTRACTION, ADDITION } from "three-bvh-csg";
import { MeshBVH } from "three-mesh-bvh";
import * as Comlink from "comlink";

import type { AppState } from "../types";
import { createTextGeometryWithSpacing } from "../utils/textEngine";
import {
    createDynamicBaseShape,
    createDynamicFrameShape,
} from "../utils/GeometryShapes";

// @ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree =
    MeshBVH.prototype.computeBoundsTree;
// @ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree =
    MeshBVH.prototype.disposeBoundsTree;

const api = {
    generate: async (state: AppState) => {
        const s = state;
        const csgEvaluator = new Evaluator();
        const fontLoader = new FontLoader();
        const ttfLoader = new TTFLoader();

        try {
            const urls = [...new Set(s.lines.map((l) => l.font))];
            const fonts: Record<string, Font> = {};
            for (const url of urls) {
                if (url.startsWith("http")) {
                    // For remote fonts, we need to fetch them first
                    const response = await fetch(url);
                    const fontData = await response.arrayBuffer();
                    if (url.endsWith(".ttf")) {
                        fonts[url] = fontLoader.parse(
                            ttfLoader.parse(fontData),
                        );
                    } else {
                        fonts[url] = fontLoader.parse(
                            JSON.parse(new TextDecoder().decode(fontData)),
                        );
                    }
                } else {
                    // For local fonts in /public
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
            }

            // --- 1. Generate Text Geometries & Measure First ---
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

            const createTextRaw = (line: any) => {
                if (!line?.text.trim()) return null;
                const depth = Math.max(0.2, line.depth || 0.6);
                const g = createTextGeometryWithSpacing(
                    line.text,
                    fonts[line.font],
                    line.size,
                    depth,
                    line.letterSpacing || 0,
                );
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

                const wTop = rawTop ? rawTop.tw : 0;
                const wCenter = rawCenter ? rawCenter.tw : 0;
                const wBot = rawBottom ? rawBottom.tw : 0;
                const maxTw = Math.max(wTop, wCenter, wBot);
                sideMargin = Math.max(8, pad);
                let calcBw = maxTw + sideMargin * 2;
                bw = Math.max(s.shape.width, calcBw);
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

            // --- 3. Create Brushes for CSG ---
            const baseGeo = new THREE.ExtrudeGeometry(
                createDynamicBaseShape(bw, bh, cornerR),
                { depth: baseThick, bevelEnabled: false, curveSegments: 16 },
            );
            baseGeo.translate(0, 0, -baseThick);
            const baseBrush = new Brush(baseGeo);

            const frameGeo = new THREE.ExtrudeGeometry(
                createDynamicFrameShape(
                    bw,
                    bh,
                    cornerR,
                    sideMargin,
                    topBandH,
                    botBandH,
                    s.shape.innerRadius ?? 20,
                ),
                { depth: frameThick, bevelEnabled: false, curveSegments: 16 },
            );
            const frameBrush = new Brush(frameGeo);
            frameBrush.updateMatrixWorld();

            // --- 4. Position Text and Create Brushes ---
            const topTextY = bh / 2 - topBandH / 2;
            const botTextY = -bh / 2 + botBandH / 2;
            const centerTextY = (botBandH - topBandH) / 2;

            let topBrush: Brush | null = null;
            if (rawTop) {
                rawTop.g.translate(
                    0,
                    topTextY - rawTop.line.size * 0.35,
                    frameThick - rawTop.line.depth,
                );
                topBrush = new Brush(rawTop.g);
                topBrush.updateMatrixWorld();
            }

            let centerBrush: Brush | null = null;
            if (rawCenter) {
                rawCenter.g.translate(0, centerTextY - rawCenter.cy, 0.01);
                centerBrush = new Brush(rawCenter.g);
                centerBrush.updateMatrixWorld();
            }

            let bottomBrush: Brush | null = null;
            if (rawBottom) {
                rawBottom.g.translate(
                    0,
                    botTextY - rawBottom.line.size * 0.35,
                    frameThick - rawBottom.line.depth,
                );
                bottomBrush = new Brush(rawBottom.g);
                bottomBrush.updateMatrixWorld();
            }

            // --- 5. Perform CSG Operations ---
            let result: Brush = baseBrush;
            result = csgEvaluator.evaluate(result, frameBrush, ADDITION);
            if (topBrush)
                result = csgEvaluator.evaluate(result, topBrush, ADDITION);
            if (bottomBrush)
                result = csgEvaluator.evaluate(result, bottomBrush, ADDITION);
            if (centerBrush)
                result = csgEvaluator.evaluate(
                    result,
                    centerBrush,
                    SUBTRACTION,
                );

            // --- 6. Finalize Geometry ---
            const finalMesh = result;
            finalMesh.geometry.computeVertexNormals();
            finalMesh.geometry.center();

            const maxD = Math.max(...s.lines.map((l) => l.depth || 0.6));
            const tabHeight = s.laceHole.enabled ? 8.75 : 0;
            const bounds = {
                x: bw,
                y: bh + tabHeight,
                z: baseThick + frameThick + maxD,
            };

            // Return geometry and bounds, using Comlink's transfer to avoid copying data
            return Comlink.transfer(
                {
                    geometry: finalMesh.geometry,
                    bounds: bounds,
                },
                [
                    finalMesh.geometry.attributes.position.array.buffer,
                    finalMesh.geometry.attributes.normal.array.buffer,
                    finalMesh.geometry.index.array.buffer,
                ],
            );
        } catch (e) {
            console.error("Worker Error", e);
            throw e;
        }
    },
};

Comlink.expose(api);
