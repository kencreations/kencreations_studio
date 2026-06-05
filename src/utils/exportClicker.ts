import * as THREE from "three";
import JSZip from "jszip";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export function exportClickerSTL(
    baseMesh: THREE.Mesh | null,
    hookMesh: THREE.Mesh | null,
    coverMesh: THREE.Mesh | null = null,
    filename: string = "fidget_clicker.stl"
) {
    const tempGroup = new THREE.Group();

    if (baseMesh) {
        const baseCloned = new THREE.Mesh(baseMesh.geometry.clone(), baseMesh.material);
        baseCloned.geometry.applyMatrix4(baseMesh.matrixWorld);
        tempGroup.add(baseCloned);
    }

    if (hookMesh) {
        const hookCloned = new THREE.Mesh(hookMesh.geometry.clone(), hookMesh.material);
        hookCloned.geometry.applyMatrix4(hookMesh.matrixWorld);
        tempGroup.add(hookCloned);
    }

    if (coverMesh) {
        const coverCloned = new THREE.Mesh(coverMesh.geometry.clone(), coverMesh.material);
        coverCloned.geometry.applyMatrix4(coverMesh.matrixWorld);
        tempGroup.add(coverCloned);
    }

    const exporter = new STLExporter();
    const result = exporter.parse(tempGroup, { binary: true });
    const blob = new Blob([result], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

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

export async function exportClicker3MF(
    baseMesh: THREE.Mesh | null,
    hookMesh: THREE.Mesh | null,
    coverMesh: THREE.Mesh | null = null,
    filename: string = "fidget_clicker.3mf"
) {
    const processedMeshes: THREE.Mesh[] = [];

    if (baseMesh) {
        const baseCloned = new THREE.Mesh(baseMesh.geometry.clone(), baseMesh.material);
        baseCloned.geometry.applyMatrix4(baseMesh.matrixWorld);
        baseCloned.matrixWorld.identity();
        processedMeshes.push(baseCloned);
    }

    if (hookMesh) {
        const hookCloned = new THREE.Mesh(hookMesh.geometry.clone(), hookMesh.material);
        hookCloned.geometry.applyMatrix4(hookMesh.matrixWorld);
        hookCloned.matrixWorld.identity();
        processedMeshes.push(hookCloned);
    }

    if (coverMesh) {
        const coverCloned = new THREE.Mesh(coverMesh.geometry.clone(), coverMesh.material);
        coverCloned.geometry.applyMatrix4(coverMesh.matrixWorld);
        coverCloned.matrixWorld.identity();
        processedMeshes.push(coverCloned);
    }

    if (processedMeshes.length === 0) return;

    // Collect distinct colors from processed meshes
    const uniqueColors: string[] = [];
    processedMeshes.forEach((mesh) => {
        let colorHex = "#FFFFFF";
        if (mesh.material) {
            const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            if ((material as any).color) {
                colorHex = "#" + (material as any).color.getHexString().toUpperCase();
            }
        }
        const colorWithAlpha = colorHex + "FF";
        if (!uniqueColors.includes(colorWithAlpha)) {
            uniqueColors.push(colorWithAlpha);
        }
    });

    let resourcesXml = `    <m:colorgroup id="1">\n`;
    uniqueColors.forEach((color) => {
        resourcesXml += `      <m:color color="${color}" />\n`;
    });
    resourcesXml += `    </m:colorgroup>\n`;

    let nextObjectId = 2; // ID 1 is for colorgroup
    let componentsXml = `  <object id="9999" type="model">\n    <components>\n`;

    processedMeshes.forEach((mesh) => {
        const geometry = mesh.geometry;
        if (!geometry || !geometry.attributes.position) return;

        const positionAttr = geometry.attributes.position;
        const indexAttr = geometry.index;
        const positionVector = new THREE.Vector3();

        let meshColor = "#FFFFFF";
        if (mesh.material) {
            const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            if ((material as any).color) {
                meshColor = "#" + (material as any).color.getHexString().toUpperCase();
            }
        }
        meshColor += "FF";

        let objectXml = `    <object id="${nextObjectId}" type="model" pid="1" pindex="${uniqueColors.indexOf(meshColor)}">\n      <mesh>\n        <vertices>\n`;

        for (let i = 0; i < positionAttr.count; i++) {
            positionVector.fromBufferAttribute(positionAttr, i);
            positionVector.applyMatrix4(mesh.matrixWorld);
            objectXml += `          <vertex x="${positionVector.x.toFixed(5)}" y="${positionVector.y.toFixed(5)}" z="${positionVector.z.toFixed(5)}"/>\n`;
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
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
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
