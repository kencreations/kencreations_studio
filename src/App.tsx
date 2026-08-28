import React, { useState, useEffect } from "react";
import {
    Download,
    Box,
    Palette,
    BarChart3,
    CheckCircle,
    Monitor,
} from "lucide-react";
import "./App.css"; // Make sure this matches your CSS file name!
import mockupImg from "./1.png";

export default function LandingPage() {
    const [downloadUrl, setDownloadUrl] = useState("");
    useEffect(() => {
        fetch(
            "https://api.github.com/repos/kencreations/kencreations_studioV2/releases/latest",
        )
            .then((response) => response.json())
            .then((data) => {
                // Find the asset that ends with .exe
                const exeAsset = data.assets?.find((asset: any) =>
                    asset.name.endsWith(".exe"),
                );
                if (exeAsset) {
                    setDownloadUrl(exeAsset.browser_download_url);
                }
            })
            .catch((error) => console.error("Error fetching release:", error));
    }, []);

    return (
        <div className="landing-container">
            {/* ── NAVIGATION ── */}
            <nav className="navbar">
                <div className="logo-group">
                    <Box className="icon-teal" size={28} />
                    <span className="logo-text">KenCreations Studio</span>
                </div>
                {/* Updated Nav Button */}
                <a
                    href={downloadUrl || "#"}
                    className="btn-primary flex-btn"
                    style={{
                        textDecoration: "none",
                        opacity: downloadUrl ? 1 : 0.6,
                        pointerEvents: downloadUrl ? "auto" : "none",
                    }}>
                    <Download size={16} />{" "}
                    {downloadUrl ? "Download for Windows" : "Fetching..."}
                </a>
            </nav>

            {/* ── HERO SECTION ── */}
            <header className="hero-section">
                <div className="version-badge">v1.1 is officially LIVE 🚀</div>
                <h1 className="hero-title">
                    The future of your <br />
                    <span className="text-gradient">3D printing workflow.</span>
                </h1>
                <p className="hero-subtitle">
                    Skip the CAD software. Automatically generate custom
                    Keycaps, Charms, Macropads, and more with our ever-expanding
                    library of parametric 3D tools.
                </p>
                <div className="hero-actions">
                    {/* Updated Hero Button */}
                    <a
                        href={downloadUrl || "#"}
                        className="btn-primary btn-large flex-btn"
                        style={{
                            textDecoration: "none",
                            opacity: downloadUrl ? 1 : 0.6,
                            pointerEvents: downloadUrl ? "auto" : "none",
                        }}>
                        <Download size={20} />{" "}
                        {downloadUrl
                            ? "Download .EXE (64-bit)"
                            : "Fetching Latest Version..."}
                    </a>
                </div>

                {/* ── CUSTOM APP WINDOW MOCKUP ── */}
                <div className="custom-app-window">
                    {/* Top Title Bar */}
                    <div className="app-titlebar">
                        <div className="traffic-lights">
                            <span className="dot close-dot"></span>
                            <span className="dot min-dot"></span>
                            <span className="dot max-dot"></span>
                        </div>
                        <div className="app-title">
                            KenCreations Studio - Pro Edition
                        </div>
                    </div>

                    {/* App Content Area */}
                    <div className="app-content">
                        {/* You will put your clean app screenshot here! */}
                        <img
                            src={mockupImg}
                            alt="KenCreations Studio Interface"
                            className="app-screenshot"
                        />
                    </div>
                </div>
            </header>

            {/* ── FEATURES SECTION ── */}
            <section className="features-section">
                <div className="features-grid">
                    <div className="card">
                        <div className="icon-box box-teal">
                            <Box className="icon-teal" size={24} />
                        </div>
                        <h3>Automated Generators</h3>
                        <p>
                            Instantly generate ready-to-print models. From daily
                            best-sellers like Name Keychains to specialized
                            mechanical keyboard accessories.
                        </p>
                    </div>
                    <div className="card">
                        <div className="icon-box box-blue">
                            <Palette className="icon-blue" size={24} />
                        </div>
                        <h3>Limitless Customization</h3>
                        <p>
                            Upload your custom fonts, dial in precise hex
                            colors, and search a built-in library of over
                            200,000+ icons directly inside the editor.
                        </p>
                    </div>
                    <div className="card">
                        <div className="icon-box box-orange">
                            <BarChart3 className="icon-orange" size={24} />
                        </div>
                        <h3>Built-In Studio Hub</h3>
                        <p>
                            Track filament inventory, calculate precise printing
                            costs, manage failure buffers, and calculate profit
                            margins automatically.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── PRICING SECTION ── */}
            <section className="pricing-section">
                <div className="pricing-header">
                    <h2>Simple, Transparent Pricing</h2>
                    <p>Choose the license that fits your printing business.</p>
                </div>

                <div className="pricing-grid">
                    {/* Core Plan */}
                    <div className="card pricing-card">
                        <h3>Core Commercial</h3>
                        <p className="subtitle">
                            Standard tools for everyday prints.
                        </p>

                        <div className="pricing-tiers">
                            <div className="tier">
                                <span>1-Month</span>
                                <strong>₱499</strong>
                            </div>
                            <div className="tier">
                                <span>6-Months</span>
                                <strong>₱2,499</strong>
                            </div>
                            <div className="tier">
                                <span>12-Months</span>
                                <strong>₱3,999</strong>
                            </div>
                            <div className="tier tier-lifetime">
                                <span>Lifetime</span>
                                <strong>₱5,999</strong>
                            </div>
                        </div>

                        <ul className="feature-list mt-auto">
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Commercial selling rights
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                All standard generators
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Studio Hub Access
                            </li>
                        </ul>
                        <button className="btn-secondary w-full">
                            Choose Core Plan
                        </button>
                    </div>

                    {/* VIP Plan */}
                    <div className="card pricing-card card-vip">
                        <div className="vip-badge">Best Value</div>
                        <h3 className="text-teal">All-Access VIP</h3>
                        <p className="subtitle">Unlock everything. Forever.</p>
                        <div className="price-block">
                            <span className="price">₱8,999</span>
                            <span className="period"> /once</span>
                        </div>
                        <ul className="feature-list">
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Lifetime Core License included
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                All exclusive premium tools
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Future premium tools unlocked
                            </li>
                        </ul>
                        <button className="btn-primary w-full shadow-glow">
                            Get VIP Access
                        </button>
                    </div>

                    {/* Custom Promo */}
                    <div className="card pricing-card custom-span">
                        <h3>Custom Commission</h3>
                        <p className="subtitle">
                            Need a tool built just for your shop?
                        </p>
                        <div className="price-block">
                            <span className="price">₱2,500</span>
                            <span className="period"> /promo</span>
                        </div>
                        <ul className="feature-list">
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                1 Dedicated custom generator
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Automate your specific STL
                            </li>
                            <li>
                                <CheckCircle size={16} className="icon-teal" />{" "}
                                Includes 1-Months Core
                            </li>
                        </ul>
                        <button className="btn-secondary w-full">
                            Request a Build
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="footer">
                <p>
                    © {new Date().getFullYear()} KenCreations Studio. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}
