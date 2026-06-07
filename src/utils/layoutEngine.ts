import type { AppState, BatchTag } from "../types";

export interface TagSize {
    width: number;
    height: number;
}

export interface LayoutItem {
    tag: BatchTag;
    x: number;
    y: number; // Center-based coordinates for Three.js
    width: number;
    height: number;
}

export interface Plate {
    items: LayoutItem[];
}

export const generateLayout = (
    tags: BatchTag[],
    bedWidth: number,
    bedHeight: number,
    tagSizes: TagSize[],
    margin: number = 5,
): Plate[] => {
    const plates: Plate[] = [];
    if (tags.length === 0) return plates;

    const usableWidth = bedWidth - margin * 2;
    const usableHeight = bedHeight - margin * 2;

    const normalizedSizes = tags.map((_, index) => {
        const size = tagSizes[index] || {
            width: usableWidth,
            height: usableHeight,
        };
        return {
            width: Math.min(size.width, usableWidth),
            height: Math.min(size.height, usableHeight),
        };
    });

    const plateRows: Array<Array<Array<LayoutItem>>> = [];
    let currentPlateRows: Array<Array<LayoutItem>> = [];
    let currentRow: LayoutItem[] = [];
    let currentRowWidth = 0;
    let currentRowHeight = 0;
    let usedHeight = 0;

    const flushRow = () => {
        if (currentRow.length === 0) return;

        const rowHeight = currentRowHeight;
        const needsNewPlate =
            currentPlateRows.length > 0
                ? usedHeight + margin + rowHeight > usableHeight
                : rowHeight > usableHeight;

        if (needsNewPlate) {
            plateRows.push(currentPlateRows);
            currentPlateRows = [];
            usedHeight = 0;
        }

        currentPlateRows.push(currentRow);
        usedHeight =
            currentPlateRows.length === 1
                ? rowHeight
                : usedHeight + margin + rowHeight;

        currentRow = [];
        currentRowWidth = 0;
        currentRowHeight = 0;
    };

    tags.forEach((tag, index) => {
        const size = normalizedSizes[index];
        const itemWidth = size.width;
        const itemHeight = size.height;

        const projectedWidth =
            currentRow.length === 0
                ? itemWidth
                : currentRowWidth + margin + itemWidth;

        if (currentRow.length > 0 && projectedWidth > usableWidth) {
            flushRow();
        }

        currentRow.push({
            tag,
            x: 0,
            y: 0,
            width: itemWidth,
            height: itemHeight,
        });
        currentRowWidth =
            currentRow.length === 1
                ? itemWidth
                : currentRowWidth + margin + itemWidth;
        currentRowHeight = Math.max(currentRowHeight, itemHeight);

        const nextSize = normalizedSizes[index + 1];
        const nextProjectedWidth = nextSize
            ? currentRowWidth + margin + nextSize.width
            : 0;

        if (!nextSize || nextProjectedWidth > usableWidth) {
            flushRow();
        }
    });

    if (currentPlateRows.length > 0) {
        plateRows.push(currentPlateRows);
    }

    plateRows.forEach((rows) => {
        const items: LayoutItem[] = [];
        const totalHeight =
            rows.reduce((sum, row) => sum + row[0].height, 0) +
            Math.max(0, rows.length - 1) * margin;
        let cursorY = totalHeight / 2;

        rows.forEach((row, rowIndex) => {
            const rowHeight = row[0].height;
            const rowWidth =
                row.reduce((sum, item) => sum + item.width, 0) +
                Math.max(0, row.length - 1) * margin;
            let cursorX = -rowWidth / 2;
            const centeredY = cursorY - rowHeight / 2;

            row.forEach((item, itemIndex) => {
                const x = cursorX + item.width / 2;
                items.push({
                    tag: item.tag,
                    x,
                    y: centeredY,
                    width: item.width,
                    height: item.height,
                });
                cursorX += item.width;
                if (itemIndex < row.length - 1) {
                    cursorX += margin;
                }
            });

            if (rowIndex < rows.length - 1) {
                cursorY -= rowHeight + margin;
            }
        });

        plates.push({ items });
    });

    return plates;
};

export const estimateTagSize = (tag: BatchTag, state: AppState): TagSize => {
    const padding = state.shape.padding || 0;
    const lineSpacing = state.lineSpacing || 0;
    const lines = tag.lines?.length
        ? tag.lines
        : state.lines.map((line) => line.text);

    let maxTextWidth = 0;
    let totalTextHeight = 0;

    lines.forEach((text, index) => {
        const lineState = state.lines[index];
        if (!lineState) return;

        const textLength =
            typeof text === "string" ? text.length : String(text || "").length;
        const lineWidth = textLength * (lineState.size || 10) * 0.7;
        const lineHeight = (lineState.size || 10) * 1.1;
        maxTextWidth = Math.max(maxTextWidth, lineWidth);
        totalTextHeight += lineHeight;
    });

    if (lines.length > 1) {
        totalTextHeight += Math.max(0, lines.length - 1) * lineSpacing;
    }

    const holeSpace = state.laceHole.enabled
        ? state.laceHole.topMargin + state.laceHole.height
        : 0;

    let width = Math.max(state.shape.width, maxTextWidth + padding * 2);
    let height = Math.max(
        state.shape.height,
        totalTextHeight + padding * 2 + holeSpace,
    );

    if (state.laceHole.enabled && state.laceHole.type === "default") {
        width = Math.max(width, state.laceHole.width + padding * 2);
    }

    if (state.laceHole.enabled && state.laceHole.type === "loop") {
        width = Math.max(width, state.laceHole.width + padding * 2 + 8);
    }

    return { width, height };
};
