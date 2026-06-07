const fs = require('fs');
let code = fs.readFileSync('src/components/Scene4.tsx', 'utf8');

// 1. Rename to Generator4/Scene4
code = code.replace(/Generator3/g, 'Generator4').replace(/Scene3/g, 'Scene4');

// 2. Replace createBaseShape definition
const newShapeFunc = `function createBaseShape(w: number, h: number, r: number, modelType: number = 0) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;

    if (modelType === 0) {
        shape.moveTo(x, y + r);
        shape.lineTo(x, y + h - r);
        shape.absarc(x + r, y + h - r, r, Math.PI, Math.PI / 2, true);
        shape.lineTo(x + w - r, y + h);
        shape.absarc(x + w - r, y + h - r, r, Math.PI / 2, 0, true);
        shape.lineTo(x + w, y + r);
        shape.absarc(x + w - r, y + r, r, 0, -Math.PI / 2, true);
        shape.lineTo(x + r, y);
        shape.absarc(x + r, y + r, r, -Math.PI / 2, -Math.PI, true);
    } else if (modelType === 1) {
        const segSize = 8;
        const countW = Math.max(1, Math.floor(w / segSize));
        const countH = Math.max(1, Math.floor(h / segSize));
        const actualSegW = w / countW;
        const actualSegH = h / countH;
        
        shape.moveTo(x, y);
        for(let i=0; i<countW; i++) {
            const curX = x + i*actualSegW;
            shape.quadraticCurveTo(curX + actualSegW/2, y - actualSegW/1.5, curX + actualSegW, y);
        }
        for(let i=0; i<countH; i++) {
            const curY = y + i*actualSegH;
            shape.quadraticCurveTo(x + w + actualSegH/1.5, curY + actualSegH/2, x + w, curY + actualSegH);
        }
        for(let i=0; i<countW; i++) {
            const curX = x + w - i*actualSegW;
            shape.quadraticCurveTo(curX - actualSegW/2, y + h + actualSegW/1.5, curX - actualSegW, y + h);
        }
        for(let i=0; i<countH; i++) {
            const curY = y + h - i*actualSegH;
            shape.quadraticCurveTo(x - actualSegH/1.5, curY - actualSegH/2, x, curY - actualSegH);
        }
    } else if (modelType === 2) {
        const segSize = 16;
        const countW = Math.max(1, Math.floor(w / segSize));
        const countH = Math.max(1, Math.floor(h / segSize));
        const actualSegW = w / countW;
        const actualSegH = h / countH;
        
        shape.moveTo(x, y);
        for(let i=0; i<countW; i++) {
            const curX = x + i*actualSegW;
            shape.quadraticCurveTo(curX + actualSegW/2, y + actualSegW/2, curX + actualSegW, y);
        }
        for(let i=0; i<countH; i++) {
            const curY = y + i*actualSegH;
            shape.quadraticCurveTo(x + w - actualSegH/2, curY + actualSegH/2, x + w, curY + actualSegH);
        }
        for(let i=0; i<countW; i++) {
            const curX = x + w - i*actualSegW;
            shape.quadraticCurveTo(curX - actualSegW/2, y + h - actualSegW/2, curX - actualSegW, y + h);
        }
        for(let i=0; i<countH; i++) {
            const curY = y + h - i*actualSegH;
            shape.quadraticCurveTo(x + actualSegH/2, curY - actualSegH/2, x, curY - actualSegH);
        }
    }

    return shape;
}`;
code = code.replace(/function createBaseShape[\s\S]*?return shape;\r?\n}/, newShapeFunc);

// 3. Update createBaseShape calls
code = code.replace(/createBaseShape\(calculatedW, calculatedH, s\.shape\.cornerRadius\)/g, 'createBaseShape(calculatedW, calculatedH, s.shape.cornerRadius, s.shape.modelType || 0)');
code = code.replace(/createBaseShape\(innerW, innerH, innerR\)/g, 'createBaseShape(innerW, innerH, innerR, s.shape.modelType || 0)');
code = code.replace(/createBaseShape\(bw, bh, state\.shape\.cornerRadius\)/g, 'createBaseShape(bw, bh, state.shape.cornerRadius, state.shape.modelType || 0)');

// 4. Update text alignment (remove left shift)
const textPosOld = `                // Shift texts horizontally to the right to make beautiful balanced space for the left-aligned slot!
                const textXOffset = s.laceHole.enabled ? holeSpaceWidth / 2.5 : 0;`;
const textPosNew = `                const textXOffset = 0; // perfectly centered`;
code = code.replace(textPosOld, textPosNew);

// 5. Replace Left Keyhole with Top Handle
const holeOldRegex = /\/\/ 3\. Create Left Keyhole Slot[\s\S]*?\/\/ 4\. Create Raised Outer Border Frame/;
const handleNew = `// 3. Create Top Trapezoidal Handle
                if (s.laceHole.enabled) {
                    const handleW = s.laceHole.width * 3; // Approx 15
                    const handleH = 8;
                    const hx = 0; // Centered
                    const hy = calculatedH / 2; // Top edge
                    
                    const handleShape = new THREE.Shape();
                    // Trapezoid
                    handleShape.moveTo(-handleW/2, 0);
                    handleShape.lineTo(handleW/2, 0);
                    handleShape.lineTo(handleW/3, handleH);
                    handleShape.lineTo(-handleW/3, handleH);
                    handleShape.lineTo(-handleW/2, 0);

                    const handleGeo = new THREE.ExtrudeGeometry(handleShape, {
                        depth: s.shape.baseThickness,
                        curveSegments: 16,
                        bevelEnabled: false,
                    });
                    handleGeo.translate(hx, hy - 1, -s.shape.baseThickness / 2);
                    
                    const holeW = handleW * 0.4;
                    const holeH = handleH * 0.4;
                    
                    const holeShape = new THREE.Shape();
                    holeShape.absarc(-holeW/2, handleH/2, holeH/2, Math.PI/2, Math.PI*1.5, false);
                    holeShape.absarc(holeW/2, handleH/2, holeH/2, Math.PI*1.5, Math.PI/2, false);
                    holeShape.lineTo(-holeW/2, handleH/2 + holeH/2);
                    
                    const holeGeo = new THREE.ExtrudeGeometry(holeShape, {
                        depth: s.shape.baseThickness * 10,
                        curveSegments: 16,
                        bevelEnabled: false,
                    });
                    holeGeo.translate(hx, hy - 1, -s.shape.baseThickness * 5);
                    
                    holeBrush = new Brush(holeGeo);
                    holeBrush.updateMatrixWorld();
                    
                    const handleBrush = new Brush(handleGeo);
                    handleBrush.updateMatrixWorld();
                    
                    // Add handle to base, subtract hole from base
                    baseBrush = evaluator.evaluate(baseBrush, handleBrush, ADDITION);
                    baseBrush = evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
                }

                // 4. Create Raised Outer Border Frame`;
code = code.replace(holeOldRegex, handleNew);

// 6. Update Border brush union (border is just outerFrame, don't union with handle)
const borderOld = `                    // Union frame with grommet if grommet exists
                    if (borderBrush) {
                        borderBrush = evaluator.evaluate(borderBrush, outerFrameBrush, ADDITION);
                    } else {
                        borderBrush = outerFrameBrush;
                    }`;
const borderNew = `                    borderBrush = outerFrameBrush;`;
code = code.replace(borderOld, borderNew);

fs.writeFileSync('src/components/Scene4.tsx', code);
