import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_02/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
let vertices = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    vertices.push({x,y});
    if(x<minX) minX=x;
    if(x>maxX) maxX=x;
    if(y<minY) minY=y;
    if(y>maxY) maxY=y;
}
console.log('Bounds:', {minX, maxX, minY, maxY, w: maxX-minX, h: maxY-minY});
