import React, { useState, useRef } from "react";
import { useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Scene from "../components/Scene";
import Scene2 from "../components/Scene2";
import Scene3 from "../components/Scene3";
import ScenePencil from "../components/ScenePencil";
import type { AppState } from "../types";
import { FONTS } from "../types";
import { Download, Camera, Box, X, Plus, Trash2, Zap, Settings, Activity, Cpu, Play, CheckCircle, RotateCcw, AlertTriangle, Printer, Layers } from "lucide-react";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { export3MF } from "../utils/export3MF";
import * as THREE from "three";
import { Evaluator, Brush, ADDITION } from "three-bvh-csg";
import JSZip from "jszip";

const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isPencilTopper = id === "pencil-topper";
    const isDesign2 = id === "id-name-tag-2";
    const isDesign3 = id === "id-name-tag-3";
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
                text: "CLYDE",
                font: FONTS[6].url,
                size: 28.0,
                depth: 1,
            },
            {
                id: "3",
                text: "Matt Clyde Theodore M. Samonte",
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
                text: "KURT",
                font: FONTS[14].url, // Arial Rounded Bold
                size: 15,
                depth: 1.5,
            },
            {
                id: "2",
                text: "Kurt C. Alcantara",
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

    const [state, setState] = useState<AppState>(
        isPencilTopper ? pencilTopperState : (isDesign2 ? design2State : (isDesign3 ? design3State : design1State)),
    );

    const [bounds, setBounds] = useState({ x: 75, y: 40, z: 4.5 });
    const groupRef = useRef<THREE.Group>(null);

    const updateState = (updates: Partial<AppState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    };

    // --- BATCH MOCKUP GENERATOR STATES & LOGIC ---
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
    const [colorCombos, setColorCombos] = useState([
        { id: "1", name: "Cocoa & Cream", baseColor: "#F7E6DE", textColor: "#6F5034", borderColor: "#6F5034" },
        { id: "2", name: "Azure Blue", baseColor: "#93C5FD", textColor: "#1E3A8A", borderColor: "#1E3A8A" },
        { id: "3", name: "Strawberry Cream", baseColor: "#FFE4E6", textColor: "#E11D48", borderColor: "#E11D48" },
        { id: "4", name: "Forest Gold", baseColor: "#E4BD68", textColor: "#14532D", borderColor: "#14532D" },
        { id: "5", name: "Charcoal White", baseColor: "#FFFFFF", textColor: "#1F2937", borderColor: "#1F2937" },
    ]);
    const [customComboName, setCustomComboName] = useState("");
    const [customBaseColor, setCustomBaseColor] = useState("#3B82F6");
    const [customTextColor, setCustomTextColor] = useState("#FFFFFF");
    const [customBorderColor, setCustomBorderColor] = useState("#3B82F6");
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState("");
    const [generationPercent, setGenerationPercent] = useState(0);

    // --- BAMBU STUDIO SLICER STATES ---
    const [activeView, setActiveView] = useState<"edit" | "slice">("edit");
    const [selectedPrinter, setSelectedPrinter] = useState<{
        id: string;
        name: string;
        nozzleDiameter: number;
        width: number;
        height: number;
        depth: number;
        maxTemp: number;
    } | null>(() => {
        try {
            const saved = localStorage.getItem("custom_slicer_printer");
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [showPrinterSetup, setShowPrinterSetup] = useState(false);
    
    // Filament & Material
    const [slicerBrand, setSlicerBrand] = useState<"Bambu" | "eSun">("Bambu");
    const [slicerFilament, setSlicerFilament] = useState("PLA");
    const [slicerNozzle, setSlicerNozzle] = useState(0.4);
    
    // Parameters
    const [slicerLayerHeight, setSlicerLayerHeight] = useState(0.12);
    const [slicerInitialHeight, setSlicerInitialHeight] = useState(0.20);
    const [slicerInfillDensity, setSlicerInfillDensity] = useState(15);
    const [slicerInfillPattern, setSlicerInfillPattern] = useState("Gyroid");
    const [slicerSupportEnabled, setSlicerSupportEnabled] = useState(false);
    const [slicerSupportType, setSlicerSupportType] = useState("Tree");
    const [slicerWallSpeed, setSlicerWallSpeed] = useState(150); // mm/s
    const [slicerTravelSpeed, setSlicerTravelSpeed] = useState(300); // mm/s

    // Slicing Process Simulation
    const [slicingState, setSlicingState] = useState<"idle" | "heating" | "slicing" | "complete">("idle");
    const [slicingProgress, setSlicingProgress] = useState(0);
    const [slicerTemp, setSlicerTemp] = useState(25);
    const [activeLayer, setActiveLayer] = useState(1);
    const [slicerPathProgress, setSlicerPathProgress] = useState(100);

    const verticalTrackRef = useRef<HTMLDivElement>(null);
    const horizontalTrackRef = useRef<HTMLDivElement>(null);
    
    const PRINTERS = [
        { id: "x1c", name: "Bambu Lab X1 Carbon", nozzleDiameter: 0.4, width: 256, height: 256, depth: 256, maxTemp: 300 },
        { id: "p1s", name: "Bambu Lab P1S", nozzleDiameter: 0.4, width: 256, height: 256, depth: 256, maxTemp: 300 },
        { id: "a1", name: "Bambu Lab A1", nozzleDiameter: 0.4, width: 256, height: 256, depth: 256, maxTemp: 300 },
        { id: "a1mini", name: "Bambu Lab A1 Mini", nozzleDiameter: 0.4, width: 180, height: 180, depth: 180, maxTemp: 300 },
    ];

    const openCameraModal = () => {
        const currentFont = isPencilTopper ? state.lines[0]?.font : (state.lines.length >= 2 ? state.lines[1].font : state.lines[0]?.font);
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
            prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
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
        
        const mainLineIndex = isPencilTopper ? 0 : (state.lines.length >= 2 ? 1 : 0);
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
                    setGenerationProgress(`Rendering option ${stepCount} of ${totalSteps}: ${fontName} (${combo.name})...`);
                    
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
                    const safeComboName = combo.name.replace(/[^a-zA-Z0-9]/g, "_");
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
        const prefix = isPencilTopper ? "pencil_topper" : (isDesign2 ? "idnametag_v2" : (isDesign3 ? "idnametag_v3" : "idnametag"));
        return `${prefix}_${safeName}.${ext}`;
    };

    // --- SLICER SIMULATOR HANDLERS ---
    const handleSelectPrinter = (printer: typeof PRINTERS[0]) => {
        setSelectedPrinter(printer);
        localStorage.setItem("custom_slicer_printer", JSON.stringify(printer));
        setShowPrinterSetup(false);
    };

    const runSlicingSimulation = (isInstant = false) => {
        if (!selectedPrinter) {
            setShowPrinterSetup(true);
            return;
        }
        
        if (isInstant) {
            setSlicingState("complete");
            setSlicingProgress(100);
            setSlicerTemp(220);
            const zHeight = bounds.z || 4.5;
            const maxL = Math.ceil(zHeight / slicerLayerHeight);
            setActiveLayer(maxL);
            setSlicerPathProgress(100);
            return;
        }

        setSlicingState("heating");
        setSlicingProgress(0);
        setSlicerTemp(25);
        setSlicerPathProgress(100);
        
        // Heat up simulation
        let currentHeat = 25;
        const heatInterval = setInterval(() => {
            currentHeat += Math.ceil(Math.random() * 25 + 15);
            if (currentHeat >= 220) {
                currentHeat = 220;
                clearInterval(heatInterval);
                
                // Slicing progress simulation
                setSlicingState("slicing");
                let progress = 0;
                const sliceInterval = setInterval(() => {
                    progress += Math.ceil(Math.random() * 8 + 4);
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(sliceInterval);
                        setSlicingState("complete");
                        const zHeight = bounds.z || 4.5;
                        const maxL = Math.ceil(zHeight / slicerLayerHeight);
                        setActiveLayer(maxL);
                    } else {
                        setSlicingProgress(progress);
                        const zHeight = bounds.z || 4.5;
                        const maxL = Math.ceil(zHeight / slicerLayerHeight);
                        setActiveLayer(Math.max(1, Math.ceil((progress / 100) * maxL)));
                    }
                }, 120);
            } else {
                setSlicerTemp(currentHeat);
            }
        }, 100);
    };

    const resetSlicer = () => {
        setSlicingState("idle");
        setSlicingProgress(0);
        setSlicerTemp(25);
        setActiveLayer(1);
        setSlicerPathProgress(100);
    };

    // Auto-trigger slicing on switch to slice view
    React.useEffect(() => {
        if (activeView === "slice" && slicingState === "idle") {
            if (selectedPrinter) {
                runSlicingSimulation(false);
            } else {
                setShowPrinterSetup(true);
            }
        }
    }, [activeView, selectedPrinter]);

    // Instant re-slice on slicer config change
    React.useEffect(() => {
        if (activeView === "slice" && slicingState === "complete") {
            runSlicingSimulation(true);
        }
    }, [
        slicerLayerHeight,
        slicerInfillDensity,
        slicerNozzle,
        slicerFilament,
        slicerBrand,
        slicerSupportEnabled,
        slicerSupportType,
        slicerWallSpeed,
        slicerTravelSpeed,
        bounds.z
    ]);

    // Pointer-event drag handlers for custom dual-axis sliders
    const handleVerticalPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!verticalTrackRef.current) return;
        verticalTrackRef.current.setPointerCapture(e.pointerId);
        updateVerticalLayer(e.clientY);
    };

    const handleVerticalPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!verticalTrackRef.current || !verticalTrackRef.current.hasPointerCapture(e.pointerId)) return;
        updateVerticalLayer(e.clientY);
    };

    const handleVerticalPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (verticalTrackRef.current) {
            verticalTrackRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const updateVerticalLayer = (clientY: number) => {
        if (!verticalTrackRef.current) return;
        const rect = verticalTrackRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
        const zHeight = bounds.z || 4.5;
        const totalLayersCount = Math.ceil(zHeight / slicerLayerHeight);
        const newLayer = Math.max(1, Math.ceil(percentage * totalLayersCount));
        setActiveLayer(newLayer);
    };

    const handleHorizontalPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!horizontalTrackRef.current) return;
        horizontalTrackRef.current.setPointerCapture(e.pointerId);
        updateHorizontalPath(e.clientX);
    };

    const handleHorizontalPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!horizontalTrackRef.current || !horizontalTrackRef.current.hasPointerCapture(e.pointerId)) return;
        updateHorizontalPath(e.clientX);
    };

    const handleHorizontalPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (horizontalTrackRef.current) {
            horizontalTrackRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const updateHorizontalPath = (clientX: number) => {
        if (!horizontalTrackRef.current) return;
        const rect = horizontalTrackRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newProgress = Math.max(1, Math.round(percentage * 100));
        setSlicerPathProgress(newProgress);
    };

    const exportSTL = () => {
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
        const textMeshes = meshes.filter((m) => m.name === "text" || (!m.name && m !== baseMeshes[0] && m !== borderMeshes[0]));

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
    };

    const handleExport3MF = async () => {
        if (!groupRef.current) return;
        await export3MF(groupRef.current, getDownloadFilename("3mf"));
    };

    if (activeView === "slice") {
        const zHeight = bounds.z || 4.5;
        const totalLayersCount = Math.ceil(zHeight / slicerLayerHeight);
        
        const baseThickness = state.shape.baseThickness || 2.0;
        const modelVolumeCm3 = ((bounds.x * bounds.y * baseThickness) + (bounds.x * bounds.y * (zHeight - baseThickness) * 0.3)) / 1000;
        
        const weightG = Math.max(0.5, modelVolumeCm3 * 1.24 * (slicerInfillDensity / 15 * 0.8));
        const costUSD = weightG * 0.022;
        
        const density = 1.24; 
        const r = 1.75 / 2; 
        const area = Math.PI * Math.pow(r, 2); 
        const filamentLengthM = (weightG / (density * area * 0.001)) / 1000;

        const baseTimeMinutes = (weightG * 4.5) + (totalLayersCount * 0.12) + (slicerSupportEnabled ? 8 : 0);
        const speedScale = 150 / slicerWallSpeed;
        const printTimeMinutes = Math.max(5, Math.round(baseTimeMinutes * speedScale));
        const hours = Math.floor(printTimeMinutes / 60);
        const minutes = printTimeMinutes % 60;
        const printTimeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return (
            <div className="slicer-workspace">
                {/* LEFT SIDEBAR: CONFIGURATIONS */}
                <div className="slicer-sidebar-left">
                    <div className="slicer-header">
                        <div className="slicer-logo">
                            <Cpu size={18} style={{ color: "#10b981" }} />
                            <span>BambuStudio</span>
                            <span className="slicer-logo-badge">Slicer</span>
                        </div>
                        <button className="slicer-close-btn" onClick={() => { setActiveView("edit"); resetSlicer(); }} title="Back to Designer">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="slicer-scrollable-content">
                        {/* 1. Printer profile configuration */}
                        <div className="slicer-input-group">
                            <span className="slicer-section-title">
                                <Printer size={12} /> Printer
                            </span>
                            <div className="slicer-card slicer-printer-setup-box">
                                {selectedPrinter ? (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#ffffff" }}>{selectedPrinter.name}</div>
                                            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                                                Nozzle: {slicerNozzle} mm • Bed: {selectedPrinter.width}x{selectedPrinter.height} mm
                                            </div>
                                        </div>
                                        <button className="slicer-btn-secondary" style={{ padding: "4px 8px", fontSize: "0.7rem" }} onClick={() => setShowPrinterSetup(true)}>
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "8px" }}>No Printer Profile Configured</div>
                                        <button className="slicer-btn-action" style={{ width: "100%", height: "30px" }} onClick={() => setShowPrinterSetup(true)}>
                                            <Plus size={14} /> Set up Printer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Filament details selector */}
                        <div className="slicer-input-group">
                            <span className="slicer-section-title">Filament Brand & Type</span>
                            <div className="slicer-tabs-container">
                                <button className={`slicer-tab ${slicerBrand === "Bambu" ? "active" : ""}`} onClick={() => setSlicerBrand("Bambu")}>
                                    Bambu Colors
                                </button>
                                <button className={`slicer-tab ${slicerBrand === "eSun" ? "active" : ""}`} onClick={() => setSlicerBrand("eSun")}>
                                    eSun Colors
                                </button>
                            </div>
                            <div className="slicer-grid-2">
                                <div className="slicer-input-group">
                                    <label>Filament Type</label>
                                    <select className="slicer-select" value={slicerFilament} onChange={(e) => setSlicerFilament(e.target.value)}>
                                        <option value="PLA">PLA</option>
                                        <option value="PETG">PETG</option>
                                        <option value="ABS">ABS</option>
                                        <option value="TPU">TPU</option>
                                    </select>
                                </div>
                                <div className="slicer-input-group">
                                    <label>Nozzle Diameter</label>
                                    <select className="slicer-select" value={slicerNozzle} onChange={(e) => setSlicerNozzle(parseFloat(e.target.value))}>
                                        <option value="0.2">0.2 mm</option>
                                        <option value="0.4">0.4 mm</option>
                                        <option value="0.6">0.6 mm</option>
                                        <option value="0.8">0.8 mm</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Detailed slice parameters accordion */}
                        <div className="slicer-input-group">
                            <span className="slicer-section-title">Slicer Settings</span>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {/* QUALITY tab */}
                                <div className="slicer-card">
                                    <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#3b82f6", borderBottom: "1px solid #242b3d", paddingBottom: "6px", marginBottom: "8px" }}>
                                        Quality
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Layer height</span>
                                        <select className="slicer-select" style={{ padding: "2px 6px", fontSize: "0.75rem" }} value={slicerLayerHeight} onChange={(e) => setSlicerLayerHeight(parseFloat(e.target.value))}>
                                            <option value={0.08}>0.08 mm (Extra Fine)</option>
                                            <option value={0.12}>0.12 mm (High Quality)</option>
                                            <option value={0.16}>0.16 mm (Optimal)</option>
                                            <option value={0.20}>0.20 mm (Standard)</option>
                                        </select>
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Initial layer height</span>
                                        <input type="number" step="0.01" className="slicer-param-input" value={slicerInitialHeight} onChange={(e) => setSlicerInitialHeight(parseFloat(e.target.value))} />
                                    </div>
                                </div>

                                {/* STRENGTH tab */}
                                <div className="slicer-card">
                                    <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#10b981", borderBottom: "1px solid #242b3d", paddingBottom: "6px", marginBottom: "8px" }}>
                                        Strength
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Sparse infill density</span>
                                        <select className="slicer-select" style={{ padding: "2px 6px", fontSize: "0.75rem" }} value={slicerInfillDensity} onChange={(e) => setSlicerInfillDensity(parseInt(e.target.value))}>
                                            <option value="10">10%</option>
                                            <option value="15">15%</option>
                                            <option value="20">20%</option>
                                            <option value="50">50%</option>
                                            <option value="100">100% (Solid)</option>
                                        </select>
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Sparse infill pattern</span>
                                        <select className="slicer-select" style={{ padding: "2px 6px", fontSize: "0.75rem" }} value={slicerInfillPattern} onChange={(e) => setSlicerInfillPattern(e.target.value)}>
                                            <option value="Gyroid">Gyroid</option>
                                            <option value="Grid">Grid</option>
                                            <option value="Honeycomb">Honeycomb</option>
                                            <option value="Adaptive Cubic">Adaptive Cubic</option>
                                        </select>
                                    </div>
                                </div>

                                {/* SPEED tab */}
                                <div className="slicer-card">
                                    <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#f59e0b", borderBottom: "1px solid #242b3d", paddingBottom: "6px", marginBottom: "8px" }}>
                                        Speed (mm/s)
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Outer wall speed</span>
                                        <input type="number" className="slicer-param-input" value={slicerWallSpeed} onChange={(e) => setSlicerWallSpeed(parseInt(e.target.value))} />
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Travel speed</span>
                                        <input type="number" className="slicer-param-input" value={slicerTravelSpeed} onChange={(e) => setSlicerTravelSpeed(parseInt(e.target.value))} />
                                    </div>
                                </div>

                                {/* SUPPORT tab */}
                                <div className="slicer-card">
                                    <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#a855f7", borderBottom: "1px solid #242b3d", paddingBottom: "6px", marginBottom: "8px" }}>
                                        Support
                                    </div>
                                    <div className="slicer-param-row">
                                        <span className="slicer-param-label">Enable support</span>
                                        <input type="checkbox" checked={slicerSupportEnabled} onChange={(e) => setSlicerSupportEnabled(e.target.checked)} style={{ cursor: "pointer" }} />
                                    </div>
                                    {slicerSupportEnabled && (
                                        <div className="slicer-param-row">
                                            <span className="slicer-param-label">Support type</span>
                                            <select className="slicer-select" style={{ padding: "2px 6px", fontSize: "0.75rem" }} value={slicerSupportType} onChange={(e) => setSlicerSupportType(e.target.value)}>
                                                <option value="Tree">Tree (Slim)</option>
                                                <option value="Normal">Normal (Grid)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SLICE TRIGGER BUTTON */}
                        <div style={{ marginTop: "10px", marginBottom: "20px" }}>
                            {slicingState === "idle" ? (
                                <button className="slicer-btn-action" style={{ width: "100%", height: "42px", fontSize: "0.9rem" }} onClick={runSlicingSimulation}>
                                    <Zap size={16} /> Prepare (Slice Model)
                                </button>
                            ) : slicingState === "heating" || slicingState === "slicing" ? (
                                <button className="slicer-btn-action success" style={{ width: "100%", height: "42px", fontSize: "0.9rem", cursor: "not-allowed", opacity: 0.8 }} disabled>
                                    <div className="loader-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", marginRight: "8px", display: "inline-block" }}></div>
                                    {slicingState === "heating" ? "Heating Extruder..." : `Slicing... ${slicingProgress}%`}
                                </button>
                            ) : (
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button className="slicer-btn-action success" style={{ flex: 1, height: "42px" }} onClick={() => alert("Simulated print job sent successfully to your Bambu Cloud account!")}>
                                        <Printer size={16} /> Send to Printer
                                    </button>
                                    <button className="slicer-btn-secondary" style={{ width: "42px", height: "42px" }} onClick={resetSlicer} title="Re-slice">
                                        <RotateCcw size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CENTER PANEL: THE 3D BUILD PLATE SCENE PREVIEW */}
                <div className="slicer-main">
                    <div style={{ position: "absolute", top: "24px", left: "24px", zIndex: 10, display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ background: "rgba(18, 21, 28, 0.8)", border: "1px solid #1f2533", color: "#ffffff", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
                            Filename: {getDownloadFilename("gcode")}
                        </div>
                    </div>

                    <div style={{ position: "absolute", top: "24px", right: "24px", zIndex: 10 }}>
                        <div className="hud-panel" style={{ backgroundColor: "rgba(18, 21, 28, 0.8)", border: "1px solid #1f2533" }}>
                            <div className="hud-title" style={{ color: "#64748b" }}>Model Dimensions (mm)</div>
                            <div className="hud-grid">
                                <div className="hud-value"><span className="hud-label">X</span><span className="hud-data" style={{ color: "#ffffff" }}>{bounds.x.toFixed(1)}</span></div>
                                <div className="hud-value"><span className="hud-label">Y</span><span className="hud-data" style={{ color: "#ffffff" }}>{bounds.y.toFixed(1)}</span></div>
                                <div className="hud-value"><span className="hud-label">Z</span><span className="hud-data" style={{ color: "#ffffff" }}>{bounds.z.toFixed(1)}</span></div>
                            </div>
                        </div>
                    </div>

                    {slicingState === "slicing" && <div className="slicing-scan-plane" />}

                    {slicingState === "heating" && (
                        <div className="slicer-nozzle-heat">
                            <div className="slicer-heat-circle">
                                <Zap size={24} style={{ color: "#f59e0b" }} />
                                <span className="slicer-heat-temp">{slicerTemp}°C</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Heating Toolhead</div>
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
                                    Stabilizing extruder temperature at 220°C for {slicerFilament} extrusion.
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pei-plate-hud">
                        <span className="pei-plate-badge">BBL Textured PEI</span>
                        <span>{selectedPrinter ? `${selectedPrinter.width} x ${selectedPrinter.height} mm Bed` : "Grid Base"}</span>
                    </div>

                    {slicingState === "complete" && (
                        <>
                            {/* Vertical Layer Inspector (Right) */}
                            <div className="layer-slider-container">
                                <span className="layer-slider-label">Layers</span>
                                <div 
                                    className="layer-slider-track"
                                    ref={verticalTrackRef}
                                    onPointerDown={handleVerticalPointerDown}
                                    onPointerMove={handleVerticalPointerMove}
                                    onPointerUp={handleVerticalPointerUp}
                                    style={{ cursor: "ns-resize", touchAction: "none" }}
                                >
                                    <div className="layer-slider-fill" style={{ height: `${(activeLayer / totalLayersCount) * 100}%` }} />
                                    <div 
                                        className="layer-slider-handle" 
                                        style={{ bottom: `calc(${(activeLayer / totalLayersCount) * 100}% - 8px)` }}
                                    >
                                        <div style={{ position: "absolute", left: "-74px", transform: "translateY(0)" }}>
                                            <div className="layer-slider-value-badge" style={{ whiteSpace: "nowrap" }}>
                                                L{activeLayer} ({(activeLayer * slicerLayerHeight).toFixed(2)}mm)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#64748b" }}>1</span>
                            </div>

                            {/* Horizontal Toolpath Inspector (Bottom) */}
                            <div className="toolpath-slider-container">
                                <span className="toolpath-slider-label">Path</span>
                                <div 
                                    className="toolpath-slider-track"
                                    ref={horizontalTrackRef}
                                    onPointerDown={handleHorizontalPointerDown}
                                    onPointerMove={handleHorizontalPointerMove}
                                    onPointerUp={handleHorizontalPointerUp}
                                    style={{ cursor: "ew-resize", touchAction: "none" }}
                                >
                                    <div className="toolpath-slider-fill" style={{ width: `${slicerPathProgress}%` }} />
                                    <div 
                                        className="toolpath-slider-handle" 
                                        style={{ left: `calc(${slicerPathProgress}% - 8px)` }}
                                    >
                                        <div className="toolpath-slider-value-badge">{slicerPathProgress}%</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {isPencilTopper ? (
                        <ScenePencil state={state} meshRef={groupRef} onBoundsChange={setBounds} activeLayer={activeLayer} totalLayers={totalLayersCount} bounds={bounds} slicerPathProgress={slicerPathProgress} />
                    ) : isDesign2 ? (
                        <Scene2 state={state} meshRef={groupRef} onBoundsChange={setBounds} activeLayer={activeLayer} totalLayers={totalLayersCount} bounds={bounds} slicerPathProgress={slicerPathProgress} />
                    ) : isDesign3 ? (
                        <Scene3 state={state} meshRef={groupRef} onBoundsChange={setBounds} activeLayer={activeLayer} totalLayers={totalLayersCount} bounds={bounds} slicerPathProgress={slicerPathProgress} />
                    ) : (
                        <Scene state={state} meshRef={groupRef} onBoundsChange={setBounds} activeLayer={activeLayer} totalLayers={totalLayersCount} bounds={bounds} slicerPathProgress={slicerPathProgress} />
                    )}
                </div>

                {/* RIGHT SIDEBAR: PRINT DETAILS / RESULTS */}
                <div className="slicer-sidebar-right">
                    <span className="slicer-section-title" style={{ marginBottom: "12px" }}>
                        <Activity size={12} /> Sliced Preview Details
                    </span>

                    {slicingState !== "complete" ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyOrigin: "center", justifyContent: "center", height: "80%", textAlign: "center", gap: "10px", color: "#64748b" }}>
                            <Zap size={32} style={{ opacity: 0.3 }} />
                            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>No Slicing Data Available</div>
                            <div style={{ fontSize: "0.7rem", maxWidth: "200px" }}>
                                Click the "Prepare (Slice Model)" button on the left panel to slice the keychain.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div className="slicer-stat-group">
                                <div className="slicer-stat-row">
                                    <div className="slicer-stat-icon green">
                                        <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>$</span>
                                    </div>
                                    <div className="slicer-stat-body">
                                        <span className="slicer-stat-name">Print Cost</span>
                                        <span className="slicer-stat-val" style={{ color: "#10b981", fontWeight: 700 }}>${costUSD.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="slicer-stat-row">
                                    <div className="slicer-stat-icon">
                                        <Zap size={14} />
                                    </div>
                                    <div className="slicer-stat-body">
                                        <span className="slicer-stat-name">Print Time</span>
                                        <span className="slicer-stat-val">{printTimeString}</span>
                                    </div>
                                </div>

                                <div className="slicer-stat-row">
                                    <div className="slicer-stat-icon yellow">
                                        <Box size={14} />
                                    </div>
                                    <div className="slicer-stat-body">
                                        <span className="slicer-stat-name">Filament Used</span>
                                        <span className="slicer-stat-val">{weightG.toFixed(2)} g • {filamentLengthM.toFixed(2)} m</span>
                                    </div>
                                </div>

                                <div className="slicer-stat-row">
                                    <div className="slicer-stat-icon" style={{ backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                                        <Layers size={14} />
                                    </div>
                                    <div className="slicer-stat-body">
                                        <span className="slicer-stat-name">Layer height / layers</span>
                                        <span className="slicer-stat-val">{slicerLayerHeight} mm • {totalLayersCount} layers</span>
                                    </div>
                                </div>
                            </div>

                            <div className="slicer-card" style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px" }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #242b3d", paddingBottom: "4px" }}>
                                    Slice Information
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Slicer used</span>
                                    <span className="slicer-param-value" style={{ color: "#10b981", fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>BambuStudio v2.5</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Filament Temp</span>
                                    <span className="slicer-param-value">220 °C</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Bed Temp</span>
                                    <span className="slicer-param-value">{slicerFilament === "PLA" ? "65 °C" : slicerFilament === "PETG" ? "80 °C" : "100 °C"}</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Infill pattern</span>
                                    <span className="slicer-param-value">{slicerInfillPattern}</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Outer wall speed</span>
                                    <span className="slicer-param-value">{slicerWallSpeed} mm/s</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Travel speed</span>
                                    <span className="slicer-param-value">{slicerTravelSpeed} mm/s</span>
                                </div>
                                <div className="slicer-param-row" style={{ padding: "4px 0" }}>
                                    <span className="slicer-param-label">Layer Preview Range</span>
                                    <span className="slicer-param-value">1 - {activeLayer}</span>
                                </div>
                            </div>

                            <button className="slicer-btn-action" style={{ width: "100%", height: "36px", fontSize: "0.8rem", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }} onClick={() => {
                                const element = document.createElement("a");
                                const file = new Blob([`; Generated by BambuStudio Online Slicer Simulator for ${selectedPrinter?.name}\n; Filename: ${getDownloadFilename("gcode")}\nM104 S220\nM140 S65\nG28\nG92\n; Layer count: ${totalLayersCount}\n; Infill pattern: ${slicerInfillPattern}\n`], {type: 'text/plain'});
                                element.href = URL.createObjectURL(file);
                                element.download = getDownloadFilename("gcode");
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                            }}>
                                <Download size={14} /> Download G-code File
                            </button>
                        </div>
                    )}
                </div>

                {/* PRINTER SETUP WIZARD POPUP */}
                {showPrinterSetup && (
                    <div className="slicer-wizard-overlay" onClick={() => selectedPrinter && setShowPrinterSetup(false)}>
                        <div className="slicer-wizard-card" onClick={(e) => e.stopPropagation()}>
                            <div className="slicer-wizard-header">
                                <h3 className="slicer-wizard-title">Select or Add 3D Printer</h3>
                                <p className="slicer-wizard-subtitle">Choose your Bambu Lab printer profile to calibrate build plate dimensions and slice parameters.</p>
                            </div>

                            <div className="printer-profiles-grid">
                                {PRINTERS.map((printer) => {
                                    const isSel = selectedPrinter?.id === printer.id;
                                    return (
                                        <div 
                                            key={printer.id} 
                                            className={`printer-profile-card ${isSel ? 'selected' : ''}`}
                                            onClick={() => handleSelectPrinter(printer)}
                                        >
                                            <Printer size={24} style={{ color: isSel ? '#3b82f6' : '#64748b' }} />
                                            <span className="printer-profile-name">{printer.name}</span>
                                            <span className="printer-profile-specs">
                                                Bed: {printer.width}x{printer.height} mm<br />
                                                Nozzle: {printer.nozzleDiameter}mm
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="slicer-wizard-footer">
                                {selectedPrinter && (
                                    <button className="btn-outline" style={{ border: "1px solid #2e374d", color: "#94a3b8" }} onClick={() => setShowPrinterSetup(false)}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="editor-layout">
            {/* Floating Top Right Header/Navigation */}

            <Sidebar
                state={state}
                updateState={updateState}
                bounds={bounds}
                isDesign2={isDesign2}
                isPencilTopper={isPencilTopper}
                isDesign3={isDesign3}
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
                    <button className="btn-pill btn-pill-icon" onClick={openCameraModal} title="Batch Catalog Generator">
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
                    <button className="btn-pill success" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", border: "none" }} onClick={() => { setActiveView("slice"); if(!selectedPrinter) setShowPrinterSetup(true); }}>
                        <Zap size={18} />
                        Slice Model
                    </button>
                    <button className="btn-pill" onClick={() => window.open("https://bambulab.com/en/download/studio", "_blank")}>
                        Open with Bambu Studio
                    </button>
                </div>

                {isPencilTopper ? (
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
                ) : (
                    <Scene
                        state={state}
                        meshRef={groupRef}
                        onBoundsChange={setBounds}
                    />
                )}

                {/* Batch Mockup Generator Modal */}
                {showCameraModal && (
                    <div className="modal-overlay" onClick={() => !isGenerating && setShowCameraModal(false)}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">Batch Catalog Generator</h3>
                                <button className="modal-close-btn" onClick={() => setShowCameraModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="modal-body">
                                {/* Font Selection Section */}
                                <div className="modal-section">
                                    <div className="modal-section-title">
                                        <span>Select Fonts to Generate ({selectedFonts.length})</span>
                                        <span className="modal-section-link" onClick={() => setSelectedFonts(FONTS.map(f => f.url))}>
                                            Select All
                                        </span>
                                    </div>
                                    <div className="font-selection-grid">
                                        {FONTS.map((font) => {
                                            const isSelected = selectedFonts.includes(font.url);
                                            return (
                                                <div 
                                                    key={font.url} 
                                                    className={`font-checkbox-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => toggleFontSelection(font.url)}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => {}} /* Handled by parent div onClick */
                                                    />
                                                    <span 
                                                        className="font-checkbox-label" 
                                                        style={{ fontFamily: font.name }}
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
                                        <span>Color Combinations ({colorCombos.length})</span>
                                    </div>
                                    
                                    <div className="combo-list">
                                        {colorCombos.map((combo) => (
                                            <div key={combo.id} className="combo-item">
                                                <div className="combo-info">
                                                    <span className="combo-name">{combo.name}</span>
                                                    <div className="combo-badges">
                                                        <div className="color-badge" style={{ backgroundColor: combo.baseColor }}>
                                                            <span className="color-badge-label">Base: {combo.baseColor}</span>
                                                        </div>
                                                        <div className="color-badge" style={{ backgroundColor: combo.textColor }}>
                                                            <span className="color-badge-label">Text: {combo.textColor}</span>
                                                        </div>
                                                        <div className="color-badge" style={{ backgroundColor: combo.borderColor }}>
                                                            <span className="color-badge-label">Border: {combo.borderColor}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {combo.id !== 'current' && (
                                                    <button className="action-btn danger" onClick={() => deleteCombo(combo.id)}>
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
                                                onChange={(e) => setCustomComboName(e.target.value)}
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Base</label>
                                            <input 
                                                type="color" 
                                                value={customBaseColor}
                                                onChange={(e) => setCustomBaseColor(e.target.value)}
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Text</label>
                                            <input 
                                                type="color" 
                                                value={customTextColor}
                                                onChange={(e) => setCustomTextColor(e.target.value)}
                                            />
                                        </div>
                                        <div className="combo-form-item">
                                            <label>Border</label>
                                            <input 
                                                type="color" 
                                                value={customBorderColor}
                                                onChange={(e) => setCustomBorderColor(e.target.value)}
                                            />
                                        </div>
                                        <button className="combo-add-btn" onClick={addCustomCombo}>
                                            <Plus size={16} style={{ marginRight: '4px' }} /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="modal-footer">
                                <button className="btn-outline" onClick={() => setShowCameraModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn-pill primary" onClick={generateCatalog}>
                                    Generate {selectedFonts.length * colorCombos.length} Previews
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Processing / Progress Loader Overlay */}
                {isGenerating && (
                    <div className="generator-loading-overlay">
                        <div className="loader-spinner"></div>
                        <div className="loader-text">Generating Mockup Catalog Pack</div>
                        <div className="loader-progress-bar-bg">
                            <div className="loader-progress-bar-fill" style={{ width: `${generationPercent}%` }}></div>
                        </div>
                        <div className="loader-subtext">{generationProgress}</div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Editor;
