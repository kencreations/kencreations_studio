import React, { useEffect, useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export interface ClickerState {
    style: "classic" | "slim" | "elevated" | "ergonomic" | "custom";
    customStlUrl: string | null;
    customStlName: string | null;
    baseColor: string;
    hookColor: string;
    hookEnabled: boolean;
    hookStyle: "ring" | "elevated" | "carabiner" | "tab" | "connector";
    hookPosition: "top" | "bottom" | "left" | "right";
    hookWidth: number;
    hookHeight: number;
    hookThickness: number;
    hookHoleRadius: number;
    hookOffsetX: number;
    hookOffsetY: number;
    hookOffsetZ: number;
    logoRemoved: boolean;
    // Legacy cover plate fields kept for backwards compat (unused)
    logoCoverEnabled: boolean;
    logoCoverWidth: number;
    logoCoverHeight: number;
    logoCoverThickness: number;
    logoCoverOffsetX: number;
    logoCoverOffsetY: number;
    logoCoverOffsetZ: number;
    logoCoverRotX: number;
    logoCoverRotY: number;
    logoCoverRotZ: number;
}

interface SceneProps {
    state: ClickerState;
    setBaseMeshRef: (mesh: THREE.Mesh | null) => void;
    setHookMeshRef: (mesh: THREE.Mesh | null) => void;
    setCoverMeshRef: (mesh: THREE.Mesh | null) => void;
    activeLayer?: number;
    totalLayers?: number;
    slicerPathProgress?: number;
    isSlicing?: boolean;
}

/**
 * Flattens the embossed logo region on the clicker base geometry.
 *
 * Strategy: After centering the geometry, the model's logo relief sits on
 * the front face (Y > 0 side). We:
 *  1. Sample all vertices on that face by filtering Y close to bbox.max.y.
 *  2. Determine the median Y of those surface vertices (the "wall plane").
 *  3. For every vertex within a tight XZ bounding box matching the logo
 *     footprint that protrudes PAST the wall plane, snap it back to the
 *     wall Y — erasing the relief.
 *  4. Recompute normals so shading is clean.
 *
 * Note: The exact bounds below are tuned for the elevated-base STL.
 * For custom uploads the function gracefully degrades (no crash).
 */
function flattenLogoRegion(geometry: THREE.BufferGeometry): void {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    if (!posAttr) return;

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const bboxSize = new THREE.Vector3();
    bbox.getSize(bboxSize);
    const bboxCenter = new THREE.Vector3();
    bbox.getCenter(bboxCenter);

    // Detect the "front face" wall Y (max Y side of the body, above centre)
    // We'll compute the median Y of all vertices that are near the outer
    // Y surface so we know the wall plane even if the model changes slightly.
    const ySamples: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        // Vertices near the top/front: Y within top 15% of bbox height
        if (v.y > bbox.max.y - bboxSize.y * 0.15) {
            ySamples.push(v.y);
        }
    }
    if (ySamples.length === 0) return;

    ySamples.sort((a, b) => a - b);
    // Use 25th percentile as "surface plane" to avoid outlier logo verts
    const wallY = ySamples[Math.floor(ySamples.length * 0.25)];

    // Logo footprint on the front face: centred on X, in upper-Z half
    // These XZ bounds cover the typical 20×10 mm logo area on the sloped top face.
    const logoXHalf = bboxSize.x * 0.38;   // ±38% of width
    const logoCentreX = bboxCenter.x;
    const logoZLow  = bboxCenter.z + bboxSize.z * 0.15;  // lower Z of logo
    const logoZHigh = bbox.max.z;                          // up to top of model

    let changed = 0;
    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);

        const inXBand = v.x > logoCentreX - logoXHalf && v.x < logoCentreX + logoXHalf;
        const inZBand = v.z > logoZLow && v.z < logoZHigh;
        const protruding = v.y > wallY + 0.05; // only relief verts stick out past wall

        if (inXBand && inZBand && protruding) {
            posAttr.setY(i, wallY);
            changed++;
        }
    }

    if (changed > 0) {
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();
    }
}

// Custom Extruder Nozzle Component for Slicing Animation
const PrintNozzle: React.FC<{
    bounds: THREE.Box3 | null;
    activeLayer: number;
    totalLayers: number;
    slicerPathProgress: number;
    floorZ: number;
}> = ({ bounds, activeLayer, totalLayers, slicerPathProgress, floorZ }) => {
    if (!bounds || activeLayer === undefined || totalLayers === undefined)
        return null;

    const size = new THREE.Vector3();
    bounds.getSize(size);
    const center = new THREE.Vector3();
    bounds.getCenter(center);

    const layerThickness = size.z / totalLayers;
    const nozzleZ = floorZ + activeLayer * layerThickness;

    const scanLines = 30;
    const scanIndex = Math.floor(slicerPathProgress * scanLines);
    const scanLineT = (slicerPathProgress * scanLines) % 1;

    let nozzleX = center.x;
    let nozzleY = center.y;

    if (size.x > 0 && size.y > 0) {
        const startX = center.x - size.x / 2;
        const endX = center.x + size.x / 2;
        const currentX = startX + (scanIndex / scanLines) * size.x;
        const startY = center.y - size.y / 2;
        const endY = center.y + size.y / 2;

        nozzleX = currentX;
        nozzleY =
            scanIndex % 2 === 0
                ? startY + scanLineT * (endY - startY)
                : endY - scanLineT * (endY - startY);
    }

    return (
        <group position={[nozzleX, nozzleY, nozzleZ]}>
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, 8]}>
                <coneGeometry args={[3, 16, 16]} />
                <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
            </mesh>
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
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.4, 8, 8]} />
                <meshBasicMaterial color="#ff7800" />
            </mesh>
            <pointLight distance={15} intensity={2.0} color="#ffaa00" />
        </group>
    );
};

const ModelLoader: React.FC<{
    state: ClickerState;
    setBaseMeshRef: (mesh: THREE.Mesh | null) => void;
    setHookMeshRef: (mesh: THREE.Mesh | null) => void;
    setCoverMeshRef: (mesh: THREE.Mesh | null) => void;
    activeLayer?: number;
    totalLayers?: number;
    slicerPathProgress?: number;
    isSlicing?: boolean;
    setBounds: (bounds: THREE.Box3 | null) => void;
}> = ({
    state,
    setBaseMeshRef,
    setHookMeshRef,
    setCoverMeshRef,
    activeLayer,
    totalLayers,
    slicerPathProgress,
    isSlicing,
    setBounds,
}) => {
    const [baseGeometry, setBaseGeometry] =
        useState<THREE.BufferGeometry | null>(null);
    const [connectorGeometry, setConnectorGeometry] =
        useState<THREE.BufferGeometry | null>(null);

    const baseMeshRef = useRef<THREE.Mesh>(null);
    const hookMeshRef = useRef<THREE.Mesh>(null);

    // 1. Determine active model URL
    const modelUrl = useMemo(() => {
        if (state.style === "custom" && state.customStlUrl) {
            return state.customStlUrl;
        }
        const fileNames = {
            classic:    "/models/obj_1_fidget clicker base.stl",
            slim:       "/models/obj_2_fidget clicker base.stl",
            elevated:   "/models/obj_3_fidget clicker base.stl",
            ergonomic:  "/models/obj_4_fidget clicker base.stl",
            custom:     "/models/obj_3_fidget clicker base.stl",
        };
        return fileNames[state.style] || fileNames.elevated;
    }, [state.style, state.customStlUrl]);

    // 2. Load STL base geometry — re-runs whenever model URL or logoRemoved changes
    useEffect(() => {
        const loader = new STLLoader();
        loader.load(
            modelUrl,
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.center();

                // ✅ If user wants logo removed, flatten it in the geometry itself
                if (state.logoRemoved) {
                    flattenLogoRegion(geometry);
                }

                setBaseGeometry(geometry);
            },
            undefined,
            (error) => {
                console.error("Failed to load clicker base STL:", error);
            },
        );
    }, [modelUrl, state.logoRemoved]);

    // Load STL connector geometry
    useEffect(() => {
        const loader = new STLLoader();
        loader.load(
            "/models/obj_1_end connector.stl",
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.center();
                setConnectorGeometry(geometry);
            },
            undefined,
            (error) => {
                console.error("Failed to load end connector STL:", error);
            },
        );
    }, []);

    // 3. Generate Modular Hook Geometry procedurally
    const hookGeometry = useMemo(() => {
        if (!state.hookEnabled) return null;

        const w = state.hookWidth;
        const h = state.hookHeight;
        const t = state.hookThickness;
        const r = state.hookHoleRadius;

        let geo: THREE.BufferGeometry;

        if (state.hookStyle === "connector") {
            return connectorGeometry || new THREE.BoxGeometry(1, 1, 1);
        } else if (state.hookStyle === "ring") {
            geo = new THREE.TorusGeometry(w / 2, t / 2, 16, 64);
        } else if (state.hookStyle === "elevated") {
            const shape = new THREE.Shape();
            shape.moveTo(-w / 2, 0);
            shape.lineTo(w / 2, 0);
            shape.lineTo(w / 4, h);
            shape.lineTo(-w / 4, h);
            shape.lineTo(-w / 2, 0);

            const holePath = new THREE.Path();
            holePath.absarc(0, h / 2, r, 0, Math.PI * 2, true);
            shape.holes.push(holePath);

            geo = new THREE.ExtrudeGeometry(shape, {
                depth: t,
                bevelEnabled: true,
                bevelThickness: 0.2,
                bevelSize: 0.1,
                bevelSegments: 3,
                curveSegments: 32,
            });
            geo.translate(0, 0, -t / 2);
            geo.rotateX(Math.PI / 2);
        } else if (state.hookStyle === "carabiner") {
            const shape = new THREE.Shape();
            shape.absarc(-w / 4, 0, h / 2, Math.PI / 2, Math.PI * 1.5);
            shape.absarc(w / 4, 0, h / 2, Math.PI * 1.5, Math.PI / 2);
            shape.closePath();

            const holePath = new THREE.Path();
            holePath.absarc(-w / 4, 0, r, Math.PI / 2, Math.PI * 1.5);
            holePath.absarc(w / 4, 0, r, Math.PI * 1.5, Math.PI / 2);
            holePath.closePath();
            shape.holes.push(holePath);

            geo = new THREE.ExtrudeGeometry(shape, {
                depth: t,
                bevelEnabled: false,
                curveSegments: 32,
            });
            geo.translate(0, 0, -t / 2);
        } else {
            const shape = new THREE.Shape();
            shape.moveTo(-w / 2, -h / 2);
            shape.lineTo(w / 2, -h / 2);
            shape.lineTo(w / 2, h / 2);
            shape.lineTo(-w / 2, h / 2);
            shape.lineTo(-w / 2, -h / 2);

            const holePath = new THREE.Path();
            holePath.absarc(0, 0, r, 0, Math.PI * 2, true);
            shape.holes.push(holePath);

            geo = new THREE.ExtrudeGeometry(shape, {
                depth: t,
                bevelEnabled: true,
                bevelThickness: 0.3,
                bevelSize: 0.2,
                bevelSegments: 3,
                curveSegments: 32,
            });
            geo.translate(0, 0, -t / 2);
        }

        return geo;
    }, [
        state.hookEnabled,
        state.hookStyle,
        state.hookWidth,
        state.hookHeight,
        state.hookThickness,
        state.hookHoleRadius,
        connectorGeometry,
    ]);

    // 4. Calculate Hook Placement dynamically on Base Boundaries
    const hookPlacement = useMemo(() => {
        if (!baseGeometry) return { x: 0, y: 0, z: 0, rotZ: 0 };

        baseGeometry.computeBoundingBox();
        const bbox = baseGeometry.boundingBox || new THREE.Box3();
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        let hx = center.x + state.hookOffsetX;
        let hy = center.y + state.hookOffsetY;
        let hz = center.z + state.hookOffsetZ;
        let rotZ = 0;

        if (state.hookPosition === "top") {
            hy = bbox.max.y + state.hookHeight / 2;
            rotZ = 0;
        } else if (state.hookPosition === "bottom") {
            hy = bbox.min.y - state.hookHeight / 2;
            rotZ = Math.PI;
        } else if (state.hookPosition === "left") {
            hx = bbox.min.x - state.hookWidth / 2;
            rotZ = Math.PI / 2;
        } else if (state.hookPosition === "right") {
            hx = bbox.max.x + state.hookWidth / 2;
            rotZ = -Math.PI / 2;
        }

        return { x: hx, y: hy, z: hz, rotZ };
    }, [
        baseGeometry,
        state.hookPosition,
        state.hookWidth,
        state.hookHeight,
        state.hookOffsetX,
        state.hookOffsetY,
        state.hookOffsetZ,
    ]);

    // 5. Update parent bounds & refs for exports/slicing
    useEffect(() => {
        if (baseMeshRef.current) {
            setBaseMeshRef(baseMeshRef.current);
        } else {
            setBaseMeshRef(null);
        }
        if (hookMeshRef.current && state.hookEnabled) {
            setHookMeshRef(hookMeshRef.current);
        } else {
            setHookMeshRef(null);
        }
        // No cover mesh — logo is removed directly from geometry
        setCoverMeshRef(null);

        if (baseMeshRef.current) {
            const combinedBox = new THREE.Box3().setFromObject(baseMeshRef.current);
            if (hookMeshRef.current && state.hookEnabled) {
                combinedBox.expandByObject(hookMeshRef.current);
            }
            setBounds(combinedBox);
        }
    }, [
        baseGeometry,
        hookGeometry,
        hookPlacement,
        state.hookEnabled,
        state.logoRemoved,
        setBaseMeshRef,
        setHookMeshRef,
        setCoverMeshRef,
        setBounds,
    ]);

    // 6. Layer Slicing clipping planes
    const clippingPlanes = useMemo(() => {
        if (
            !isSlicing ||
            activeLayer === undefined ||
            totalLayers === undefined ||
            !baseMeshRef.current
        )
            return [];

        const bounds = new THREE.Box3().setFromObject(baseMeshRef.current);
        if (hookMeshRef.current && state.hookEnabled) {
            bounds.expandByObject(hookMeshRef.current);
        }

        const size = new THREE.Vector3();
        bounds.getSize(size);

        const layerThickness = size.z / totalLayers;
        const sliceZ = bounds.min.z + activeLayer * layerThickness;
        return [new THREE.Plane(new THREE.Vector3(0, 0, -1), sliceZ)];
    }, [isSlicing, activeLayer, totalLayers, state.hookEnabled]);

    return (
        <group>
            {/* 1. Base Mesh */}
            {baseGeometry && (
                <mesh
                    ref={baseMeshRef}
                    geometry={baseGeometry}
                    name="base"
                    castShadow
                    receiveShadow>
                    <meshStandardMaterial
                        color={state.baseColor}
                        roughness={0.4}
                        metalness={0.1}
                        clippingPlanes={clippingPlanes}
                        clipShadows
                    />
                </mesh>
            )}

            {/* 2. Modular Hook Mesh */}
            {state.hookEnabled && hookGeometry && (
                <mesh
                    ref={hookMeshRef}
                    geometry={hookGeometry}
                    name="hook"
                    position={[hookPlacement.x, hookPlacement.y, hookPlacement.z]}
                    rotation={[0, 0, hookPlacement.rotZ]}
                    scale={
                        state.hookStyle === "connector"
                            ? [
                                  state.hookWidth / 15,
                                  state.hookHeight / 18,
                                  state.hookThickness / 4,
                              ]
                            : [1, 1, 1]
                    }
                    castShadow
                    receiveShadow>
                    <meshStandardMaterial
                        color={state.hookColor}
                        roughness={0.4}
                        metalness={0.1}
                        clippingPlanes={clippingPlanes}
                        clipShadows
                    />
                </mesh>
            )}
        </group>
    );
};

const SceneClicker: React.FC<SceneProps> = (props) => {
    
    const [bounds, setBounds] = useState<THREE.Box3 | null>(null);

    const floorZ = useMemo(() => {
        if (!bounds) return -10;
        return bounds.min.z;
    }, [bounds]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                shadows
                camera={{ position: [0, -120, 100], fov: 40 }}
                gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
                style={{
                    background:
                        "radial-gradient(circle at center, #1b2030 0%, #0d0f17 100%)",
                }}>
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
                    <ModelLoader {...props} setBounds={setBounds} />

                    {isSlicing &&
                        activeLayer !== undefined &&
                        totalLayers !== undefined &&
                        slicerPathProgress !== undefined && (
                            <PrintNozzle
                                bounds={bounds}
                                activeLayer={activeLayer}
                                totalLayers={totalLayers}
                                slicerPathProgress={slicerPathProgress}
                                floorZ={floorZ}
                            />
                        )}
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

export default SceneClicker;
