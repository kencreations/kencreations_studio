const fs = require('fs');

function connectEdges(edges) {
    const loops = [];
    let remaining = [...edges];
    
    while (remaining.length > 0) {
        const loop = [];
        let currentEdge = remaining.pop();
        loop.push(currentEdge.p1);
        loop.push(currentEdge.p2);
        
        while (true) {
            const lastPt = loop[loop.length - 1];
            let foundIndex = -1;
            let reversed = false;
            
            for (let i = 0; i < remaining.length; i++) {
                const e = remaining[i];
                if (Math.hypot(e.p1.x - lastPt.x, e.p1.y - lastPt.y) < 0.001) {
                    foundIndex = i;
                    reversed = false;
                    break;
                }
                if (Math.hypot(e.p2.x - lastPt.x, e.p2.y - lastPt.y) < 0.001) {
                    foundIndex = i;
                    reversed = true;
                    break;
                }
            }
            
            if (foundIndex !== -1) {
                const nextEdge = remaining.splice(foundIndex, 1)[0];
                loop.push(reversed ? nextEdge.p1 : nextEdge.p2);
            } else {
                break;
            }
        }
        
        const optimizedLoop = [];
        for (let i = 0; i < loop.length; i++) {
            if (i === 0 || i === loop.length - 1) {
                optimizedLoop.push(loop[i]);
            } else {
                const prev = loop[i - 1];
                const curr = loop[i];
                const next = loop[i + 1];
                const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
                const v2 = { x: next.x - curr.x, y: next.y - curr.y };
                const len1 = Math.hypot(v1.x, v1.y);
                const len2 = Math.hypot(v2.x, v2.y);
                if (len1 > 0 && len2 > 0) {
                    const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
                    if (dot < 0.9999) {
                        optimizedLoop.push(curr);
                    }
                } else {
                    optimizedLoop.push(curr);
                }
            }
        }
        
        loops.push(optimizedLoop);
    }
    
    loops.sort((a, b) => {
        let minXa = 1e9, maxXa = -1e9, minYa = 1e9, maxYa = -1e9;
        a.forEach(p => { minXa = Math.min(minXa, p.x); maxXa = Math.max(maxXa, p.x); minYa = Math.min(minYa, p.y); maxYa = Math.max(maxYa, p.y); });
        let minXb = 1e9, maxXb = -1e9, minYb = 1e9, maxYb = -1e9;
        b.forEach(p => { minXb = Math.min(minXb, p.x); maxXb = Math.max(maxXb, p.x); minYb = Math.min(minYb, p.y); maxYb = Math.max(maxYb, p.y); });
        return ((maxXb - minXb) * (maxYb - minYb)) - ((maxXa - minXa) * (maxYa - minYa));
    });
    
    return loops;
}

const baseEdges = JSON.parse(fs.readFileSync('base_edges.json'));
const frameEdges = JSON.parse(fs.readFileSync('frame_edges.json'));

const baseLoops = connectEdges(baseEdges);
const frameLoops = connectEdges(frameEdges);

console.log('Base loops:', baseLoops.length, 'points in main loop:', baseLoops[0].length);
console.log('Frame loops:', frameLoops.length, 'points in main loop:', frameLoops[0].length);
if (frameLoops.length > 1) console.log('points in frame hole:', frameLoops[1].length);

function generateShapeCode(name, loops) {
    let code = "export function " + name + "() {\n  const shape = new THREE.Shape();\n";
    const outer = loops[0];
    code += "  shape.moveTo(" + outer[0].x.toFixed(4) + ", " + outer[0].y.toFixed(4) + ");\n";
    for (let i = 1; i < outer.length; i++) {
        code += "  shape.lineTo(" + outer[i].x.toFixed(4) + ", " + outer[i].y.toFixed(4) + ");\n";
    }
    
    for (let j = 1; j < loops.length; j++) {
        const hole = loops[j];
        if (hole.length < 3) continue;
        code += "  const hole" + j + " = new THREE.Path();\n";
        code += "  hole" + j + ".moveTo(" + hole[0].x.toFixed(4) + ", " + hole[0].y.toFixed(4) + ");\n";
        for (let i = 1; i < hole.length; i++) {
            code += "  hole" + j + ".lineTo(" + hole[i].x.toFixed(4) + ", " + hole[i].y.toFixed(4) + ");\n";
        }
        code += "  shape.holes.push(hole" + j + ");\n";
    }
    code += "  return shape;\n}\n";
    return code;
}

const fileContent = "import * as THREE from 'three';\n\n" + generateShapeCode('createBaseShape', baseLoops) + generateShapeCode('createFrameShape', frameLoops);
fs.writeFileSync('src/utils/GeometryShapes.ts', fileContent);
