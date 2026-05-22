import * as THREE from "three";
import JSZip from "jszip";

export async function export3MF(
    group: THREE.Group,
    filename: string = "export.3mf",
) {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            meshes.push(child as THREE.Mesh);
        }
    });

    if (meshes.length === 0) return;

    const uniqueColors: string[] = [];
    meshes.forEach((mesh) => {
        const colorHex = getMeshColor(mesh);
        if (!uniqueColors.includes(colorHex)) {
            uniqueColors.push(colorHex);
        }
    });

    let resourcesXml = `    <basematerials id="1">\n`;
    uniqueColors.forEach((color, index) => {
        resourcesXml += `      <base name="Filament Color ${index + 1}" displaycolor="${color}" />\n`;
    });
    resourcesXml += `    </basematerials>\n`;

    let nextObjectId = 2;
    let componentsXml = `  <object id="9999" type="model" name="KenCreations_Studio_Model">\n    <components>\n`;

    meshes.forEach((mesh) => {
        const geometry = mesh.geometry;
        if (!geometry || !geometry.attributes.position) return;

        const positionAttr = geometry.attributes.position;
        const indexAttr = geometry.index;
        const positionVector = new THREE.Vector3();

        const pindex = uniqueColors.indexOf(getMeshColor(mesh));
        const meshName = mesh.name || `Part_${nextObjectId}`;

        let objectXml = `    <object id="${nextObjectId}" type="model" name="${meshName}" pid="1" pindex="${pindex}">\n      <mesh>\n        <vertices>\n`;

        for (let i = 0; i < positionAttr.count; i++) {
            positionVector.fromBufferAttribute(positionAttr, i);
            positionVector.applyMatrix4(mesh.matrixWorld);

            // Strictly rounding to 4 decimal places prevents micro-layer bleeding
            objectXml += `          <vertex x="${positionVector.x.toFixed(4)}" y="${positionVector.y.toFixed(4)}" z="${positionVector.z.toFixed(4)}"/>\n`;
        }
        objectXml += `        </vertices>\n        <triangles>\n`;

        if (indexAttr) {
            const indices = indexAttr.array;
            for (let i = 0; i < indices.length; i += 3) {
                objectXml += `          <triangle v1="${indices[i]}" v2="${indices[i + 1]}" v3="${indices[i + 2]}"/>\n`;
            }
        } else {
            for (let i = 0; i < positionAttr.count; i += 3) {
                objectXml += `          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>\n`;
            }
        }

        objectXml += `        </triangles>\n      </mesh>\n    </object>\n`;
        resourcesXml += objectXml;

        componentsXml += `      <component objectid="${nextObjectId}" transform="1 0 0 0 1 0 0 0 1 0 0 0" />\n`;
        nextObjectId++;
    });

    componentsXml += `    </components>\n  </object>\n`;
    resourcesXml += componentsXml;

    let buildXml = `  <build>\n    <item objectid="9999" transform="1 0 0 0 1 0 0 0 1 0 0 0" />\n  </build>\n`;

    const modelXml = `<?xml version="1.0" encoding="utf-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
${resourcesXml}  </resources>
${buildXml}</model>`;

    const relsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels")?.file(".rels", relsXml);
    zip.folder("3D")?.file("3dmodel.model", modelXml);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);

    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

function getMeshColor(mesh: THREE.Mesh): string {
    let colorHex = "#FFFFFF";
    if (mesh.material) {
        const material = Array.isArray(mesh.material)
            ? mesh.material[0]
            : mesh.material;
        if ((material as any).color) {
            colorHex =
                "#" + (material as any).color.getHexString().toUpperCase();
        }
    }
    return colorHex + "FF";
}
