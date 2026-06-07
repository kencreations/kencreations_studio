import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
    Box,
    Sparkles,
    Fingerprint,
    PenTool,
    LayoutGrid,
    ChevronRight,
    AlertTriangle,
    ShieldCheck,
    Zap,
} from "lucide-react";

export interface ToolItem {
    ref: string;
    name: string;
    description: string;
    path: string;
    icon: React.ReactNode;
    color: string;
    status: "stable" | "beta" | "maintenance" | "upcoming";
    priceHint?: string; // Optional price metadata for premium features
}

export const RAW_TOOLS: ToolItem[] = [
    {
        ref: "001",
        name: "Classic ID Tag",
        description:
            "Standard customizable 3D name tag template with dynamic text padding adjustment rules.",
        path: "/editor/id-name-tag",
        icon: <Fingerprint size={24} strokeWidth={1.5} />,
        color: "#06b6d4",
        status: "stable",
        priceHint: "Free",
    },
    {
        ref: "002",
        name: "ID Tag V2",
        description:
            "Streamlined modern name tag incorporating a custom dual-material overlay border frame configuration.",
        path: "/editor/id-name-tag-2",
        icon: <LayoutGrid size={24} strokeWidth={1.5} />,
        color: "#10b981",
        status: "stable",
        priceHint: "Pro Plan",
    },
    {
        ref: "003",
        name: "Rounded ID Tag",
        description:
            "Dynamic typographic configurations matched over parametric corner configurations for modern looks.",
        path: "/editor/id-name-tag-3",
        icon: <Box size={24} strokeWidth={1.5} />,
        color: "#8b5cf6",
        status: "maintenance",
        priceHint: "Pro Plan",
    },
    {
        ref: "003-b",
        name: "Creative ID Tag",
        description:
            "Dynamic models with 3 distinct organic shapes: standard rounded, cloud-like squiggly edge, and wavy scalloped borders with a custom trapezoidal handle.",
        path: "/editor/id-name-tag-4",
        icon: <Sparkles size={24} strokeWidth={1.5} />,
        color: "#10b981",
        status: "maintenance",
    },
    {
        ref: "004",
        name: "Fidget Clicker",
        description:
            "Parametric modular clicker generator with integrated mechanical keyboard switch housings and SVG extruders.",
        path: "/editor/fidget-clicker",
        icon: <Sparkles size={24} strokeWidth={1.5} />,
        color: "#f59e0b",
        status: "maintenance",
        priceHint: "Pro Plan",
    },
    {
        ref: "005",
        name: "Pencil Topper",
        description:
            "Personalized structural typographic caps fitted perfectly onto standard office pencil dimensions.",
        path: "/editor/pencil-topper",
        icon: <PenTool size={24} strokeWidth={1.5} />,
        color: "#ec4899",
        status: "stable",
    },
];

const STATUS_CONFIG = {
    stable: {
        label: "Stable",
        bg: "rgba(16, 185, 129, 0.08)",
        text: "#10b981",
        border: "rgba(16, 185, 129, 0.2)",
    },
    beta: {
        label: "Beta",
        bg: "rgba(245, 158, 11, 0.08)",
        text: "#f59e0b",
        border: "rgba(245, 158, 11, 0.2)",
    },
    maintenance: {
        label: "Maintenance",
        bg: "rgba(239, 68, 68, 0.08)",
        text: "#ef4444",
        border: "rgba(239, 68, 68, 0.2)",
    },
    upcoming: {
        label: "Coming Soon",
        bg: "rgba(107, 114, 128, 0.08)",
        text: "#9ca3af",
        border: "rgba(107, 114, 128, 0.2)",
    },
};

const Home: React.FC = () => {
    // Deduplicate array using a reliable Map index grouped on ref properties
    const uniqueTools = useMemo(() => {
        const deduplicationMap = new Map(
            RAW_TOOLS.map((item) => [item.ref, item]),
        );
        return Array.from(deduplicationMap.values());
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#030712",
                color: "#f9fafb",
                fontFamily:
                    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                padding: "80px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
            }}
        >
            {/* Header Content Frame */}
            <div
                style={{
                    textAlign: "center",
                    maxWidth: "640px",
                    marginBottom: "72px",
                }}
            >
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        padding: "6px 14px",
                        borderRadius: "100px",
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                        fontWeight: 500,
                        marginBottom: "24px",
                    }}
                >
                    <Zap size={14} color="#eab308" /> Studio Cloud Platform
                    Engine Active
                </div>
                <h1
                    style={{
                        fontSize: "3.5rem",
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        margin: "0 0 16px 0",
                        background:
                            "linear-gradient(135deg, #ffffff 30%, #9ca3af 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    KenCreations Studio
                </h1>
                <p
                    style={{
                        fontSize: "1.1rem",
                        color: "#9ca3af",
                        lineHeight: 1.6,
                        margin: 0,
                        fontWeight: 400,
                    }}
                >
                    Professional toolsets for dynamic 3D model generation.
                    Adjust specifications, evaluate slices, and download
                    manufacturing-grade fabrication geometries directly.
                </p>
            </div>

            {/* Grid Framework Section */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "24px",
                    width: "100%",
                    maxWidth: "1100px",
                }}
            >
                {uniqueTools.map((tool) => {
                    const status = STATUS_CONFIG[tool.status];
                    const isDisabled =
                        tool.status === "maintenance" ||
                        tool.status === "upcoming";

                    const CardInnerContent = (
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.01)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                borderRadius: "20px",
                                padding: "28px",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                transition:
                                    "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                position: "relative",
                                opacity: isDisabled ? 0.6 : 1,
                                cursor: isDisabled ? "not-allowed" : "pointer",
                            }}
                            onMouseEnter={(e) => {
                                if (!isDisabled) {
                                    e.currentTarget.style.background =
                                        "rgba(255, 255, 255, 0.03)";
                                    e.currentTarget.style.border = `1px solid ${tool.color}40`;
                                    e.currentTarget.style.transform =
                                        "translateY(-4px)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isDisabled) {
                                    e.currentTarget.style.background =
                                        "rgba(255, 255, 255, 0.01)";
                                    e.currentTarget.style.border =
                                        "1px solid rgba(255, 255, 255, 0.05)";
                                    e.currentTarget.style.transform =
                                        "translateY(0)";
                                }
                            }}
                        >
                            {/* Card Top Row Badges */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "24px",
                                }}
                            >
                                <div
                                    style={{
                                        background: `${tool.color}10`,
                                        color: tool.color,
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "14px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {tool.icon}
                                </div>

                                {/* Status Chip Element */}
                                <div
                                    style={{
                                        backgroundColor: status.bg,
                                        color: status.text,
                                        border: `1px solid ${status.border}`,
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {status.label}
                                </div>
                            </div>

                            {/* Title & Monetization Hint Frame */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: "10px",
                                    margin: "0 0 8px 0",
                                }}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: "1.2rem",
                                        fontWeight: 600,
                                        color: "#f3f4f6",
                                    }}
                                >
                                    {tool.name}
                                </h3>
                                {tool.priceHint && !isDisabled && (
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color:
                                                tool.priceHint === "Free"
                                                    ? "#10b981"
                                                    : "#06b6d4",
                                            background:
                                                tool.priceHint === "Free"
                                                    ? "rgba(16,185,129,0.06)"
                                                    : "rgba(6,182,212,0.06)",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {tool.priceHint}
                                    </span>
                                )}
                            </div>

                            <p
                                style={{
                                    margin: 0,
                                    color: "#9ca3af",
                                    fontSize: "0.9rem",
                                    lineHeight: 1.5,
                                    flexGrow: 1,
                                }}
                            >
                                {tool.description}
                            </p>

                            {/* Conditional Bottom Context Triggers */}
                            <div
                                style={{
                                    marginTop: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                    color: isDisabled ? "#6b7280" : tool.color,
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                }}
                            >
                                {tool.status === "maintenance" && (
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            color: "#ef4444",
                                        }}
                                    >
                                        <AlertTriangle size={14} /> Under
                                        Construction
                                    </span>
                                )}
                                {tool.status === "upcoming" && (
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        Deployment Scheduled
                                    </span>
                                )}
                                {tool.status === "stable" && (
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                        }}
                                    >
                                        Initialize Engine{" "}
                                        <ChevronRight size={14} />
                                    </span>
                                )}
                                {tool.status === "beta" && (
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                        }}
                                    >
                                        Launch Sandbox Preview{" "}
                                        <ChevronRight size={14} />
                                    </span>
                                )}
                            </div>
                        </div>
                    );

                    return isDisabled ? (
                        <div key={tool.ref}>{CardInnerContent}</div>
                    ) : (
                        <Link
                            key={tool.ref}
                            to={tool.path}
                            style={{ textDecoration: "none" }}
                        >
                            {CardInnerContent}
                        </Link>
                    );
                })}
            </div>

            <div
                style={{
                    marginTop: "80px",
                    fontSize: "0.75rem",
                    color: "#4b5563",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                }}
            >
                <ShieldCheck size={14} /> Cryptographic client-side execution
                environment. All file compilations processed safely in-browser.
            </div>
        </div>
    );
};

export default Home;
