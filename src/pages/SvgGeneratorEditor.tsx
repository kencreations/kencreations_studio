import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
    ChevronLeft,
    Upload,
    Download,
    FileCode,
    Check,
    Layers,
    Eye,
    ImageIcon,
    Sparkles,
} from "lucide-react";
import SceneClicker from "../components/SceneClicker";
import type { ClickerState } from "../components/SceneClicker";
import { exportClickerSTL, exportClicker3MF } from "../utils/exportClicker";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT STATE — SVG mode, nothing loaded
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STATE: ClickerState = {
    style: "svg",
    customStlUrl: null,
    customStlName: null,
    customSvgString: null,
    customSvgName: null,
    customImageUrl: null,
    customImageName: null,
    svgScale: 0.2,
    svgMode: "none",
    svgExtrusion: 5,
    keychainLoopRadius: 5,
    keychainLoopTube: 1.5,
    keychainAttachOffset: 0,
    clickerWallThickness: 2.0,
    clickerTolerance: 0.15,
    clickerDepth: 12.8,
    baseColor: "#06b6d4",
    hookColor: "#a78bfa",
    hookEnabled: false,
    hookStyle: "elevated",
    hookPosition: "top",
    hookWidth: 15,
    hookHeight: 18,
    hookThickness: 4,
    hookHoleRadius: 4.5,
    hookOffsetX: 0,
    hookOffsetY: 0,
    hookOffsetZ: 0,
    logoRemoved: false,
    logoCoverEnabled: false,
    logoCoverWidth: 18,
    logoCoverHeight: 6,
    logoCoverThickness: 0.4,
    logoCoverOffsetX: 0,
    logoCoverOffsetY: 12.0,
    logoCoverOffsetZ: 2.1,
    logoCoverRotX: -28,
    logoCoverRotY: 0,
    logoCoverRotZ: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
    { name: "Cyan",    hex: "#06b6d4" },
    { name: "Violet",  hex: "#a78bfa" },
    { name: "Emerald", hex: "#10b981" },
    { name: "White",   hex: "#f8fafc" },
    { name: "Slate",   hex: "#334155" },
    { name: "Crimson", hex: "#ef4444" },
    { name: "Orange",  hex: "#f97316" },
    { name: "Gold",    hex: "#eab308" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#6b7280", textTransform: "uppercase" as const }}>
        {children}
    </span>
);

const Divider: React.FC = () => (
    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />
);

const Slider: React.FC<{
    id?: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    prefix?: string;
    accent?: string;
    decimals?: number;
    onChange: (v: number) => void;
}> = ({ id, label, value, min, max, step, unit = "mm", prefix = "", accent = "#06b6d4", decimals, onChange }) => {
    const display = decimals !== undefined ? value.toFixed(decimals) : (Number.isInteger(value) ? value : value.toFixed(1));
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px", color: "#d1d5db" }}>
                <span>{label}</span>
                <span style={{ color: "#f3f4f6", fontWeight: 600 }}>{prefix}{display} {unit}</span>
            </div>
            <input id={id} type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: accent }}
            />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const SvgGeneratorEditor: React.FC = () => {
    const [state, setState] = useState<ClickerState>(DEFAULT_STATE);
    const [baseMesh,  setBaseMesh]  = useState<THREE.Mesh | null>(null);
    const [hookMesh,  setHookMesh]  = useState<THREE.Mesh | null>(null);
    const [coverMesh, setCoverMesh] = useState<THREE.Mesh | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const set = (key: keyof ClickerState, value: any) =>
        setState((prev) => ({ ...prev, [key]: value }));

    // ── File Upload (SVG / PNG / JPG) ─────────────────────────────────────
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isSvg = file.name.toLowerCase().endsWith(".svg");

        const reader = new FileReader();
        reader.onload = (ev) => {
            if (isSvg) {
                setState((prev) => ({
                    ...prev,
                    style: "svg",
                    customSvgString: ev.target?.result as string,
                    customSvgName: file.name,
                    customImageUrl: null,
                    customImageName: null,
                }));
            } else {
                setState((prev) => ({
                    ...prev,
                    style: "svg",
                    customImageUrl: ev.target?.result as string,
                    customImageName: file.name,
                    customSvgString: null,
                    customSvgName: null,
                }));
            }
        };
        isSvg ? reader.readAsText(file) : reader.readAsDataURL(file);
        e.target.value = "";
    };

    const fileName = state.customSvgName ?? state.customImageName ?? null;
    const fileLoaded = Boolean(state.customSvgString || state.customImageUrl);
    const isSvgLoaded = Boolean(state.customSvgString);

    const clickerDepthWarning =
        state.svgMode === "clicker" && state.clickerDepth > state.svgExtrusion
            ? `Housing depth (${state.clickerDepth} mm) exceeds extrusion (${state.svgExtrusion} mm) — will be clamped.`
            : null;

    return (
        <div
            className="editor-layout"
            style={{
                background: "radial-gradient(circle at 30% 20%, #0f1729 0%, #030712 60%)",
                color: "#f3f4f6",
            }}
        >
            {/* ── Canvas ────────────────────────────────────────────────── */}
            <div className="canvas-container">
                <SceneClicker
                    state={state}
                    setBaseMeshRef={setBaseMesh}
                    setHookMeshRef={setHookMesh}
                    setCoverMeshRef={setCoverMesh}
                />
            </div>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="home-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Link to="/" className="back-btn" style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#e5e7eb", marginRight: "12px" }}>
                    <ChevronLeft size={20} />
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "34px", height: "34px", borderRadius: "9px",
                        background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.28)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Sparkles size={16} color="#a78bfa" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "#f3f4f6" }}>
                            Fidget Clicker Generator
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                            {fileName ? `Active: ${fileName}` : "Upload SVG, PNG, or JPG to begin"}
                        </span>
                    </div>
                </div>

                {fileLoaded && state.svgMode !== "none" && (
                    <div style={{
                        marginLeft: "16px",
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        padding: "4px 12px", borderRadius: "20px",
                        fontSize: "0.72rem", fontWeight: 600,
                        background: state.svgMode === "keychain" ? "rgba(16,185,129,0.12)" : "rgba(139,92,246,0.12)",
                        border: state.svgMode === "keychain" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(139,92,246,0.3)",
                        color: state.svgMode === "keychain" ? "#10b981" : "#a78bfa",
                    }}>
                        {state.svgMode === "keychain" ? "⛓ Keychain Mode" : "⌨ MX Clicker Mode"}
                    </div>
                )}

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#4b5563" }}>
                    <Eye size={13} /> Drag · Scroll
                </div>
            </header>

            {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
            <div className="sidebar" style={{
                background: "rgba(8, 11, 22, 0.98)",
                border: "1px solid rgba(255,255,255,0.07)",
                top: "80px", bottom: "80px",
                overflowY: "auto",
                display: "flex", flexDirection: "column",
            }}>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* ── HERO DESCRIPTION (only before file load) ────────── */}
                    {!fileLoaded && (
                        <div style={{
                            background: "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(6,182,212,0.05) 100%)",
                            border: "1px solid rgba(167,139,250,0.15)",
                            borderRadius: "14px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Sparkles size={16} color="#a78bfa" />
                                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#e9d5ff" }}>
                                    Instant Fidget Clicker
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", lineHeight: 1.6 }}>
                                No 3D modeling needed. Upload any image and the system automatically
                                generates a 3D-printable fidget clicker for you.
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ width: "20px", textAlign: "center" }}>🎨</span>
                                    <span style={{ color: "#d1d5db" }}><strong style={{ color: "#c4b5fd" }}>SVG</strong> — preserves all original colours</span>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ width: "20px", textAlign: "center" }}>🖼</span>
                                    <span style={{ color: "#d1d5db" }}><strong style={{ color: "#7dd3fc" }}>PNG / JPG</strong> — auto-silhouette extraction</span>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ width: "20px", textAlign: "center" }}>⛓</span>
                                    <span style={{ color: "#d1d5db" }}><strong style={{ color: "#6ee7b7" }}>Keychain</strong> — adds a ring loop for printing</span>
                                </div>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <span style={{ width: "20px", textAlign: "center" }}>⌨</span>
                                    <span style={{ color: "#d1d5db" }}><strong style={{ color: "#c4b5fd" }}>MX Clicker</strong> — hollow Cherry MX switch socket</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── UPLOAD ZONE ─────────────────────────────────────── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <SectionLabel>Design File</SectionLabel>
                        <input ref={fileInputRef} type="file" accept=".svg,.png,.jpg,.jpeg" onChange={handleUpload} style={{ display: "none" }} />

                        <button
                            id="file-upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: "100%",
                                padding: fileLoaded ? "14px" : "24px 14px",
                                borderRadius: "14px",
                                border: fileLoaded ? "1px solid rgba(167,139,250,0.4)" : "2px dashed rgba(167,139,250,0.3)",
                                background: fileLoaded ? "rgba(167,139,250,0.06)" : "rgba(167,139,250,0.025)",
                                color: "#e5e7eb",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "7px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "rgba(167,139,250,0.6)";
                                e.currentTarget.style.background = "rgba(167,139,250,0.09)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = fileLoaded ? "rgba(167,139,250,0.4)" : "rgba(167,139,250,0.3)";
                                e.currentTarget.style.background = fileLoaded ? "rgba(167,139,250,0.06)" : "rgba(167,139,250,0.025)";
                            }}
                        >
                            {fileLoaded ? (
                                <>
                                    <Check size={20} color="#a78bfa" />
                                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#c4b5fd" }}>{fileName}</span>
                                    <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>Click to replace file</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={26} color="#a78bfa" strokeWidth={1.5} />
                                    <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#e5e7eb" }}>
                                        Upload Your Design
                                    </span>
                                    <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                                        SVG · PNG · JPG — any flat graphic
                                    </span>
                                </>
                            )}
                        </button>

                        {/* File type note */}
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            {["SVG", "PNG", "JPG"].map((ext) => (
                                <span key={ext} style={{
                                    fontSize: "0.67rem", fontWeight: 600, padding: "2px 7px",
                                    borderRadius: "5px",
                                    background: ext === "SVG" ? "rgba(167,139,250,0.1)" : "rgba(6,182,212,0.08)",
                                    color: ext === "SVG" ? "#c4b5fd" : "#67e8f9",
                                    border: ext === "SVG" ? "1px solid rgba(167,139,250,0.2)" : "1px solid rgba(6,182,212,0.15)",
                                }}>
                                    {ext}
                                </span>
                            ))}
                        </div>

                        {/* SVG color note */}
                        {isSvgLoaded && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: "7px",
                                fontSize: "0.72rem", color: "#a78bfa",
                                background: "rgba(167,139,250,0.06)",
                                border: "1px solid rgba(167,139,250,0.15)",
                                borderRadius: "8px", padding: "7px 10px",
                            }}>
                                <span>🎨</span>
                                Original SVG colours are preserved in the 3D model.
                            </div>
                        )}
                    </div>

                    {/* ── CONTROLS (only after file load) ─────────────────── */}
                    {fileLoaded && (
                        <>
                            <Divider />

                            {/* Extrusion */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <SectionLabel>Extrusion</SectionLabel>
                                <Slider label="Body Thickness" value={state.svgExtrusion} min={1} max={25} step={0.5}
                                    onChange={(v) => set("svgExtrusion", v)} />
                                <Slider label="SVG Scale" value={state.svgScale} min={0.05} max={1.0} step={0.01}
                                    unit="×" decimals={2} onChange={(v) => set("svgScale", v)} />
                            </div>

                            <Divider />

                            {/* Mode Selector */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <SectionLabel>Mechanical Mode</SectionLabel>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "7px" }}>
                                    {([
                                        { id: "none",     label: "None",       icon: "◯", desc: "Plain shape",      accent: "#06b6d4" },
                                        { id: "keychain", label: "Keychain",   icon: "⛓", desc: "Ring loop",       accent: "#10b981" },
                                        { id: "clicker",  label: "MX Clicker", icon: "⌨", desc: "Switch socket",   accent: "#a78bfa" },
                                    ] as { id: "none"|"keychain"|"clicker"; label: string; icon: string; desc: string; accent: string }[]).map((m) => {
                                        const active = state.svgMode === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                id={`mode-btn-${m.id}`}
                                                onClick={() => set("svgMode", m.id)}
                                                style={{
                                                    padding: "12px 5px",
                                                    borderRadius: "11px",
                                                    border: `1px solid ${active ? m.accent + "55" : "rgba(255,255,255,0.07)"}`,
                                                    background: active ? `${m.accent}12` : "rgba(255,255,255,0.02)",
                                                    color: active ? m.accent : "#6b7280",
                                                    fontSize: "0.72rem",
                                                    fontWeight: active ? 700 : 500,
                                                    cursor: "pointer",
                                                    display: "flex", flexDirection: "column",
                                                    alignItems: "center", gap: "3px",
                                                    lineHeight: 1.3,
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{m.icon}</span>
                                                <span>{m.label}</span>
                                                <span style={{ fontSize: "0.62rem", opacity: 0.7 }}>{m.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── KEYCHAIN PANEL ────────────────────────────── */}
                            {state.svgMode === "keychain" && (
                                <>
                                    <div style={{ height: "1px", background: "rgba(16,185,129,0.15)" }} />
                                    <div style={{
                                        display: "flex", flexDirection: "column", gap: "14px",
                                        background: "rgba(16,185,129,0.04)",
                                        border: "1px solid rgba(16,185,129,0.18)",
                                        borderRadius: "14px", padding: "16px",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                                            <span>⛓</span>
                                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#10b981" }}>
                                                Keychain Loop Settings
                                            </span>
                                        </div>
                                        <Slider id="kc-radius" label="Loop Radius" value={state.keychainLoopRadius} min={2} max={15} step={0.5} accent="#10b981" onChange={(v) => set("keychainLoopRadius", v)} />
                                        <Slider id="kc-tube" label="Ring Thickness" value={state.keychainLoopTube} min={0.5} max={5} step={0.1} accent="#10b981" decimals={1} onChange={(v) => set("keychainLoopTube", v)} />
                                        <Slider id="kc-offset" label="Attach Offset" value={state.keychainAttachOffset} min={-20} max={20} step={0.5} prefix={state.keychainAttachOffset > 0 ? "+" : ""} accent="#10b981" onChange={(v) => set("keychainAttachOffset", v)} />
                                        <div style={{
                                            fontSize: "0.71rem", color: "#6ee7b7",
                                            background: "rgba(16,185,129,0.06)",
                                            border: "1px solid rgba(16,185,129,0.12)",
                                            borderRadius: "8px", padding: "8px 10px", lineHeight: 1.55,
                                        }}>
                                            💡 Ring is rendered as a separate body. Set its colour below under <strong>Ring Colour</strong> — ideal for dual-colour 3MF printing.
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── CLICKER PANEL ─────────────────────────────── */}
                            {state.svgMode === "clicker" && (
                                <>
                                    <div style={{ height: "1px", background: "rgba(139,92,246,0.15)" }} />
                                    <div style={{
                                        display: "flex", flexDirection: "column", gap: "14px",
                                        background: "rgba(139,92,246,0.05)",
                                        border: "1px solid rgba(139,92,246,0.2)",
                                        borderRadius: "14px", padding: "16px",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                                            <span>⌨</span>
                                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#a78bfa" }}>
                                                Cherry MX Switch Socket
                                            </span>
                                        </div>
                                        <div style={{
                                            background: "rgba(139,92,246,0.10)",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                            borderRadius: "10px", padding: "11px 13px",
                                            display: "flex", flexDirection: "column", gap: "5px",
                                            fontSize: "0.75rem",
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#c4b5fd" }}>
                                                <span>🔒 Inner switch pocket</span>
                                                <span style={{ fontWeight: 700, color: "#ede9fe" }}>13.8 × 13.8 mm</span>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#c4b5fd" }}>
                                                <span>🔒 Stem cross void</span>
                                                <span style={{ fontWeight: 700, color: "#ede9fe" }}>4.40 × 1.30 mm</span>
                                            </div>
                                            <div style={{ marginTop: "3px", fontSize: "0.67rem", color: "#7c3aed", lineHeight: 1.5 }}>
                                                Housing sits <strong>entirely behind</strong> the logo face. Built from solid wall primitives — no boolean ops, guaranteed clean STL. Colour set via <strong>Housing Colour</strong> below.
                                            </div>
                                        </div>
                                        <Slider id="cl-wall" label="Wall Thickness" value={state.clickerWallThickness} min={1.0} max={5.0} step={0.1} accent="#8b5cf6" decimals={1} onChange={(v) => set("clickerWallThickness", v)} />
                                        <Slider id="cl-tol" label="Clearance Tolerance" value={state.clickerTolerance} min={0.0} max={0.5} step={0.01} prefix="±" accent="#8b5cf6" decimals={2} onChange={(v) => set("clickerTolerance", v)} />
                                        <Slider id="cl-depth" label="Housing Depth" value={state.clickerDepth} min={3.0} max={20.0} step={0.1} accent="#8b5cf6" decimals={1} onChange={(v) => set("clickerDepth", v)} />
                                        {clickerDepthWarning && (
                                            <div style={{
                                                display: "flex", alignItems: "flex-start", gap: "8px",
                                                background: "rgba(234,179,8,0.08)",
                                                border: "1px solid rgba(234,179,8,0.22)",
                                                borderRadius: "8px", padding: "8px 10px",
                                                fontSize: "0.71rem", color: "#fde047", lineHeight: 1.5,
                                            }}>
                                                <span style={{ flexShrink: 0 }}>⚠️</span>
                                                <span>{clickerDepthWarning}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <Divider />

                            {/* Colours */}
                            {/* For SVG files, show a note instead of base colour override */}
                            {isSvgLoaded ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <SectionLabel>Colours</SectionLabel>
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: "8px",
                                        background: "rgba(167,139,250,0.06)",
                                        border: "1px solid rgba(167,139,250,0.14)",
                                        borderRadius: "10px", padding: "10px 12px",
                                        fontSize: "0.75rem", color: "#c4b5fd", lineHeight: 1.5,
                                    }}>
                                        <span style={{ fontSize: "1rem" }}>🎨</span>
                                        <span>
                                            SVG colours are <strong>automatically applied</strong> from your file.
                                            Each path retains its original fill colour in the 3D model.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <SectionLabel>Base Colour</SectionLabel>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px" }}>
                                        {COLOR_PRESETS.map((c) => (
                                            <button key={c.hex} title={c.name}
                                                onClick={() => set("baseColor", c.hex)}
                                                style={{
                                                    height: "30px", borderRadius: "7px",
                                                    background: c.hex,
                                                    border: state.baseColor.toLowerCase() === c.hex ? "2px solid #fff" : "2px solid transparent",
                                                    cursor: "pointer",
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <input type="color" value={state.baseColor} onChange={(e) => set("baseColor", e.target.value)}
                                        style={{ width: "100%", height: "30px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer" }}
                                    />
                                </div>
                            )}

                            {(state.svgMode === "keychain" || state.svgMode === "clicker") && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <SectionLabel>
                                        {state.svgMode === "keychain" ? "Ring Colour" : "Housing Colour"}
                                    </SectionLabel>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px" }}>
                                        {COLOR_PRESETS.map((c) => (
                                            <button key={c.hex} title={c.name}
                                                onClick={() => set("hookColor", c.hex)}
                                                style={{
                                                    height: "30px", borderRadius: "7px",
                                                    background: c.hex,
                                                    border: state.hookColor.toLowerCase() === c.hex ? "2px solid #fff" : "2px solid transparent",
                                                    cursor: "pointer",
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <input type="color" value={state.hookColor} onChange={(e) => set("hookColor", e.target.value)}
                                        style={{ width: "100%", height: "30px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer" }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── BOTTOM EXPORT BAR ────────────────────────────────────────── */}
            <div style={{
                position: "absolute",
                bottom: "24px", left: "400px", right: "24px", height: "56px",
                background: "rgba(8,11,22,0.97)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 20px", zIndex: 10,
            }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem", color: "#4b5563" }}>
                    <Sparkles size={14} color="#a78bfa" />
                    <span>
                        {fileLoaded
                            ? `${fileName} · ${state.svgExtrusion}mm · ${state.svgMode !== "none" ? (state.svgMode === "keychain" ? "⛓ Keychain" : "⌨ MX Clicker") : "Plain extrusion"}`
                            : "Upload a design to enable export"}
                    </span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className="btn-pill secondary"
                        disabled={!fileLoaded}
                        onClick={() => exportClickerSTL(baseMesh, hookMesh, coverMesh)}
                        style={{
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: fileLoaded ? "transparent" : "rgba(255,255,255,0.02)",
                            color: fileLoaded ? "#ffffff" : "#4b5563",
                            cursor: fileLoaded ? "pointer" : "not-allowed",
                        }}
                    >
                        <Download size={15} style={{ marginRight: "6px" }} />
                        Export STL
                    </button>
                    <button
                        className="btn-pill primary"
                        disabled={!fileLoaded}
                        onClick={() => exportClicker3MF(baseMesh, hookMesh, coverMesh)}
                        style={{ opacity: fileLoaded ? 1 : 0.4, cursor: fileLoaded ? "pointer" : "not-allowed" }}
                    >
                        <Download size={15} style={{ marginRight: "6px" }} />
                        Export 3MF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SvgGeneratorEditor;
