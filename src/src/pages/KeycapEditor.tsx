import React, { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Camera, Lock, Download } from "lucide-react";
import * as THREE from "three";
import SceneKeycap, {
    FONT_OPTIONS,
    lettersFromLegends,
    gridPositions,
    computeSetBounds,
} from "../components/SceneKeycap";
import type { KeycapState } from "../components/SceneKeycap";
import type { SceneInnerHandle } from "../components/SceneKeycap";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_STATE: KeycapState = {
    legends: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    capColor: "#ffffff",
    legendColor: "#3898ff",
    legendSizePct: 60,
    legendDepth: 0.5,
    fontLabel: "Titan One",
    topBorder: false,
    mergeForExport: false,
};

// ── STL download helper ───────────────────────────────────────────────────────
function downloadBinary(data: ArrayBuffer | string, filename: string) {
    const blob = new Blob(
        [typeof data === "string" ? data : data],
        { type: "application/octet-stream" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Main editor ───────────────────────────────────────────────────────────────
const KeycapEditor: React.FC = () => {
    const [state, setState]     = useState<KeycapState>(DEFAULT_STATE);
    const [capBB,  setCapBB]    = useState<THREE.Box3 | null>(null);
    const [exporting, setExporting] = useState(false);
    const sceneRef = useRef<SceneInnerHandle>(null);

    const set = <K extends keyof KeycapState>(key: K, value: KeycapState[K]) =>
        setState(prev => ({ ...prev, [key]: value }));

    const handleCapBB = useCallback((bb: THREE.Box3 | null) => setCapBB(bb), []);

    const letters = lettersFromLegends(state.legends);
    const bounds  = computeSetBounds(letters.length, capBB);
    const cols    = Math.min(letters.length, 6);
    const rows    = Math.ceil(letters.length / Math.max(cols, 1));

    // ── Real STL export ───────────────────────────────────────────────────────
    const handleExportSTL = async () => {
        const handle = sceneRef.current;
        if (!handle) { alert("Scene not ready yet — wait for model to load."); return; }
        setExporting(true);
        try {
            const result = handle.buildExportGeo();
            if (!result) { alert("Model not fully loaded yet. Please wait a moment."); return; }

            // Always export as ONE merged STL (caps + legends combined)
            const exporter = new STLExporter();
            const merged = new THREE.Group();
            merged.add(new THREE.Mesh(result.caps));
            if (result.legends.attributes.position?.count > 0) {
                merged.add(new THREE.Mesh(result.legends));
            }
            const data = exporter.parse(merged, { binary: true }) as ArrayBuffer;
            downloadBinary(data, "keycap-set.stl");
        } finally {
            setExporting(false);
        }
    };

    // ── Reusable UI components ────────────────────────────────────────────────
    const SliderRow = ({
        label, value, min, max, step, display, onChange,
    }: {
        label: string; value: number; min: number; max: number;
        step: number; display: string; onChange: (v: number) => void;
    }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>{display}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#2563eb" }} />
        </div>
    );

    const ColorRow = ({
        label, value, onChange,
    }: {
        label: string; value: string; onChange: (v: string) => void;
    }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{label}</span>
            <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 12px",
                background: "#fff", cursor: "pointer",
            }} onClick={() => (document.getElementById(`color-${label}`) as HTMLInputElement)?.click()}>
                <input id={`color-${label}`} type="color" value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{ width: "26px", height: "26px", border: "none", cursor: "pointer",
                        background: "none", padding: 0, borderRadius: "4px" }} />
                <span style={{ fontSize: "0.82rem", color: "#111827", fontFamily: "monospace", fontWeight: 500 }}>
                    {value.toUpperCase()}
                </span>
            </div>
        </div>
    );

    const CheckRow = ({
        label, desc, value, onChange,
    }: {
        label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
    }) => (
        <label style={{ display: "flex", gap: "10px", cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
                style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#2563eb", cursor: "pointer" }} />
            <div>
                <div style={{ fontSize: "0.82rem", color: "#111827", fontWeight: 500 }}>{label}</div>
                {desc && <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "2px", lineHeight: 1.4 }}>{desc}</div>}
            </div>
        </label>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{
            display: "flex", height: "100vh", width: "100vw", overflow: "hidden",
            fontFamily: "'Poppins', sans-serif", background: "#f4f6f9",
        }}>
            {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
            <div style={{
                width: "370px", minWidth: "370px",
                background: "#ffffff",
                borderRight: "1px solid #e5e7eb",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
                boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
            }}>
                {/* Header */}
                <div style={{
                    padding: "14px 20px", borderBottom: "1px solid #f0f0f0",
                    display: "flex", alignItems: "center", gap: "10px",
                }}>
                    <Link to="/" style={{
                        color: "#374151", textDecoration: "none", display: "flex",
                        alignItems: "center", padding: "5px 8px", borderRadius: "8px",
                        background: "#f3f4f6", fontWeight: 600, fontSize: "0.82rem", gap: "2px",
                    }}>
                        <ChevronLeft size={16} /> Back
                    </Link>
                    <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "#111827" }}>
                        Keycap Set Maker
                    </span>
                </div>

                {/* Scrollable controls */}
                <div style={{
                    flex: 1, overflowY: "auto", padding: "16px 18px",
                    display: "flex", flexDirection: "column", gap: "18px",
                }}>

                    {/* Upload hint */}
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                        Upload a flat keycap base (STL) or use the default.
                        Enter one legend per grapheme
                    </p>

                    {/* Legends */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Legends</span>
                            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                {letters.length} keys · {cols}×{rows}
                            </span>
                        </div>
                        <textarea
                            value={state.legends}
                            onChange={e => set("legends", e.target.value)}
                            rows={4}
                            style={{
                                width: "100%", border: "1px solid #d1d5db", borderRadius: "8px",
                                padding: "10px 12px", fontFamily: "monospace", fontSize: "0.88rem",
                                color: "#111827", background: "#fafafa", resize: "vertical",
                                outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                            }}
                        />
                        <p style={{ fontSize: "0.7rem", color: "#9ca3af", margin: 0 }}>
                            Default is A–Z and 0–9. Clear and type your own set; order is left-to-right, top to bottom.
                        </p>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {[
                                { label: "A–Z + 0–9", val: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
                                { label: "A–Z",        val: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
                                { label: "0–9",        val: "0123456789" },
                            ].map(p => (
                                <button key={p.label} onClick={() => set("legends", p.val)}
                                    style={{
                                        padding: "4px 10px", fontSize: "0.72rem", borderRadius: "6px",
                                        border: "1px solid #d1d5db", background: "#f9fafb",
                                        color: "#374151", cursor: "pointer", fontWeight: 500,
                                    }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: 0 }} />

                    {/* Keycap base */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Keycap base (STL)</span>
                        <div style={{
                            border: "1px solid #d1d5db", borderRadius: "8px",
                            padding: "9px 12px", background: "#fafafa",
                            fontSize: "0.82rem", color: "#6b7280",
                        }}>
                            Choose File  No file chosen
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>keycap.stl</span>
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: 0 }} />

                    {/* Font */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 600 }}>Font</span>
                        <div style={{ position: "relative" }}>
                            <select
                                value={state.fontLabel}
                                onChange={e => set("fontLabel", e.target.value)}
                                style={{
                                    width: "100%", padding: "9px 34px 9px 12px",
                                    border: "1px solid #d1d5db", borderRadius: "8px",
                                    background: "#fff", fontSize: "0.88rem",
                                    color: "#111827", fontWeight: 600, cursor: "pointer",
                                    appearance: "none", outline: "none",
                                }}>
                                {FONT_OPTIONS.map(f => (
                                    <option key={f.label} value={f.label}>{f.label}</option>
                                ))}
                            </select>
                            <svg style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                                width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Legend size */}
                    <SliderRow label="Legend size" value={state.legendSizePct}
                        min={10} max={100} step={1} display={`${state.legendSizePct}%`}
                        onChange={v => set("legendSizePct", v)} />

                    {/* Legend depth */}
                    <SliderRow label="Legend depth" value={state.legendDepth}
                        min={0.1} max={3.0} step={0.1} display={`${state.legendDepth.toFixed(1)} mm`}
                        onChange={v => set("legendDepth", v)} />

                    <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: 0 }} />

                    {/* Colors */}
                    <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                            <ColorRow label="Keycap color" value={state.capColor} onChange={v => set("capColor", v)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <ColorRow label="Legend color" value={state.legendColor} onChange={v => set("legendColor", v)} />
                        </div>
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: 0 }} />

                    {/* Checkboxes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <CheckRow
                            label="Top border (STL)"
                            desc="Uses legend color; border and legend share the keycap top (z)."
                            value={state.topBorder}
                            onChange={v => set("topBorder", v)}
                        />
                        <CheckRow
                            label="Merge for 3MF / Bambu"
                            desc="Export one grouped assembly: merged keycaps + merged legends/borders (two solids, one rigid group)."
                            value={state.mergeForExport}
                            onChange={v => set("mergeForExport", v)}
                        />
                    </div>
                </div>
            </div>

            {/* ── RIGHT: 3D VIEWPORT ───────────────────────────────────────── */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <SceneKeycap ref={sceneRef} state={state} onCapBB={handleCapBB} />

                {/* Size HUD */}
                {capBB && (
                    <div style={{
                        position: "absolute", top: "16px", left: "16px",
                        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
                        border: "1px solid #e5e7eb", borderRadius: "10px",
                        padding: "10px 14px", fontSize: "0.75rem", color: "#374151",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minWidth: "100px",
                    }}>
                        <div style={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}>Size (mm)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: "3px 6px" }}>
                            <span style={{ color: "#9ca3af" }}>X</span>
                            <span style={{ fontWeight: 600 }}>{bounds.x.toFixed(1)}</span>
                            <span style={{ color: "#9ca3af" }}>Y</span>
                            <span style={{ fontWeight: 600 }}>{bounds.y.toFixed(1)}</span>
                            <span style={{ color: "#9ca3af" }}>Z</span>
                            <span style={{ fontWeight: 600 }}>{bounds.z.toFixed(1)}</span>
                        </div>
                    </div>
                )}

                {/* Bottom export bar */}
                <div style={{
                    position: "absolute", bottom: "20px", right: "20px",
                    display: "flex", gap: "10px", alignItems: "center",
                }}>
                    {/* Screenshot */}
                    <button
                        title="Screenshot"
                        onClick={() => {
                            const canvas = document.querySelector("canvas");
                            if (!canvas) return;
                            const url = canvas.toDataURL("image/png");
                            const a = document.createElement("a");
                            a.href = url; a.download = "keycap-set.png";
                            a.click();
                        }}
                        style={{
                            width: "38px", height: "38px", borderRadius: "8px",
                            border: "1px solid #d1d5db", background: "rgba(255,255,255,0.92)",
                            cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", backdropFilter: "blur(8px)",
                        }}>
                        <Camera size={16} color="#374151" />
                    </button>

                    {/* Export STL */}
                    <button
                        onClick={handleExportSTL}
                        disabled={exporting}
                        style={{
                            padding: "9px 18px", borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            background: exporting ? "#f3f4f6" : "rgba(255,255,255,0.92)",
                            cursor: exporting ? "not-allowed" : "pointer",
                            fontSize: "0.83rem", fontWeight: 600, color: "#111827",
                            backdropFilter: "blur(8px)",
                            display: "flex", alignItems: "center", gap: "6px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                        }}>
                        <Lock size={13} color="#6b7280" />
                        {exporting ? "Exporting…" : "Export STL"}
                    </button>

                    {/* Export 3MF */}
                    <button
                        onClick={handleExportSTL}
                        disabled={exporting}
                        style={{
                            padding: "9px 18px", borderRadius: "8px",
                            border: "1px solid #d1d5db", background: "rgba(255,255,255,0.92)",
                            cursor: "pointer", fontSize: "0.83rem", fontWeight: 600, color: "#111827",
                            backdropFilter: "blur(8px)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                        }}>
                        Export 3MF
                    </button>

                    {/* Bambu */}
                    <button style={{
                        padding: "9px 20px", borderRadius: "8px", border: "none",
                        background: "#08BF08", cursor: "pointer",
                        fontSize: "0.83rem", fontWeight: 700, color: "#fff",
                        boxShadow: "0 2px 12px rgba(8,191,8,0.3)",
                    }}>
                        Open with Bambu Studio
                    </button>
                </div>

                {/* Orbit hint */}
                <div style={{
                    position: "absolute", bottom: "24px", left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(255,255,255,0.75)", backdropFilter: "blur(6px)",
                    padding: "5px 14px", borderRadius: "999px",
                    fontSize: "0.7rem", color: "#9ca3af", pointerEvents: "none",
                    border: "1px solid #e5e7eb", whiteSpace: "nowrap",
                }}>
                    Drag to orbit · Scroll to zoom
                </div>
            </div>
        </div>
    );
};

export default KeycapEditor;
