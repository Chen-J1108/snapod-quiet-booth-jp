import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import occtImport from "occt-import-js";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { SNAPOD_ASSEMBLY_MANIFEST } from "./snapod-assembly.manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const defaultSource = "D:/桌面/new project/杭州嘉兴静音仓SNAPOD/杭州嘉兴静音仓SNAPOD/002 SNAPOD 左开门（可拆钢板+加门樘+底部通风）/Snapod(小号)静音仓-W1000D1000H2300-总装 - 门樘-固定桌板-常规线路-可拆侧板.stp";
const sourcePath = path.resolve(process.argv[2] || process.env.SNAPOD_STEP_SOURCE || defaultSource);
const modelDir = path.join(projectRoot, "public", "assets", "models");
const tempDir = path.join(projectRoot, ".tmp", "cad-conversion");
const rawPath = path.join(tempDir, "snapod-assembly.raw.glb");
const outputPath = path.join(modelDir, "snapod-assembly.glb");
const metadataPath = path.join(modelDir, "snapod-assembly.meta.json");
const CLIP_NAME = "SNAPOD_INSTALL_V1";
const CLIP_DURATION = 10;

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

function meshFingerprint(mesh) {
  const hash = createHash("sha256");
  const positions = mesh.attributes.position.array;
  const positionBytes = Buffer.allocUnsafe(positions.length * 4);
  for (let index = 0; index < positions.length; index += 1) {
    positionBytes.writeInt32LE(Math.round(positions[index] * 1e6), index * 4);
  }
  hash.update(positionBytes);

  const indices = mesh.index.array;
  const indexBytes = Buffer.allocUnsafe(indices.length * 4);
  for (let index = 0; index < indices.length; index += 1) {
    indexBytes.writeUInt32LE(indices[index], index * 4);
  }
  hash.update(indexBytes);
  return hash.digest("hex").slice(0, 20);
}

function nodeFingerprint(node, meshes) {
  const meshFingerprints = (node.meshes || [])
    .map((meshIndex) => meshFingerprint(meshes[meshIndex]))
    .sort();
  return createHash("sha256").update(meshFingerprints.join("|")).digest("hex").slice(0, 20);
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

function createMesh(sourceMesh, meshIndex, center, materialCache, localOrigin = [0, 0, 0]) {
  const geometry = new THREE.BufferGeometry();
  const sourcePositions = sourceMesh.attributes.position.array;
  const positions = new Float32Array(sourcePositions.length);
  for (let index = 0; index < sourcePositions.length; index += 3) {
    const point = mappedPoint(sourcePositions, index);
    positions[index] = point[0] - center[0] - localOrigin[0];
    positions[index + 1] = point[1] - center[1] - localOrigin[1];
    positions[index + 2] = point[2] - center[2] - localOrigin[2];
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
  const fingerprint = meshFingerprint(sourceMesh);
  mesh.name = `CAD_${fingerprint}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.stableId = `mesh:${fingerprint}`;
  mesh.userData.sourceName = cleanText(sourceMesh.name);
  mesh.userData.sourceMeshFingerprint = fingerprint;
  mesh.userData.sourceMeshIndex = meshIndex;
  return mesh;
}

function makeGroup(name, userData = {}) {
  const group = new THREE.Group();
  group.name = name;
  Object.assign(group.userData, userData);
  return group;
}

function trackTimes(start, end) {
  const values = [0, start * CLIP_DURATION, end * CLIP_DURATION, CLIP_DURATION];
  return [...new Set(values)].sort((a, b) => a - b);
}

function positionTrack(object, start, end, exploded) {
  const times = trackTimes(start, end);
  const values = [];
  for (const time of times) {
    const assembled = end <= start ? 1 : THREE.MathUtils.smoothstep(time / CLIP_DURATION, start, end);
    values.push(...exploded.map((value) => value * (1 - assembled)));
  }
  return new THREE.VectorKeyframeTrack(`${object.name}.position`, times, values);
}

function quaternionTrack(object, start, end, explodedQuaternion, assembledQuaternion) {
  const times = trackTimes(start, end);
  const values = [];
  for (const time of times) {
    const assembled = end <= start ? 1 : THREE.MathUtils.smoothstep(time / CLIP_DURATION, start, end);
    const value = explodedQuaternion.clone().slerp(assembledQuaternion, assembled);
    values.push(value.x, value.y, value.z, value.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${object.name}.quaternion`, times, values);
}

function assertManifestCoverage(assembly, meshes) {
  const seen = new Map();
  for (const node of assembly.children || []) {
    const fingerprint = nodeFingerprint(node, meshes);
    if (seen.has(fingerprint)) {
      throw new Error(`Ambiguous STEP node fingerprint ${fingerprint}.`);
    }
    seen.set(fingerprint, node);
  }

  const expected = new Set(Object.keys(SNAPOD_ASSEMBLY_MANIFEST.nodes));
  const unknown = [...seen.keys()].filter((fingerprint) => !expected.has(fingerprint));
  const missing = [...expected].filter((fingerprint) => !seen.has(fingerprint));
  if (unknown.length || missing.length) {
    throw new Error(`Assembly manifest mismatch. Unknown: ${unknown.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}.`);
  }
  return seen;
}

async function exportBinary(scene, animations) {
  const exporter = new GLTFExporter();
  return exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: false,
    trs: true,
    includeCustomExtensions: true,
    animations,
  });
}

async function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`STEP file not found: ${sourcePath}`);
  fs.mkdirSync(modelDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`Reading STEP: ${sourcePath}`);
  const sourceBytes = fs.readFileSync(sourcePath);
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  if (sourceSha256 !== SNAPOD_ASSEMBLY_MANIFEST.sourceSha256) {
    throw new Error(`STEP source hash does not match manifest ${SNAPOD_ASSEMBLY_MANIFEST.id}.`);
  }

  const occt = await occtImport();
  const result = occt.ReadStepFile(sourceBytes, {
    linearUnit: "meter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.0015,
    angularDeflection: 0.35,
  });
  if (!result.success) throw new Error("OpenCascade could not triangulate the STEP assembly.");

  const assembly = result.root.children?.[0];
  if (!assembly) throw new Error("Unexpected empty STEP assembly hierarchy.");
  const nodesByFingerprint = assertManifestCoverage(assembly, result.meshes);
  const bounds = getBounds(result.meshes);
  const materialCache = new Map();
  const scene = new THREE.Scene();
  scene.name = "SNAPOD_SPD01";
  scene.userData.source = path.basename(sourcePath);
  scene.userData.manifestId = SNAPOD_ASSEMBLY_MANIFEST.id;
  scene.userData.dimensionsMeters = bounds.size.map((value) => Number(value.toFixed(5)));
  scene.userData.animationClip = CLIP_NAME;

  const moduleGroups = new Map();
  const moduleStats = new Map();
  for (const [id, definition] of Object.entries(SNAPOD_ASSEMBLY_MANIFEST.modules)) {
    const group = makeGroup(`SNAPOD_${id}`, {
      stableId: `module:${id}`,
      moduleId: id,
      label: definition.label,
      installRange: definition.install,
      explodeOffset: definition.explodeOffset,
    });
    moduleGroups.set(id, group);
    moduleStats.set(id, { id, label: definition.label, meshCount: 0, triangleCount: 0 });
    scene.add(group);
  }

  const tracks = [];
  const animatedModules = ["frame-core", "rear-wall", "service-wall", "fixed-glass", "roof", "door-jamb", "carpet"];
  for (const moduleId of animatedModules) {
    const definition = SNAPOD_ASSEMBLY_MANIFEST.modules[moduleId];
    tracks.push(positionTrack(moduleGroups.get(moduleId), ...definition.install, definition.explodeOffset));
  }

  const assignedMeshes = new Set();
  const doorJambFingerprints = new Set(SNAPOD_ASSEMBLY_MANIFEST.door.jambMeshFingerprints);
  const doorNodeFingerprint = Object.entries(SNAPOD_ASSEMBLY_MANIFEST.nodes)
    .find(([, definition]) => definition.moduleId === "door-special")?.[0];
  const doorNode = nodesByFingerprint.get(doorNodeFingerprint);
  if (!doorNode) throw new Error("Door assembly node was not resolved by the manifest.");

  const doorInstall = makeGroup("SNAPOD_door-leaf_install", {
    stableId: "joint:door-install",
    jointType: "installation",
  });
  moduleGroups.get("door-leaf").add(doorInstall);
  const hingeSource = SNAPOD_ASSEMBLY_MANIFEST.door.hingePositionMeters;
  const hingeLocal = [hingeSource[0] - bounds.center[0], 0, hingeSource[2] - bounds.center[2]];
  const doorPivot = makeGroup("SNAPOD_door-leaf_pivot", {
    stableId: "joint:door-hinge",
    jointType: "revolute",
    axis: SNAPOD_ASSEMBLY_MANIFEST.door.hingeAxis,
    pivotMeters: hingeLocal.map((value) => Number(value.toFixed(6))),
  });
  doorPivot.position.set(...hingeLocal);
  doorInstall.add(doorPivot);

  const doorDefinition = SNAPOD_ASSEMBLY_MANIFEST.modules["door-leaf"];
  tracks.push(positionTrack(doorInstall, 0.68, 0.8, doorDefinition.explodeOffset));
  const hingeAxis = new THREE.Vector3(...SNAPOD_ASSEMBLY_MANIFEST.door.hingeAxis).normalize();
  const openQuaternion = new THREE.Quaternion().setFromAxisAngle(
    hingeAxis,
    THREE.MathUtils.degToRad(SNAPOD_ASSEMBLY_MANIFEST.door.openAngleDegrees),
  );
  tracks.push(quaternionTrack(doorPivot, 0.74, 0.88, openQuaternion, new THREE.Quaternion()));

  function addSourceMesh(moduleId, parent, sourceMeshIndex, partId, localOrigin = [0, 0, 0]) {
    if (assignedMeshes.has(sourceMeshIndex)) throw new Error(`STEP mesh ${sourceMeshIndex} was assigned more than once.`);
    assignedMeshes.add(sourceMeshIndex);
    const sourceMesh = result.meshes[sourceMeshIndex];
    const mesh = createMesh(sourceMesh, sourceMeshIndex, bounds.center, materialCache, localOrigin);
    mesh.userData.partId = partId;
    mesh.userData.moduleId = moduleId;
    parent.add(mesh);
    const stats = moduleStats.get(moduleId);
    stats.meshCount += 1;
    stats.triangleCount += sourceMesh.index.array.length / 3;
  }

  for (const [fingerprint, node] of nodesByFingerprint) {
    const definition = SNAPOD_ASSEMBLY_MANIFEST.nodes[fingerprint];
    if (definition.moduleId === "door-special") continue;
    const moduleGroup = moduleGroups.get(definition.moduleId);
    const partGroup = makeGroup(`SNAPOD_PART_${definition.partId}`, {
      stableId: `part:${definition.partId}`,
      partId: definition.partId,
      moduleId: definition.moduleId,
      sourceNodeFingerprint: fingerprint,
      sourceName: cleanText(node.name),
    });
    moduleGroup.add(partGroup);

    if (definition.moduleId === "column-covers") {
      const install = SNAPOD_ASSEMBLY_MANIFEST.modules["column-covers"].install;
      tracks.push(positionTrack(partGroup, ...install, definition.explodeOffset));
    }

    for (const sourceMeshIndex of node.meshes || []) {
      const sourceMesh = result.meshes[sourceMeshIndex];
      if (meshFingerprint(sourceMesh) === SNAPOD_ASSEMBLY_MANIFEST.carpetMeshFingerprint) {
        addSourceMesh("carpet", moduleGroups.get("carpet"), sourceMeshIndex, "floor-carpet");
      } else {
        addSourceMesh(definition.moduleId, partGroup, sourceMeshIndex, definition.partId);
      }
    }
  }

  const resolvedDoorJamb = new Set();
  for (const sourceMeshIndex of doorNode.meshes || []) {
    const fingerprint = meshFingerprint(result.meshes[sourceMeshIndex]);
    if (doorJambFingerprints.has(fingerprint)) {
      resolvedDoorJamb.add(fingerprint);
      addSourceMesh("door-jamb", moduleGroups.get("door-jamb"), sourceMeshIndex, "door-jamb");
    } else {
      addSourceMesh("door-leaf", doorPivot, sourceMeshIndex, "door-leaf", hingeLocal);
    }
  }
  const missingDoorJamb = [...doorJambFingerprints].filter((fingerprint) => !resolvedDoorJamb.has(fingerprint));
  if (missingDoorJamb.length) throw new Error(`Door jamb mesh selectors did not resolve: ${missingDoorJamb.join(", ")}`);
  if (assignedMeshes.size !== result.meshes.length) {
    const missing = result.meshes.map((_, index) => index).filter((index) => !assignedMeshes.has(index));
    throw new Error(`Unassigned STEP meshes: ${missing.join(", ")}`);
  }

  const clip = new THREE.AnimationClip(CLIP_NAME, CLIP_DURATION, tracks);
  const totalTriangles = result.meshes.reduce((sum, mesh) => sum + mesh.index.array.length / 3, 0);
  console.log(`Triangulated ${result.meshes.length} meshes / ${Math.round(totalTriangles).toLocaleString()} triangles.`);
  const glb = await exportBinary(scene, [clip]);
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
    manifestId: SNAPOD_ASSEMBLY_MANIFEST.id,
    fingerprintVersion: SNAPOD_ASSEMBLY_MANIFEST.fingerprintVersion,
    sourceFile: path.basename(sourcePath),
    sourceSha256,
    sourceBytes: sourceBytes.length,
    dimensionsMeters: bounds.size.map((value) => Number(value.toFixed(5))),
    sourceMeshes: result.meshes.length,
    triangles: totalTriangles,
    modules: [...moduleStats.values()].map((stats) => ({
      ...stats,
      triangleCount: Math.round(stats.triangleCount),
      installRange: SNAPOD_ASSEMBLY_MANIFEST.modules[stats.id].install,
      explodeOffset: SNAPOD_ASSEMBLY_MANIFEST.modules[stats.id].explodeOffset,
    })),
    doorJoint: {
      pivotMeters: hingeLocal.map((value) => Number(value.toFixed(6))),
      axis: SNAPOD_ASSEMBLY_MANIFEST.door.hingeAxis,
      openAngleDegrees: SNAPOD_ASSEMBLY_MANIFEST.door.openAngleDegrees,
    },
    animation: {
      clip: CLIP_NAME,
      durationSeconds: CLIP_DURATION,
      direction: "disassembled-to-assembled",
    },
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
