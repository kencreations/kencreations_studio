import * as XLSX from "xlsx";
import type { BatchTag } from "../types";

const COLOR_MAP: Record<string, string> = {
    "lilac": "#c8a2c8",
    "hot pink": "#ff69b4",
    "red": "#ef4444",
    "cyan": "#06b6d4",
    "blue": "#3b82f6",
    "green": "#10b981",
    "yellow": "#eab308",
    "orange": "#f97316",
    "purple": "#8b5cf6",
    "black": "#18181b",
    "white": "#ffffff",
    "gray": "#6b7280",
    "pink": "#ec4899",
    "teal": "#14b8a6",
    "indigo": "#6366f1",
    "neon yellow": "#eab308", // approximation
    "hotpink": "#ff69b4"
};

const mapColor = (colorStr?: string) => {
    if (!colorStr) return undefined;
    const cleanStr = String(colorStr).toLowerCase().trim();
    return COLOR_MAP[cleanStr] || colorStr; // return mapped hex, or original string if not found
};

export const parseExcelTags = async (file: File): Promise<BatchTag[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                
                const headers = rows[0]?.map(h => String(h).toLowerCase().trim()) || [];
                const nameIdx = headers.findIndex(h => h === "name");
                const nicknameIdx = headers.findIndex(h => h === "nickname");
                const baseColorIdx = headers.findIndex(h => h === "basecolor" || h === "base color" || h === "color");
                const textColorIdx = headers.findIndex(h => h === "textcolor" || h === "text color");
                const borderColorIdx = headers.findIndex(h => h === "bordercolor" || h === "border color");

                if (nameIdx === -1) {
                    reject(new Error("Excel file must contain a 'name' column."));
                    return;
                }

                const tags: BatchTag[] = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length === 0) continue;
                    
                    const name = row[nameIdx];
                    if (!name) continue;

                    const lines = [];
                    // Nickname goes first (Line 1 is usually the large text)
                    if (nicknameIdx !== -1 && row[nicknameIdx]) {
                        lines.push(String(row[nicknameIdx]));
                    } else {
                        lines.push(String(name).split(" ")[0]); // fallback to first name
                    }
                    lines.push(String(name));

                    tags.push({
                        id: `batch-${i}`,
                        lines,
                        baseColor: mapColor(baseColorIdx !== -1 ? row[baseColorIdx] : undefined),
                        textColor: mapColor(textColorIdx !== -1 ? row[textColorIdx] : undefined),
                        borderColor: mapColor(borderColorIdx !== -1 ? row[borderColorIdx] : undefined),
                    });
                }
                resolve(tags);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

