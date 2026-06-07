import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import type { AppState } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { createTextGeometryWithSpacing } from "../utils/textEngine";

interface SceneProps {
    state: AppState;
    meshRef: React.RefObject<THREE.Group | null>;
    onBoundsChange?: (bounds: { x: number; y: number; z: number }) => void;
    activeLayer?: number;
    totalLayers?: number;
    bounds?: { x: number; y: number; z: number };
    slicerPathProgress?: number;
}

const Generator4: React.FC<SceneProps> = ({
    state,
    meshRef,
    onBoundsChange,
}) => {
    const [templateGroup, setTemplateGroup] = useState<THREE.Group | null>(
        null,
    );
    const [templateZSurface, setTemplateZSurface] = useState<number>(3);
    const [textGeos, setTextGeos] = useState<
        { g: THREE.BufferGeometry; color: string }[]
    >([]);

    const debouncedState = useDebounce(state, 200);

    // --------------------------------------------------------
    // 1. LOAD THE STL TEMPLATE
    // --------------------------------------------------------
    // --------------------------------------------------------
    // 1. LOAD THE DUAL-STL TEMPLATES (Base + Border)
    // --------------------------------------------------------
    useEffect(() => {
        const loader = new STLLoader();
        const fileNumber = (debouncedState.shape.modelType || 0) + 1;
        const filePath = `/models/PRINTISM-Model-0${fileNumber}.stl`;

        // 1. Fetch as ArrayBuffer to ensure we handle binary data correctly
        fetch(filePath)
            .then((res) => res.arrayBuffer())
            .then((buffer) => {
                // 2. Parse the buffer directly
                const geometry = loader.parse(buffer);
                geometry.computeVertexNormals();
                geometry.center();

                const material = new THREE.MeshStandardMaterial({
                    color: debouncedState.baseColor,
                    roughness: 0.4,
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const group = new THREE.Group();
                group.add(mesh);

                setTemplateGroup(group);

                geometry.computeBoundingBox();
                const size = new THREE.Vector3();
                geometry.boundingBox!.getSize(size);
                setTemplateZSurface(size.z / 2);
                onBoundsChange?.({ x: size.x, y: size.y, z: size.z });
            })
            .catch((err) => console.error("Binary Load Failed:", err));
    }, [debouncedState.shape.modelType, debouncedState.baseColor]); // Make sure borderColor is in the dependency array!
    // --------------------------------------------------------
    // 2. GENERATE AND POSITION TEXT
    // --------------------------------------------------------
    useEffect(() => {
        let active = true;
        const generateText = async () => {
            const fontLoader = new FontLoader();
            const ttfLoader = new TTFLoader();
            try {
                // Load Fonts
                const fontUrls = [
                    ...new Set(debouncedState.lines.map((l) => l.font)),
                ];
                const loadedFonts: Record<string, Font> = {};
                for (const url of fontUrls) {
                    if (url.endsWith(".ttf")) {
                        loadedFonts[url] = await new Promise<Font>((res, rej) =>
                            ttfLoader.load(
                                url,
                                (json) => res(fontLoader.parse(json)),
                                undefined,
                                rej,
                            ),
                        );
                    } else {
                        loadedFonts[url] = await new Promise<Font>((res, rej) =>
                            fontLoader.load(url, res, undefined, rej),
                        );
                    }
                }

                if (!active) return;

                const textGeometries: THREE.BufferGeometry[] = [];
                const lineGeometries: any[] = [];

                // Create Geometries
                for (const line of debouncedState.lines) {
                    if (!line.text.trim()) continue;
                    const geo = createTextGeometryWithSpacing(
                        line.text,
                        loadedFonts[line.font],
                        line.size,
                        line.depth,
                        line.letterSpacing || 0,
                    );
                    geo.computeBoundingBox();
                    const b = geo.boundingBox!;
                    lineGeometries.push({
                        line,
                        geo,
                        tw: b.max.x - b.min.x,
                        th: b.max.y - b.min.y,
                        maxY: b.max.y,
                        minX: b.min.x,
                        maxX: b.max.x,
                    });
                }

                const totalTextHeight =
                    lineGeometries.reduce((sum, item) => sum + item.th, 0) +
                    Math.max(0, lineGeometries.length - 1) *
                        debouncedState.lineSpacing;

                // --- THE FIX: VISUAL Y-OFFSET ---
                // The handle pulls the center of the STL upward by about 6-8mm.
                // We subtract that amount here to push the text down into the visual center of the rectangle.
                const visualCenterYOffset = -7.5;

                let currentTop = totalTextHeight / 2 + visualCenterYOffset;
                const finalTexts = [];

                for (let i = 0; i < lineGeometries.length; i++) {
                    const { geo, minX, maxX, maxY, th, line } =
                        lineGeometries[i];

                    const offsetX = -((minX + maxX) / 2);
                    const offsetY = currentTop - maxY;

                    // Push the text up to sit exactly on the surface of the loaded STL
                    geo.translate(offsetX, offsetY, templateZSurface);

                    geo.computeVertexNormals();
                    finalTexts.push({
                        g: geo,
                        color: line.color || debouncedState.textColor,
                    });

                    currentTop -= th + debouncedState.lineSpacing;
                }

                setTextGeos(finalTexts);
            } catch (e) {
                console.error("Text Generation Error", e);
            }
        };

        generateText();
        return () => {
            active = false;
        };
    }, [
        debouncedState.lines,
        debouncedState.lineSpacing,
        debouncedState.textColor,
        templateZSurface,
    ]);
    return (
        <Center disableZ>
            <group ref={meshRef}>
                {/* 1. Render the Loaded STL Template */}
                {templateGroup && <primitive object={templateGroup} />}

                {/* 2. Render the Generated Text on Top */}
                {textGeos.map((tg, i) => (
                    <mesh
                        key={`txt-${i}`}
                        geometry={tg.g}
                        name="text"
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={tg.color}
                            roughness={0.3}
                            flatShading={true}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                ))}
            </group>
        </Center>
    );
};

// --------------------------------------------------------
// 3. MAIN SCENE WRAPPER
// --------------------------------------------------------
const Scene4: React.FC<SceneProps> = (props) => {
    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                shadows
                camera={{ position: [0, -90, 80], fov: 40 }}
                gl={{ preserveDrawingBuffer: true }}
                style={{
                    background:
                        "radial-gradient(circle at center, #1b2030 0%, #0d0f17 100%)",
                }}
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
                    <Generator4 {...props} />
                </group>

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    minDistance={30}
                    maxDistance={250}
                />
                <Grid
                    position={[0, 0, -2]}
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

export { Generator4 };
export default Scene4;
