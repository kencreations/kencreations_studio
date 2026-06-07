import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ChevronLeft,
    Sliders,
    Palette,
    Layers,
    Download,
    Upload,
    Play,
    Pause,
    RefreshCw,
    Settings,
    Maximize2,
    Check,
    Box,
    Sparkles,
    Circle,
    Eye,
} from "lucide-react";
import SceneClicker from "../components/SceneClicker";
import type { ClickerState } from "../components/SceneClicker";
import { exportClickerSTL, exportClicker3MF } from "../utils/exportClicker";
import * as THREE from "three";
import { useLocation } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { AuthOverlay } from "../components/AuthOverlay";
import { RAW_TOOLS } from "./Home";

const PRESETS = [
    { name: "Bamboo Green", hex: "#10b981" },
    { name: "Jade White", hex: "#ffffff" },
    { name: "Matte Black", hex: "#18181b" },
    { name: "Crimson Red", hex: "#ef4444" },
    { name: "Neon Orange", hex: "#f97316" },
    { name: "Azure Blue", hex: "#06b6d4" },
    { name: "Royal Purple", hex: "#8b5cf6" },
    { name: "Gold", hex: "#eab308" },
];

const PRINTERS = [
    { name: "Bambu Lab X1 Carbon", width: 256, height: 256, heightZ: 256 },
    { name: "Bambu Lab A1 Mini", width: 180, height: 180, heightZ: 180 },
    { name: "Ender 3 V3", width: 220, height: 220, heightZ: 250 },
];

const FidgetClickerEditor: React.FC = () => {
    const [state, setState] = useState<ClickerState>({
        style: "elevated",
        customStlUrl: null,
        customStlName: null,
        customSvgString: null, // NEW
        customSvgName: null,   // NEW
        svgScale: 0.2,         // NEW
        baseColor: "#06b6d4",
        hookColor: "#10b981",
        hookEnabled: true,
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
        // Legacy cover plate fields (kept for backwards compat)
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
    });

    const location = useLocation();
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    const isFreeFeature = React.useMemo(() => {
        const tool = RAW_TOOLS.find((t) => t.path === location.pathname);
        if (!tool) return true;
        if (tool.priceHint && tool.priceHint.toLowerCase() !== "free") {
            return false;
        }
        return true;
    }, [location.pathname]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                setIsAuthorized(false);
                return;
            }
            if (isFreeFeature) {
                setIsAuthorized(true);
            } else {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists() && snap.data()?.isPaid) {
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
            }
        });
        return () => unsubscribe();
    }, [isFreeFeature]);

    const [activeTab, setActiveTab] = useState<"style" | "hook" | "color">(
        "style",
    );
    const [activeView, setActiveView] = useState<"edit" | "slice">("edit");

    // Refs for meshes to export
    const [baseMesh, setBaseMesh] = useState<THREE.Mesh | null>(null);
    const [hookMesh, setHookMesh] = useState<THREE.Mesh | null>(null);
    const [coverMesh, setCoverMesh] = useState<THREE.Mesh | null>(null);

    // Slicer settings
    const [slicerBrand, setSlicerBrand] = useState<"Bambu" | "eSun">("Bambu");
    const [slicerFilament, setSlicerFilament] = useState("PLA");
    const [slicerNozzle, setSlicerNozzle] = useState(0.4);
    const [selectedPrinter, setSelectedPrinter] = useState(PRINTERS[0]);
    const [showPrinterSetup, setShowPrinterSetup] = useState(false);

    const [slicerLayerHeight, setSlicerLayerHeight] = useState(0.12);
    const [slicerInfillDensity, setSlicerInfillDensity] = useState(15);
    const [slicerWallSpeed, setSlicerWallSpeed] = useState(150); // mm/s
    const [slicerTravelSpeed, setSlicerTravelSpeed] = useState(300); // mm/s
    const [slicerSupportEnabled, setSlicerSupportEnabled] = useState(false);

    // Slicing state variables
    const [slicingState, setSlicingState] = useState<
        "idle" | "heating" | "slicing" | "complete"
    >("idle");
    const [slicingProgress, setSlicingProgress] = useState(0);
    const [slicerTemp, setSlicerTemp] = useState(25);
    const [activeLayer, setActiveLayer] = useState(1);
    const [totalLayers, setTotalLayers] = useState(38);
    const [slicerPathProgress, setSlicerPathProgress] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Automatically trigger slicing on entering slice mode
    useEffect(() => {
        if (activeView === "slice" && slicingState === "idle") {
            runSlicingSimulation();
        }
    }, [activeView]);

    // Handle play/pause nozzle animation
    useEffect(() => {
        let interval: any;
        if (isPlaying && slicingState === "complete") {
            interval = setInterval(() => {
                setSlicerPathProgress((prev) => {
                    if (prev >= 100) {
                        setActiveLayer((layer) => {
                            if (layer >= totalLayers) {
                                return 1;
                            }
                            return layer + 1;
                        });
                        return 0;
                    }
                    return prev + 10;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, slicingState, totalLayers]);

    const runSlicingSimulation = () => {
        setSlicingState("heating");
        setSlicingProgress(0);
        setSlicerTemp(25);
        setSlicerPathProgress(100);

        let currentHeat = 25;
        const heatInterval = setInterval(() => {
            currentHeat += 35;
            if (currentHeat >= 220) {
                currentHeat = 220;
                clearInterval(heatInterval);

                setSlicingState("slicing");
                let progress = 0;
                const sliceInterval = setInterval(() => {
                    progress += 15;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(sliceInterval);
                        setSlicingState("complete");
                        setActiveLayer(totalLayers);
                    }
                    setSlicingProgress(progress);
                }, 100);
            }
            setSlicerTemp(currentHeat);
        }, 100);
    };

   const svgFileInputRef = useRef<HTMLInputElement>(null);

    const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setState((prev) => ({
                    ...prev,
                    style: "svg",
                    customSvgString: event.target?.result as string,
                    customSvgName: file.name,
                }));
            };
            reader.readAsText(file); // SVGs must be read as raw text XML
        }
    };

    const handleCustomStlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setState((prev) => ({
                ...prev,
                style: "custom",
                customStlUrl: url,
                customStlName: file.name,
            }));
            // Reset input value to allow uploading the same file again
            e.target.value = "";
        }
    };

    const handleStyleChange = (style: ClickerState["style"]) => {
        setState((prev) => ({ ...prev, style }));
    };

    const handleHookToggle = (enabled: boolean) => {
        setState((prev) => ({ ...prev, hookEnabled: enabled }));
    };

    const handleStateChange = (key: keyof ClickerState, value: any) => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

    // Calculate slicer stats
    const weightG = 12.8 * (slicerInfillDensity / 15);
    const printTimeMinutes = Math.round(
        35 * (0.12 / slicerLayerHeight) * (150 / slicerWallSpeed),
    );

    return (
        <div
            className="editor-layout"
            style={{
                background:
                    "radial-gradient(circle at center, #111827 0%, #030712 100%)",
                color: "#f3f4f6",
            }}>
            {!isAuthorized && (
                <AuthOverlay
                    onUnlock={() => setIsAuthorized(true)}
                    isFreeFeature={isFreeFeature}
                />
            )}
            
            {/* 3D Canvas */}
            <div className="canvas-container">
                <SceneClicker
                    state={state}
                    setBaseMeshRef={setBaseMesh}
                    setHookMeshRef={setHookMesh}
                    setCoverMeshRef={setCoverMesh}
                    isSlicing={activeView === "slice"}
                    activeLayer={activeLayer}
                    totalLayers={totalLayers}
                    slicerPathProgress={slicerPathProgress / 100}
                />
            </div>

            {/* Header branding / navigation */}
            <header
                className="home-header"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Link
                    to="/"
                    className="back-btn"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "none",
                        color: "#e5e7eb",
                        marginRight: "12px",
                    }}>
                    <ChevronLeft size={20} />
                </Link>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                        style={{
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: "#f3f4f6",
                        }}>
                        Fidget Clicker Customizer
                    </span>
                    <span
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                        }}>
                        {state.style === "custom"
                            ? state.customStlName
                            : `${state.style.toUpperCase()} Base Style`}
                    </span>
                </div>
                <div
                    className="home-nav"
                    style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: "10px",
                    }}>
                    <button
                        className={`btn-pill ${activeView === "edit" ? "primary" : "secondary"}`}
                        onClick={() => setActiveView("edit")}
                        style={{
                            border:
                                activeView === "edit"
                                    ? "none"
                                    : "1px solid rgba(255,255,255,0.15)",
                            background:
                                activeView === "edit" ? "" : "transparent",
                            color: "#ffffff",
                        }}>
                        <Sliders size={16} style={{ marginRight: "6px" }} />
                        Design
                    </button>
                    <button
                        className={`btn-pill ${activeView === "slice" ? "primary" : "secondary"}`}
                        onClick={() => setActiveView("slice")}
                        style={{
                            border:
                                activeView === "slice"
                                    ? "none"
                                    : "1px solid rgba(255,255,255,0.15)",
                            background:
                                activeView === "slice" ? "" : "transparent",
                            color: "#ffffff",
                        }}>
                        <Layers size={16} style={{ marginRight: "6px" }} />
                        Slice Simulator
                    </button>
                </div>
            </header>

            {/* DESIGN VIEW SIDEBAR */}
            {activeView === "edit" && (
                <div
                    className="sidebar"
                    style={{
                        background: "rgba(17, 24, 39, 0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#f3f4f6",
                        top: "80px",
                        bottom: "80px",
                    }}>
                    {/* Navigation Tabs */}
                    <div
                        style={{
                            display: "flex",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}>
                        <button
                            onClick={() => setActiveTab("style")}
                            style={{
                                flex: 1,
                                padding: "14px",
                                border: "none",
                                background:
                                    activeTab === "style"
                                        ? "rgba(255,255,255,0.05)"
                                        : "transparent",
                                color:
                                    activeTab === "style"
                                        ? "#f3f4f6"
                                        : "#9ca3af",
                                fontWeight: activeTab === "style" ? 600 : 400,
                                borderBottom:
                                    activeTab === "style"
                                        ? "2px solid #06b6d4"
                                        : "none",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "6px",
                            }}>
                            <Box size={16} /> Base Style
                        </button>
                        <button
                            onClick={() => setActiveTab("hook")}
                            style={{
                                flex: 1,
                                padding: "14px",
                                border: "none",
                                background:
                                    activeTab === "hook"
                                        ? "rgba(255,255,255,0.05)"
                                        : "transparent",
                                color:
                                    activeTab === "hook"
                                        ? "#f3f4f6"
                                        : "#9ca3af",
                                fontWeight: activeTab === "hook" ? 600 : 400,
                                borderBottom:
                                    activeTab === "hook"
                                        ? "2px solid #06b6d4"
                                        : "none",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "6px",
                            }}>
                            <Sparkles size={16} /> Modular Hook
                        </button>
                        <button
                            onClick={() => setActiveTab("color")}
                            style={{
                                flex: 1,
                                padding: "14px",
                                border: "none",
                                background:
                                    activeTab === "color"
                                        ? "rgba(255,255,255,0.05)"
                                        : "transparent",
                                color:
                                    activeTab === "color"
                                        ? "#f3f4f6"
                                        : "#9ca3af",
                                fontWeight: activeTab === "color" ? 600 : 400,
                                borderBottom:
                                    activeTab === "color"
                                        ? "2px solid #06b6d4"
                                        : "none",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: "6px",
                            }}>
                            <Palette size={16} /> Color
                        </button>
                    </div>

                    <div
                        className="sidebar-content"
                        style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
                        {/* TAB 1: BASE STYLE */}
                        {activeTab === "style" && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px",
                                }}>
                                <span
                                    style={{
                                        fontSize: "0.8rem",
                                        color: "#9ca3af",
                                        fontWeight: 500,
                                    }}>
                                    SELECT FIDGET CLICKER STYLE
                                </span>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "10px",
                                    }}>
                                    {[
                                        {
                                            id: "classic",
                                            label: "Style 1 (Classic)",
                                        },
                                        { id: "slim", label: "Style 2 (Slim)" },
                                        {
                                            id: "elevated",
                                            label: "Style 3 (Elevated)",
                                        },
                                        {
                                            id: "ergonomic",
                                            label: "Style 4 (Ergonomic)",
                                        },
                                    ].map((styleOption) => (
                                        <button
                                            key={styleOption.id}
                                            onClick={() =>
                                                handleStyleChange(
                                                    styleOption.id as any,
                                                )
                                            }
                                            style={{
                                                padding: "16px 12px",
                                                borderRadius: "12px",
                                                border: "1px solid",
                                                borderColor:
                                                    state.style ===
                                                    styleOption.id
                                                        ? "#06b6d4"
                                                        : "rgba(255,255,255,0.08)",
                                                background:
                                                    state.style ===
                                                    styleOption.id
                                                        ? "rgba(6,182,212,0.1)"
                                                        : "rgba(255,255,255,0.02)",
                                                color:
                                                    state.style ===
                                                    styleOption.id
                                                        ? "#22d3ee"
                                                        : "#d1d5db",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}>
                                            <Box size={24} />
                                            {styleOption.label}
                                        </button>
                                    ))}
                                </div>

                                <div
                                    style={{
                                        margin: "10px 0",
                                        borderTop:
                                            "1px solid rgba(255,255,255,0.08)",
                                        paddingTop: "16px",
                                    }}>
                                    <span
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "#9ca3af",
                                            fontWeight: 500,
                                            display: "block",
                                            marginBottom: "10px",
                                        }}>
                                        OR UPLOAD YOUR OWN REVISION STL
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".stl"
                                        onChange={handleCustomStlUpload}
                                        style={{ display: "none" }}
                                    />
                                    <button
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "14px",
                                            borderRadius: "12px",
                                            border: "1px dashed rgba(255,255,255,0.2)",
                                            background:
                                                "rgba(255,255,255,0.02)",
                                            color: "#e5e7eb",
                                            fontWeight: 600,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            cursor: "pointer",
                                        }}>
                                        <Upload size={18} />
                                        Upload STL File
                                    </button>
                                    {state.style === "custom" && (
                                        <div
                                            style={{
                                                marginTop: "10px",
                                                fontSize: "0.8rem",
                                                color: "#10b981",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                            }}>
                                            <Check size={16} /> Active Custom:{" "}
                                            {state.customStlName}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        margin: "10px 0",
                                        borderTop:
                                            "1px solid rgba(255,255,255,0.08)",
                                        paddingTop: "16px",
                                    }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            background:
                                                "rgba(255,255,255,0.02)",
                                            padding: "12px",
                                            borderRadius: "10px",
                                            marginBottom: "10px",
                                        }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                            }}>
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: "0.9rem",
                                                    color: "#ffffff",
                                                }}>
                                                Remove Imprinted Logo
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "0.7rem",
                                                    color: "#9ca3af",
                                                }}>
                                                Flatten embossed branding from the geometry
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={(state as any).logoRemoved || false}
                                            onChange={(e) =>
                                                handleStateChange(
                                                    "logoRemoved",
                                                    e.target.checked,
                                                )
                                            }
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                accentColor: "#06b6d4",
                                                cursor: "pointer",
                                            }}
                                        />
                                    </div>

                                    {(state as any).logoRemoved && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                background: "rgba(6,182,212,0.08)",
                                                border: "1px solid rgba(6,182,212,0.25)",
                                                borderRadius: "10px",
                                                padding: "10px 14px",
                                                fontSize: "0.78rem",
                                                color: "#22d3ee",
                                            }}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <circle cx="8" cy="8" r="7" stroke="#22d3ee" strokeWidth="1.5"/>
                                                <path d="M5 8l2 2 4-4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Logo removed from mesh geometry. Export STL for a clean, logo-free model.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: MODULAR HOOK ENGINE */}
                        {activeTab === "hook" && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "18px",
                                }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        background: "rgba(255,255,255,0.02)",
                                        padding: "12px",
                                        borderRadius: "10px",
                                    }}>
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "0.9rem",
                                        }}>
                                        Enable Modular Hook
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={state.hookEnabled}
                                        onChange={(e) =>
                                            handleHookToggle(e.target.checked)
                                        }
                                        style={{
                                            width: "20px",
                                            height: "20px",
                                            accentColor: "#06b6d4",
                                            cursor: "pointer",
                                        }}
                                    />
                                </div>

                                {state.hookEnabled && (
                                    <>
                                        {/* Hook Style Selector */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: "0.8rem",
                                                    color: "#9ca3af",
                                                    fontWeight: 500,
                                                }}>
                                                HOOK STYLE
                                            </span>
                                            <select
                                                value={state.hookStyle}
                                                onChange={(e) =>
                                                    handleStateChange(
                                                        "hookStyle",
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    background:
                                                        "rgba(255,255,255,0.05)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    color: "#ffffff",
                                                    outline: "none",
                                                }}>
                                                <option value="connector">
                                                    End Connector (Snap-Fit STL)
                                                </option>
                                                <option value="ring">
                                                    Ring Loop (Circular)
                                                </option>
                                                <option value="elevated">
                                                    Elevated Hook (Angled)
                                                </option>
                                                <option value="carabiner">
                                                    Carabiner Slot
                                                </option>
                                                <option value="tab">
                                                    Ergonomic Solid Tab
                                                </option>
                                            </select>
                                        </div>

                                        {/* Hook Position Selector */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: "0.8rem",
                                                    color: "#9ca3af",
                                                    fontWeight: 500,
                                                }}>
                                                HOOK DOCKING POSITION
                                            </span>
                                            <select
                                                value={state.hookPosition}
                                                onChange={(e) =>
                                                    handleStateChange(
                                                        "hookPosition",
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    padding: "10px",
                                                    borderRadius: "8px",
                                                    background:
                                                        "rgba(255,255,255,0.05)",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    color: "#ffffff",
                                                    outline: "none",
                                                }}>
                                                <option value="top">
                                                    Top Edge
                                                </option>
                                                <option value="bottom">
                                                    Bottom Edge
                                                </option>
                                                <option value="left">
                                                    Left Edge
                                                </option>
                                                <option value="right">
                                                    Right Edge
                                                </option>
                                            </select>
                                        </div>

                                        {/* Sliders for Hook parameters */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "12px",
                                                borderTop:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                paddingTop: "12px",
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: "0.8rem",
                                                    color: "#9ca3af",
                                                    fontWeight: 500,
                                                }}>
                                                DIMENSIONS (mm)
                                            </span>

                                            {/* Width */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Width</span>
                                                    <span>
                                                        {state.hookWidth} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={6}
                                                    max={30}
                                                    step={1}
                                                    value={state.hookWidth}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookWidth",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>

                                            {/* Height */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Height</span>
                                                    <span>
                                                        {state.hookHeight} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={6}
                                                    max={35}
                                                    step={1}
                                                    value={state.hookHeight}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookHeight",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>

                                            {/* Thickness */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Thickness</span>
                                                    <span>
                                                        {state.hookThickness} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={2}
                                                    max={12}
                                                    step={0.5}
                                                    value={state.hookThickness}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookThickness",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>

                                            {/* Hole Radius */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Hole Radius</span>
                                                    <span>
                                                        {state.hookHoleRadius}{" "}
                                                        mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={12}
                                                    step={0.5}
                                                    value={state.hookHoleRadius}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookHoleRadius",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Position offsets */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "12px",
                                                borderTop:
                                                    "1px solid rgba(255,255,255,0.08)",
                                                paddingTop: "12px",
                                            }}>
                                            <span
                                                style={{
                                                    fontSize: "0.8rem",
                                                    color: "#9ca3af",
                                                    fontWeight: 500,
                                                }}>
                                                FINE ADJUSTMENT OFFSETS (mm)
                                            </span>

                                            {/* Offset X */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Offset X</span>
                                                    <span>
                                                        {state.hookOffsetX} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-30}
                                                    max={30}
                                                    step={0.5}
                                                    value={state.hookOffsetX}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookOffsetX",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>

                                            {/* Offset Y */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Offset Y</span>
                                                    <span>
                                                        {state.hookOffsetY} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-30}
                                                    max={30}
                                                    step={0.5}
                                                    value={state.hookOffsetY}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookOffsetY",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>

                                            {/* Offset Z */}
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        fontSize: "0.8rem",
                                                        marginBottom: "4px",
                                                    }}>
                                                    <span>Offset Z</span>
                                                    <span>
                                                        {state.hookOffsetZ} mm
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-20}
                                                    max={20}
                                                    step={0.5}
                                                    value={state.hookOffsetZ}
                                                    onChange={(e) =>
                                                        handleStateChange(
                                                            "hookOffsetZ",
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        accentColor: "#06b6d4",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* TAB 3: COLOR PALETTE */}
                        {activeTab === "color" && (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "20px",
                                }}>
                                {/* Base Color section */}
                                <div>
                                    <span
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "#9ca3af",
                                            fontWeight: 500,
                                            display: "block",
                                            marginBottom: "10px",
                                        }}>
                                        BASE FIDGET COLOR
                                    </span>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(4, 1fr)",
                                            gap: "8px",
                                        }}>
                                        {PRESETS.map((color) => (
                                            <button
                                                key={`base-${color.name}`}
                                                onClick={() =>
                                                    handleStateChange(
                                                        "baseColor",
                                                        color.hex,
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    background: color.hex,
                                                    border:
                                                        state.baseColor.toLowerCase() ===
                                                        color.hex.toLowerCase()
                                                            ? "2px solid #06b6d4"
                                                            : "2px solid transparent",
                                                    cursor: "pointer",
                                                    boxShadow:
                                                        "0 2px 4px rgba(0,0,0,0.2)",
                                                }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <input
                                        type="color"
                                        value={state.baseColor}
                                        onChange={(e) =>
                                            handleStateChange(
                                                "baseColor",
                                                e.target.value,
                                            )
                                        }
                                        style={{
                                            width: "100%",
                                            height: "36px",
                                            marginTop: "10px",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            background: "transparent",
                                        }}
                                    />
                                </div>

                                {/* Hook Color section */}
                                {state.hookEnabled && (
                                    <div
                                        style={{
                                            borderTop:
                                                "1px solid rgba(255,255,255,0.08)",
                                            paddingTop: "16px",
                                        }}>
                                        <span
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#9ca3af",
                                                fontWeight: 500,
                                                display: "block",
                                                marginBottom: "10px",
                                            }}>
                                            MODULAR HOOK COLOR
                                        </span>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "repeat(4, 1fr)",
                                                gap: "8px",
                                            }}>
                                            {PRESETS.map((color) => (
                                                <button
                                                    key={`hook-${color.name}`}
                                                    onClick={() =>
                                                        handleStateChange(
                                                            "hookColor",
                                                            color.hex,
                                                        )
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        height: "36px",
                                                        borderRadius: "8px",
                                                        background: color.hex,
                                                        border:
                                                            state.hookColor.toLowerCase() ===
                                                            color.hex.toLowerCase()
                                                                ? "2px solid #06b6d4"
                                                                : "2px solid transparent",
                                                        cursor: "pointer",
                                                        boxShadow:
                                                            "0 2px 4px rgba(0,0,0,0.2)",
                                                    }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                        <input
                                            type="color"
                                            value={state.hookColor}
                                            onChange={(e) =>
                                                handleStateChange(
                                                    "hookColor",
                                                    e.target.value,
                                                )
                                            }
                                            style={{
                                                width: "100%",
                                                height: "36px",
                                                marginTop: "10px",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                background: "transparent",
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SLICER VIEW PANEL (OVERLAY LAYER) */}
            {activeView === "slice" && (
                <div
                    className="slicer-workspace"
                    style={{ background: "rgba(3, 7, 18, 0.3)" }}>
                    {/* Left Sidebar */}
                    <div
                        className="slicer-sidebar-left"
                        style={{
                            background: "rgba(17, 24, 39, 0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#f3f4f6",
                            top: "80px",
                            bottom: "80px",
                            left: "24px",
                        }}>
                        <div
                            className="slicer-header"
                            style={{
                                borderBottom:
                                    "1px solid rgba(255,255,255,0.08)",
                            }}>
                            <div className="slicer-logo">
                                <Layers
                                    className="brand-icon"
                                    size={24}
                                    color="#06b6d4"
                                />
                                <span
                                    style={{
                                        color: "#ffffff",
                                        fontWeight: 700,
                                    }}>
                                    Print Engine
                                </span>
                                <span
                                    className="slicer-logo-badge"
                                    style={{
                                        background: "#06b6d4",
                                        color: "#000000",
                                    }}>
                                    G-Code
                                </span>
                            </div>
                        </div>

                        <div
                            className="slicer-scrollable-content"
                            style={{ padding: "20px" }}>
                            {/* Infill Density Slider */}
                            <div
                                className="slicer-input-group"
                                style={{ marginBottom: "16px" }}>
                                <span
                                    className="slicer-section-title"
                                    style={{ color: "#9ca3af" }}>
                                    Infill Density
                                </span>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "0.85rem",
                                        marginBottom: "4px",
                                    }}>
                                    <span>Density</span>
                                    <span>{slicerInfillDensity}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={80}
                                    step={5}
                                    value={slicerInfillDensity}
                                    onChange={(e) =>
                                        setSlicerInfillDensity(
                                            Number(e.target.value),
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        accentColor: "#06b6d4",
                                    }}
                                />
                            </div>

                            {/* Layer Height Slider */}
                            <div
                                className="slicer-input-group"
                                style={{ marginBottom: "16px" }}>
                                <span
                                    className="slicer-section-title"
                                    style={{ color: "#9ca3af" }}>
                                    Layer Height
                                </span>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "0.85rem",
                                        marginBottom: "4px",
                                    }}>
                                    <span>Z Resolution</span>
                                    <span>{slicerLayerHeight} mm</span>
                                </div>
                                <input
                                    type="range"
                                    min={0.08}
                                    max={0.28}
                                    step={0.04}
                                    value={slicerLayerHeight}
                                    onChange={(e) =>
                                        setSlicerLayerHeight(
                                            Number(e.target.value),
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        accentColor: "#06b6d4",
                                    }}
                                />
                            </div>

                            {/* Wall speed */}
                            <div
                                className="slicer-input-group"
                                style={{ marginBottom: "16px" }}>
                                <span
                                    className="slicer-section-title"
                                    style={{ color: "#9ca3af" }}>
                                    Outer Wall Print Speed
                                </span>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "0.85rem",
                                        marginBottom: "4px",
                                    }}>
                                    <span>Extrusion Velocity</span>
                                    <span>{slicerWallSpeed} mm/s</span>
                                </div>
                                <input
                                    type="range"
                                    min={50}
                                    max={250}
                                    step={10}
                                    value={slicerWallSpeed}
                                    onChange={(e) =>
                                        setSlicerWallSpeed(
                                            Number(e.target.value),
                                        )
                                    }
                                    style={{
                                        width: "100%",
                                        accentColor: "#06b6d4",
                                    }}
                                />
                            </div>

                            {/* Support toggler */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "rgba(255,255,255,0.02)",
                                    padding: "12px",
                                    borderRadius: "10px",
                                    marginBottom: "20px",
                                }}>
                                <span
                                    style={{
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                    }}>
                                    Generate Supports
                                </span>
                                <input
                                    type="checkbox"
                                    checked={slicerSupportEnabled}
                                    onChange={(e) =>
                                        setSlicerSupportEnabled(
                                            e.target.checked,
                                        )
                                    }
                                    style={{
                                        width: "16px",
                                        height: "16px",
                                        accentColor: "#06b6d4",
                                    }}
                                />
                            </div>

                            <button
                                className="btn-pill primary"
                                onClick={runSlicingSimulation}
                                style={{
                                    width: "100%",
                                    justifyContent: "center",
                                    height: "42px",
                                    fontSize: "0.9rem",
                                }}>
                                <RefreshCw
                                    size={16}
                                    style={{ marginRight: "6px" }}
                                />
                                Re-Slice Model
                            </button>
                        </div>
                    </div>

                    {/* Right Stats Sidebar */}
                    <div
                        className="slicer-sidebar-right"
                        style={{
                            background: "rgba(17, 24, 39, 0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#f3f4f6",
                            top: "80px",
                            bottom: "80px",
                            right: "24px",
                        }}>
                        <div
                            className="slicer-header"
                            style={{
                                borderBottom:
                                    "1px solid rgba(255,255,255,0.08)",
                            }}>
                            <span style={{ fontWeight: 700 }}>
                                Slicing Diagnostics
                            </span>
                        </div>

                        <div
                            className="slicer-diagnostics-content"
                            style={{ padding: "20px" }}>
                            {slicingState === "heating" && (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "40px 0",
                                    }}>
                                    <div
                                        style={{
                                            fontSize: "2.5rem",
                                            color: "#ca8a04",
                                            fontWeight: 700,
                                        }}>
                                        {slicerTemp}°C
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "0.9rem",
                                            color: "#9ca3af",
                                        }}>
                                        Heating Nozzle...
                                    </span>
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "4px",
                                            background:
                                                "rgba(255,255,255,0.05)",
                                            borderRadius: "2px",
                                            marginTop: "16px",
                                            overflow: "hidden",
                                        }}>
                                        <div
                                            style={{
                                                width: `${(slicerTemp / 220) * 100}%`,
                                                height: "100%",
                                                background: "#ca8a04",
                                                transition: "width 0.1s ease",
                                            }}></div>
                                    </div>
                                </div>
                            )}

                            {slicingState === "slicing" && (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "40px 0",
                                    }}>
                                    <div
                                        style={{
                                            fontSize: "2.5rem",
                                            color: "#06b6d4",
                                            fontWeight: 700,
                                        }}>
                                        {slicingProgress}%
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "0.9rem",
                                            color: "#9ca3af",
                                        }}>
                                        Analyzing Mesh Volumetrics...
                                    </span>
                                    <div
                                        style={{
                                            width: "100%",
                                            height: "4px",
                                            background:
                                                "rgba(255,255,255,0.05)",
                                            borderRadius: "2px",
                                            marginTop: "16px",
                                            overflow: "hidden",
                                        }}>
                                        <div
                                            style={{
                                                width: `${slicingProgress}%`,
                                                height: "100%",
                                                background: "#06b6d4",
                                                transition: "width 0.1s ease",
                                            }}></div>
                                    </div>
                                </div>
                            )}

                            {slicingState === "complete" && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "16px",
                                    }}>
                                    {/* Stats grid */}
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "10px",
                                        }}>
                                        <div
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.02)",
                                                padding: "14px",
                                                borderRadius: "10px",
                                                textAlign: "center",
                                            }}>
                                            <div
                                                style={{
                                                    fontSize: "1.2rem",
                                                    fontWeight: 700,
                                                    color: "#10b981",
                                                }}>
                                                {printTimeMinutes}m
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#9ca3af",
                                                }}>
                                                Print Time
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.02)",
                                                padding: "14px",
                                                borderRadius: "10px",
                                                textAlign: "center",
                                            }}>
                                            <div
                                                style={{
                                                    fontSize: "1.2rem",
                                                    fontWeight: 700,
                                                    color: "#10b981",
                                                }}>
                                                {weightG.toFixed(1)}g
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#9ca3af",
                                                }}>
                                                Filament
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats rows */}
                                    <div
                                        style={{
                                            borderTop:
                                                "1px solid rgba(255,255,255,0.08)",
                                            paddingTop: "12px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px",
                                            fontSize: "0.85rem",
                                        }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}>
                                            <span style={{ color: "#9ca3af" }}>
                                                Layer Count:
                                            </span>
                                            <span>{totalLayers} Layers</span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}>
                                            <span style={{ color: "#9ca3af" }}>
                                                Extrusion nozzle:
                                            </span>
                                            <span>{slicerNozzle} mm</span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                            }}>
                                            <span style={{ color: "#9ca3af" }}>
                                                Materials:
                                            </span>
                                            <span>PLA Filament</span>
                                        </div>
                                    </div>

                                    {/* Nozzle simulation controllers */}
                                    <div
                                        style={{
                                            borderTop:
                                                "1px solid rgba(255,255,255,0.08)",
                                            paddingTop: "16px",
                                        }}>
                                        <span
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#9ca3af",
                                                fontWeight: 500,
                                                display: "block",
                                                marginBottom: "10px",
                                            }}>
                                            NOZZLE TOOLPATH PLAYER
                                        </span>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "10px",
                                                alignItems: "center",
                                            }}>
                                            <button
                                                className="btn-pill secondary"
                                                onClick={() =>
                                                    setIsPlaying(!isPlaying)
                                                }
                                                style={{
                                                    flex: 1,
                                                    padding: "8px 12px",
                                                    border: "1px solid rgba(255,255,255,0.15)",
                                                    background: "transparent",
                                                    color: "#ffffff",
                                                    height: "36px",
                                                    justifyContent: "center",
                                                }}>
                                                {isPlaying ? (
                                                    <Pause size={16} />
                                                ) : (
                                                    <Play size={16} />
                                                )}
                                                <span
                                                    style={{
                                                        marginLeft: "6px",
                                                    }}>
                                                    {isPlaying
                                                        ? "Pause"
                                                        : "Play"}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Layer slider control */}
                                        <div style={{ marginTop: "16px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    fontSize: "0.8rem",
                                                    marginBottom: "4px",
                                                }}>
                                                <span>
                                                    Active Layer Preview
                                                </span>
                                                <span>
                                                    Layer {activeLayer} /{" "}
                                                    {totalLayers}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={totalLayers}
                                                step={1}
                                                value={activeLayer}
                                                onChange={(e) =>
                                                    setActiveLayer(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    accentColor: "#06b6d4",
                                                }}
                                            />
                                        </div>

                                        {/* Toolpath Progress Control */}
                                        <div style={{ marginTop: "12px" }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    fontSize: "0.8rem",
                                                    marginBottom: "4px",
                                                }}>
                                                <span>Toolpath Draw Path</span>
                                                <span>
                                                    {slicerPathProgress}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                step={5}
                                                value={slicerPathProgress}
                                                onChange={(e) =>
                                                    setSlicerPathProgress(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                style={{
                                                    width: "100%",
                                                    accentColor: "#06b6d4",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Download Actions Bar */}
            <div
                style={{
                    position: "absolute",
                    bottom: "24px",
                    left: activeView === "edit" ? "400px" : "400px",
                    right: "24px",
                    height: "56px",
                    background: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 20px",
                    zIndex: 10,
                }}>
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        fontSize: "0.85rem",
                        color: "#9ca3af",
                    }}>
                    <Eye size={16} /> Drag to Orbit • Scroll to Zoom
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        className="btn-pill secondary"
                        onClick={() =>
                            exportClickerSTL(baseMesh, hookMesh, coverMesh)
                        }
                        style={{
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "transparent",
                            color: "#ffffff",
                        }}>
                        <Download size={16} style={{ marginRight: "6px" }} />
                        Export STL
                    </button>
                    <button
                        className="btn-pill primary"
                        onClick={() =>
                            exportClicker3MF(baseMesh, hookMesh, coverMesh)
                        }>
                        <Download size={16} style={{ marginRight: "6px" }} />
                        Export 3MF (Color)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FidgetClickerEditor;
