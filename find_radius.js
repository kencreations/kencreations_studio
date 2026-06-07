import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_01/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let vertices = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    vertices.push({x,y});
}

// Top right corner should be near x=70, y=70
// Let's find the maximum x for y near 70.
let topEdgeYs = vertices.filter(v => v.y > 69.9).map(v => v.x);
console.log('Top edge max X:', Math.max(...topEdgeYs));

let rightEdgeXs = vertices.filter(v => v.x > 69.9).map(v => v.y);
console.log('Right edge max Y:', Math.max(...rightEdgeXs));

