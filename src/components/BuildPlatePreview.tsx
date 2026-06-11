import React, { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";
import type { AppState, BatchTag } from "../types";
import { estimateTagSize, generateLayout } from "../utils/layoutEngine";
import { Generator } from "./Scene";
import { Generator2 } from "./Scene2";
import { Generator3 } from "./Scene3";
import { Generator4 } from "./Scene4";
import { GeneratorPencil } from "./ScenePencil";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BuildPlatePreviewProps {
    state: AppState;
    meshRef?: React.RefObject<THREE.Group | null>;
}

const BED_SIZES = {
    "A1 Mini": { w: 180, h: 180 },
    A1: { w: 256, h: 256 },
    P1S: { w: 256, h: 256 },
    "X1 Carbon": { w: 256, h: 256 },
};

export const BuildPlatePreview: React.FC<BuildPlatePreviewProps> = ({
    state,
    meshRef,
}) => {
    const [currentPlate, setCurrentPlate] = useState(0);

    const isDesign2 = location.pathname.includes("id-name-tag-2") || location.pathname === "/design2";
    const isDesign3 = location.pathname.includes("bag-tag") || location.pathname.includes("id-name-tag-3") || location.pathname === "/design3";
    const isDesign4 = location.pathname.includes("id-name-tag-4") || location.pathname === "/design4";
    const isPencilTopper = location.pathname.includes("pencil-topper") || location.pathname === "/pencil";

    const tags = state.massCreation?.tags || [];
    const printerType = state.massCreation?.printerType || "A1 Mini";
    const bedSize = BED_SIZES[printerType];

    const tagSizes = useMemo(
        () => tags.map((tag) => estimateTagSize(tag, state)),
        [tags, state],
    );

    const plates = useMemo(() => {
        return generateLayout(tags, bedSize.w, bedSize.h, tagSizes, 8);
    }, [tags, bedSize.w, bedSize.h, tagSizes]);

    const activePlate = plates[currentPlate] || { items: [] };

    const renderTag = (item: any) => {
        const tagState: AppState = JSON.parse(JSON.stringify(state));
        if (item.tag.baseColor) tagState.baseColor = item.tag.baseColor;
        if (item.tag.textColor) tagState.textColor = item.tag.textColor;
        if (item.tag.borderColor) tagState.borderColor = item.tag.borderColor;

        const newLines = [...tagState.lines];
        item.tag.lines?.forEach((txt: string, i: number) => {
            if (newLines[i]) {
                newLines[i].text = txt;
            }
        });
        tagState.lines = newLines;

        const props = {
            state: tagState,
            meshRef: { current: null },
            bounds: {
                x: item.width,
                y: item.height,
                z: state.shape.baseThickness + 2,
            },
        };

        return (
            <group key={item.tag.id} position={[item.x, item.y, 0]}>
                {isPencilTopper ? (
                    <GeneratorPencil {...props} />
                ) : isDesign2 ? (
                    <Generator2 {...props} />
                ) : isDesign3 ? (
                    <Generator3 {...props} />
                ) : isDesign4 ? (
                    <Generator4 {...props} />
                ) : (
                    <Generator {...props} />
                )}
            </group>
        );
    };

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: 0,
                    right: 0,
                    display: "flex",
                    justifyContent: "center",
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        backgroundColor: "var(--bg-secondary)",
                        padding: "8px 16px",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        border: "1px solid var(--border-color)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                >
                    <button
                        disabled={currentPlate === 0}
                        onClick={() => setCurrentPlate((p) => p - 1)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor:
                                currentPlate === 0 ? "not-allowed" : "pointer",
                            opacity: currentPlate === 0 ? 0.3 : 1,
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span
                        style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--text-primary)",
                        }}
                    >
                        Plate {currentPlate + 1} of {Math.max(1, plates.length)}
                    </span>
                    <button
                        disabled={
                            currentPlate >= plates.length - 1 ||
                            plates.length === 0
                        }
                        onClick={() => setCurrentPlate((p) => p + 1)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor:
                                currentPlate >= plates.length - 1 ||
                                plates.length === 0
                                    ? "not-allowed"
                                    : "pointer",
                            opacity:
                                currentPlate >= plates.length - 1 ||
                                plates.length === 0
                                    ? 0.3
                                    : 1,
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <Canvas
                shadows
                camera={{
                    position: [0, -bedSize.h * 0.8, bedSize.w * 0.8],
                    fov: 45,
                }}
                gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[10, -10, 30]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <directionalLight position={[-10, 10, -10]} intensity={0.4} />

                <group>
                    <mesh
                        position={[0, 0, -state.shape.baseThickness / 2 - 0.1]}
                        receiveShadow
                    >
                        <boxGeometry args={[bedSize.w, bedSize.h, 0.2]} />
                        <meshStandardMaterial
                            color="#1e293b"
                            roughness={0.8}
                            metalness={0.2}
                        />
                    </mesh>
                    <gridHelper
                        args={[
                            Math.max(bedSize.w, bedSize.h),
                            20,
                            "#475569",
                            "#334155",
                        ]}
                        rotation={[Math.PI / 2, 0, 0]}
                        position={[0, 0, -state.shape.baseThickness / 2]}
                    />
                </group>

                <group ref={meshRef}>{activePlate.items.map(renderTag)}</group>

                <OrbitControls
                    makeDefault
                    minDistance={50}
                    maxDistance={500}
                    target={[0, 0, 0]}
                />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};
