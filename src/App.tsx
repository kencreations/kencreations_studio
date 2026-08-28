import React from "react";
import {
    Download,
    Box,
    Palette,
    BarChart3,
    CheckCircle,
    Monitor,
} from "lucide-react";
import "./App.css"; // Make sure this matches your CSS file name!

export default function LandingPage() {
    return (
        <div className="landing-container">
            {/* ── NAVIGATION ── */}
            <nav className="navbar">
                <div className="logo-group">
                    <Box className="icon-teal" size={28} />
                    <span className="logo-text">KenCreations Studio</span>
                </div>
                <button className="btn-primary flex-btn">
                    <Download size={16} /> Download for Windows
                </button>
            </nav>

            {/* ── HERO SECTION ── */}
            <header className="hero-section">
                <div className="version-badge">v1.0 is officially LIVE 🚀</div>
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
                    <button className="btn-primary btn-large flex-btn">
                        <Download size={20} /> Download .EXE (64-bit)
                    </button>
                </div>

                <div className="hero-mockup">
                    <Monitor size={48} className="icon-slate" />
                    <span className="mockup-text">
                        Insert App UI Graphic Here
                    </span>
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
                        <div className="price-block">
                            <span className="price">₱499</span>
                            <span className="period"> /mo</span>
                        </div>
                        <ul className="feature-list">
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
                            Also available for ₱5,999 / Lifetime
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
                                Includes 6-Months Core
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
