import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    Trash2,
    Plus,
    Camera,
    Download,
    Save,
    Bookmark,
    X,
} from "lucide-react";
import SceneNameKeychain, {
    KEYCHAIN_FONTS,
    type NameKeychainState,
    type NameLine,
    type SceneHandle,
} from "../components/SceneNameKeychain";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
let _id = 1;
const mkLine = (text = "", font = "Pacifico"): NameLine => ({
    id: `l${_id++}`, text, fontLabel: font,
    size: 14, depth: 3, spacing: 0, color: "#ffffff",
});

const DEFAULT_STATE: NameKeychainState = {
    lines: [mkLine("Pinky")],
    lineSpacing: 2,
    outlineThickness: 8,
    outlineDepth: 2,
    outlineColor: "#ec4899",
    borderEnabled: false,
    borderThickness: 1.5,
    borderColor: "#be185d",
    ringRadius: 6,
    ringTube: 1.2,
    cornerRadius: 6,
};

interface SavedDesign {
    name: string;
    state: NameKeychainState;
}

const STORAGE_KEY = "nk_saved_designs";
const loadSaved = (): SavedDesign[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
};
const persistSaved = (d: SavedDesign[]) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
    { label: "Pink",    hex: "#ec4899" },
    { label: "Violet",  hex: "#8b5cf6" },
    { label: "Cyan",    hex: "#06b6d4" },
    { label: "Emerald", hex: "#10b981" },
    { label: "Orange",  hex: "#f97316" },
    { label: "Yellow",  hex: "#eab308" },
    { label: "Red",     hex: "#ef4444" },
    { label: "White",   hex: "#ffffff" },
    { label: "Black",   hex: "#111827" },
    { label: "Gray",    hex: "#6b7280" },
    { label: "Rose",    hex: "#be185d" },
    { label: "Teal",    hex: "#0d9488" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
/** Tiny section header exactly matching image 2 */
const SH: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
        {children}
    </div>
);

const Rule = () => <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "10px 0" }} />;

/** Tiny slider row — matches image 2's inline size/depth/spacing layout */
const MiniSlider: React.FC<{
    label: string; value: number; min: number; max: number; step: number;
    accent?: string; decimals?: number; onChange: (v: number) => void;
}> = ({ label, value, min, max, step, accent = "#3b82f6", decimals = 0, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#64748b" }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            <span style={{ color: "#1e293b" }}>{value.toFixed(decimals)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: accent, height: 3 }}
        />
    </div>
);

/** Full-width slider with label + value */
const Slider: React.FC<{
    label: string; value: number; min: number; max: number; step: number;
    unit?: string; decimals?: number; onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = "", decimals = 1, onChange }) => (
    <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: 4 }}>
            <span>{label}</span>
            <span style={{ fontWeight: 600, color: "#1e293b" }}>{value.toFixed(decimals)}{unit ? " " + unit : ""}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6" }}
        />
    </div>
);

/** Color dot + label display matching image 2 */
const ColorDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#334155" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: color, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
        {label}
    </div>
);

const colorLabel = (hex: string) =>
    COLOR_PRESETS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex.toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PICKER PANEL
// ─────────────────────────────────────────────────────────────────────────────
const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
            {COLOR_PRESETS.map((c) => (
                <button
                    key={c.hex} title={c.label} onClick={() => onChange(c.hex)}
                    style={{
                        width: 28, height: 28, borderRadius: 6, background: c.hex, cursor: "pointer",
                        border: value.toLowerCase() === c.hex.toLowerCase() ? "2.5px solid #3b82f6" : "1.5px solid rgba(0,0,0,0.1)",
                    }}
                />
            ))}
        </div>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{ width: "100%", height: 30, borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer", background: "transparent" }}
        />
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LINE CARD — matches image 2 layout exactly
// ─────────────────────────────────────────────────────────────────────────────
const LineCard: React.FC<{
    line: NameLine; index: number; total: number;
    onUpdate: (id: string, p: Partial<NameLine>) => void;
    onRemove: (id: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
}> = ({ line, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }) => {
    const [colorOpen, setColorOpen] = useState(false);
    const upd = (p: Partial<NameLine>) => onUpdate(line.id, p);

    return (
        <div style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 9,
        }}>
            {/* ── Header row: LINE n | up | down | trash ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", flex: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Line {index + 1}
                </span>
                <button disabled={index === 0}
                    onClick={() => onMoveUp(line.id)}
                    style={{ background: "none", border: "none", cursor: index === 0 ? "default" : "pointer", color: index === 0 ? "#cbd5e1" : "#64748b", padding: 2 }}>
                    <ChevronUp size={14} />
                </button>
                <button disabled={index === total - 1}
                    onClick={() => onMoveDown(line.id)}
                    style={{ background: "none", border: "none", cursor: index === total - 1 ? "default" : "pointer", color: index === total - 1 ? "#cbd5e1" : "#64748b", padding: 2 }}>
                    <ChevronDown size={14} />
                </button>
                {total > 1 && (
                    <button onClick={() => onRemove(line.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            {/* Content */}
            <input
                value={line.text}
                placeholder="Type your name…"
                onChange={(e) => upd({ text: e.target.value })}
                style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "7px 10px", borderRadius: 7,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#1e293b", fontSize: "0.88rem",
                    outline: "none", fontFamily: "inherit",
                }}
            />

            {/* Font */}
            <select
                value={line.fontLabel}
                onChange={(e) => upd({ fontLabel: e.target.value })}
                style={{
                    width: "100%", padding: "7px 10px", borderRadius: 7,
                    border: "1px solid #e2e8f0", background: "#fff",
                    color: "#1e293b", fontSize: "0.83rem", cursor: "pointer",
                    fontWeight: 600,
                }}
            >
                {KEYCHAIN_FONTS.map((f) => (
                    <option key={f.label} value={f.label}>{f.label}</option>
                ))}
            </select>

            {/* Color selector */}
            <button
                onClick={() => setColorOpen((o) => !o)}
                style={{
                    background: "none", border: "1px solid #e2e8f0", borderRadius: 7,
                    padding: "6px 10px", cursor: "pointer", width: "100%", textAlign: "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
            >
                <ColorDot color={line.color} label={colorLabel(line.color)} />
                <ChevronDown size={13} color="#94a3b8" style={{ transform: colorOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            {colorOpen && (
                <div style={{ padding: "8px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <ColorPicker value={line.color} onChange={(c) => upd({ color: c })} />
                </div>
            )}

            {/* Size / Depth / Spacing row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <MiniSlider label="Size" value={line.size} min={6} max={30} step={0.5} decimals={1} onChange={(v) => upd({ size: v })} />
                <MiniSlider label="Depth" value={line.depth} min={0.5} max={8} step={0.1} decimals={1} accent="#ec4899" onChange={(v) => upd({ depth: v })} />
                <MiniSlider label="Spacing" value={line.spacing} min={-2} max={10} step={0.1} decimals={1} accent="#8b5cf6" onChange={(v) => upd({ spacing: v })} />
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const NameKeychainEditor: React.FC = () => {
    const [state, setState] = useState<NameKeychainState>(DEFAULT_STATE);
    const [activeTab, setActiveTab] = useState<"lines" | "object">("lines");
    const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>(loadSaved);
    const [designName, setDesignName] = useState("");
    const [size, setSize] = useState({ x: 0, y: 0, z: 0 });
    const [savedOpen, setSavedOpen] = useState(false);
    const [massMode, setMassMode] = useState(false);
    const sceneRef = useRef<SceneHandle>(null);

    const set = useCallback(<K extends keyof NameKeychainState>(key: K, val: NameKeychainState[K]) => {
        setState((p) => ({ ...p, [key]: val }));
    }, []);

    // Line ops
    const addLine = () => setState((p) => ({ ...p, lines: [...p.lines, mkLine()] }));
    const removeLine = (id: string) => setState((p) => ({ ...p, lines: p.lines.filter((l) => l.id !== id) }));
    const updateLine = (id: string, patch: Partial<NameLine>) =>
        setState((p) => ({ ...p, lines: p.lines.map((l) => l.id === id ? { ...l, ...patch } : l) }));
    const moveLine = (id: string, dir: "up" | "down") =>
        setState((p) => {
            const arr = [...p.lines], i = arr.findIndex((l) => l.id === id);
            if (dir === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
            if (dir === "down" && i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
            return { ...p, lines: arr };
        });

    // Save/load
    const saveDesign = () => {
        if (!designName.trim()) return;
        const d = [...savedDesigns.filter((s) => s.name !== designName.trim()), { name: designName.trim(), state }];
        setSavedDesigns(d); persistSaved(d); setDesignName("");
    };
    const loadDesign = (d: SavedDesign) => setState(d.state);
    const deleteDesign = (name: string) => {
        const d = savedDesigns.filter((s) => s.name !== name);
        setSavedDesigns(d); persistSaved(d);
    };

    // Sidebar light-mode palette
    const SIDEBAR: React.CSSProperties = {
        position: "absolute",
        top: 0, left: 0, bottom: 0,
        width: 170,
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        overflowY: "auto",
        overflowX: "hidden",
    };

    const TAB = (active: boolean): React.CSSProperties => ({
        flex: 1, padding: "8px 4px",
        border: "none", borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
        background: "none", cursor: "pointer",
        fontWeight: active ? 700 : 500,
        fontSize: "0.72rem",
        color: active ? "#3b82f6" : "#94a3b8",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
    });

    return (
        <div className="editor-layout" style={{ background: "radial-gradient(circle at center, #f0f4ff 0%, #e8ecf8 100%)" }}>

            {/* ── Canvas fills whole page ─────────────────────────────── */}
            <div className="canvas-container" style={{ left: 170 }}>
                <SceneNameKeychain
                    ref={sceneRef}
                    state={state}
                    onBoundsChange={(x, y, z) => setSize({ x, y, z })}
                />
            </div>

            {/* ── SIZE BADGE (top-right of canvas, matching image 2) ───── */}
            <div style={{
                position: "absolute", top: 16, right: 20, zIndex: 30,
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "6px 12px",
                display: "flex", gap: 14, fontSize: "0.72rem",
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontWeight: 700, color: "#64748b", fontSize: "0.62rem", letterSpacing: "0.06em" }}>SIZE (mm)</span>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[["X", size.x], ["Y", size.y], ["Z", size.z]].map(([axis, val]) => (
                            <div key={String(axis)} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600 }}>{axis}</div>
                                <div style={{ fontWeight: 700, color: "#1e293b" }}>{Number(val).toFixed(1)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── LIGHT SIDEBAR ─────────────────────────────────────────── */}
            <div style={SIDEBAR}>

                {/* Header */}
                <div style={{
                    padding: "12px 12px 8px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                }}>
                    <Link to="/" style={{
                        display: "flex", alignItems: "center", gap: 4,
                        color: "#475569", textDecoration: "none",
                        fontSize: "0.8rem", fontWeight: 600,
                    }}>
                        <ChevronLeft size={16} /> Back
                    </Link>
                </div>

                {/* Title + mass mode */}
                <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", marginBottom: 8 }}>
                        Name Keychain
                    </div>
                    <button
                        onClick={() => setMassMode((m) => !m)}
                        style={{
                            width: "100%", padding: "6px 8px", borderRadius: 7,
                            border: massMode ? "1px solid #0d9488" : "1px solid #e2e8f0",
                            background: massMode ? "#0d9488" : "#f1f5f9",
                            color: massMode ? "#fff" : "#475569",
                            fontWeight: 600, fontSize: "0.7rem", cursor: "pointer",
                            letterSpacing: "0.04em", textTransform: "uppercase",
                        }}
                    >
                        {massMode ? "✓ Mass Mode ON" : "Mass Creation Mode"}
                    </button>
                </div>

                {/* Saved Designs */}
                <div style={{ borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                    <button
                        onClick={() => setSavedOpen((o) => !o)}
                        style={{
                            width: "100%", padding: "8px 12px",
                            background: "none", border: "none", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            fontSize: "0.7rem", fontWeight: 700, color: "#64748b",
                            textTransform: "uppercase", letterSpacing: "0.08em",
                        }}
                    >
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Bookmark size={12} /> Saved Designs
                        </span>
                        <ChevronDown size={12} style={{ transform: savedOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>

                    {savedOpen && (
                        <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", gap: 5 }}>
                                <input
                                    value={designName}
                                    onChange={(e) => setDesignName(e.target.value)}
                                    placeholder="Design name…"
                                    style={{
                                        flex: 1, padding: "5px 8px", borderRadius: 6,
                                        border: "1px solid #e2e8f0", fontSize: "0.75rem",
                                        color: "#1e293b", background: "#f8fafc", outline: "none",
                                    }}
                                />
                                <button
                                    onClick={saveDesign}
                                    style={{
                                        padding: "5px 9px", borderRadius: 6, border: "none",
                                        background: "#3b82f6", color: "#fff",
                                        fontWeight: 700, fontSize: "0.72rem", cursor: "pointer",
                                    }}
                                >
                                    <Save size={12} />
                                </button>
                            </div>
                            {savedDesigns.map((d) => (
                                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <button
                                        onClick={() => loadDesign(d)}
                                        style={{
                                            flex: 1, textAlign: "left", padding: "4px 8px",
                                            borderRadius: 6, border: "1px solid #e2e8f0",
                                            background: "#f8fafc", fontSize: "0.75rem",
                                            color: "#334155", cursor: "pointer",
                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}
                                    >
                                        {d.name}
                                    </button>
                                    <button
                                        onClick={() => deleteDesign(d.name)}
                                        style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 2 }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                    <button style={TAB(activeTab === "lines")} onClick={() => setActiveTab("lines")}>
                        Keychains
                    </button>
                    <button style={TAB(activeTab === "object")} onClick={() => setActiveTab("object")}>
                        Object Settings
                    </button>
                </div>

                {/* ── SCROLLABLE CONTENT ─────────────────────────────── */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

                    {/* ══ KEYCHAINS TAB ══════════════════════════════════ */}
                    {activeTab === "lines" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                            {/* Count label */}
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Active keychain lines &nbsp; {state.lines.length} of 8
                            </div>

                            {/* Line cards */}
                            {state.lines.map((line, i) => (
                                <LineCard
                                    key={line.id} line={line} index={i} total={state.lines.length}
                                    onUpdate={updateLine} onRemove={removeLine}
                                    onMoveUp={(id) => moveLine(id, "up")}
                                    onMoveDown={(id) => moveLine(id, "down")}
                                />
                            ))}

                            {/* Add line */}
                            {state.lines.length < 8 && (
                                <button
                                    onClick={addLine}
                                    style={{
                                        width: "100%", padding: "7px",
                                        borderRadius: 8, border: "1px dashed #cbd5e1",
                                        background: "#f8fafc", color: "#64748b",
                                        fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                    }}
                                >
                                    <Plus size={13} /> Add line
                                </button>
                            )}

                            <Rule />

                            {/* Line spacing */}
                            <Slider
                                label="Line spacing" value={state.lineSpacing}
                                min={0} max={15} step={0.5} decimals={1}
                                onChange={(v) => set("lineSpacing", v)}
                            />
                        </div>
                    )}

                    {/* ══ OBJECT SETTINGS TAB ════════════════════════════ */}
                    {activeTab === "object" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                            {/* Backing plate */}
                            <SH>Base outline</SH>
                            <Slider label="Thickness" value={state.outlineThickness} min={2} max={25} step={0.5} decimals={1} onChange={(v) => set("outlineThickness", v)} />
                            <Slider label="Depth" value={state.outlineDepth} min={0.5} max={8} step={0.1} decimals={1} onChange={(v) => set("outlineDepth", v)} />
                            <Slider label="Corner radius" value={state.cornerRadius} min={0} max={20} step={0.5} decimals={1} onChange={(v) => set("cornerRadius", v)} />
                            <SH>Base outline color</SH>
                            <ColorPicker value={state.outlineColor} onChange={(c) => set("outlineColor", c)} />

                            <Rule />

                            {/* Border */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <SH>Border</SH>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 6 }}>
                                    <input type="checkbox" checked={state.borderEnabled}
                                        onChange={(e) => set("borderEnabled", e.target.checked)}
                                        style={{ accentColor: "#3b82f6", width: 14, height: 14 }}
                                    />
                                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                        {state.borderEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                </label>
                            </div>
                            {state.borderEnabled && (
                                <>
                                    <Slider label="Border thickness" value={state.borderThickness} min={0.5} max={8} step={0.1} decimals={1} onChange={(v) => set("borderThickness", v)} />
                                    <SH>Border color</SH>
                                    <ColorPicker value={state.borderColor} onChange={(c) => set("borderColor", c)} />
                                </>
                            )}

                            <Rule />

                            {/* Ring */}
                            <SH>Keychain Ring</SH>
                            <Slider label="Ring radius" value={state.ringRadius} min={3} max={14} step={0.5} decimals={1} onChange={(v) => set("ringRadius", v)} />
                            <Slider label="Ring tube" value={state.ringTube} min={0.4} max={3} step={0.05} decimals={2} onChange={(v) => set("ringTube", v)} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── BOTTOM BAR (image 2 style) ────────────────────────────── */}
            <div style={{
                position: "absolute", bottom: 0, left: 170, right: 0,
                height: 52,
                background: "rgba(255,255,255,0.95)",
                borderTop: "1px solid #e2e8f0",
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                zIndex: 20,
                backdropFilter: "blur(8px)",
            }}>
                {/* Status */}
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ec4899" }} />
                    {state.lines.map((l) => l.text).filter(Boolean).join(" · ") || "—"}
                    {" · "}{state.lines.length} {state.lines.length === 1 ? "line" : "lines"}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Camera screenshot (placeholder) */}
                    <button
                        style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: "1px solid #e2e8f0", background: "#f8fafc",
                            color: "#64748b", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        title="Screenshot"
                    >
                        <Camera size={16} />
                    </button>

                    {/* Export STL */}
                    <button
                        onClick={() => sceneRef.current?.exportSTL()}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 8, border: "none",
                            background: "#1e293b", color: "#fff",
                            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                        }}
                    >
                        <Download size={14} /> Export STL
                    </button>

                    {/* Export 3MF */}
                    <button
                        onClick={() => sceneRef.current?.export3MF()}
                        style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 8,
                            border: "1px solid #e2e8f0", background: "#f8fafc",
                            color: "#334155",
                            fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                        }}
                    >
                        <Download size={14} /> Export 3MF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NameKeychainEditor;
