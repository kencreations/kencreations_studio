import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { RAW_TOOLS } from "./Home";

import Sidebar from "../components/Sidebar";
import Scene from "../components/Scene";
import Scene2 from "../components/Scene2";
import Scene3 from "../components/Scene3";
import Scene4 from "../components/Scene4";
import ScenePencil from "../components/ScenePencil";
import { BuildPlatePreview } from "../components/BuildPlatePreview";
import type { AppState } from "../types";
import { FONTS } from "../types";
import {
    Download,
    Camera,
    Box,
    X,
    Plus,
    Trash2,
    Zap,
    Settings,
    Activity,
    Cpu,
    Play,
    CheckCircle,
    RotateCcw,
    AlertTriangle,
    Printer,
    Layers,
} from "lucide-react";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { export3MF } from "../utils/export3MF";
import * as THREE from "three";
import { Evaluator, Brush, ADDITION } from "three-bvh-csg";

import { auth, db } from "../firebaseConfig"; // Ensure this import is correct
import { doc, getDoc } from "firebase/firestore";
import JSZip from "jszip";
import { AuthOverlay } from "../components/AuthOverlay";
import { logExportEvent } from "../utils/metrics";

const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // 1. ALL HOOKS FIRST
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true); // <--- ADD THIS

    const isPencilTopper = id === "pencil-topper";
    const isDesign2 = id === "id-name-tag-2";
    const isDesign3 = id === "bag-tag" || id === "id-name-tag-3";
    const isDesign4 = id === "id-name-tag-4";

    const location = useLocation();
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
                setChecking(false);
                setIsAuthorized(false);
                setShowAuthModal(true); // Show modal if not logged in
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
                    setShowAuthModal(true); // Show modal if paid feature but not paid
                }
            }
            setChecking(false);
        });
        return () => unsubscribe();
    }, [id, isFreeFeature]);
    const design1State: AppState = {
        lines: [
            {
                id: "1",
                text: "NICKNAME",
                font: FONTS[0].url,
                size: 10,
                depth: 1.5,
            },
            {
                id: "2",
                text: "Full Name / Tag",
                font: FONTS[0].url,
                size: 5,
                depth: 1.0,
            },
        ],
        lineSpacing: 2.0,
        textColor: "#000000",
        borderColor: "#000000",
        baseColor: "#FFFFFF",
        laceHole: {
            enabled: true,
            width: 15,
            height: 2,
            topMargin: 3,
            type: "default",
        },
        shape: {
            autoSize: true,
            padding: 10,
            width: 75,
            height: 40,
            cornerRadius: 4,
            amplitude: 0,
            wavelength: 0,
            baseThickness: 2.0,
            topBorder: 1.0,
            innerRadius: 20,
            borderWidth: 2.0,
        },
    };

    const design2State: AppState = {
        lines: [
            {
                id: "1",
                text: "HELLO, MY NAME IS",
                font: FONTS[8].url,
                size: 10,
                depth: 0.6,
            },
            {
                id: "2",
                text: "NICKNAME",
                font: FONTS[0].url,
                size: 18.0,
                depth: 1,
            },
            {
                id: "3",
                text: "Full Name / Tag",
                font: FONTS[8].url,
                size: 7,
                depth: 0.6,
            },
        ],
        lineSpacing: 2.0,
        textColor: "#6F5034",
        borderColor: "#6F5034",
        baseColor: "#F7E6DE",
        laceHole: {
            enabled: true,
            width: 11.0,
            height: 4.5,
            topMargin: 2.0,
            type: "default",
        },
        shape: {
            autoSize: true,
            padding: 4.0,
            width: 175.0,
            height: 61.0,
            cornerRadius: 20,
            amplitude: 0,
            wavelength: 0,
            baseThickness: 3.5,
            topBorder: 1.5,
            innerRadius: 14.0,
            borderWidth: 2.0,
        },
    };

    const pencilTopperState: AppState = {
        lines: [
            {
                id: "1",
                text: "HELLO",
                font: FONTS[0].url,
                size: 23,
                depth: 1.2,
            },
        ],
        lineSpacing: 2.0,
        textColor: "#FFFFFF",
        borderColor: "#3B82F6",
        baseColor: "#3B82F6",
        laceHole: {
            enabled: true,
            width: 7.8, // Pencil hole diameter
            height: 2,
            topMargin: 0,
            type: "default",
        },
        shape: {
            autoSize: true,
            padding: 9.5, // Outline width
            width: 118.5,
            height: 42.3,
            cornerRadius: 20,
            amplitude: 0,
            wavelength: 0,
            baseThickness: 12.8,
            topBorder: 0,
            innerRadius: 20,
            borderWidth: 2.0,
        },
    };

    const design3State: AppState = {
        lines: [
            {
                id: "1",
                text: "NICKNAME",
                font: FONTS[14].url, // Arial Rounded Bold
                size: 15,
                depth: 1.5,
            },
            {
                id: "2",
                text: "Full Name / Tag",
                font: FONTS[13].url, // Arial Rounded Bold/Medium
                size: 7.0,
                depth: 1.0,
            },
        ],
        lineSpacing: 3.5,
        textColor: "#ffffff",
        borderColor: "#ffffff",
        baseColor: "#0f3d59",
        laceHole: {
            enabled: true,
            width: 5.5,
            height: 5.5,
            topMargin: 2.0,
            type: "default",
        },
        shape: {
            autoSize: true,
            padding: 9.0,
            width: 90,
            height: 48,
            cornerRadius: 10,
            amplitude: 0,
            wavelength: 0,
            baseThickness: 3.5,
            topBorder: 1.5,
            innerRadius: 10,
            borderWidth: 2.0,
        },
    };

    const design4State: AppState = {
        lines: [
            {
                id: "1",
                text: "NICKNAME",
                font: FONTS[0].url,
                size: 15,
                depth: 1.7,
            },
            {
                id: "2",
                text: "Full Name / Tag",
                font: FONTS[0].url,
                size: 7,
                depth: 1.0,
            },
        ],
        lineSpacing: 2.0,
        textColor: "#000000",
        borderColor: "#000000",
        baseColor: "#E4BD68",
        laceHole: {
            enabled: true,
            width: 5,
            height: 5,
            topMargin: 0,
            type: "default",
        },
        shape: {
            modelType: 0,
            autoSize: true,
            padding: 10,
            width: 140,
            height: 70,
            cornerRadius: 10,
            amplitude: 0,
            wavelength: 0,
            baseThickness: 3.3,
            topBorder: 1.5,
            innerRadius: 10,
            borderWidth: 2.0,
        },
    };

    const initialState = isPencilTopper
        ? pencilTopperState
        : isDesign4
          ? design4State
          : isDesign2
            ? design2State
            : isDesign3
              ? design3State
              : design1State;

    const [state, setState] = useState<AppState>(initialState);

    useEffect(() => {
        setState(initialState);
    }, [id]);

    const [bounds, setBounds] = useState({ x: 75, y: 40, z: 4.5 });
    const groupRef = useRef<THREE.Group>(null);

    const updateState = (updates: Partial<AppState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    };

    // --- BATCH MOCKUP GENERATOR STATES & LOGIC ---
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
    const [colorCombos, setColorCombos] = useState([
        {
            id: "1",
            name: "Cocoa & Cream",
            baseColor: "#F7E6DE",
            textColor: "#6F5034",
            borderColor: "#6F5034",
        },
        {
            id: "2",
            name: "Azure Blue",
            baseColor: "#93C5FD",
            textColor: "#1E3A8A",
            borderColor: "#1E3A8A",
        },
        {
            id: "3",
            name: "Strawberry Cream",
            baseColor: "#FFE4E6",
            textColor: "#E11D48",
            borderColor: "#E11D48",
        },
        {
            id: "4",
            name: "Forest Gold",
            baseColor: "#E4BD68",
            textColor: "#14532D",
            borderColor: "#14532D",
        },
        {
            id: "5",
            name: "Charcoal White",
            baseColor: "#FFFFFF",
            textColor: "#1F2937",
            borderColor: "#1F2937",
        },
    ]);
    const [customComboName, setCustomComboName] = useState("");
    const [customBaseColor, setCustomBaseColor] = useState("#3B82F6");
    const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
    const [customBorderColor, setCustomBorderColor] = useState("#3B82F6");

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState("");
    const [generationPercent, setGenerationPercent] = useState(0);

    const openCameraModal = () => {
        const currentFont = isPencilTopper
            ? state.lines[0]?.font
            : state.lines.length >= 2
              ? state.lines[1].font
              : state.lines[0]?.font;
        const fontList = [
            currentFont,
            FONTS[0].url, // Titan One
            FONTS[3].url, // Kindergo
            FONTS[6].url, // Bebas Neue
            FONTS[8].url, // Coiny
        ].filter((url, index, self) => url && self.indexOf(url) === index);

        setSelectedFonts(fontList);

        const activeCombo = {
            id: "current",
            name: "Current Design Colors",
            baseColor: state.baseColor,
            textColor: state.textColor,
            borderColor: state.borderColor,
        };

        setColorCombos((prev) => [
            activeCombo,
            ...prev.filter((c) => c.id !== "current"),
        ]);

        setShowCameraModal(true);
    };

    const addCustomCombo = () => {
        if (!customComboName.trim()) {
            alert("Please enter a name for the color combination.");
            return;
        }
        const newCombo = {
            id: Date.now().toString(),
            name: customComboName.trim(),
            baseColor: customBaseColor,
            textColor: customTextColor,
            borderColor: customBorderColor,
        };
        setColorCombos((prev) => [...prev, newCombo]);
        setCustomComboName("");
    };

    const deleteCombo = (idToDelete: string) => {
        setColorCombos((prev) => prev.filter((c) => c.id !== idToDelete));
    };

    const toggleFontSelection = (url: string) => {
        setSelectedFonts((prev) =>
            prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
        );
    };

    const generateCatalog = async () => {
        if (selectedFonts.length === 0) {
            alert("Please select at least one font.");
            return;
        }
        if (colorCombos.length === 0) {
            alert("Please select at least one color combination.");
            return;
        }

        setIsGenerating(true);
        setGenerationPercent(0);

        const zip = new JSZip();
        const originalState = JSON.parse(JSON.stringify(state));

        const canvas = document.querySelector("canvas");
        if (!canvas) {
            alert("Could not locate 3D Canvas element.");
            setIsGenerating(false);
            return;
        }

        const mainLineIndex = isPencilTopper
            ? 0
            : state.lines.length >= 2
              ? 1
              : 0;
        const totalSteps = selectedFonts.length * colorCombos.length;
        let stepCount = 0;

        try {
            for (const fontUrl of selectedFonts) {
                const fontObj = FONTS.find((f) => f.url === fontUrl);
                const fontName = fontObj ? fontObj.name : "Font";

                for (const combo of colorCombos) {
                    stepCount++;
                    const percent = Math.round((stepCount / totalSteps) * 100);
                    setGenerationPercent(percent);
                    setGenerationProgress(
                        `Rendering option ${stepCount} of ${totalSteps}: ${fontName} (${combo.name})...`,
                    );

                    // Create state updates
                    const updatedLines = state.lines.map((line, idx) => {
                        if (idx === mainLineIndex) {
                            return { ...line, font: fontUrl };
                        }
                        return line;
                    });

                    const updatedState = {
                        ...state,
                        lines: updatedLines,
                        baseColor: combo.baseColor,
                        textColor: combo.textColor,
                        borderColor: combo.borderColor,
                    };

                    // Apply update
                    setState(updatedState);

                    // Wait for dynamic font rendering
                    await new Promise((resolve) => setTimeout(resolve, 600));

                    // Get base64 PNG data URL from Three.js canvas
                    const dataUrl = canvas.toDataURL("image/png");
                    const base64Data = dataUrl.split(",")[1];

                    const safeFontName = fontName.replace(/[^a-zA-Z0-9]/g, "");
                    const safeComboName = combo.name.replace(
                        /[^a-zA-Z0-9]/g,
                        "_",
                    );
                    const filename = `preview_${safeFontName}_${safeComboName}.png`;

                    zip.file(filename, base64Data, { base64: true });
                }
            }

            setGenerationProgress("Creating ZIP folder...");
            setGenerationPercent(95);
            await new Promise((resolve) => setTimeout(resolve, 300));

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement("a");
            link.style.display = "none";
            link.href = url;
            link.download = `${getDownloadFilename("zip").replace(".zip", "_catalog_pack.zip")}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Batch screenshot catalog generation failed:", error);
            alert("Catalog generation encountered an unexpected error.");
        } finally {
            // Restore exact original state
            setState(originalState);
            setIsGenerating(false);
            setShowCameraModal(false);
        }
    };

    const getDownloadFilename = (ext: string) => {
        const nameLine =
            state.lines.length >= 2
                ? state.lines[1].text.trim() || "nametag"
                : state.lines[0]?.text.trim() || "nametag";
        const safeName = nameLine.replace(/[^a-zA-Z0-9_-]/g, "_");
        const prefix = isPencilTopper
            ? "pencil_topper"
            : isDesign2
              ? "idnametag_v2"
              : isDesign3
                ? "idnametag_v3"
                : "idnametag";
        return `${prefix}_${safeName}.${ext}`;
    };

    const exportSTL = async () => {
        if (!groupRef.current) return;

        const meshes: THREE.Mesh[] = [];
        groupRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                meshes.push(child as THREE.Mesh);
            }
        });

        // Create a temporary group to hold meshes in world coordinates for export
        const tempGroup = new THREE.Group();

        // 1. Separate base, border, and other (text) meshes
        const baseMeshes = meshes.filter((m) => m.name === "base");
        const borderMeshes = meshes.filter((m) => m.name === "border");
        const textMeshes = meshes.filter(
            (m) =>
                m.name === "text" ||
                (!m.name && m !== baseMeshes[0] && m !== borderMeshes[0]),
        );

        // 2. Add base and border meshes in world coordinates directly (perfect watertight meshes)
        baseMeshes.forEach((m) => {
            const cloned = new THREE.Mesh(m.geometry.clone(), m.material);
            cloned.geometry.applyMatrix4(m.matrixWorld);
            tempGroup.add(cloned);
        });
        borderMeshes.forEach((m) => {
            const cloned = new THREE.Mesh(m.geometry.clone(), m.material);
            cloned.geometry.applyMatrix4(m.matrixWorld);
            tempGroup.add(cloned);
        });

        // 4. Add all text meshes in world coordinates (individually watertight, perfectly manifold!)
        textMeshes.forEach((m) => {
            const cloned = new THREE.Mesh(m.geometry.clone(), m.material);
            cloned.geometry.applyMatrix4(m.matrixWorld);
            tempGroup.add(cloned);
        });

        const exporter = new STLExporter();
        // Export as binary STL for optimal file size and extremely fast slicer loading
        const result = exporter.parse(tempGroup, { binary: true });
        const blob = new Blob([result], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.style.display = "none";
        link.href = url;
        link.download = getDownloadFilename("stl");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await logExportEvent("stl");
    };

    const handleExport3MF = async () => {
        if (!groupRef.current) return;
        await export3MF(groupRef.current, getDownloadFilename("3mf"));
        await logExportEvent("3mf");
    };

    return (
        <div className="editor-layout">
            {!isAuthorized && (
                <AuthOverlay
                    onUnlock={() => setIsAuthorized(true)}
                    isFreeFeature={isFreeFeature}
                />
            )}

            <Sidebar
                state={state}
                updateState={updateState}
                bounds={bounds}
                isDesign2={isDesign2}
                isPencilTopper={isPencilTopper}
                isDesign3={isDesign3}
                isDesign4={isDesign4}
            />

            <main className="canvas-container">
                {/* HUD Dimensions */}
                <div
                    style={{
                        position: "absolute",
                        top: "24px",
                        left: "408px",
                        zIndex: 10,
                    }}
                >
                    <div className="hud-panel">
                        <div className="hud-title">Size (mm)</div>
                        <div className="hud-grid">
                            <div className="hud-value">
                                <span className="hud-label">X</span>
                                <span className="hud-data">
                                    {bounds.x.toFixed(1)}
                                </span>
                            </div>
                            <div className="hud-value">
                                <span className="hud-label">Y</span>
                                <span className="hud-data">
                                    {bounds.y.toFixed(1)}
                                </span>
                            </div>
                            <div className="hud-value">
                                <span className="hud-label">Z</span>
                                <span className="hud-data">
                                    {bounds.z.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        position: "absolute",
                        bottom: "24px",
                        right: "24px",
                        zIndex: 10,
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                    }}
                >
                    <button
                        className="btn-pill btn-pill-icon"
                        onClick={openCameraModal}
                        title="Batch Catalog Generator"
                    >
                        <Camera size={20} />
                    </button>
                    <button className="btn-pill primary" onClick={exportSTL}>
                        <Download size={18} />
                        Export STL
                    </button>
                    <button className="btn-pill" onClick={handleExport3MF}>
                        <Box size={18} />
                        Export 3MF
                    </button>
                </div>

                {state.massCreation?.enabled ? (
                    <BuildPlatePreview state={state} meshRef={groupRef} />
                ) : isPencilTopper ? (
                    <ScenePencil
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                ) : isDesign2 ? (
                    <Scene2
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                ) : isDesign3 ? (
                    <Scene3
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                ) : isDesign4 ? (
                    <Scene4
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                ) : (
                    <Scene
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                )}

                {/* Batch Mockup Generator Modal */}
                {showCameraModal && (
                    <div
                        className="modal-overlay"
                        onClick={() =>
                            !isGenerating && setShowCameraModal(false)
                        }
                    >
                        <div
                            className="modal-container"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    Batch Catalog Generator
                                </h3>
                                <button
                                    className="modal-close-btn"
                                    onClick={() => setShowCameraModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                {/* Font Selection Section */}
                                <div className="modal-section">
                                    <div className="modal-section-title">
                                        <span>
                                            Select Fonts to Generate (
                                            {selectedFonts.length})
                                        </span>
                                        <span
                                            className="modal-section-link"
                                            onClick={() =>
                                                setSelectedFonts(
                                                    FONTS.map((f) => f.url),
                                                )
                                            }
                                        >
                                            Select All
                                        </span>
                                    </div>
                                    <div className="font-selection-grid">
                                        {FONTS.map((font) => {
                                            const isSelected =
                                                selectedFonts.includes(
                                                    font.url,
                                                );
                                            return (
                                                <div
                                                    key={font.url}
                                                    className={`font-checkbox-card ${isSelected ? "selected" : ""}`}
                                                    onClick={() =>
                                                        toggleFontSelection(
                                                            font.url,
                                                        )
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} /* Handled by parent div onClick */
                                                    />
                                                    <span
                                                        className="font-checkbox-label"
                                                        style={{
                                                            fontFamily:
                                                                font.name,
                                                        }}
                                                        title={font.name}
                                                    >
                                                        {font.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Color Combinations Section */}
                                <div className="modal-section">
                                    <div className="modal-section-title">
                                        <span>
                                            Color Combinations (
                                            {colorCombos.length})
                                        </span>
                                    </div>

                                    <div className="combo-list">
                                        {colorCombos.map((combo) => (
                                            <div
                                                key={combo.id}
                                                className="combo-item"
                                            >
                                                <div className="combo-info">
                                                    <span className="combo-name">
                                                        {combo.name}
                                                    </span>
                                                    <div className="combo-badges">
                                                        <div
                                                            className="color-badge"
                                                            style={{
                                                                backgroundColor:
                                                                    combo.baseColor,
                                                            }}
                                                        >
                                                            <span className="color-badge-label">
                                                                Base:{" "}
                                                                {
                                                                    combo.baseColor
                                                                }
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="color-badge"
                                                            style={{
                                                                backgroundColor:
                                                                    combo.textColor,
                                                            }}
                                                        >
                                                            <span className="color-badge-label">
                                                                Text:{" "}
                                                                {
                                                                    combo.textColor
                                                                }
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="color-badge"
                                                            style={{
                                                                backgroundColor:
                                                                    combo.borderColor,
                                                            }}
                                                        >
                                                            <span className="color-badge-label">
                                                                Border:{" "}
                                                                {
                                                                    combo.borderColor
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {combo.id !== "current" && (
                                                    <button
                                                        className="action-btn danger"
                                                        onClick={() =>
                                                            deleteCombo(
                                                                combo.id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Custom Color combo form */}
                                    <div className="combo-form">
                                        <div className="combo-form-item">
                                            <label>Combination Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Lavender Gold"
                                                value={customComboName}
                                                onChange={(e) =>
                                                    setCustomComboName(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Base</label>
                                            <input
                                                type="color"
                                                value={customBaseColor}
                                                onChange={(e) =>
                                                    setCustomBaseColor(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Text</label>
                                            <input
                                                type="color"
                                                value={customTextColor}
                                                onChange={(e) =>
                                                    setCustomTextColor(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Border</label>
                                            <input
                                                type="color"
                                                value={customBorderColor}
                                                onChange={(e) =>
                                                    setCustomBorderColor(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <button
                                            className="combo-add-btn"
                                            onClick={addCustomCombo}
                                        >
                                            <Plus
                                                size={16}
                                                style={{
                                                    marginRight: "4px",
                                                }}
                                            />{" "}
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn-outline"
                                    onClick={() => setShowCameraModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-pill primary"
                                    onClick={generateCatalog}
                                >
                                    Generate{" "}
                                    {selectedFonts.length * colorCombos.length}{" "}
                                    Previews
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing / Progress Loader Overlay */}
                {(isGenerating || state.isProcessing) && (
                    <div className="generator-loading-overlay">
                        <div className="loader-spinner"></div>
                        <div className="loader-text">
                            {state.isProcessing
                                ? "Processing 3D Models"
                                : "Generating Mockup Catalog Pack"}
                        </div>
                        {isGenerating && (
                            <div className="loader-progress-bar-bg">
                                <div
                                    className="loader-progress-bar-fill"
                                    style={{
                                        width: `${generationPercent}%`,
                                    }}
                                ></div>
                            </div>
                        )}
                        <div className="loader-subtext">
                            {state.isProcessing
                                ? state.processingMessage
                                : generationProgress}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
export default Editor;
