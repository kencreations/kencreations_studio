import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { AppState, TextLine } from "../types";
import { FONTS } from "../types";
import {
    ArrowUp,
    ArrowDown,
    Trash2,
    Plus,
    ChevronLeft,
    Palette,
    Type,
    ScanLine,
    CircleDashed,
    Save,
    FolderOpen,
} from "lucide-react";

const BAMBU_COLORS = [
    { name: "Jade White", hex: "#FFFFFF" },
    { name: "Beige", hex: "#F7E6DE" },
    { name: "Light Gray", hex: "#D1D3D5" },
    { name: "Silver", hex: "#A6A9AA" },
    { name: "Gray", hex: "#8E9089" },
    { name: "Magenta", hex: "#EC008C" },
    { name: "Pink", hex: "#F55A74" },
    { name: "Hot Pink", hex: "#F5547C" },
    { name: "Orange", hex: "#FF6A13" },
    { name: "Pumpkin Orange", hex: "#FF9016" },
    { name: "Gold", hex: "#E4BD68" },
    { name: "Sunflower Yellow", hex: "#FEC600" },
    { name: "Yellow", hex: "#F4EE2A" },
    { name: "Bright Green", hex: "#BECF00" },
    { name: "Bambu Green", hex: "#00AE42" },
    { name: "Mistletoe Green", hex: "#3F8E43" },
    { name: "Bronze", hex: "#847D48" },
    { name: "Cocoa Brown", hex: "#6F5034" },
    { name: "Brown", hex: "#9D432C" },
    { name: "Maroon Red", hex: "#9D2235" },
    { name: "Red", hex: "#C12E1F" },
    { name: "Turquoise", hex: "#00B1B7" },
    { name: "Cyan", hex: "#0086D6" },
    { name: "Blue", hex: "#0A2989" },
    { name: "Cobalt Blue", hex: "#0056B8" },
    { name: "Purple", hex: "#5E43B7" },
    { name: "Indigo Purple", hex: "#482960" },
    { name: "Blue Grey", hex: "#5B6579" },
    { name: "Dark Gray", hex: "#545454" },
    { name: "Black", hex: "#000000" },
];

const EditableNumber = ({
    value,
    onChange,
    min,
    max,
    step,
}: {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setTempValue(value.toString());
    }, [value]);

    const commit = () => {
        let num = parseFloat(tempValue);
        if (isNaN(num)) num = value;
        if (min !== undefined) num = Math.max(min, num);
        if (max !== undefined) num = Math.min(max, num);
        onChange(num);
        setTempValue(num.toString());
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") setIsEditing(false);
                }}
                step={step || "any"}
                className="editable-number-input"
                style={{
                    width: "40px",
                    fontSize: "11px",
                    padding: "0",
                    border: "1px solid #3b82f6",
                    borderRadius: "2px",
                    outline: "none",
                    background: "transparent",
                }}
            />
        );
    }

    return (
        <span
            className="control-value"
            onDoubleClick={() => setIsEditing(true)}
            onClick={() => setIsEditing(true)}
            style={{ cursor: "pointer", borderBottom: "1px dashed #cbd5e1" }}
            title="Click to edit"
        >
            {value.toFixed(1)}
        </span>
    );
};

const ESUN_COLORS = [
    { name: "eSun White", hex: "#FFFFFF" },
    { name: "eSun Black", hex: "#1A1A1A" },
    { name: "Lilac", hex: "#DEBBFF" },
];

const ColorSelect = ({
    value,
    onChange,
    colors,
}: {
    value: string;
    onChange: (val: string) => void;
    colors: { name: string; hex: string }[];
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [align, setAlign] = useState<"left" | "right">("right");

    const [activeTab, setActiveTab] = useState(() => {
        const cleanVal = (value || "").toUpperCase();
        if (ESUN_COLORS.some((c) => c.hex.toUpperCase() === cleanVal)) {
            return "eSun";
        }
        return "Bambu";
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const sidebar =
                containerRef.current.closest(".sidebar-content") ||
                containerRef.current.closest(".sidebar") ||
                document.body;
            const sidebarRect = sidebar.getBoundingClientRect();

            // If there's enough space (at least 270px) inside the sidebar container to the right of the picker, align left.
            // Otherwise align right so it extends leftward and stays inside the sidebar.
            if (sidebarRect.right - rect.left >= 270) {
                setAlign("left");
            } else {
                setAlign("right");
            }
        }
    }, [isOpen]);

    // Try to find the name of the currently selected color
    const getSelectedColor = () => {
        const cleanVal = (value || "").toUpperCase();
        const bambuMatch = colors.find((c) => c.hex.toUpperCase() === cleanVal);
        if (bambuMatch) return bambuMatch;
        const esunMatch = ESUN_COLORS.find(
            (c) => c.hex.toUpperCase() === cleanVal,
        );
        if (esunMatch) return esunMatch;
        return { name: "Custom", hex: value };
    };

    const selectedColor = getSelectedColor();

    return (
        <div ref={containerRef} style={{ position: "relative", flexGrow: 1 }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: "var(--bg-secondary)",
                    fontSize: "12px",
                    height: "28px",
                    userSelect: "none",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <div
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: selectedColor.hex,
                            border: "1px solid rgba(0,0,0,0.1)",
                            flexShrink: 0,
                        }}
                    />
                    <span>{selectedColor.name}</span>
                </div>
                <ChevronLeft
                    size={14}
                    style={{
                        transform: isOpen ? "rotate(90deg)" : "rotate(-90deg)",
                        transition: "transform 0.2s",
                    }}
                />
            </div>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "105%",
                        left: align === "left" ? 0 : "auto",
                        right: align === "right" ? 0 : "auto",
                        width: "270px",
                        zIndex: 100,
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow:
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        color: "#1e293b",
                    }}
                >
                    {/* BRAND TABS */}
                    <div
                        style={{
                            display: "flex",
                            background: "#f1f5f9",
                            padding: "2px",
                            borderRadius: "6px",
                            gap: "2px",
                        }}
                    >
                        {["Bambu", "eSun"].map((tab) => (
                            <button
                                key={tab}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveTab(tab);
                                }}
                                style={{
                                    flex: 1,
                                    padding: "4px 0",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    backgroundColor:
                                        activeTab === tab
                                            ? "#ffffff"
                                            : "transparent",
                                    color:
                                        activeTab === tab
                                            ? "#0f172a"
                                            : "#64748b",
                                    boxShadow:
                                        activeTab === tab
                                            ? "0 1px 2px rgba(0,0,0,0.08)"
                                            : "none",
                                    transition: "all 0.15s",
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* TAB CONTENT */}
                    <div>
                        {activeTab === "Bambu" && (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(5, minmax(0, 1fr))",
                                    gap: "6px",
                                }}
                            >
                                {colors.map((c) => {
                                    const isSelected =
                                        value.toUpperCase() ===
                                        c.hex.toUpperCase();
                                    return (
                                        <div
                                            key={c.hex}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(c.hex);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                cursor: "pointer",
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    border: isSelected
                                                        ? "2px solid #6366f1"
                                                        : "2px solid transparent",
                                                    backgroundColor: isSelected
                                                        ? "rgba(99, 102, 241, 0.05)"
                                                        : "transparent",
                                                    transition: "all 0.15s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected)
                                                        e.currentTarget.style.backgroundColor =
                                                            "rgba(0,0,0,0.04)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected)
                                                        e.currentTarget.style.backgroundColor =
                                                            "transparent";
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "28px",
                                                        height: "28px",
                                                        borderRadius: "4px",
                                                        backgroundColor: c.hex,
                                                        border: "1px solid rgba(0,0,0,0.12)",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "8.5px",
                                                    fontWeight: 600,
                                                    color: "#475569",
                                                    textAlign: "center",
                                                    marginTop: "4px",
                                                    width: "100%",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={c.name}
                                            >
                                                {c.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === "eSun" && (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(5, minmax(0, 1fr))",
                                    gap: "6px",
                                }}
                            >
                                {ESUN_COLORS.map((c) => {
                                    const isSelected =
                                        value.toUpperCase() ===
                                        c.hex.toUpperCase();
                                    return (
                                        <div
                                            key={c.hex}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(c.hex);
                                                setIsOpen(false);
                                            }}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                cursor: "pointer",
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    border: isSelected
                                                        ? "2px solid #6366f1"
                                                        : "2px solid transparent",
                                                    backgroundColor: isSelected
                                                        ? "rgba(99, 102, 241, 0.05)"
                                                        : "transparent",
                                                    transition: "all 0.15s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected)
                                                        e.currentTarget.style.backgroundColor =
                                                            "rgba(0,0,0,0.04)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected)
                                                        e.currentTarget.style.backgroundColor =
                                                            "transparent";
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "28px",
                                                        height: "28px",
                                                        borderRadius: "4px",
                                                        backgroundColor: c.hex,
                                                        border: "1px solid rgba(0,0,0,0.12)",
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "8.5px",
                                                    fontWeight: 600,
                                                    color: "#475569",
                                                    textAlign: "center",
                                                    marginTop: "4px",
                                                    width: "100%",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                                title={c.name}
                                            >
                                                {c.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface SidebarProps {
    isDesign2?: boolean;
    isPencilTopper?: boolean;
    isDesign3?: boolean;
    isDesign4?: boolean;
    state: AppState;
    updateState: (updates: Partial<AppState>) => void;
    bounds: { x: number; y: number; z: number };
}

const Sidebar: React.FC<SidebarProps> = ({
    state,
    updateState,
    bounds,
    isDesign2,
    isPencilTopper,
    isDesign3,
    isDesign4,
}) => {
    const [allPresets, setAllPresets] = useState<
        { name: string; mode: string; state: AppState }[]
    >(() => {
        try {
            const saved = localStorage.getItem("custom_3d_keychain_presets");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [newPresetName, setNewPresetName] = useState("");

    const modeKey = isPencilTopper
        ? "pencil"
        : isDesign2
          ? "design2"
          : isDesign3
            ? "design3"
            : "design1";
    const modePresets = allPresets.filter((p) => p.mode === modeKey);

    const savePreset = () => {
        if (!newPresetName.trim()) return;
        try {
            const saved = localStorage.getItem("custom_3d_keychain_presets");
            const currentList = saved ? JSON.parse(saved) : [];

            const filtered = currentList.filter(
                (p: any) =>
                    !(
                        p.mode === modeKey &&
                        p.name.toLowerCase() ===
                            newPresetName.trim().toLowerCase()
                    ),
            );

            const updated = [
                ...filtered,
                {
                    name: newPresetName.trim(),
                    mode: modeKey,
                    state: state,
                },
            ];
            localStorage.setItem(
                "custom_3d_keychain_presets",
                JSON.stringify(updated),
            );
            setAllPresets(updated);
            setNewPresetName("");
        } catch (e) {
            console.error("Failed to save preset", e);
        }
    };

    const loadPreset = (presetState: AppState) => {
        updateState(presetState);
    };

    const deletePreset = (name: string) => {
        try {
            const saved = localStorage.getItem("custom_3d_keychain_presets");
            const currentList = saved ? JSON.parse(saved) : [];
            const updated = currentList.filter(
                (p: any) => !(p.mode === modeKey && p.name === name),
            );
            localStorage.setItem(
                "custom_3d_keychain_presets",
                JSON.stringify(updated),
            );
            setAllPresets(updated);
        } catch (e) {
            console.error("Failed to delete preset", e);
        }
    };

    const moveLine = (index: number, direction: "up" | "down") => {
        // ... preserving rest of functions ...
        const newLines = [...state.lines];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLines.length) return;

        const temp = newLines[index];
        newLines[index] = newLines[targetIndex];
        newLines[targetIndex] = temp;
        updateState({ lines: newLines });
    };

    const removeLine = (index: number) => {
        const newLines = state.lines.filter((_, i) => i !== index);
        updateState({ lines: newLines });
    };

    const updateLine = (index: number, updates: Partial<TextLine>) => {
        const newLines = [...state.lines];
        newLines[index] = { ...newLines[index], ...updates };
        updateState({ lines: newLines });
    };

    const addLine = () => {
        if (state.lines.length >= 8) return;
        updateState({
            lines: [
                ...state.lines,
                {
                    id: Math.random().toString(),
                    text: "New Line",
                    font: FONTS[0].url,
                    size: 8,
                    depth: 1.5,
                },
            ],
        });
    };

    const updateShape = (updates: Partial<AppState["shape"]>) => {
        updateState({ shape: { ...state.shape, ...updates } });
    };

    const updateLaceHole = (updates: Partial<AppState["laceHole"]>) => {
        updateState({ laceHole: { ...state.laceHole, ...updates } });
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link to="/" className="back-btn">
                    <ChevronLeft size={20} />
                </Link>
                <span className="editor-title">
                    {isPencilTopper
                        ? "Pencil Name Topper"
                        : isDesign3
                          ? "ID Name Tag (Design 3)"
                          : isDesign2
                            ? "ID Name Tag (Design 2)"
                            : "Id Name Tag"}
                </span>
            </div>

            <div className="sidebar-content">
                {/* MASS CREATION SECTION */}
                <div
                    className="control-group"
                    style={{
                        marginBottom: "16px",
                        backgroundColor: state.massCreation?.enabled
                            ? "rgba(99, 102, 241, 0.05)"
                            : "transparent",
                        padding: "12px",
                        borderRadius: "8px",
                        border: state.massCreation?.enabled
                            ? "1px solid rgba(99, 102, 241, 0.2)"
                            : "1px solid transparent",
                        transition: "all 0.2s",
                    }}
                >
                    <h2
                        className="control-title"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            justifyContent: "space-between",
                            margin: 0,
                        }}
                    >
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                margin: 0,
                                fontWeight: 700,
                                color: state.massCreation?.enabled
                                    ? "#6366f1"
                                    : "var(--text-secondary)",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={state.massCreation?.enabled || false}
                                onChange={(e) =>
                                    updateState({
                                        massCreation: {
                                            ...state.massCreation,
                                            printerType:
                                                state.massCreation
                                                    ?.printerType || "A1 Mini",
                                            tags:
                                                state.massCreation?.tags || [],
                                            enabled: e.target.checked,
                                        },
                                    })
                                }
                                style={{ accentColor: "#6366f1" }}
                            />
                            Mass Creation Mode
                        </label>
                    </h2>
                    {state.massCreation?.enabled && (
                        <div
                            style={{
                                marginTop: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                            }}
                        >
                            <div className="control-item">
                                <label
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            color: "var(--text-tertiary)",
                                        }}
                                    >
                                        Printer Build Plate
                                    </span>
                                    <select
                                        style={{
                                            padding: "6px",
                                            borderRadius: "4px",
                                            border: "1px solid var(--border-color)",
                                            backgroundColor:
                                                "var(--bg-primary)",
                                            color: "var(--text-primary)",
                                            fontSize: "12px",
                                            outline: "none",
                                        }}
                                        value={
                                            state.massCreation.printerType ||
                                            "A1 Mini"
                                        }
                                        onChange={(e) =>
                                            updateState({
                                                massCreation: {
                                                    ...state.massCreation,
                                                    printerType: e.target
                                                        .value as any,
                                                    tags:
                                                        state.massCreation
                                                            ?.tags || [],
                                                    enabled: true,
                                                },
                                            })
                                        }
                                    >
                                        <option value="A1 Mini">
                                            A1 Mini (180x180)
                                        </option>
                                        <option value="A1">A1 (256x256)</option>
                                        <option value="P1S">
                                            P1S (256x256)
                                        </option>
                                        <option value="X1 Carbon">
                                            X1 Carbon (256x256)
                                        </option>
                                    </select>
                                </label>
                            </div>
                            <div className="control-item">
                                <label
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            color: "var(--text-tertiary)",
                                        }}
                                    >
                                        Data Source (Excel)
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={async (e) => {
                                            if (
                                                e.target.files &&
                                                e.target.files.length > 0
                                            ) {
                                                const file = e.target.files[0];
                                                e.target.value = ""; // Clear value to allow re-upload
                                                updateState({
                                                    isProcessing: true,
                                                    processingMessage:
                                                        "Parsing Excel and laying out batch tags...",
                                                });
                                                try {
                                                    const { parseExcelTags } =
                                                        await import("../utils/excelParser");
                                                    const tags =
                                                        await parseExcelTags(
                                                            file,
                                                        );

                                                    // Give UI a moment to show the loader, then update tags
                                                    setTimeout(() => {
                                                        updateState({
                                                            massCreation: {
                                                                ...state.massCreation,
                                                                printerType:
                                                                    state
                                                                        .massCreation
                                                                        ?.printerType ||
                                                                    "A1 Mini",
                                                                tags,
                                                                enabled: true,
                                                            },
                                                            isProcessing: false,
                                                            processingMessage:
                                                                undefined,
                                                        });
                                                    }, 500);
                                                } catch (err) {
                                                    updateState({
                                                        isProcessing: false,
                                                        processingMessage:
                                                            undefined,
                                                    });
                                                    alert(
                                                        "Error parsing excel: " +
                                                            err,
                                                    );
                                                }
                                            }
                                        }}
                                        style={{ fontSize: "11px" }}
                                    />
                                </label>
                            </div>
                            {state.massCreation.tags &&
                                state.massCreation.tags.length > 0 && (
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "#10b981",
                                            fontWeight: 500,
                                            padding: "4px",
                                            backgroundColor:
                                                "rgba(16, 185, 129, 0.1)",
                                            borderRadius: "4px",
                                            textAlign: "center",
                                        }}
                                    >
                                        Loaded {state.massCreation.tags.length}{" "}
                                        tags successfully.
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                {/* PRESETS SECTION */}
                <div className="control-group" style={{ marginBottom: "16px" }}>
                    <h2
                        className="control-title"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            justifyContent: "space-between",
                        }}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                        >
                            <Save size={14} /> Saved Designs
                        </span>
                    </h2>

                    {/* Save Current Design Form */}
                    <div
                        style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "8px",
                            marginBottom: "12px",
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Design Name (e.g. Neon Yellow)"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            style={{
                                flexGrow: 1,
                                padding: "6px 10px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                border: "1px solid var(--border-color)",
                                outline: "none",
                                background: "var(--bg-secondary)",
                                color: "var(--text-primary)",
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") savePreset();
                            }}
                        />
                        <button
                            className="action-btn"
                            onClick={savePreset}
                            style={{
                                padding: "0 12px",
                                fontSize: "12px",
                                height: "30px",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                border: "1px solid #10b981",
                                color: "#10b981",
                                background: "transparent",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                    "rgba(16, 185, 129, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                    "transparent";
                            }}
                        >
                            Save
                        </button>
                    </div>

                    {/* Presets List */}
                    {modePresets.length > 0 ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                maxHeight: "150px",
                                overflowY: "auto",
                                paddingRight: "4px",
                            }}
                        >
                            {modePresets.map((preset) => (
                                <div
                                    key={preset.name}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <span
                                        onClick={() => loadPreset(preset.state)}
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            cursor: "pointer",
                                            flexGrow: 1,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                        title="Click to load design settings"
                                    >
                                        {preset.name}
                                    </span>
                                    <div
                                        style={{ display: "flex", gap: "6px" }}
                                    >
                                        <button
                                            className="action-btn"
                                            onClick={() =>
                                                loadPreset(preset.state)
                                            }
                                            style={{
                                                padding: "4px",
                                                minWidth: "auto",
                                            }}
                                            title="Load Design"
                                        >
                                            <FolderOpen size={13} />
                                        </button>
                                        <button
                                            className="action-btn danger"
                                            onClick={() =>
                                                deletePreset(preset.name)
                                            }
                                            style={{
                                                padding: "4px",
                                                minWidth: "auto",
                                            }}
                                            title="Delete Design"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                fontSize: "11px",
                                color: "var(--text-tertiary)",
                                textAlign: "center",
                                fontStyle: "italic",
                                padding: "4px 0",
                            }}
                        >
                            No saved designs yet.
                        </div>
                    )}
                </div>

                {/* LINES SECTION */}
                <div className="control-group">
                    <h2
                        className="control-title"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <Type size={14} /> Lines ({state.lines.length} of 8)
                    </h2>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >
                        {state.lines.map((line, idx) => (
                            <div key={line.id} className="line-card">
                                <div className="line-card-header">
                                    <span className="line-card-title">
                                        {isPencilTopper
                                            ? "Text Settings"
                                            : `Line ${idx + 1}`}
                                    </span>
                                    {!isPencilTopper && (
                                        <div className="line-card-actions">
                                            <button
                                                className="action-btn"
                                                onClick={() =>
                                                    moveLine(idx, "up")
                                                }
                                                disabled={idx === 0}
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                className="action-btn"
                                                onClick={() =>
                                                    moveLine(idx, "down")
                                                }
                                                disabled={
                                                    idx ===
                                                    state.lines.length - 1
                                                }
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                            <button
                                                className="action-btn danger"
                                                onClick={() => removeLine(idx)}
                                                disabled={
                                                    state.lines.length === 1
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="control-item">
                                    <input
                                        type="text"
                                        value={line.text}
                                        onChange={(e) =>
                                            updateLine(idx, {
                                                text: e.target.value,
                                            })
                                        }
                                        placeholder="Content"
                                    />
                                </div>

                                <div className="control-item">
                                    <select
                                        value={line.font}
                                        onChange={(e) =>
                                            updateLine(idx, {
                                                font: e.target.value,
                                            })
                                        }
                                        style={{
                                            fontFamily:
                                                FONTS.find(
                                                    (f) => f.url === line.font,
                                                )?.name || "inherit",
                                            fontSize: "1rem",
                                            padding: "6px 12px",
                                        }}
                                    >
                                        {FONTS.map((f) => (
                                            <option
                                                key={f.url}
                                                value={f.url}
                                                style={{
                                                    fontFamily: f.name,
                                                    fontSize: "1.1rem",
                                                }}
                                            >
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {!isPencilTopper && (
                                    <div className="control-item">
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "8px",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "20px",
                                                    height: "20px",
                                                    borderRadius: "4px",
                                                    backgroundColor:
                                                        line.color ||
                                                        state.textColor,
                                                    border: "1px solid #d1d5db",
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <ColorSelect
                                                value={
                                                    line.color ||
                                                    state.textColor
                                                }
                                                onChange={(val) =>
                                                    updateLine(idx, {
                                                        color: val,
                                                    })
                                                }
                                                colors={BAMBU_COLORS}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="line-grid"
                                    style={{
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                    }}
                                >
                                    <div className="control-item">
                                        <label>
                                            <span>Size</span>
                                            <EditableNumber
                                                value={line.size}
                                                onChange={(val) =>
                                                    updateLine(idx, {
                                                        size: val,
                                                    })
                                                }
                                                min={2}
                                                max={isPencilTopper ? 60 : 30}
                                                step={0.5}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={2}
                                            max={isPencilTopper ? 60 : 30}
                                            step={0.5}
                                            value={line.size}
                                            onChange={(e) =>
                                                updateLine(idx, {
                                                    size: parseFloat(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="control-item">
                                        <label>
                                            <span>Depth</span>
                                            <EditableNumber
                                                value={line.depth}
                                                onChange={(val) =>
                                                    updateLine(idx, {
                                                        depth: val,
                                                    })
                                                }
                                                min={0.5}
                                                max={10}
                                                step={0.1}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={0.5}
                                            max={10}
                                            step={0.1}
                                            value={line.depth}
                                            onChange={(e) =>
                                                updateLine(idx, {
                                                    depth: parseFloat(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="control-item">
                                        <label>
                                            <span>Spacing</span>
                                            <EditableNumber
                                                value={line.letterSpacing || 0}
                                                onChange={(val) =>
                                                    updateLine(idx, {
                                                        letterSpacing: val,
                                                    })
                                                }
                                                min={-5}
                                                max={20}
                                                step={0.5}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={-5}
                                            max={20}
                                            step={0.5}
                                            value={line.letterSpacing || 0}
                                            onChange={(e) =>
                                                updateLine(idx, {
                                                    letterSpacing: parseFloat(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!isPencilTopper && (
                        <>
                            <button
                                onClick={addLine}
                                disabled={state.lines.length >= 8}
                                className="btn-outline"
                                style={{
                                    marginTop: "4px",
                                    borderStyle: "dashed",
                                    padding: "12px",
                                }}
                            >
                                <Plus
                                    size={18}
                                    style={{ marginRight: "6px" }}
                                />{" "}
                                Add line
                            </button>

                            <div
                                className="control-item"
                                style={{ marginTop: "12px", padding: "0 8px" }}
                            >
                                <label>
                                    <span>Line spacing</span>
                                    <EditableNumber
                                        value={state.lineSpacing}
                                        onChange={(val) =>
                                            updateState({ lineSpacing: val })
                                        }
                                        min={0}
                                        max={10}
                                        step={0.5}
                                    />
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={state.lineSpacing}
                                    onChange={(e) =>
                                        updateState({
                                            lineSpacing: parseFloat(
                                                e.target.value,
                                            ),
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>

                <hr
                    style={{
                        borderTop: "1px solid var(--border-color)",
                        margin: "4px 0",
                    }}
                />

                {/* COLORS SECTION */}
                <div className="control-group">
                    <h2
                        className="control-title"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <Palette size={14} /> Colors
                    </h2>
                    <div
                        className="line-grid"
                        style={{ gridTemplateColumns: "1fr 1fr" }}
                    >
                        {isPencilTopper ? (
                            <>
                                <div className="control-item">
                                    <label>Top Color</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    state.textColor,
                                                border: "1px solid #d1d5db",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <ColorSelect
                                            value={state.textColor}
                                            onChange={(val) =>
                                                updateState({ textColor: val })
                                            }
                                            colors={BAMBU_COLORS}
                                        />
                                    </div>
                                </div>
                                <div className="control-item">
                                    <label>Base Color</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    state.baseColor,
                                                border: "1px solid #d1d5db",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <ColorSelect
                                            value={state.baseColor}
                                            onChange={(val) =>
                                                updateState({ baseColor: val })
                                            }
                                            colors={BAMBU_COLORS}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="control-item">
                                    <label>Border</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    state.borderColor,
                                                border: "1px solid #d1d5db",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <ColorSelect
                                            value={state.borderColor}
                                            onChange={(val) =>
                                                updateState({
                                                    borderColor: val,
                                                })
                                            }
                                            colors={BAMBU_COLORS}
                                        />
                                    </div>
                                </div>
                                <div className="control-item">
                                    <label>Base Plate</label>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    state.baseColor,
                                                border: "1px solid #d1d5db",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <ColorSelect
                                            value={state.baseColor}
                                            onChange={(val) =>
                                                updateState({ baseColor: val })
                                            }
                                            colors={BAMBU_COLORS}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <hr
                    style={{
                        borderTop: "1px solid var(--border-color)",
                        margin: "4px 0",
                    }}
                />

                {/* SHAPE CONTROLS SECTION */}
                <div className="control-group">
                    <h2
                        className="control-title"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <ScanLine size={14} /> Shape
                    </h2>

                    {isDesign4 && (
                        <div style={{ marginBottom: "16px" }}>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "var(--text-tertiary)",
                                    textTransform: "uppercase",
                                }}
                            >
                                Model Selection
                            </span>
                            <div
                                style={{
                                    display: "flex",
                                    gap: "8px",
                                    marginTop: "8px",
                                }}
                            >
                                {[
                                    { id: 0, label: "Model 1" },
                                    { id: 1, label: "Model 2" },
                                    { id: 2, label: "Model 3" },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        className="btn-outline"
                                        onClick={() =>
                                            updateShape({ modelType: m.id })
                                        }
                                        style={{
                                            flex: 1,
                                            padding: "6px",
                                            fontSize: "11px",
                                            backgroundColor:
                                                state.shape.modelType === m.id
                                                    ? "var(--bg-secondary)"
                                                    : "transparent",
                                            borderColor:
                                                state.shape.modelType === m.id
                                                    ? "var(--accent)"
                                                    : "var(--border-color)",
                                        }}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isPencilTopper ? (
                        <div
                            style={{
                                marginTop: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                            }}
                        >
                            <div className="control-item">
                                <label>
                                    <span>Outline Width</span>
                                    <EditableNumber
                                        value={state.shape.padding}
                                        onChange={(val) =>
                                            updateShape({ padding: val })
                                        }
                                        min={2}
                                        max={20}
                                        step={0.5}
                                    />
                                </label>
                                <input
                                    type="range"
                                    min={2}
                                    max={20}
                                    step={0.5}
                                    value={state.shape.padding}
                                    onChange={(e) =>
                                        updateState({
                                            shape: {
                                                ...state.shape,
                                                padding: parseFloat(
                                                    e.target.value,
                                                ),
                                            },
                                        })
                                    }
                                />
                            </div>

                            <div className="control-item">
                                <label>
                                    <span>Base Thickness</span>
                                    <EditableNumber
                                        value={state.shape.baseThickness}
                                        onChange={(val) =>
                                            updateShape({ baseThickness: val })
                                        }
                                        min={5}
                                        max={25}
                                        step={0.5}
                                    />
                                </label>
                                <input
                                    type="range"
                                    min={5}
                                    max={25}
                                    step={0.5}
                                    value={state.shape.baseThickness}
                                    onChange={(e) =>
                                        updateState({
                                            shape: {
                                                ...state.shape,
                                                baseThickness: parseFloat(
                                                    e.target.value,
                                                ),
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginTop: "4px" }}>
                                <span
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: "var(--text-tertiary)",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Size
                                </span>
                                <div
                                    style={{
                                        marginTop: "12px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            className="hud-label"
                                            style={{
                                                fontSize: "0.8rem",
                                                fontWeight: 600,
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            Auto Size
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={state.shape.autoSize}
                                            onChange={(e) => {
                                                const isAuto = e.target.checked;
                                                if (isAuto) {
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            autoSize: true,
                                                        },
                                                    });
                                                } else {
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            autoSize: false,
                                                            width: bounds.x,
                                                            height: bounds.y,
                                                        },
                                                    });
                                                }
                                            }}
                                        />
                                    </div>

                                    <div
                                        className="control-item"
                                        style={{ marginBottom: "12px" }}
                                    >
                                        <label>
                                            <span>Padding</span>
                                            <EditableNumber
                                                value={state.shape.padding}
                                                onChange={(val) =>
                                                    updateShape({
                                                        padding: val,
                                                    })
                                                }
                                                min={0}
                                                max={50}
                                                step={1}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={2}
                                            max={30}
                                            step={1}
                                            value={state.shape.padding}
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        padding: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="line-grid">
                                        <div className="control-item">
                                            <label>
                                                <span>Width</span>
                                                <span className="control-value">
                                                    {state.shape.width.toFixed(
                                                        1,
                                                    )}
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min={20}
                                                max={300}
                                                step={1}
                                                value={state.shape.width}
                                                onChange={(e) =>
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            width: parseFloat(
                                                                e.target.value,
                                                            ),
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="control-item">
                                            <label>
                                                <span>Height</span>
                                                <span className="control-value">
                                                    {state.shape.height.toFixed(
                                                        1,
                                                    )}
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min={10}
                                                max={200}
                                                step={1}
                                                value={state.shape.height}
                                                onChange={(e) =>
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            height: parseFloat(
                                                                e.target.value,
                                                            ),
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div
                                        className="line-grid"
                                        style={{ marginTop: "12px" }}
                                    >
                                        <div className="control-item">
                                            <label>
                                                <span>Corner radius</span>
                                                <span className="control-value">
                                                    {state.shape.cornerRadius.toFixed(
                                                        1,
                                                    )}
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min={0}
                                                max={50}
                                                step={0.5}
                                                value={state.shape.cornerRadius}
                                                onChange={(e) =>
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            cornerRadius:
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="control-item">
                                            <label>
                                                <span>Inner radius</span>
                                                <span className="control-value">
                                                    {(
                                                        state.shape
                                                            .innerRadius ?? 20
                                                    ).toFixed(1)}
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min={0}
                                                max={50}
                                                step={0.5}
                                                value={
                                                    state.shape.innerRadius ??
                                                    20
                                                }
                                                onChange={(e) =>
                                                    updateState({
                                                        shape: {
                                                            ...state.shape,
                                                            innerRadius:
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: "8px" }}>
                                <span
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: "var(--text-tertiary)",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Waves
                                </span>
                                <div
                                    className="line-grid"
                                    style={{ marginTop: "12px" }}
                                >
                                    <div className="control-item">
                                        <label>
                                            <span>Amplitude</span>
                                            <EditableNumber
                                                value={state.shape.amplitude}
                                                onChange={(val) =>
                                                    updateShape({
                                                        amplitude: val,
                                                    })
                                                }
                                                min={0}
                                                max={20}
                                                step={0.5}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={10}
                                            step={0.5}
                                            value={state.shape.amplitude}
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        amplitude: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="control-item">
                                        <label>
                                            <span>Wavelength</span>
                                            <EditableNumber
                                                value={state.shape.wavelength}
                                                onChange={(val) =>
                                                    updateShape({
                                                        wavelength: val,
                                                    })
                                                }
                                                min={0}
                                                max={100}
                                                step={1}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={50}
                                            step={1}
                                            value={state.shape.wavelength}
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        wavelength: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: "8px" }}>
                                <span
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        color: "var(--text-tertiary)",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Depth
                                </span>
                                <div
                                    className="line-grid"
                                    style={{ marginTop: "12px" }}
                                >
                                    <div className="control-item">
                                        <label>
                                            <span>Base</span>
                                            <span className="control-value">
                                                {state.shape.baseThickness.toFixed(
                                                    1,
                                                )}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0.5}
                                            max={10}
                                            step={0.1}
                                            value={state.shape.baseThickness}
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        baseThickness:
                                                            parseFloat(
                                                                e.target.value,
                                                            ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="control-item">
                                        <label>
                                            <span>Top border</span>
                                            <span className="control-value">
                                                {state.shape.topBorder.toFixed(
                                                    1,
                                                )}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={10}
                                            step={0.1}
                                            value={state.shape.topBorder}
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        topBorder: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div
                                    className="line-grid"
                                    style={{ marginTop: "12px" }}
                                >
                                    <div className="control-item">
                                        <label>
                                            <span>Border width</span>
                                            <span className="control-value">
                                                {(
                                                    state.shape.borderWidth ??
                                                    2.0
                                                ).toFixed(1)}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0.5}
                                            max={15}
                                            step={0.1}
                                            value={
                                                state.shape.borderWidth ?? 2.0
                                            }
                                            onChange={(e) =>
                                                updateState({
                                                    shape: {
                                                        ...state.shape,
                                                        borderWidth: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <hr
                    style={{
                        borderTop: "1px solid var(--border-color)",
                        margin: "4px 0",
                    }}
                />

                {/* LACE HOLE SECTION */}
                <div className="control-group">
                    {isPencilTopper ? (
                        <>
                            <h2
                                className="control-title"
                                style={{
                                    margin: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <CircleDashed size={14} /> Pencil Hole
                            </h2>
                            <div
                                className="line-grid"
                                style={{ marginTop: "12px" }}
                            >
                                <div
                                    className="control-item"
                                    style={{ gridColumn: "span 2" }}
                                >
                                    <label>
                                        <span>Diameter (mm)</span>
                                        <EditableNumber
                                            value={state.laceHole.width}
                                            onChange={(val) =>
                                                updateLaceHole({ width: val })
                                            }
                                            min={5}
                                            max={12}
                                            step={0.1}
                                        />
                                    </label>
                                    <input
                                        type="range"
                                        min={5}
                                        max={12}
                                        step={0.1}
                                        value={state.laceHole.width}
                                        onChange={(e) =>
                                            updateState({
                                                laceHole: {
                                                    ...state.laceHole,
                                                    width: parseFloat(
                                                        e.target.value,
                                                    ),
                                                },
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <h2
                                    className="control-title"
                                    style={{
                                        margin: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                    }}
                                >
                                    <CircleDashed size={14} /> Lace hole
                                </h2>
                                <input
                                    type="checkbox"
                                    checked={state.laceHole.enabled}
                                    onChange={(e) =>
                                        updateState({
                                            laceHole: {
                                                ...state.laceHole,
                                                enabled: e.target.checked,
                                            },
                                        })
                                    }
                                />
                            </div>

                            {state.laceHole.enabled && (
                                <div
                                    className="line-grid"
                                    style={{ marginTop: "8px" }}
                                >
                                    <div className="control-item">
                                        <label>
                                            <span>Width</span>
                                            <EditableNumber
                                                value={state.laceHole.width}
                                                onChange={(val) =>
                                                    updateLaceHole({
                                                        width: val,
                                                    })
                                                }
                                                min={2}
                                                max={50}
                                                step={1}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={2}
                                            max={30}
                                            step={0.5}
                                            value={state.laceHole.width}
                                            onChange={(e) =>
                                                updateState({
                                                    laceHole: {
                                                        ...state.laceHole,
                                                        width: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="control-item">
                                        <label>
                                            <span>Height</span>
                                            <EditableNumber
                                                value={state.laceHole.height}
                                                onChange={(val) =>
                                                    updateLaceHole({
                                                        height: val,
                                                    })
                                                }
                                                min={2}
                                                max={50}
                                                step={1}
                                            />
                                        </label>
                                        <input
                                            type="range"
                                            min={2}
                                            max={10}
                                            step={0.5}
                                            value={state.laceHole.height}
                                            onChange={(e) =>
                                                updateState({
                                                    laceHole: {
                                                        ...state.laceHole,
                                                        height: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="control-item">
                                        <label>Type</label>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "10px",
                                                alignItems: "center",
                                                minHeight: "28px",
                                            }}
                                        >
                                            <label
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    margin: 0,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="lace-hole-type"
                                                    checked={
                                                        (state.laceHole.type ||
                                                            "default") ===
                                                        "default"
                                                    }
                                                    onChange={() =>
                                                        updateLaceHole({
                                                            type: "default",
                                                        })
                                                    }
                                                />
                                                Slot
                                            </label>
                                            <label
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    margin: 0,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="lace-hole-type"
                                                    checked={
                                                        (state.laceHole.type ||
                                                            "default") ===
                                                        "loop"
                                                    }
                                                    onChange={() =>
                                                        updateLaceHole({
                                                            type: "loop",
                                                        })
                                                    }
                                                />
                                                Loop Tab
                                            </label>
                                        </div>
                                    </div>
                                    <div
                                        className="control-item"
                                        style={{ gridColumn: "span 2" }}
                                    >
                                        <label>
                                            <span>Top margin</span>
                                            <span className="control-value">
                                                {state.laceHole.topMargin.toFixed(
                                                    1,
                                                )}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={20}
                                            step={0.5}
                                            value={state.laceHole.topMargin}
                                            onChange={(e) =>
                                                updateState({
                                                    laceHole: {
                                                        ...state.laceHole,
                                                        topMargin: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div
                                        className="control-item"
                                        style={{
                                            gridColumn: "span 2",
                                            marginTop: "8px",
                                        }}
                                    >
                                        <label>
                                            <span>X Offset</span>
                                            <span className="control-value">
                                                {(
                                                    state.laceHole.offsetX || 0
                                                ).toFixed(1)}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={-50}
                                            max={50}
                                            step={0.5}
                                            value={state.laceHole.offsetX || 0}
                                            onChange={(e) =>
                                                updateState({
                                                    laceHole: {
                                                        ...state.laceHole,
                                                        offsetX: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div
                                        className="control-item"
                                        style={{
                                            gridColumn: "span 2",
                                            marginTop: "8px",
                                        }}
                                    >
                                        <label>
                                            <span>Y Offset</span>
                                            <span className="control-value">
                                                {(
                                                    state.laceHole.offsetY || 0
                                                ).toFixed(1)}
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={-50}
                                            max={50}
                                            step={0.5}
                                            value={state.laceHole.offsetY || 0}
                                            onChange={(e) =>
                                                updateState({
                                                    laceHole: {
                                                        ...state.laceHole,
                                                        offsetY: parseFloat(
                                                            e.target.value,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
