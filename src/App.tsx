import React from "react";
import {
    Download,
    Box,
    Palette,
    BarChart3,
    CheckCircle,
    Monitor,
} from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-teal-500/30">
            {/* ── NAVIGATION ── */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                    <Box className="text-teal-400" size={28} />
                    <span className="text-xl font-bold tracking-tight">
                        KenCreations Studio
                    </span>
                </div>
                <button className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-5 py-2.5 rounded-full font-bold transition-all">
                    <Download size={16} /> Download for Windows
                </button>
            </nav>

            {/* ── HERO SECTION ── */}
            <header className="px-8 py-24 max-w-5xl mx-auto text-center space-y-8">
                <div className="inline-block px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-semibold mb-4">
                    v1.0 is officially LIVE 🚀
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                    The future of your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                        3D printing workflow.
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                    Skip the CAD software. Automatically generate custom
                    Keycaps, Charms, Macropads, and more with our ever-expanding
                    library of parametric 3D tools.
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-teal-500/25 hover:scale-105">
                        <Download size={20} /> Download .EXE (64-bit)
                    </button>
                </div>

                {/* Placeholder for the Desktop App Mockup Graphic */}
                <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/50 p-2 shadow-2xl overflow-hidden aspect-video relative flex items-center justify-center">
                    <Monitor size={48} className="text-slate-700 mb-2" />
                    <span className="absolute mt-16 text-slate-500 font-medium">
                        Insert App UI Graphic Here
                    </span>
                </div>
            </header>

            {/* ── FEATURES SECTION ── */}
            <section className="py-24 bg-slate-900/30 border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="w-12 h-12 bg-teal-500/10 flex items-center justify-center rounded-xl mb-6">
                            <Box className="text-teal-400" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Automated Generators
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Instantly generate ready-to-print models. From daily
                            best-sellers like Name Keychains to specialized
                            mechanical keyboard accessories.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-xl mb-6">
                            <Palette className="text-blue-400" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Limitless Customization
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Upload your custom fonts, dial in precise hex
                            colors, and search a built-in library of over
                            200,000+ icons directly inside the editor.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="w-12 h-12 bg-orange-500/10 flex items-center justify-center rounded-xl mb-6">
                            <BarChart3 className="text-orange-400" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            Built-In Studio Hub
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Track filament inventory, calculate precise printing
                            costs, manage failure buffers, and calculate profit
                            margins automatically.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── PRICING SECTION ── */}
            <section className="py-24 max-w-7xl mx-auto px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-slate-400">
                        Choose the license that fits your printing business.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Core Plan */}
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
                        <h3 className="text-xl font-bold mb-2">
                            Core Commercial
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Standard standard tools for everyday prints.
                        </p>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold">
                                ₱499
                            </span>
                            <span className="text-slate-500"> /mo</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-sm text-slate-300">
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Commercial selling rights
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                All standard generators
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Studio Hub Access
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors">
                            Also available for ₱5,999 / Lifetime
                        </button>
                    </div>

                    {/* VIP Plan */}
                    <div className="p-8 rounded-3xl bg-teal-500/5 border border-teal-500/30 relative transform md:-translate-y-4 shadow-2xl shadow-teal-500/10">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Best Value
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-teal-400">
                            All-Access VIP
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Unlock everything. Forever.
                        </p>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold">
                                ₱8,999
                            </span>
                            <span className="text-slate-500"> /once</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-sm text-slate-300">
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Lifetime Core License included
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                All exclusive premium tools
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Future premium tools unlocked
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-colors shadow-lg shadow-teal-500/20">
                            Get VIP Access
                        </button>
                    </div>

                    {/* Custom Promo */}
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 lg:col-span-1 md:col-span-2">
                        <h3 className="text-xl font-bold mb-2">
                            Custom Commission
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Need a tool built just for your shop?
                        </p>
                        <div className="mb-6">
                            <span className="text-4xl font-extrabold">
                                ₱2,500
                            </span>
                            <span className="text-slate-500"> /promo</span>
                        </div>
                        <ul className="space-y-3 mb-8 text-sm text-slate-300">
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                1 Dedicated custom generator
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Automate your specific STL
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle
                                    size={16}
                                    className="text-teal-400"
                                />{" "}
                                Includes 6-Months Core License
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold transition-colors">
                            Request a Build
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-800/50">
                <p>
                    © {new Date().getFullYear()} KenCreations Studio. All rights
                    reserved.
                </p>
            </footer>
        </div>
    );
}
