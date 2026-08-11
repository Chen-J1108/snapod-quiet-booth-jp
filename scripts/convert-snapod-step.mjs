import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import occtImport from "occt-import-js";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const defaultSource = "D:/桌面/new project/杭州嘉兴静音仓SNAPOD/杭州嘉兴静音仓SNAPOD/002 SNAPOD 左开门（可拆钢板+加门樘+底部通风）/Snapod(小号)静音仓-W1000D1000H2300-总装 - 门樘-固定桌板-常规线路-可拆侧板.stp";
const sourcePath = path.resolve(process.argv[2] || process.env.SNAPOD_STEP_SOURCE || defaultSource);
const modelDir = path.join(projectRoot, "public", "assets", "models");
const tempDir = path.join(projectRoot, ".tmp", "cad-conversion");
const rawPath = path.join(tempDir, "snapod-assembly.raw.glb");
const outputPath = path.join(modelDir, "snapod-assembly.glb");
const metadataPath = path.join(modelDir, "snapod-assembly.meta.json");

const GROUPS = [
  { id: "base", label: "底座・換気", childIndexes: [0, 14, 20, 21, 23], explode: [0, -0.62, 0] },
  { id: "frame", label: "コーナーフレーム", childIndexes: [1, 2, 3, 4, 5, 6, 7, 15], explode: [0, 0, 0] },
  { id: "roof", label: "トップユニット", childIndexes: [8, 9, 10, 12, 13], explode: [0, 0.78, 0] },
  { id: "fixed-glass", label: "固定ガラス", childIndexes: [11], explode: [0.72, 0, 0] },
  { id: "door", label: "ドアユニット", childIndexes: [16], explode: [-0.82, 0, -0.06] },
  { id: "rear-wall", label: "背面吸音パネル", childIndexes: [17, 24, 25], explode: [0, 0, -0.78] },
  { id: "service-wall", label: "設備側パネル", childIndexes: [18, 19, 22], explode: [0, 0, 0.78] },
];

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(value).toString("base64")}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }).catch((error) => this.onerror?.(error));
  }
}

globalThis.FileReader ??= NodeFileReader;

function cleanText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function mappedPoint(array, index) {
  return [array[index], -array[index + 2], array[index + 1]];
}

function getBounds(meshes) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    const positions = mesh.attributes.position.array;
    for (let index = 0; index < positions.length; index += 3) {
      const point = mappedPoint(positions, index);
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], point[axis]);
        max[axis] = Math.max(max[axis], point[axis]);
      }
    }
  }
  return {
    min,
    max,
    center: max.map((value, index) => (value + min[index]) / 2),
    size: max.map((value, index) => value - min[index]),
  };
}

function dominantColor(sourceMesh) {
  if (sourceMesh.color) return sourceMesh.color;
  const weighted = new Map();
  for (const face of sourceMesh.brep_faces || []) {
    if (!face.color) continue;
    const key = face.color.map((value) => Number(value).toFixed(4)).join(",");
    weighted.set(key, (weighted.get(key) || 0) + (face.last - face.first + 1));
  }
  const best = [...weighted.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ? best.split(",").map(Number) : [0.34, 0.36, 0.37];
}

function isGlassColor(color) {
  const target = [0.1664, 0.3175, 0.5089];
  return color.reduce((distance, value, index) => distance + Math.abs(value - target[index]), 0) < 0.16;
}

function createMaterial(color, materialCache) {
  const glass = isGlassColor(color);
  const key = `${color.map((value) => value.toFixed(4)).join("-")}-${glass ? "glass" : "solid"}`;
  if (materialCache.has(key)) return materialCache.get(key);

  const renderColor = new THREE.Color(...color).convertSRGBToLinear();
  const luminance = renderColor.r * 0.2126 + renderColor.g * 0.7152 + renderColor.b * 0.0722;
  const material = glass
    ? new THREE.MeshPhysicalMaterial({
        name: "SNAPOD_Glass",
        color: renderColor,
        roughness: 0.08,
        metalness: 0,
        transmission: 0.55,
        thickness: 0.008,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshStandardMaterial({
        name: luminance < 0.08 ? "SNAPOD_BlackHardware" : `SNAPOD_CAD_${materialCache.size}`,
        color: renderColor,
        roughness: luminance < 0.2 ? 0.34 : 0.55,
        metalness: luminance < 0.2 ? 0.48 : 0.14,
        side: THREE.DoubleSide,
      });

  materialCache.set(key, material);
  return material;
}

function createMesh(sourceMesh, meshIndex, center, materialCache) {
  const geometry = new THREE.BufferGeometry();
  const sourcePositions = sourceMesh.attributes.position.array;
  const positions = new Float32Array(sourcePositions.length);
  for (let index = 0; index < sourcePositions.length; index += 3) {
    const point = mappedPoint(sourcePositions, index);
    positions[index] = point[0] - center[0];
    positions[index + 1] = point[1] - center[1];
    positions[index + 2] = point[2] - center[2];
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const sourceNormals = sourceMesh.attributes.normal?.array;
  if (sourceNormals) {
    const normals = new Float32Array(sourceNormals.length);
    for (let index = 0; index < sourceNormals.length; index += 3) {
      const normal = mappedPoint(sourceNormals, index);
      normals[index] = normal[0];
      normals[index + 1] = normal[1];
      normals[index + 2] = normal[2];
    }
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }

  const sourceIndex = sourceMesh.index.array;
  const IndexArray = Math.max(...sourceIndex) > 65535 ? Uint32Array : Uint16Array;
  geometry.setIndex(new THREE.BufferAttribute(IndexArray.from(sourceIndex), 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = createMaterial(dominantColor(sourceMesh), materialCache);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `CAD_${String(meshIndex).padStart(3, "0")}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.sourceName = cleanText(sourceMesh.name);
  mesh.userData.sourceMeshIndex = meshIndex;
  return mesh;
}

async function exportBinary(scene) {
  const exporter = new GLTFExporter();
  return exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: false,
    trs: true,
    includeCustomExtensions: true,
  });
}

async function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`STEP file not found: ${sourcePath}`);
  fs.mkdirSync(modelDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`Reading STEP: ${sourcePath}`);
  const sourceBytes = fs.readFileSync(sourcePath);
  const occt = await occtImport();
  const result = occt.ReadStepFile(sourceBytes, {
    linearUnit: "meter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.0015,
    angularDeflection: 0.35,
  });
  if (!result.success) throw new Error("OpenCascade could not triangulate the STEP assembly.");

  const assembly = result.root.children?.[0];
  if (!assembly || assembly.children.length < 26) {
    throw new Error(`Unexpected assembly hierarchy: ${assembly?.children?.length || 0} top-level children.`);
  }

  const bounds = getBounds(result.meshes);
  const materialCache = new Map();
  const scene = new THREE.Scene();
  scene.name = "SNAPOD_SPD01";
  scene.userData.source = path.basename(sourcePath);
  scene.userData.dimensionsMeters = bounds.size.map((value) => Number(value.toFixed(5)));

  const assignedChildren = new Set();
  const groupStats = [];
  for (const definition of GROUPS) {
    const group = new THREE.Group();
    group.name = `SNAPOD_${definition.id}`;
    group.userData.label = definition.label;
    group.userData.explodeOffset = definition.explode;
    let triangleCount = 0;
    let meshCount = 0;

    for (const childIndex of definition.childIndexes) {
      assignedChildren.add(childIndex);
      const sourceNode = assembly.children[childIndex];
      for (const meshIndex of sourceNode.meshes || []) {
        const sourceMesh = result.meshes[meshIndex];
        triangleCount += sourceMesh.index.array.length / 3;
        meshCount += 1;
        group.add(createMesh(sourceMesh, meshIndex, bounds.center, materialCache));
      }
    }

    groupStats.push({
      id: definition.id,
      label: definition.label,
      childIndexes: definition.childIndexes,
      explodeOffset: definition.explode,
      meshCount,
      triangleCount,
    });
    scene.add(group);
  }

  const unassigned = assembly.children
    .map((_, index) => index)
    .filter((index) => !assignedChildren.has(index));
  if (unassigned.length) throw new Error(`Unassigned top-level STEP nodes: ${unassigned.join(", ")}`);

  const totalTriangles = result.meshes.reduce((sum, mesh) => sum + mesh.index.array.length / 3, 0);
  console.log(`Triangulated ${result.meshes.length} meshes / ${Math.round(totalTriangles).toLocaleString()} triangles.`);
  const glb = await exportBinary(scene);
  fs.writeFileSync(rawPath, Buffer.from(glb));

  const gltfTransformCli = path.join(projectRoot, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
  const optimize = spawnSync(process.execPath, [
    gltfTransformCli,
    "optimize",
    rawPath,
    outputPath,
    "--compress", "meshopt",
    "--flatten", "false",
    "--join", "false",
    "--instance", "false",
    "--simplify", "false",
    "--palette", "false",
  ], { cwd: projectRoot, encoding: "utf8", stdio: "pipe" });
  if (optimize.status !== 0) {
    console.error(optimize.error);
    console.error(optimize.stdout);
    console.error(optimize.stderr);
    throw new Error("glTF optimization failed.");
  }

  const metadata = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(sourcePath),
    sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
    sourceBytes: sourceBytes.length,
    dimensionsMeters: bounds.size.map((value) => Number(value.toFixed(5))),
    sourceMeshes: result.meshes.length,
    triangles: totalTriangles,
    groups: groupStats,
    rawGlbBytes: fs.statSync(rawPath).size,
    optimizedGlbBytes: fs.statSync(outputPath).size,
    compression: "EXT_meshopt_compression",
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  console.log(`Wrote: ${outputPath}`);
  console.log(`GLB: ${(metadata.optimizedGlbBytes / 1024 / 1024).toFixed(2)} MiB (raw ${(metadata.rawGlbBytes / 1024 / 1024).toFixed(2)} MiB)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
