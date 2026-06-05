import React, { useEffect, useRef, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ── Available fonts ───────────────────────────────────────────────────────────
export const FONT_OPTIONS = [
    { label: "Titan One",   path: "/fonts/TitanOne.ttf" },
    { label: "Showpop",     path: "/fonts/Showpop.ttf" },
    { label: "Bebas Neue",  path: "/fonts/BebasNeue.ttf" },
    { label: "Kindergo",    path: "/fonts/Kindergo.ttf" },
    { label: "Retro Dolly", path: "/fonts/RetroDolly.ttf" },
    { label: "DynaPuff",    path: "/fonts/DynaPuff.ttf" },
    { label: "Pacifico",    path: "/fonts/Pacifico.ttf" },
    { label: "Coiny",       path: "/fonts/Coiny.ttf" },
];
export const AVAILABLE_FONTS = FONT_OPTIONS.map((f) => f.label);

// ── State ─────────────────────────────────────────────────────────────────────
export type KeycapState = {
    legends: string;
    capColor: string;
    legendColor: string;
    legendSizePct: number;
    legendDepth: number;
    fontLabel: string;
    topBorder: boolean;
    mergeForExport: boolean;
};

// ── Export handle ─────────────────────────────────────────────────────────────
export type SceneKeycapHandle = {
    exportMergedGeometry: () => { caps: THREE.BufferGeometry; legends: THREE.BufferGeometry } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function lettersFromLegends(legends: string): string[] {
    const result: string[] = [];
    for (const ch of legends) {
        if (ch.trim()) result.push(ch);
    }
    return result;
}

const SCALE   = 0.28;
const GAP_MM  = 1.5;  // mm gap between caps
const MAX_COLS = 6;

// spacing is computed dynamically once cap BB is known
function computeSpacing(capBB: THREE.Box3 | null): number {
    if (!capBB) return 20;
    const sz = new THREE.Vector3();
    capBB.getSize(sz);
    return sz.x * SCALE + GAP_MM;
}

export function gridPositions(
    count: number,
    spacing: number
): [number, number, number][] {
    const cols = Math.min(count, MAX_COLS);
    const rows = Math.ceil(count / cols);
    return Array.from({ length: count }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return [
            (c - (cols - 1) / 2) * spacing,
            ((rows - 1) / 2 - r) * spacing,
            0,
        ] as [number, number, number];
    });
}

export function computeSetBounds(
    count: number,
    capBB: THREE.Box3 | null
): { x: number; y: number; z: number } {
    if (!capBB || count === 0) return { x: 0, y: 0, z: 0 };
    const sz = new THREE.Vector3();
    capBB.getSize(sz);
    const spacing = computeSpacing(capBB);
    const cols = Math.min(count, MAX_COLS);
    const rows = Math.ceil(count / cols);
    const capW = sz.x * SCALE;
    const capH = sz.y * SCALE;
    return {
        x: Math.round((cols * capW + (cols - 1) * GAP_MM) * 10) / 10,
        y: Math.round((rows * capH + (rows - 1) * GAP_MM) * 10) / 10,
        z: Math.round(sz.z * SCALE * 10) / 10,
    };
}

// ── Geometry cache ────────────────────────────────────────────────────────────
const geoCache = new Map<string, THREE.ExtrudeGeometry | null>();

function buildLetterGeo(
    font: Font,
    ch: string,
    sizeUnits: number,
    depth: number
): THREE.ExtrudeGeometry | null {
    if (!ch.trim()) return null;
    const k = `${font.data.familyName}|${ch}|${sizeUnits.toFixed(2)}|${depth.toFixed(2)}`;
    if (geoCache.has(k)) return geoCache.get(k)!;
    const shapes = font.generateShapes(ch, sizeUnits);
    if (!shapes.length) { geoCache.set(k, null); return null; }
    const g = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.04,
        bevelSegments: 1,
        curveSegments: 14,
    });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
    geoCache.set(k, g);
    return g;
}

// ── Instanced cap bodies ──────────────────────────────────────────────────────
const CapInstances = React.memo(({
    capGeo,
    positions,
    color,
}: {
    capGeo: THREE.BufferGeometry;
    positions: [number, number, number][];
    color: string;
}) => {
    const ref = useRef<THREE.InstancedMesh>(null);
    const mat = useMemo(
        () => new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.06 }),
        [color]
    );

    useEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const m4 = new THREE.Matrix4();
        const sc = new THREE.Vector3(SCALE, SCALE, SCALE);
        positions.forEach((p, i) => {
            m4.compose(new THREE.Vector3(...p), new THREE.Quaternion(), sc);
            mesh.setMatrixAt(i, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }, [positions]);

    return (
        <instancedMesh ref={ref} args={[capGeo, mat, positions.length]} castShadow receiveShadow />
    );
});

// ── Letter meshes ─────────────────────────────────────────────────────────────
const LetterMeshes = React.memo(({
    letters, positions, font, sizeUnits, depth, color, letterZ,
}: {
    letters: string[]; positions: [number, number, number][];
    font: Font; sizeUnits: number; depth: number; color: string; letterZ: number;
}) => {
    const mat = useMemo(
        () => new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.04 }),
        [color]
    );
    return (
        <>
            {letters.map((ch, i) => {
                const geo = buildLetterGeo(font, ch, sizeUnits, depth);
                if (!geo) return null;
                const [x, y] = positions[i];
                return <mesh key={`${ch}-${i}`} geometry={geo} material={mat} position={[x, y, letterZ]} castShadow />;
            })}
        </>
    );
});

// ── Border rings ──────────────────────────────────────────────────────────────
const BorderRings = React.memo(({
    positions, capBB, color,
}: {
    positions: [number, number, number][]; capBB: THREE.Box3; color: string;
}) => {
    const sz = new THREE.Vector3();
    capBB.getSize(sz);
    const r = (Math.min(sz.x, sz.y) * SCALE) / 2;
    const geo = useMemo(() => new THREE.TorusGeometry(r * 0.88, r * 0.06, 10, 64), [r]);
    const mat = useMemo(
        () => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.06 }),
        [color]
    );
    const borderZ = capBB.max.z * SCALE + 0.1;
    return (
        <>
            {positions.map((p, i) => (
                <mesh key={i} geometry={geo} material={mat} position={[p[0], p[1], borderZ]} castShadow />
            ))}
        </>
    );
});

// ── SceneInner exposes export function via ref ────────────────────────────────
interface SceneInnerProps {
    state: KeycapState;
    onCapBB?: (bb: THREE.Box3 | null) => void;
}
interface SceneInnerHandle {
    buildExportGeo: () => { caps: THREE.BufferGeometry; legends: THREE.BufferGeometry } | null;
}

const SceneInner = forwardRef<SceneInnerHandle, SceneInnerProps>(({ state, onCapBB }, ref) => {
    const [capGeo, setCapGeo] = useState<THREE.BufferGeometry | null>(null);
    const [capBB,  setCapBB]  = useState<THREE.Box3 | null>(null);
    const [font,   setFont]   = useState<Font | null>(null);

    useEffect(() => {
        new STLLoader().load(
            "/models/keycaps/template.stl",
            (g) => {
                g.computeVertexNormals();
                g.center();
                g.computeBoundingBox();
                setCapGeo(g);
                const bb = g.boundingBox!.clone();
                setCapBB(bb);
                onCapBB?.(bb);
            },
            undefined,
            (e) => console.error("STL error", e)
        );
    }, []);

    useEffect(() => {
        const opt = FONT_OPTIONS.find((f) => f.label === state.fontLabel) ?? FONT_OPTIONS[0];
        const fl = new FontLoader();
        const tl = new TTFLoader();
        tl.load(opt.path, (json: any) => setFont(fl.parse(json)), undefined, (e) => console.error("Font error", e));
    }, [state.fontLabel]);

    const letters  = lettersFromLegends(state.legends);
    const spacing  = computeSpacing(capBB);
    const positions = useMemo(() => gridPositions(letters.length, spacing), [letters.length, spacing, letters.join("")]);

    const letterSizeUnits = useMemo(() => {
        if (!capBB) return 5;
        const sz = new THREE.Vector3();
        capBB.getSize(sz);
        return (sz.x * SCALE * state.legendSizePct) / 100;
    }, [capBB, state.legendSizePct]);

    const letterZ = capBB ? capBB.max.z * SCALE - 0.08 : 0;

    // ── Export geometry builder (NATIVE mm scale — no display SCALE applied) ──
    useImperativeHandle(ref, () => ({
        buildExportGeo(): { caps: THREE.BufferGeometry; legends: THREE.BufferGeometry } | null {
            if (!capGeo || !font || !capBB) return null;

            // Real cap dimensions in STL mm units, scaled exactly to 18x18mm
            const capSz = new THREE.Vector3();
            capBB.getSize(capSz);
            
            const TARGET_SIZE = 18; // mm
            const scaleX = TARGET_SIZE / capSz.x;
            const scaleY = TARGET_SIZE / capSz.y;
            const scaleZ = scaleX; // keep Z proportional to X

            const realSpacing  = TARGET_SIZE + GAP_MM;            // centre-to-centre mm
            const realCapTopZ  = capBB.max.z * scaleZ;          // top surface in mm
            const realLetterZ  = realCapTopZ - 0.05;            // barely proud of top
            const realLetterSz = (TARGET_SIZE * state.legendSizePct) / 100; // mm

            // Recompute grid positions in real mm (not display units)
            const count = letters.length;
            const cols  = Math.min(count, MAX_COLS);
            const rows  = Math.ceil(count / cols);
            const realPos: [number, number, number][] = Array.from({ length: count }, (_, i) => [
                (i % cols - (cols - 1) / 2) * realSpacing,
                ((rows - 1) / 2 - Math.floor(i / cols)) * realSpacing,
                0,
            ]);

            const capGeos: THREE.BufferGeometry[]    = [];
            const legendGeos: THREE.BufferGeometry[] = [];

            // Caps scaled to exactly 18x18mm
            realPos.forEach((pos) => {
                const g = capGeo.clone();
                g.applyMatrix4(new THREE.Matrix4().makeScale(scaleX, scaleY, scaleZ));
                g.applyMatrix4(new THREE.Matrix4().makeTranslation(...pos));
                capGeos.push(g);
            });

            // Legends at real mm size, placed on cap top surface
            letters.forEach((ch, i) => {
                const geo = buildLetterGeo(font, ch, realLetterSz, state.legendDepth);
                if (!geo) return;
                const [x, y] = realPos[i];
                const g = geo.clone();
                g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, realLetterZ));
                legendGeos.push(g);
            });

            const mergedCaps = capGeos.length
                ? BufferGeometryUtils.mergeGeometries(capGeos, false)
                : new THREE.BufferGeometry();
            const mergedLegends = legendGeos.length
                ? BufferGeometryUtils.mergeGeometries(legendGeos, false)
                : new THREE.BufferGeometry();

            return { caps: mergedCaps, legends: mergedLegends };
        }
    }), [capGeo, capBB, font, letters, state.legendSizePct, state.legendDepth]);

    if (!capGeo) return null;

    return (
        <>
            <CapInstances capGeo={capGeo} positions={positions} color={state.capColor} />
            {state.topBorder && capBB && (
                <BorderRings positions={positions} capBB={capBB} color={state.legendColor} />
            )}
            {font && (
                <LetterMeshes
                    letters={letters} positions={positions} font={font}
                    sizeUnits={letterSizeUnits} depth={state.legendDepth}
                    color={state.legendColor} letterZ={letterZ}
                />
            )}
        </>
    );
});

// ── Inner canvas wrapper to bridge ref into R3F context ───────────────────────
const InnerWrapper = forwardRef<SceneInnerHandle, SceneInnerProps>((props, ref) => {
    return <SceneInner ref={ref} {...props} />;
});

// ── Public canvas component ───────────────────────────────────────────────────
const SceneKeycap = forwardRef<SceneInnerHandle, {
    state: KeycapState;
    onCapBB?: (bb: THREE.Box3 | null) => void;
}>(({ state, onCapBB }, ref) => {
    const letters  = lettersFromLegends(state.legends);
    const cols     = Math.min(Math.max(letters.length, 1), MAX_COLS);
    const rows     = Math.ceil(Math.max(letters.length, 1) / cols);
    const d        = Math.max(60, cols * 18 + rows * 14);

    return (
        <div style={{ width: "100%", height: "100%", background: "#f4f6f9" }}>
            <Canvas
                shadows={false}
                camera={{ position: [0, -d * 0.55, d * 0.85], fov: 38 }}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                style={{ background: "#f4f6f9" }}>

                <ambientLight intensity={1.0} color="#ffffff" />
                <directionalLight position={[10, -20, 30]} intensity={1.2} color="#ffffff" />
                <directionalLight position={[-15, 15, 15]} intensity={0.5} color="#e8efff" />
                <hemisphereLight args={["#ddeeff", "#bbccdd", 0.4]} />

                <InnerWrapper ref={ref} state={state} onCapBB={onCapBB} />

                <OrbitControls enableDamping dampingFactor={0.07}
                    minDistance={10} maxDistance={500}
                    maxPolarAngle={Math.PI / 2 + 0.25} />

                {/* Light grid matching reference */}
                <Grid
                    position={[0, 0, -12]}
                    args={[500, 500]}
                    cellSize={6} cellThickness={0.5} cellColor="#c8d4e0"
                    sectionSize={30} sectionThickness={0.8} sectionColor="#adbdcf"
                    fadeDistance={250} infiniteGrid
                />
            </Canvas>
        </div>
    );
});

export default SceneKeycap;
export type { SceneInnerHandle };
