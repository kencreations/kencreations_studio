import React, { useState, useRef } from "react";
import { useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Scene from "../components/Scene";
import Scene2 from "../components/Scene2";
import type { AppState } from "../types";
import { FONTS } from "../types";
import { Download, Camera, Box } from "lucide-react";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { export3MF } from "../utils/export3MF";
import * as THREE from "three";

const Editor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isDesign2 = id === "id-name-tag-2";
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
        },
    };

    const [state, setState] = useState<AppState>(
        isDesign2 ? design2State : design1State,
    );

    const [bounds, setBounds] = useState({ x: 75, y: 40, z: 4.5 });
    const groupRef = useRef<THREE.Group>(null);

    const updateState = (updates: Partial<AppState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    };

    const getDownloadFilename = (ext: string) => {
        const nameLine =
            state.lines.length >= 2
                ? state.lines[1].text.trim() || "nametag"
                : "nametag";
        const safeName = nameLine.replace(/[^a-zA-Z0-9_-]/g, "_");
        const prefix = isDesign2 ? "idnametag_v2" : "idnametag";
        return `${prefix}_${safeName}.${ext}`;
    };

    const exportSTL = () => {
        if (!groupRef.current) return;

        const exporter = new STLExporter();
        const result = exporter.parse(groupRef.current);
        const blob = new Blob([result], { type: "text/plain" });
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

    return (
        <div className="editor-layout">
            {/* Floating Top Right Header/Navigation */}

            <Sidebar
                state={state}
                updateState={updateState}
                bounds={bounds}
                isDesign2={isDesign2}
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

                {/* Action Buttons */}
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
                    <button className="btn-pill btn-pill-icon">
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
                    <button className="btn-pill success">
                        Open with Bambu Studio
                    </button>
                </div>

                {isDesign2 ? (
                    <Scene2
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
            </main>
        </div>
    );
};

export default Editor;
