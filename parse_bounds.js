import fs from 'fs';
['01', '02', '03'].forEach(num => {
    const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_' + num + '/3D/3dmodel.model', 'utf8');
    const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
    let match;
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    while(match = regex.exec(xml)) {
        let x = parseFloat(match[1]);
        let y = parseFloat(match[2]);
        if(x<minX) minX=x;
        if(x>maxX) maxX=x;
        if(y<minY) minY=y;
        if(y>maxY) maxY=y;
    }
    console.log('Model ' + num + ' Bounds:', {minX, maxX, minY, maxY, w: maxX-minX, h: maxY-minY});
});
