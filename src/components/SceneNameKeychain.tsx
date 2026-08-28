/**
 * SceneNameKeychain.tsx  —  3D preview for the Name Keychain Generator
 *
 * Geometry (front-to-back):
 *   Text extrusion   z = outlineDepth … outlineDepth+textDepth   (textColor)
 *   Backing plate    z = 0 … outlineDepth                         (outlineColor)
 *   Border plate     z = -0.8 … 0                                 (borderColor, optional)
 *   Ring             centred in hole at top of plate               (silver metallic)
 */
import React, {
    useEffect,
    useRef,
    useState,
    useMemo,
    useImperativeHandle,
    forwardRef,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface NameLine {
    id: string;
    text: string;
    fontLabel: string;
    size: number;   // mm
    depth: number;  // mm
    spacing: number;// letter-spacing (currently unused by TextGeometry but stored)
    color: string;
}

export interface NameKeychainState {
    lines: NameLine[];
    lineSpacing: number;        // mm gap between stacked lines
    outlineThickness: number;   // plate padding around text
    outlineDepth: number;       // plate extrusion depth
    outlineColor: string;
    borderEnabled: boolean;
    borderThickness: number;
    borderColor: string;
    ringRadius: number;
    ringTube: number;
    cornerRadius: number;
}

export interface SceneHandle {
    exportSTL: () => void;
    export3MF: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONT CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────
export const KEYCHAIN_FONTS = [
    { label: "Pacifico",         path: "/fonts/Pacifico.ttf" },
    { label: "Titan One",        path: "/fonts/TitanOne.ttf" },
    { label: "Showpop",          path: "/fonts/Showpop.ttf" },
    { label: "DynaPuff",         path: "/fonts/DynaPuff.ttf" },
    { label: "Coiny",            path: "/fonts/Coiny.ttf" },
    { label: "Kindergo",         path: "/fonts/Kindergo.ttf" },
    { label: "Bebas Neue",       path: "/fonts/BebasNeue.ttf" },
    { label: "Retro Dolly",      path: "/fonts/RetroDolly.ttf" },
];

// ─────────────────────────────────────────────────────────────────────────────
// FONT CACHE
// ─────────────────────────────────────────────────────────────────────────────
const fontCache = new Map<string, Font>();
const fontPending = new Map<string, Promise<Font>>();

function loadFont(path: string): Promise<Font> {
    if (fontCache.has(path)) return Promise.resolve(fontCache.get(path)!);
    if (fontPending.has(path)) return fontPending.get(path)!;
    const p = new Promise<Font>((res, rej) => {
        const ttf = new TTFLoader();
        ttf.load(path, (json: any) => {
            const font = new FontLoader().parse(json);
            fontCache.set(path, font);
            fontPending.delete(path);
            res(font);
        }, undefined, rej);
    });
    fontPending.set(path, p);
    return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUNDED RECT SHAPE
// ─────────────────────────────────────────────────────────────────────────────
function rrShape(w: number, h: number, r: number): THREE.Shape {
    r = Math.min(r, w / 2, h / 2);
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    s.closePath();
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function dl(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function doExportSTL(group: THREE.Group) {
    const e = new STLExporter();
    dl(new Blob([e.parse(group, { binary: true })], { type: "application/octet-stream" }), "name_keychain.stl");
}

async function doExport3MF(group: THREE.Group) {
    const JSZip = (await import("jszip")).default;
    let verts = "", tris = "", offset = 0;
    group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const g = obj.geometry.clone(); g.applyMatrix4(obj.matrixWorld); g.toNonIndexed();
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++)
            verts += `<vertex x="${pos.getX(i).toFixed(4)}" y="${pos.getY(i).toFixed(4)}" z="${pos.getZ(i).toFixed(4)}"/>`;
        for (let i = 0; i < pos.count; i += 3)
            tris += `<triangle v1="${offset + i}" v2="${offset + i + 1}" v3="${offset + i + 2}"/>`;
        offset += pos.count;
    });
    const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${verts}</vertices><triangles>${tris}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
    const zip = new JSZip();
    zip.file("3D/3dmodel.model", model);
    zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="r0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`);
    dl(await zip.generateAsync({ type: "blob" }), "name_keychain.3mf");
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL (inside Canvas)
// ─────────────────────────────────────────────────────────────────────────────
interface ModelProps {
    state: NameKeychainState;
    groupRef: React.RefObject<THREE.Group>;
}

const Model: React.FC<ModelProps> = ({ state, groupRef }) => {
    const [fonts, setFonts] = useState<Map<string, Font>>(new Map());

    // Load fonts
    const needed = useMemo(
        () => [...new Set(state.lines.map((l) => l.fontLabel))],
        [state.lines],
    );
    useEffect(() => {
        let live = true;
        Promise.all(
            needed.map(async (label) => {
                const entry = KEYCHAIN_FONTS.find((f) => f.label === label);
                if (!entry) return [label, null] as const;
                try { return [label, await loadFont(entry.path)] as const; }
                catch { return [label, null] as const; }
            }),
        ).then((res) => {
            if (!live) return;
            setFonts((prev) => {
                const m = new Map(prev);
                res.forEach(([l, f]) => { if (f) m.set(l, f); });
                return m;
            });
        });
        return () => { live = false; };
    }, [needed]);

    // Build text geometries
    const textGeos = useMemo(() =>
        state.lines.map((line) => {
            const font = fonts.get(line.fontLabel);
            if (!font || !line.text.trim()) return null;
            try {
                const g = new TextGeometry(line.text, {
                    font,
                    size: line.size,
                    depth: line.depth,
                    curveSegments: 8,
                    bevelEnabled: true,
                    bevelThickness: 0.25,
                    bevelSize: 0.18,
                    bevelSegments: 3,
                });
                g.computeBoundingBox();
                return g;
            } catch { return null; }
        }),
        [state.lines, fonts],
    );

    // Layout: stack lines vertically, each centred on X
    const layout = useMemo(() => {
        const lineW: number[] = [];
        const lineH: number[] = [];
        textGeos.forEach((g) => {
            if (!g?.boundingBox) { lineW.push(0); lineH.push(0); return; }
            lineW.push(g.boundingBox.max.x - g.boundingBox.min.x);
            lineH.push(g.boundingBox.max.y - g.boundingBox.min.y);
        });
        const maxW = Math.max(...lineW, 10);

        // Stack from top downward
        const yPos: number[] = [];
        let y = 0;
        for (let i = 0; i < textGeos.length; i++) {
            yPos.push(y);
            y -= (lineH[i] || 0) + state.lineSpacing;
        }
        const totalH = -y - state.lineSpacing + (lineH[lineH.length - 1] || 0);
        return { lineW, lineH, maxW, yPos, totalH };
    }, [textGeos, state.lineSpacing]);

    // Plate dimensions
    const pad = state.outlineThickness;
    const ringZone = state.ringRadius * 2 + state.ringTube * 2 + 4; // space for ring above text
    const plateW = layout.maxW + pad * 2;
    const plateH = layout.totalH + pad * 2 + ringZone;

    // Plate centre in world-space Y: text block sits in lower portion, ring zone at top
    // Text group top = plateCY + plateH/2 - ringZone - pad
    const plateCY = 0;
    const textTopY = plateCY + plateH / 2 - ringZone - pad;

    // Ring position (inside the hole, front face of plate)
    const ringCY = plateCY + plateH / 2 - state.ringRadius - state.ringTube - 2;
    const ringCZ = state.outlineDepth / 2;

    // Backing plate geometry (with ring hole cut at top centre)
    const backGeo = useMemo(() => {
        const shape = rrShape(plateW, plateH, state.cornerRadius);
        const hole = new THREE.Path();
        hole.absarc(0, plateH / 2 - state.ringRadius - state.ringTube - 2, state.ringRadius + 0.5, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        return new THREE.ExtrudeGeometry(shape, {
            depth: state.outlineDepth,
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.25,
            bevelSegments: 3,
            curveSegments: 40,
        });
    }, [plateW, plateH, state.cornerRadius, state.outlineDepth, state.ringRadius, state.ringTube]);

    // Border geometry
    const borderGeo = useMemo(() => {
        if (!state.borderEnabled) return null;
        const bw = state.borderThickness;
        return new THREE.ExtrudeGeometry(
            rrShape(plateW + bw * 2, plateH + bw * 2, state.cornerRadius + bw),
            { depth: 0.8, bevelEnabled: false, curveSegments: 40 },
        );
    }, [state.borderEnabled, plateW, plateH, state.borderThickness, state.cornerRadius]);

    // Keychain ring
    const ringGeo = useMemo(
        () => new THREE.TorusGeometry(state.ringRadius, state.ringTube, 16, 80),
        [state.ringRadius, state.ringTube],
    );

    return (
        <group ref={groupRef}>
            {/* Border plate (behind backing) */}
            {state.borderEnabled && borderGeo && (
                <mesh geometry={borderGeo} position={[0, plateCY, -0.8]} castShadow>
                    <meshStandardMaterial color={state.borderColor} roughness={0.5} metalness={0.05} />
                </mesh>
            )}

            {/* Backing plate */}
            <mesh geometry={backGeo} position={[0, plateCY, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={state.outlineColor} roughness={0.4} metalness={0.05} />
            </mesh>

            {/* Text lines */}
            {textGeos.map((geo, i) => {
                if (!geo) return null;
                const line = state.lines[i];
                const xOff = -layout.lineW[i] / 2;
                const yOff = textTopY + layout.yPos[i] - layout.lineH[i];
                return (
                    <mesh
                        key={line.id}
                        geometry={geo}
                        position={[xOff, yOff, state.outlineDepth]}
                        castShadow
                    >
                        <meshStandardMaterial color={line.color} roughness={0.35} metalness={0.06} />
                    </mesh>
                );
            })}

            {/* Keychain ring — upright (perpendicular to plate face) */}
            <mesh
                geometry={ringGeo}
                position={[0, ringCY, ringCZ]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
            >
                <meshStandardMaterial color="#d4d4d8" roughness={0.12} metalness={0.9} />
            </mesh>
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED SCENE
// ─────────────────────────────────────────────────────────────────────────────
export interface SceneNameKeychainProps {
    state: NameKeychainState;
    onBoundsChange?: (x: number, y: number, z: number) => void;
}

const SceneNameKeychain = forwardRef<SceneHandle, SceneNameKeychainProps>(
    ({ state, onBoundsChange }, ref) => {
        const groupRef = useRef<THREE.Group>(null!);

        useImperativeHandle(ref, () => ({
            exportSTL: () => { if (groupRef.current) doExportSTL(groupRef.current as unknown as THREE.Group); },
            export3MF: () => { if (groupRef.current) doExport3MF(groupRef.current as unknown as THREE.Group); },
        }));

        // Measure and propagate bounding box for the SIZE display
        useEffect(() => {
            if (!groupRef.current || !onBoundsChange) return;
            const box = new THREE.Box3().setFromObject(groupRef.current);
            const size = new THREE.Vector3();
            box.getSize(size);
            onBoundsChange(
                parseFloat(size.x.toFixed(1)),
                parseFloat(size.y.toFixed(1)),
                parseFloat(size.z.toFixed(1)),
            );
        });

        return (
            <div style={{ width: "100%", height: "100%" }}>
                <Canvas
                    shadows
                    camera={{ position: [0, 0, 200], fov: 36 }}
                    gl={{ preserveDrawingBuffer: true, antialias: true }}
                    style={{ background: "transparent" }}
                >
                    {/* Lights matching light-mode UI */}
                    <ambientLight intensity={0.7} />
                    <directionalLight
                        position={[40, 80, 120]} intensity={1.0}
                        castShadow shadow-mapSize={[2048, 2048]}
                    />
                    <directionalLight position={[-30, -20, 60]} intensity={0.4} />
                    <pointLight position={[0, 60, 80]} intensity={0.3} color="#ffffff" />

                    <Model state={state} groupRef={groupRef} />

                    <OrbitControls
                        enableDamping dampingFactor={0.06}
                        minDistance={50} maxDistance={500}
                    />

                    {/* Light-mode grid (matches Editor.tsx canvas) */}
                    <Grid
                        position={[0, -80, 0]}
                        args={[400, 400]}
                        cellSize={10}
                        cellThickness={0.6}
                        cellColor="#c7d2fe"
                        sectionSize={50}
                        sectionThickness={1.0}
                        sectionColor="#a5b4fc"
                        fadeDistance={280}
                        infiniteGrid
                    />
                </Canvas>
            </div>
        );
    },
);

export default SceneNameKeychain;
