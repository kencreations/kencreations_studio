export interface TextLine {
    id: string;
    text: string;
    font: string;
    size: number;
    depth: number;
    color?: string;
    letterSpacing?: number;
}

export interface BatchTag {
    id: string;
    lines: string[];
    baseColor?: string;
    textColor?: string;
    borderColor?: string;
}

export interface AppState {
    isProcessing?: boolean;
    processingMessage?: string;
    lines: TextLine[];
    lineSpacing: number;
    textColor: string;
    borderColor: string;
    baseColor: string;
    laceHole: {
        enabled: boolean;
        width: number;
        height: number;
        topMargin: number;
        offsetX?: number;
        offsetY?: number;
        type: "default" | "loop";
    };
    shape: {
        autoSize: boolean;
        padding: number;
        width: number;
        height: number;
        cornerRadius: number;
        amplitude: number;
        wavelength: number;
        baseThickness: number;
        topBorder: number;
        innerRadius: number;
        borderWidth?: number;
    };
    massCreation?: {
        enabled: boolean;
        printerType: "A1" | "A1 Mini" | "X1 Carbon" | "P1S";
        tags: BatchTag[];
    };
}

export const FONTS = [
    { name: "Titan One", url: "/fonts/TitanOne.ttf" },
    { name: "Showpop", url: "/fonts/Showpop.ttf" },
    { name: "Retro Dolly", url: "/fonts/RetroDolly.ttf" },
    { name: "Kindergo", url: "/fonts/Kindergo.ttf" },
    { name: "Beautiful Harmony", url: "/fonts/BeautifulHarmony.ttf" },
    { name: "Milkyway", url: "/fonts/Milkyway.ttf" },
    { name: "Bebas Neue", url: "/fonts/BebasNeue.ttf" },
    { name: "DynaPuff", url: "/fonts/DynaPuff.ttf" },
    { name: "Coiny", url: "/fonts/Coiny.ttf" },
    { name: "Pacifico", url: "/fonts/Pacifico.ttf" },
    { name: "Lobster Two", url: "/fonts/LobsterTwo.ttf" },
    { name: "Roadside Sans", url: "/fonts/RoadsideSans.ttf" },
    { name: "Arial", url: "/fonts/ARIAL.ttf" },
    { name: "Arial Medium", url: "/fonts/ArialMdm.ttf" },
    { name: "Arial Rounded Bold", url: "/fonts/ArialRnDBD.ttf" },
];
