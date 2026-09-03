import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const sourcePath = process.argv[2];
const outputPath = path.resolve(
  process.argv[3] || path.join(projectRoot, "public", "assets", "models", "snapod-white-components.glb"),
);
const metadataPath = outputPath.replace(/\.glb$/i, ".meta.json");

if (!sourcePath) {
  throw new Error("Usage: npm run model:prepare-glb -- <source.glb> [output.glb]");
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const document = await io.read(path.resolve(sourcePath));
const root = document.getRoot();
const scene = root.getDefaultScene() || root.listScenes()[0];

if (!scene) throw new Error("The GLB does not contain a scene.");

const sourceChildren = [...scene.listChildren()];
const sourceMeshCount = root.listMeshes().length;
const sourceNodeCount = root.listNodes().length;
const bounds = getBounds(scene);
const center = bounds.min.map((value, index) => (value + bounds.max[index]) / 2);
const size = bounds.max.map((value, index) => value - bounds.min[index]);

const modules = [
  { id: "roof", label: "Roof assembly", offset: [0, 0.92, 0] },
  { id: "base", label: "Base assembly", offset: [0, -0.62, 0] },
  { id: "left-wall", label: "Left wall assembly", offset: [-1.18, 0, 0] },
  { id: "right-wall", label: "Right wall assembly", offset: [1.18, 0, 0] },
  { id: "front-glass", label: "Front door and glass", offset: [0, 0, -1.24] },
  { id: "rear-glass", label: "Rear glass assembly", offset: [0, 0, 1.12] },
  { id: "interior", label: "Interior fittings", offset: [0, 0, 0] },
].map((definition) => ({
  ...definition,
  node: document.createNode(`TULIKO_${definition.id.toUpperCase().replaceAll("-", "_")}`)
    .setExtras({
      moduleId: definition.id,
      moduleLabel: definition.label,
      explodeOffset: definition.offset,
    }),
  parts: 0,
}));
const moduleById = new Map(modules.map((module) => [module.id, module]));

function classifyPart(node) {
  const partBounds = getBounds(node);
  const partCenter = partBounds.min.map((value, index) => (value + partBounds.max[index]) / 2);
  const partSize = partBounds.max.map((value, index) => value - partBounds.min[index]);
  const local = partCenter.map((value, index) => value - center[index]);

  if (local[1] > size[1] * 0.38) return { id: "roof", partSize };
  if (local[1] < size[1] * -0.38) return { id: "base", partSize };

  const sideScore = Math.abs(local[0]) / Math.max(size[0] / 2, 0.0001);
  const faceScore = Math.abs(local[2]) / Math.max(size[2] / 2, 0.0001);

  if (sideScore > 0.7 || faceScore > 0.7) {
    if (sideScore > faceScore) return { id: local[0] < 0 ? "left-wall" : "right-wall", partSize };
    return { id: local[2] < 0 ? "front-glass" : "rear-glass", partSize };
  }

  return { id: "interior", partSize };
}

const whitePanel = document.createMaterial("Tuliko_WhitePanel")
  .setBaseColorFactor([0.82, 0.84, 0.82, 1])
  .setMetallicFactor(0.04)
  .setRoughnessFactor(0.66);
const glass = document.createMaterial("Tuliko_Glass")
  .setBaseColorFactor([0.72, 0.84, 0.83, 0.24])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.12)
  .setAlphaMode("BLEND")
  .setDoubleSided(true);

function isSidePanel(partSize) {
  return partSize[0] < size[0] * 0.035
    && partSize[1] > size[1] * 0.78
    && partSize[2] > size[2] * 0.7;
}

function isGlassPanel(partSize) {
  return partSize[2] < size[2] * 0.035
    && partSize[1] > size[1] * 0.78
    && partSize[0] > size[0] * 0.7;
}

function forEachPrimitive(node, callback) {
  const visit = (current) => {
    const mesh = current.getMesh();
    if (mesh) mesh.listPrimitives().forEach(callback);
    current.listChildren().forEach(visit);
  };
  visit(node);
}

for (const material of root.listMaterials()) {
  if (["Tuliko_WhitePanel", "Tuliko_Glass"].includes(material.getName())) continue;
  const [red, green, blue] = material.getBaseColorFactor();
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  if (max < 0.08) {
    material.setName("Tuliko_BlackHardware");
  } else if (green - red > 0.25 && green - blue > 0.08) {
    material.setName("Tuliko_Accent");
  } else if (red > blue + 0.08 && red > green) {
    material.setName("Tuliko_Carpet");
  } else if (max - min < 0.14) {
    material.setName("Tuliko_LightHardware");
  } else {
    material.setName("Tuliko_SecondaryFinish");
  }
}

for (const child of sourceChildren) {
  const { id, partSize } = classifyPart(child);
  const module = moduleById.get(id);

  if (isSidePanel(partSize)) {
    forEachPrimitive(child, (primitive) => primitive.setMaterial(whitePanel));
  } else if (isGlassPanel(partSize)) {
    forEachPrimitive(child, (primitive) => primitive.setMaterial(glass));
  }

  scene.removeChild(child);
  module.node.addChild(child);
  module.parts += 1;
}

for (const module of modules) {
  module.node.setExtras({
    ...module.node.getExtras(),
    partCount: module.parts,
  });
  scene.addChild(module.node);
}

scene.setName("TULIKO_SPD01_WHITE_WEB");
scene.setExtras({
  ...scene.getExtras(),
  sourceFile: path.basename(sourcePath),
  dimensionsMeters: size.map((value) => Number(value.toFixed(5))),
  componentGrouping: "spatial-web-v1",
});

await MeshoptEncoder.ready;
await document.transform(
  dedup(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await io.write(outputPath, document);

const output = await fs.stat(outputPath);
const metadata = {
  sourceFile: path.basename(sourcePath),
  outputFile: path.basename(outputPath),
  sourceBytes: (await fs.stat(sourcePath)).size,
  outputBytes: output.size,
  dimensionsMeters: size.map((value) => Number(value.toFixed(5))),
  sourceMeshCount,
  sourceNodeCount,
  sourcePartCount: sourceChildren.length,
  animationCount: root.listAnimations().length,
  groups: Object.fromEntries(modules.map((module) => [module.id, {
    label: module.label,
    partCount: module.parts,
    explodeOffset: module.offset,
  }])),
  inferredMaterials: {
    whitePanels: "large vertical X-thin planes",
    glass: "large vertical Z-thin planes",
    note: "The source GLB did not include semantic accessory names; groups were inferred from spatial position.",
  },
};
await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(JSON.stringify(metadata, null, 2));
