import React, { useEffect, useState, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Evaluator, Brush, SUBTRACTION } from "three-bvh-csg";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface ClickerState {
    style: "classic" | "slim" | "elevated" | "ergonomic" | "custom" | "svg";
    customStlUrl: string | null;
    customStlName: string | null;

    customSvgString: string | null;
    customSvgName: string | null;

    customImageUrl: string | null;
    customImageName: string | null;

    svgScale: number;
    svgMode: "none" | "keychain" | "clicker";
    svgExtrusion: number;

    // Keychain Mode
    keychainLoopRadius: number;
    keychainLoopTube: number;
    keychainAttachOffset: number;

    // Clicker Mode (Cherry MX)
    clickerWallThickness: number;
    clickerTolerance: number;
    clickerDepth: number;

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

interface SvgPathMesh {
    geo: THREE.BufferGeometry;
    color: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// CHERRY MX CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MX_BODY_SIZE   = 13.8;  // switch body square (mm)
const MX_STEM_HORIZ  = 4.4;   // cross fin width (mm)
const MX_STEM_VERT   = 1.3;   // cross fin thickness (mm)
const FLOOR_THICKNESS = 2.0;  // housing floor plate depth (mm)

// ─────────────────────────────────────────────────────────────────────────────
// LOGO FLATTEN UTILITY
// ─────────────────────────────────────────────────────────────────────────────
function flattenLogoRegion(geometry: THREE.BufferGeometry): void {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    if (!posAttr) return;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const bboxSize = new THREE.Vector3();
    bbox.getSize(bboxSize);
    const bboxCenter = new THREE.Vector3();
    bbox.getCenter(bboxCenter);
    const ySamples: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        if (v.y > bbox.max.y - bboxSize.y * 0.15) ySamples.push(v.y);
    }
    if (!ySamples.length) return;
    ySamples.sort((a, b) => a - b);
    const wallY = ySamples[Math.floor(ySamples.length * 0.25)];
    const logoXHalf = bboxSize.x * 0.38;
    const logoCentreX = bboxCenter.x;
    const logoZLow = bboxCenter.z + bboxSize.z * 0.15;
    const logoZHigh = bbox.max.z;
    let changed = 0;
    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        if (
            v.x > logoCentreX - logoXHalf && v.x < logoCentreX + logoXHalf &&
            v.z > logoZLow && v.z < logoZHigh && v.y > wallY + 0.05
        ) {
            posAttr.setY(i, wallY);
            changed++;
        }
    }
    if (changed > 0) { posAttr.needsUpdate = true; geometry.computeVertexNormals(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG → MULTI-COLOUR PATH MESHES
// Each SVG path becomes its own geometry retaining its original fill colour.
// All geometries share a common centre derived from the combined bounding box.
// ─────────────────────────────────────────────────────────────────────────────
function parseSvgToPaths(
    svgString: string,
    scale: number,
    extrusion: number,
    fallbackColor: string,
): SvgPathMesh[] {
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: extrusion,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.3,
        bevelSegments: 3,
        curveSegments: 20,
    };

    const rawGeos: THREE.BufferGeometry[] = [];
    const colors: string[] = [];

    for (const path of svgData.paths) {
        const shapes = path.toShapes(true);
        if (!shapes.length) continue;
        const style: any = path.userData?.style ?? {};
        let fill: string = style.fill ?? "";
        if (!fill || fill === "none") fill = fallbackColor;
        const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
        geo.rotateX(Math.PI); // SVG Y-axis is inverted relative to Three.js
        geo.scale(scale, scale, 1);
        rawGeos.push(geo);
        colors.push(fill);
    }

    if (!rawGeos.length) return [];

    // Compute combined bounding box so all paths share the same centre
    const combined = new THREE.Box3();
    for (const g of rawGeos) {
        g.computeBoundingBox();
        combined.union(g.boundingBox!);
    }
    const centre = new THREE.Vector3();
    combined.getCenter(centre);

    return rawGeos.map((geo, i) => {
        geo.translate(-centre.x, -centre.y, -centre.z);
        geo.computeVertexNormals();
        (geo as any).computeBoundsTree?.();
        return { geo, color: colors[i] };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// PNG / JPG → SILHOUETTE SHAPE
// Threshold pixels via canvas, walk column-by-column to build the outline.
// ─────────────────────────────────────────────────────────────────────────────
async function imageToSvgPath(
    dataUrl: string,
    scale: number,
    extrusion: number,
    fallbackColor: string,
): Promise<SvgPathMesh[]> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const RESOLUTION = 256;
            const aspect = img.naturalWidth / img.naturalHeight;
            const cw = RESOLUTION;
            const ch = Math.round(RESOLUTION / aspect);
            const canvas = document.createElement("canvas");
            canvas.width = cw; canvas.height = ch;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            const { data } = ctx.getImageData(0, 0, cw, ch);

            const isSolid = (x: number, y: number): boolean => {
                const idx = (y * cw + x) * 4;
                const a = data[idx + 3];
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                return a > 128 && brightness < 200;
            };

            const norm = (v: number, total: number) => ((v / total) - 0.5) * 50 * scale;
            const topPts: [number, number][] = [];
            const botPts: [number, number][] = [];

            for (let x = 0; x < cw; x++) {
                let top = -1, bot = -1;
                for (let y = 0; y < ch; y++) {
                    if (isSolid(x, y)) { if (top === -1) top = y; bot = y; }
                }
                if (top !== -1) {
                    topPts.push([norm(x, cw), -norm(top, ch)]);
                    botPts.push([norm(x, cw), -norm(bot, ch)]);
                }
            }

            if (topPts.length < 4) { resolve([]); return; }

            const shape = new THREE.Shape();
            shape.moveTo(topPts[0][0], topPts[0][1]);
            for (const [px, py] of topPts) shape.lineTo(px, py);
            for (let i = botPts.length - 1; i >= 0; i--) shape.lineTo(botPts[i][0], botPts[i][1]);
            shape.closePath();

            const geo = new THREE.ExtrudeGeometry([shape], {
                depth: extrusion,
                bevelEnabled: true,
                bevelThickness: 0.3,
                bevelSize: 0.3,
                bevelSegments: 3,
                curveSegments: 16,
            });
            geo.center();
            geo.computeVertexNormals();
            (geo as any).computeBoundsTree?.();
            resolve([{ geo, color: fallbackColor }]);
        };
        img.onerror = () => resolve([]);
        img.src = dataUrl;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MX CLICKER HOUSING  ← constructive primitive approach (no CSG)
//
// The SVG logo face remains completely untouched (positive Z, clean).
// The housing is built from box primitives in NEGATIVE Z space — entirely
// behind the logo's back face.
//
// Structure (5 walls + 4 floor tiles):
//
//   ┌─────────────────────────┐  ← top wall
//   │  ┌───────────────────┐  │  ← inner pocket (open top towards logo)
//   │  │                   │  │
//   │  │    switch sits    │  │
//   │  │       here        │  │
//   │  └──┬──┬──────┬──┬───┘  │  ← floor tiles with cross void
//   └─────┴──┘      └──┴──────┘  ← bottom wall
//         ↑
//     stem cross void (4.40 × 1.30 mm)
//
// ─────────────────────────────────────────────────────────────────────────────
const MxClickerHousing: React.FC<{
    svgBBox: THREE.Box3;
    wallThickness: number;
    clearanceTolerance: number;
    housingDepth: number;
    color: string;
}> = ({ svgBBox, wallThickness, clearanceTolerance, housingDepth, color }) => {
    // ── Derived dimensions ────────────────────────────────────────────────
    const innerSize = MX_BODY_SIZE + clearanceTolerance;   // inner pocket (square)
    const outerW    = innerSize + 2 * wallThickness;
    const outerH    = innerSize + 2 * wallThickness;

    // Cross void (simplified to square hole = stemHoriz × stemHoriz)
    const crossW = MX_STEM_HORIZ + clearanceTolerance;     // 4.4 + tol
    const crossH = MX_STEM_HORIZ + clearanceTolerance;     // use square for clean floor

    // Floor tile strip sizes around the cross void
    const floorStripW = outerW / 2 - crossW / 2;     // left / right strips
    const floorStripH = outerH / 2 - crossH / 2;     // top / bottom centre strips

    // ── Group placement ───────────────────────────────────────────────────
    // Sit the housing open face flush with the SVG back face (svgBBox.min.z)
    // Group centre is at the midpoint of the wall depth
    const centre = new THREE.Vector3();
    svgBBox.getCenter(centre);
    const groupZ = svgBBox.min.z - housingDepth / 2;

    // Floor Z relative to group centre (just below the wall bottom)
    const floorLocalZ = -(housingDepth / 2 + FLOOR_THICKNESS / 2);

    // ── Wall positions (local to group) ──────────────────────────────────
    const lx = -(innerSize / 2 + wallThickness / 2);   // left wall centre X
    const rx =  (innerSize / 2 + wallThickness / 2);   // right wall centre X
    const ty =  (innerSize / 2 + wallThickness / 2);   // top wall centre Y
    const by = -(innerSize / 2 + wallThickness / 2);   // bottom wall centre Y

    const mat = (
        <meshStandardMaterial
            color={color}
            roughness={0.55}
            metalness={0.05}
            side={THREE.FrontSide}
        />
    );

    const floorMat = (
        <meshStandardMaterial
            color={color}
            roughness={0.6}
            metalness={0.02}
        />
    );

    // ── Small cross indicator ─────────────────────────────────────────────
    // Renders the cross void shape as a recessed highlight so designers can
    // visually verify alignment in the 3D preview.
    const crossIndicatorZ = floorLocalZ + FLOOR_THICKNESS / 2 + 0.05;
    const crossColor = "#7c3aed"; // purple accent for visibility

    return (
        <group position={[centre.x, centre.y, groupZ]}>

            {/* ══════════════════════ 4 PERIMETER WALLS ══════════════════ */}

            {/* Left wall */}
            <mesh castShadow receiveShadow position={[lx, 0, 0]}>
                <boxGeometry args={[wallThickness, outerH, housingDepth]} />
                {mat}
            </mesh>

            {/* Right wall */}
            <mesh castShadow receiveShadow position={[rx, 0, 0]}>
                <boxGeometry args={[wallThickness, outerH, housingDepth]} />
                {mat}
            </mesh>

            {/* Top wall (inner width only — left/right walls already cover corners) */}
            <mesh castShadow receiveShadow position={[0, ty, 0]}>
                <boxGeometry args={[innerSize, wallThickness, housingDepth]} />
                {mat}
            </mesh>

            {/* Bottom wall */}
            <mesh castShadow receiveShadow position={[0, by, 0]}>
                <boxGeometry args={[innerSize, wallThickness, housingDepth]} />
                {mat}
            </mesh>

            {/* ═══════════════════════ FLOOR PLATE ═══════════════════════ */}
            {/*
              Built as 4 rectangles arranged around the stem cross void so
              the floor plate has a clean cross-shaped pass-through for the
              MX switch stem.  No CSG needed.

              Layout (bird's eye view of floor):
              ┌────────┬────┬────────┐
              │ left   │ TL │ right  │  ← top row
              │ strip  │    │ strip  │
              ├────────┘    └────────┤
              │     CROSS VOID      │  ← open (switch stem travel)
              ├────────┐    ┌────────┤
              │ left   │ BL │ right  │  ← bottom row
              │ strip  │    │ strip  │
              └────────┴────┴────────┘
            */}

            {/* Left floor strip */}
            <mesh castShadow receiveShadow
                position={[-(crossW / 2 + floorStripW / 2), 0, floorLocalZ]}>
                <boxGeometry args={[floorStripW, outerH, FLOOR_THICKNESS]} />
                {floorMat}
            </mesh>

            {/* Right floor strip */}
            <mesh castShadow receiveShadow
                position={[+(crossW / 2 + floorStripW / 2), 0, floorLocalZ]}>
                <boxGeometry args={[floorStripW, outerH, FLOOR_THICKNESS]} />
                {floorMat}
            </mesh>

            {/* Top centre floor tile (between cross void top and top wall) */}
            <mesh castShadow receiveShadow
                position={[0, +(crossH / 2 + floorStripH / 2), floorLocalZ]}>
                <boxGeometry args={[crossW, floorStripH, FLOOR_THICKNESS]} />
                {floorMat}
            </mesh>

            {/* Bottom centre floor tile */}
            <mesh castShadow receiveShadow
                position={[0, -(crossH / 2 + floorStripH / 2), floorLocalZ]}>
                <boxGeometry args={[crossW, floorStripH, FLOOR_THICKNESS]} />
                {floorMat}
            </mesh>

            {/* ════════════════ STEM CROSS INDICATOR ══════════════════════ */}
            {/*
              Two overlapping coloured discs in the floor void to show where
              the 4.40 × 1.30 mm Cherry MX stem cross will be.
              These are PREVIEW-ONLY and do not affect the exported mesh.
            */}
            {/* Horizontal bar */}
            <mesh position={[0, 0, crossIndicatorZ]}>
                <boxGeometry args={[MX_STEM_HORIZ + clearanceTolerance, MX_STEM_VERT + clearanceTolerance, 0.1]} />
                <meshStandardMaterial color={crossColor} emissive={crossColor} emissiveIntensity={0.4} transparent opacity={0.85} />
            </mesh>
            {/* Vertical bar */}
            <mesh position={[0, 0, crossIndicatorZ]}>
                <boxGeometry args={[MX_STEM_VERT + clearanceTolerance, MX_STEM_HORIZ + clearanceTolerance, 0.1]} />
                <meshStandardMaterial color={crossColor} emissive={crossColor} emissiveIntensity={0.4} transparent opacity={0.85} />
            </mesh>
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRINT NOZZLE ANIMATION
// ─────────────────────────────────────────────────────────────────────────────
const PrintNozzle: React.FC<{
    bounds: THREE.Box3 | null;
    activeLayer: number;
    totalLayers: number;
    slicerPathProgress: number;
    floorZ: number;
}> = ({ bounds, activeLayer, totalLayers, slicerPathProgress, floorZ }) => {
    if (!bounds) return null;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    const nozzleZ = floorZ + (activeLayer / totalLayers) * size.z;
    const scanLines = 30;
    const scanIndex = Math.floor(slicerPathProgress * scanLines);
    const scanLineT = (slicerPathProgress * scanLines) % 1;
    let nozzleX = center.x, nozzleY = center.y;
    if (size.x > 0 && size.y > 0) {
        const startX = center.x - size.x / 2;
        const currentX = startX + (scanIndex / scanLines) * size.x;
        const startY = center.y - size.y / 2;
        const endY = center.y + size.y / 2;
        nozzleX = currentX;
        nozzleY = scanIndex % 2 === 0
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
                <meshStandardMaterial color="#ca8a04" roughness={0.2} metalness={0.9} emissive="#caca24" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.4, 8, 8]} />
                <meshBasicMaterial color="#ff7800" />
            </mesh>
            <pointLight distance={15} intensity={2.0} color="#ffaa00" />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODEL LOADER
// ─────────────────────────────────────────────────────────────────────────────
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
    setBaseMeshRef, setHookMeshRef, setCoverMeshRef,
    activeLayer, totalLayers, slicerPathProgress, isSlicing,
    setBounds,
}) => {
    const [baseGeometry,   setBaseGeometry]   = useState<THREE.BufferGeometry | null>(null);
    const [svgPaths,       setSvgPaths]       = useState<SvgPathMesh[]>([]);
    const [svgCombinedBox, setSvgCombinedBox] = useState<THREE.Box3 | null>(null);

    const baseMeshRef = useRef<THREE.Mesh>(null);
    const hookMeshRef = useRef<THREE.Mesh>(null);
    const ringMeshRef = useRef<THREE.Mesh>(null);

    // ── STL model (non-SVG styles) ────────────────────────────────────────
    const modelUrl = useMemo(() => {
        if (state.style === "custom" && state.customStlUrl) return state.customStlUrl;
        const map: Record<string, string> = {
            classic:   "/models/obj_1_fidget clicker base.stl",
            slim:      "/models/obj_2_fidget clicker base.stl",
            elevated:  "/models/obj_3_fidget clicker base.stl",
            ergonomic: "/models/obj_4_fidget clicker base.stl",
            custom:    "/models/obj_3_fidget clicker base.stl",
        };
        return map[state.style] ?? map.elevated;
    }, [state.style, state.customStlUrl]);

    useEffect(() => {
        if (state.style === "svg") return;
        new STLLoader().load(
            modelUrl,
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.center();
                if (state.logoRemoved) flattenLogoRegion(geometry);
                setBaseGeometry(geometry);
                setSvgPaths([]);
                setSvgCombinedBox(null);
            },
            undefined,
            (e) => console.error("STL load error:", e),
        );
    }, [modelUrl, state.logoRemoved, state.style]);

    // ── SVG / Image pipeline ──────────────────────────────────────────────
    useEffect(() => {
        if (state.style !== "svg") { setSvgPaths([]); setSvgCombinedBox(null); return; }
        if (!state.customSvgString && !state.customImageUrl) {
            setSvgPaths([]); setSvgCombinedBox(null); return;
        }

        const storePaths = (raw: SvgPathMesh[]) => {
            if (!raw.length) { setSvgPaths([]); setSvgCombinedBox(null); return; }

            // Compute combined bounding box for housing & ring placement
            const bbox = new THREE.Box3();
            for (const { geo } of raw) {
                geo.computeBoundingBox();
                bbox.union(geo.boundingBox!);
            }
            setSvgCombinedBox(bbox);

            // In clicker mode, SVG paths are NOT modified.
            // The housing is a separate constructive-geometry group (MxClickerHousing).
            setSvgPaths(raw);
        };

        if (state.customSvgString) {
            try {
                storePaths(parseSvgToPaths(
                    state.customSvgString,
                    state.svgScale,
                    state.svgExtrusion,
                    state.baseColor,
                ));
            } catch (err) {
                console.error("SVG parse error:", err);
                setSvgPaths([]);
            }
        } else if (state.customImageUrl) {
            imageToSvgPath(
                state.customImageUrl,
                state.svgScale,
                state.svgExtrusion,
                state.baseColor,
            ).then(storePaths);
        }
    }, [
        state.style,
        state.customSvgString,
        state.customImageUrl,
        state.svgScale,
        state.svgExtrusion,
        state.baseColor,
        // svgMode changes do NOT re-parse — the housing is rendered conditionally
    ]);

    // ── Keychain ring ─────────────────────────────────────────────────────
    const keychainRingGeo = useMemo<THREE.BufferGeometry | null>(() => {
        if (state.style !== "svg" || state.svgMode !== "keychain") return null;
        return new THREE.TorusGeometry(state.keychainLoopRadius, state.keychainLoopTube, 20, 80);
    }, [state.style, state.svgMode, state.keychainLoopRadius, state.keychainLoopTube]);

    const keychainRingPos = useMemo<[number, number, number]>(() => {
        if (!svgCombinedBox || state.svgMode !== "keychain") return [0, 0, 0];
        const c = new THREE.Vector3();
        svgCombinedBox.getCenter(c);
        return [c.x, svgCombinedBox.max.y + state.keychainLoopRadius + state.keychainAttachOffset, c.z];
    }, [svgCombinedBox, state.svgMode, state.keychainLoopRadius, state.keychainAttachOffset]);

    // ── Modular hook (non-SVG) ────────────────────────────────────────────
    const hookGeometry = useMemo(() => {
        if (!state.hookEnabled || state.style === "svg") return null;
        const w = state.hookWidth, h = state.hookHeight, t = state.hookThickness, r = state.hookHoleRadius;
        if (state.hookStyle === "ring") return new THREE.TorusGeometry(w / 2, t / 2, 16, 64);
        if (state.hookStyle === "elevated") {
            const s = new THREE.Shape();
            s.moveTo(-w/2, 0); s.lineTo(w/2, 0); s.lineTo(w/4, h); s.lineTo(-w/4, h); s.closePath();
            const hole = new THREE.Path(); hole.absarc(0, h/2, r, 0, Math.PI * 2, true); s.holes.push(hole);
            const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.1, bevelSegments: 3, curveSegments: 32 });
            geo.translate(0, 0, -t / 2); geo.rotateX(Math.PI / 2); return geo;
        }
        if (state.hookStyle === "carabiner") {
            const s = new THREE.Shape();
            s.absarc(-w/4, 0, h/2, Math.PI/2, Math.PI*1.5);
            s.absarc(w/4, 0, h/2, Math.PI*1.5, Math.PI/2);
            s.closePath();
            const hole = new THREE.Path();
            hole.absarc(-w/4, 0, r, Math.PI/2, Math.PI*1.5);
            hole.absarc(w/4, 0, r, Math.PI*1.5, Math.PI/2);
            hole.closePath();
            s.holes.push(hole);
            const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 32 });
            geo.translate(0, 0, -t / 2); return geo;
        }
        if (state.hookStyle === "tab") {
            const s = new THREE.Shape();
            s.moveTo(-w/2,-h/2); s.lineTo(w/2,-h/2); s.lineTo(w/2,h/2); s.lineTo(-w/2,h/2); s.closePath();
            const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(hole);
            const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.2, bevelSegments: 3, curveSegments: 32 });
            geo.translate(0, 0, -t / 2); return geo;
        }
        return new THREE.BoxGeometry(1, 1, 1); // connector fallback
    }, [state.hookEnabled, state.style, state.hookStyle, state.hookWidth, state.hookHeight, state.hookThickness, state.hookHoleRadius]);

    const hookPlacement = useMemo(() => {
        if (!baseGeometry) return { x: 0, y: 0, z: 0, rotZ: 0 };
        baseGeometry.computeBoundingBox();
        const bbox = baseGeometry.boundingBox!;
        const centre = new THREE.Vector3(); bbox.getCenter(centre);
        let hx = centre.x + state.hookOffsetX;
        let hy = centre.y + state.hookOffsetY;
        let hz = centre.z + state.hookOffsetZ;
        let rotZ = 0;
        if (state.hookPosition === "top")    { hy = bbox.max.y + state.hookHeight / 2; rotZ = 0; }
        if (state.hookPosition === "bottom") { hy = bbox.min.y - state.hookHeight / 2; rotZ = Math.PI; }
        if (state.hookPosition === "left")   { hx = bbox.min.x - state.hookWidth / 2; rotZ = Math.PI / 2; }
        if (state.hookPosition === "right")  { hx = bbox.max.x + state.hookWidth / 2; rotZ = -Math.PI / 2; }
        return { x: hx, y: hy, z: hz, rotZ };
    }, [baseGeometry, state.hookPosition, state.hookWidth, state.hookHeight, state.hookOffsetX, state.hookOffsetY, state.hookOffsetZ]);

    // ── Sync refs & bounds ────────────────────────────────────────────────
    useEffect(() => {
        setBaseMeshRef(baseMeshRef.current);
        const hookActive = state.hookEnabled && state.style !== "svg";
        setHookMeshRef(hookActive ? hookMeshRef.current : null);
        setCoverMeshRef(null);
        if (baseMeshRef.current) {
            const box = new THREE.Box3().setFromObject(baseMeshRef.current);
            if (hookActive && hookMeshRef.current) box.expandByObject(hookMeshRef.current);
            setBounds(box);
        } else if (svgCombinedBox) {
            setBounds(svgCombinedBox.clone());
        }
    }, [baseGeometry, svgPaths, svgCombinedBox, hookGeometry, hookPlacement,
        state.hookEnabled, state.style, state.svgMode,
        setBaseMeshRef, setHookMeshRef, setCoverMeshRef, setBounds]);

    const clippingPlanes = useMemo<THREE.Plane[]>(() => {
        if (!isSlicing || activeLayer === undefined || totalLayers === undefined || !baseMeshRef.current) return [];
        const b = new THREE.Box3().setFromObject(baseMeshRef.current);
        const size = new THREE.Vector3(); b.getSize(size);
        const sliceZ = b.min.z + (activeLayer / totalLayers) * size.z;
        return [new THREE.Plane(new THREE.Vector3(0, 0, -1), sliceZ)];
    }, [isSlicing, activeLayer, totalLayers]);

    return (
        <group>
            {/* ── SVG / Image multi-path meshes (unmodified, colours preserved) */}
            {state.style === "svg" && svgPaths.map((item, idx) => (
                <mesh
                    key={idx}
                    ref={idx === 0 ? baseMeshRef : undefined}
                    geometry={item.geo}
                    name={`svg-path-${idx}`}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color={item.color}
                        roughness={0.4}
                        metalness={0.08}
                        polygonOffset
                        polygonOffsetFactor={idx + 1}
                        polygonOffsetUnits={idx + 1}
                        clippingPlanes={clippingPlanes}
                        clipShadows
                    />
                </mesh>
            ))}

            {/* ── MX Clicker Housing (constructive primitives, behind SVG) ── */}
            {state.style === "svg" &&
                state.svgMode === "clicker" &&
                svgCombinedBox && (
                    <MxClickerHousing
                        svgBBox={svgCombinedBox}
                        wallThickness={state.clickerWallThickness}
                        clearanceTolerance={state.clickerTolerance}
                        housingDepth={state.clickerDepth}
                        color={state.hookColor}
                    />
                )}

            {/* ── Keychain ring ─────────────────────────────────────────── */}
            {state.style === "svg" &&
                state.svgMode === "keychain" &&
                keychainRingGeo && (
                    <mesh
                        ref={ringMeshRef}
                        geometry={keychainRingGeo}
                        position={keychainRingPos}
                        name="keychain-ring"
                        castShadow receiveShadow
                    >
                        <meshStandardMaterial
                            color={state.hookColor}
                            roughness={0.35}
                            metalness={0.15}
                            clippingPlanes={clippingPlanes}
                            clipShadows
                        />
                    </mesh>
                )}

            {/* ── STL base (non-SVG styles) ─────────────────────────────── */}
            {state.style !== "svg" && baseGeometry && (
                <mesh
                    ref={baseMeshRef}
                    geometry={baseGeometry}
                    name="base"
                    castShadow receiveShadow
                >
                    <meshStandardMaterial
                        color={state.baseColor}
                        roughness={0.4}
                        metalness={0.1}
                        clippingPlanes={clippingPlanes}
                        clipShadows
                    />
                </mesh>
            )}

            {/* ── Modular hook (non-SVG styles) ─────────────────────────── */}
            {state.style !== "svg" && state.hookEnabled && hookGeometry && (
                <mesh
                    ref={hookMeshRef}
                    geometry={hookGeometry}
                    name="hook"
                    position={[hookPlacement.x, hookPlacement.y, hookPlacement.z]}
                    rotation={[0, 0, hookPlacement.rotZ]}
                    castShadow receiveShadow
                >
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORTED SCENE
// ─────────────────────────────────────────────────────────────────────────────
const SceneClicker: React.FC<SceneProps> = (props) => {
    const { isSlicing, activeLayer, totalLayers, slicerPathProgress } = props;
    const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
    const floorZ = bounds?.min.z ?? -10;

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <Canvas
                shadows
                camera={{ position: [0, -120, 100], fov: 40 }}
                gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
                style={{ background: "radial-gradient(circle at center, #1b2030 0%, #0d0f17 100%)" }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[15, -30, 40]} intensity={1.2}
                    castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001}
                />
                <directionalLight position={[-15, 30, 20]} intensity={0.4} />
                <pointLight position={[0, 0, 25]} intensity={0.5} />

                <group>
                    <ModelLoader {...props} setBounds={setBounds} />
                    {isSlicing &&
                        activeLayer !== undefined &&
                        totalLayers !== undefined &&
                        slicerPathProgress !== undefined && (
                            <PrintNozzle
                                bounds={bounds}
                                activeLayer={activeLayer}
                                totalLayers={totalLayers}
                                slicerPathProgress={slicerPathProgress / 100}
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
                    cellSize={10} cellThickness={1.0} cellColor="#1e293b"
                    sectionSize={50} sectionThickness={1.5} sectionColor="#334155"
                    fadeDistance={180} infiniteGrid
                />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

export default SceneClicker;
