import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { Evaluator, Brush, SUBTRACTION } from "three-bvh-csg";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createTextGeometryWithSpacing } from "../utils/textEngine";
import { createTextShapesWithSpacing, offsetShapes } from "../utils/textContour";
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

const Generator: React.FC<SceneProps> = ({
    state,
    meshRef,
    onBoundsChange,
    activeLayer,
    totalLayers,
    bounds,
}) => {
    const clippingPlanes = React.useMemo(() => {
        if (activeLayer === undefined || totalLayers === undefined || activeLayer >= totalLayers) {
            return [];
        }
        const baseThickness = state.shape.baseThickness || 2.0;
        const zHeight = bounds?.z || 4.5;
        const floorZ = -baseThickness / 2;
        const cutoffZ = floorZ + (activeLayer / totalLayers) * zHeight;
        return [new THREE.Plane(new THREE.Vector3(0, 0, -1), cutoffZ)];
    }, [activeLayer, totalLayers, state.shape.baseThickness, bounds?.z]);
    const [textGeo, setTextGeo] = useState<THREE.BufferGeometry | null>(null);
    const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
    const debouncedState = useDebounce(state, 200);

    useEffect(() => {
        let active = true;
        const s = debouncedState;
        const generate = async () => {
            const fontLoader = new FontLoader();
            const { TTFLoader } = await import("three/examples/jsm/loaders/TTFLoader.js");
            const ttfLoader = new TTFLoader();
            try {
                const line = s.lines[0];
                if (!line || !line.text.trim()) return;

                const url = line.font;
                let loadedFont: Font;
                if (url.endsWith(".ttf")) {
                    loadedFont = await new Promise<Font>((res, rej) => {
                        ttfLoader.load(
                            url,
                            (json) => res(fontLoader.parse(json)),
                            undefined,
                            rej,
                        );
                    });
                } else {
                    loadedFont = await new Promise<Font>((res, rej) =>
                        fontLoader.load(url, res, undefined, rej),
                    );
                }

                if (!active) return;

                const evaluator = new Evaluator();

                // 1. Text Geometry
                const textThickness = line.depth || 1.2;
                const rawText = createTextGeometryWithSpacing(
                    line.text,
                    loadedFont,
                    line.size || 23,
                    textThickness,
                    line.letterSpacing || 0,
                );
                
                rawText.computeBoundingBox();
                const bounds = rawText.boundingBox!;
                const tw = bounds.max.x - bounds.min.x;
                const th = bounds.max.y - bounds.min.y;
                const cx = (bounds.min.x + bounds.max.x) / 2;
                const cy = (bounds.min.y + bounds.max.y) / 2;

                // Center the text geometry at Z=0 (with a -0.1mm overlap penetration)
                rawText.translate(-cx, -cy, -0.1);
                rawText.computeVertexNormals();

                // Weld text vertices for a watertight manifold shell
                const weldedText = BufferGeometryUtils.mergeVertices(rawText);
                setTextGeo(weldedText);

                // 2. Contoured Outline Backing Base Geometry (using clipper-lib)
                const outlineWidth = s.shape.padding || 9.5;
                const baseThickness = s.shape.baseThickness || 12.8;

                // Generate exact 2D outline contours matching characters
                const textShapes = createTextShapesWithSpacing(
                    line.text,
                    loadedFont,
                    line.size || 23,
                    line.letterSpacing || 0
                );

                const baseShapes = offsetShapes(textShapes, outlineWidth);

                let rawBase: THREE.BufferGeometry;
                if (baseShapes.length > 0) {
                    rawBase = new THREE.ExtrudeGeometry(baseShapes, {
                        depth: baseThickness,
                        bevelEnabled: false,
                        curveSegments: 16,
                    });
                } else {
                    // Fallback
                    const shape = new THREE.Shape();
                    shape.moveTo(-tw/2, -th/2);
                    shape.lineTo(tw/2, -th/2);
                    shape.lineTo(tw/2, th/2);
                    shape.lineTo(-tw/2, th/2);
                    shape.closePath();
                    rawBase = new THREE.ExtrudeGeometry(shape, {
                        depth: baseThickness,
                        bevelEnabled: false,
                        curveSegments: 16,
                    });
                }

                // Center it exactly at XY origin (aligning perfectly with the centered text)
                rawBase.computeBoundingBox();
                const baseBounds = rawBase.boundingBox!;
                const bcx = (baseBounds.min.x + baseBounds.max.x) / 2;
                const bcy = (baseBounds.min.y + baseBounds.max.y) / 2;
                rawBase.translate(-bcx, -bcy, -baseThickness);
                rawBase.computeVertexNormals();

                // 3. Horizontal Pencil Insertion Tunnel
                const holeDiameter = s.laceHole.width || 7.8;
                const holeRadius = holeDiameter / 2;
                // Create a horizontal cylinder running along the X-axis
                const cylinderGeo = new THREE.CylinderGeometry(
                    horizontalCylinderRadius => holeRadius,
                    horizontalCylinderRadius => holeRadius,
                    tw + outlineWidth * 2 + 40, // ensure clean cut on outer boundaries
                    32,
                    1
                );
                // Correct syntax error from system guidelines or custom cylinder setup
                const realCylinderGeo = new THREE.CylinderGeometry(
                    holeRadius,
                    holeRadius,
                    tw + outlineWidth * 2 + 40,
                    32,
                    1
                );
                // Rotate cylinder to run parallel to the X-axis
                realCylinderGeo.rotateZ(Math.PI / 2);
                // Center it vertically inside the base thickness
                realCylinderGeo.translate(0, 0, -baseThickness / 2);
                realCylinderGeo.computeVertexNormals();

                const baseBrush = new Brush(rawBase);
                const cylinderBrush = new Brush(realCylinderGeo);
                baseBrush.updateMatrixWorld();
                cylinderBrush.updateMatrixWorld();

                // Perform CSG subtraction to hollow out the insertion channel
                const subtractedBase = evaluator.evaluate(
                    baseBrush,
                    cylinderBrush,
                    SUBTRACTION
                );
                
                // Weld base vertices for a perfect manifold slice
                const weldedBase = BufferGeometryUtils.mergeVertices(subtractedBase.geometry);
                setBaseGeo(weldedBase);

                // Notify parent of outer bounding dimensions
                if (onBoundsChange) {
                    onBoundsChange({
                        x: tw + outlineWidth * 2,
                        y: th + outlineWidth * 2,
                        z: baseThickness + textThickness - 0.1,
                    });
                }
            } catch (e) {
                console.error("Error generating 3D Pencil Topper geometry", e);
            }
        };

        generate();
        return () => {
            active = false;
        };
    }, [debouncedState]);

    return (
        <Center disableZ>
            <group ref={meshRef}>
                {baseGeo && (
                    <mesh geometry={baseGeo} name="base" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={debouncedState.baseColor}
                            roughness={0.3}
                            flatShading={true}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}
                {textGeo && (
                    <mesh geometry={textGeo} name="text" castShadow receiveShadow>
                        <meshStandardMaterial
                            color={debouncedState.textColor}
                            roughness={0.3}
                            flatShading={true}
                            clippingPlanes={clippingPlanes}
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

const ScenePencil: React.FC<SceneProps> = (props) => {
    const floorZ = -props.state.shape.baseThickness / 2;

    return (
        <Canvas shadows camera={{ position: [0, -80, 80], fov: 45 }} gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}>
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, -10, 30]}
                intensity={1.2}
                castShadow
                shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-10, 10, -10]} intensity={0.4} />

            <Generator {...props} />

            {props.activeLayer !== undefined && props.totalLayers !== undefined && (
                <PrintNozzle
                    bounds={props.bounds}
                    activeLayer={props.activeLayer}
                    totalLayers={props.totalLayers}
                    slicerPathProgress={props.slicerPathProgress}
                    floorZ={floorZ}
                />
            )}

            {/* Floor to receive shadow */}
            <mesh position={[0, 0, floorZ - 0.05]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <shadowMaterial transparent opacity={0.15} />
            </mesh>

            {/* Modern Grid */}
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

export default ScenePencil;
