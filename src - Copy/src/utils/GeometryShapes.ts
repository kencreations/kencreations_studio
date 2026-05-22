import * as THREE from 'three';

// Reusable rounded rectangle generator for the outer profile (CCW)
function createRoundedRectProfile(shape: THREE.Shape | THREE.Path, hw: number, hh: number, rs: number) {
    if (rs <= 0) {
        shape.moveTo(-hw, hh);
        shape.lineTo(-hw, -hh);
        shape.lineTo(hw, -hh);
        shape.lineTo(hw, hh);
        return;
    }
    // Start at top-left, going DOWN (CCW)
    shape.moveTo(-hw, hh - rs);
    shape.lineTo(-hw, -hh + rs);
    shape.absarc(-hw + rs, -hh + rs, rs, -Math.PI, -Math.PI / 2, false);
    shape.lineTo(hw - rs, -hh);
    shape.absarc(hw - rs, -hh + rs, rs, -Math.PI / 2, 0, false);
    shape.lineTo(hw, hh - rs);
    shape.absarc(hw - rs, hh - rs, rs, 0, Math.PI / 2, false);
    shape.lineTo(-hw + rs, hh);
    shape.absarc(-hw + rs, hh - rs, rs, Math.PI / 2, Math.PI, false);
    shape.closePath();
}

export function createDynamicBaseShape(w: number, h: number, cornerR: number) {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    const rs = Math.min(cornerR, hw, hh);

    // CCW Path
    shape.moveTo(-hw, hh - rs);
    shape.lineTo(-hw, -hh + rs);
    shape.absarc(-hw + rs, -hh + rs, rs, -Math.PI, -Math.PI / 2, false);
    shape.lineTo(hw - rs, -hh);
    shape.absarc(hw - rs, -hh + rs, rs, -Math.PI / 2, 0, false);
    shape.lineTo(hw, hh - rs);
    shape.absarc(hw - rs, hh - rs, rs, 0, Math.PI / 2, false);
    
    // Tab points (Left to Right)
    const tabPoints = [
        [-18.3211, 0.0000],
        [-17.3456, 0.0961],
        [-16.4077, 0.3806],
        [-15.5432, 0.8427],
        [-14.7855, 1.4645],
        [-8.9645, 7.2855],
        [-8.2068, 7.9074],
        [-7.3423, 8.3694],
        [-6.4044, 8.6539],
        [-5.4289, 8.7500],
        [5.4289, 8.7500],
        [6.4044, 8.6539],
        [7.3423, 8.3694],
        [8.2068, 7.9074],
        [8.9645, 7.2855],
        [14.7855, 1.4645],
        [15.5432, 0.8427],
        [16.4077, 0.3806],
        [17.3456, 0.0961],
        [18.3211, 0.0000]
    ];

    // Connect right edge to right-side of tab
    shape.lineTo(tabPoints[tabPoints.length - 1][0], hh);
    
    // Trace tab backwards (Right to Left) for CCW
    for (let i = tabPoints.length - 1; i >= 0; i--) {
        shape.lineTo(tabPoints[i][0], hh + tabPoints[i][1]);
    }

    // Connect to left corner arc
    shape.lineTo(-hw + rs, hh);
    shape.absarc(-hw + rs, hh - rs, rs, Math.PI / 2, Math.PI, false);
    shape.closePath();
    
    // Lanyard hole (CW)
    const holeLanyard = new THREE.Path();
    const lhw = 15 / 2;
    const lhh = 3.5 / 2;
    const lhy = hh + 5;
    const lrs = 1.75;
    
    holeLanyard.moveTo(-lhw + lrs, lhy + lhh);
    holeLanyard.lineTo(lhw - lrs, lhy + lhh);
    holeLanyard.absarc(lhw - lrs, lhy + lhh - lrs, lrs, Math.PI/2, 0, true);
    holeLanyard.lineTo(lhw, lhy - lhh + lrs);
    holeLanyard.absarc(lhw - lrs, lhy - lhh + lrs, lrs, 0, -Math.PI/2, true);
    holeLanyard.lineTo(-lhw + lrs, lhy - lhh);
    holeLanyard.absarc(-lhw + lrs, lhy - lhh + lrs, lrs, -Math.PI/2, -Math.PI, true);
    holeLanyard.lineTo(-lhw, lhy + lhh - lrs);
    holeLanyard.absarc(-lhw + lrs, lhy + lhh - lrs, lrs, -Math.PI, -Math.PI*1.5, true);
    holeLanyard.closePath();

    shape.holes.push(holeLanyard);

    return shape;
}

export function createDynamicFrameShape(w: number, h: number, cornerR: number, sideMargin: number, topBandH: number, botBandH: number, innerRadius: number) {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const hh = h / 2;
    const rs = Math.min(cornerR, hw, hh);

    // Frame is just the base without the tab! (Outer CCW)
    createRoundedRectProfile(shape, hw, hh, rs);

    // Inner Hole for the White Panel (Inner CW)
    const innerW = Math.max(1, w - sideMargin * 2);
    const innerH = Math.max(1, h - topBandH - botBandH);
    const innerR = Math.max(0, innerRadius);
    const holeOffsetY = (botBandH - topBandH) / 2;

    const hole = new THREE.Path();
    const ihw = innerW / 2;
    const ihh = innerH / 2;
    const irs = Math.min(innerR, ihw, ihh);
    
    if (irs <= 0) {
        hole.moveTo(-ihw, holeOffsetY + ihh);
        hole.lineTo(ihw, holeOffsetY + ihh);
        hole.lineTo(ihw, holeOffsetY - ihh);
        hole.lineTo(-ihw, holeOffsetY - ihh);
    } else {
        hole.moveTo(-ihw + irs, holeOffsetY + ihh);
        hole.lineTo(ihw - irs, holeOffsetY + ihh);
        hole.absarc(ihw - irs, holeOffsetY + ihh - irs, irs, Math.PI / 2, 0, true);
        hole.lineTo(ihw, holeOffsetY - ihh + irs);
        hole.absarc(ihw - irs, holeOffsetY - ihh + irs, irs, 0, -Math.PI / 2, true);
        hole.lineTo(-ihw + irs, holeOffsetY - ihh);
        hole.absarc(-ihw + irs, holeOffsetY - ihh + irs, irs, -Math.PI / 2, -Math.PI, true);
        hole.lineTo(-ihw, holeOffsetY + ihh - irs);
        hole.absarc(-ihw + irs, holeOffsetY + ihh - irs, irs, -Math.PI, -Math.PI * 1.5, true);
    }
    hole.closePath();

    shape.holes.push(hole);

    return shape;
}
