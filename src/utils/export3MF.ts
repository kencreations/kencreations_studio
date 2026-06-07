import * as THREE from "three";
import JSZip from "jszip";

export async function export3MF(
    group: THREE.Group,
    filename: string = "export.3mf",
) {
    group.updateMatrixWorld(true);

    const exportRoots = group.children.filter((child) =>
        hasMeshDescendant(child),
    );
    const units = exportRoots.length > 0 ? exportRoots : [group];

    const unitEntries = units
        .map((root) => {
            root.updateMatrixWorld(true);

            const meshes: THREE.Mesh[] = [];
            root.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    meshes.push(child as THREE.Mesh);
                }
            });

            return {
                root,
                meshes,
                transform: matrixTo3mfTransform(root.matrixWorld),
                inverseRootMatrix: new THREE.Matrix4()
                    .copy(root.matrixWorld)
                    .invert(),
            };
        })
        .filter((unit) => unit.meshes.length > 0);

    if (unitEntries.length === 0) return;

    const uniqueColors: string[] = [];
    unitEntries.forEach(({ meshes }) => {
        meshes.forEach((mesh) => {
            const colorWithAlpha = getMeshColor(mesh);
            if (!uniqueColors.includes(colorWithAlpha)) {
                uniqueColors.push(colorWithAlpha);
            }
        });
    });

    const meshColorIndex = new Map<THREE.Mesh, number>();
    unitEntries.forEach(({ meshes }) => {
        meshes.forEach((mesh) => {
            meshColorIndex.set(mesh, uniqueColors.indexOf(getMeshColor(mesh)));
        });
    });

    let resourcesXml = `    <m:colorgroup id="1">\n`;
    uniqueColors.forEach((color) => {
        resourcesXml += `      <m:color color="${color}" />\n`;
    });
    resourcesXml += `    </m:colorgroup>\n`;

    let nextObjectId = 2; // ID 1 is for colorgroup
    let buildXml = `  <build>\n`;

    unitEntries.forEach(({ meshes, transform, inverseRootMatrix }) => {
        const unitObjectId = nextObjectId++;
        
        let objectXml = `    <object id="${unitObjectId}" type="model">\n      <mesh>\n        <vertices>\n`;
        let trianglesXml = `        <triangles>\n`;
        
        let vertexOffset = 0;

        meshes.forEach((mesh) => {
            const geometry = mesh.geometry;
            if (!geometry || !geometry.attributes.position) return;

            const positionAttr = geometry.attributes.position;
            const indexAttr = geometry.index;
            const positionVector = new THREE.Vector3();
            const localMatrix = new THREE.Matrix4().multiplyMatrices(
                inverseRootMatrix,
                mesh.matrixWorld,
            );
            const colorIndex = meshColorIndex.get(mesh) ?? 0;

            for (let i = 0; i < positionAttr.count; i++) {
                positionVector.fromBufferAttribute(positionAttr, i);
                positionVector.applyMatrix4(localMatrix);
                objectXml += `          <vertex x="${positionVector.x.toFixed(5)}" y="${positionVector.y.toFixed(5)}" z="${positionVector.z.toFixed(5)}"/>\n`;
            }

            if (indexAttr) {
                const indices = indexAttr.array;
                for (let i = 0; i < indices.length; i += 3) {
                    trianglesXml += `          <triangle v1="${indices[i] + vertexOffset}" v2="${indices[i + 1] + vertexOffset}" v3="${indices[i + 2] + vertexOffset}" pid="1" p1="${colorIndex}"/>\n`;
                }
            } else {
                for (let i = 0; i < positionAttr.count; i += 3) {
                    trianglesXml += `          <triangle v1="${i + vertexOffset}" v2="${i + 1 + vertexOffset}" v3="${i + 2 + vertexOffset}" pid="1" p1="${colorIndex}"/>\n`;
                }
            }

            vertexOffset += positionAttr.count;
        });

        objectXml += `        </vertices>\n${trianglesXml}        </triangles>\n      </mesh>\n    </object>\n`;
        resourcesXml += objectXml;
        buildXml += `    <item objectid="${unitObjectId}" transform="${transform}" />\n`;
    });

    buildXml += `  </build>\n`;

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

function hasMeshDescendant(object: THREE.Object3D): boolean {
    let found = false;
    object.traverse((child) => {
        if (found) return;
        if ((child as THREE.Mesh).isMesh) {
            found = true;
        }
    });
    return found;
}

function matrixTo3mfTransform(matrix: THREE.Matrix4): string {
    const elements = matrix.elements;
    return [
        elements[0],
        elements[4],
        elements[8],
        elements[12],
        elements[1],
        elements[5],
        elements[9],
        elements[13],
        elements[2],
        elements[6],
        elements[10],
        elements[14],
    ]
        .map((value) => Number(value).toFixed(6))
        .join(" ");
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
