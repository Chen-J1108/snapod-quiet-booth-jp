import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function mappedArray(source) {
  const mapped = new Float32Array(source.length);
  for (let index = 0; index < source.length; index += 3) {
    mapped[index] = source[index];
    mapped[index + 1] = -source[index + 2];
    mapped[index + 2] = source[index + 1];
  }
  return mapped;
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
  return best ? best.split(",").map(Number) : [0.58, 0.61, 0.63];
}

function materialFor(sourceMesh, cache) {
  const color = dominantColor(sourceMesh);
  const glassTarget = [0.1664, 0.3175, 0.5089];
  const glass = color.reduce((sum, value, index) => sum + Math.abs(value - glassTarget[index]), 0) < 0.16;
  const key = `${color.map((value) => value.toFixed(4)).join("-")}-${glass}`;
  if (cache.has(key)) return cache.get(key);
  const material = glass
    ? new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(...color),
        roughness: 0.12,
        transmission: 0.45,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshStandardMaterial({
        color: new THREE.Color(...color),
        roughness: 0.55,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
  cache.set(key, material);
  return material;
}

function meshFromOcct(sourceMesh, material, nodePath, meshIndex) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mappedArray(sourceMesh.attributes.position.array), 3));
  if (sourceMesh.attributes.normal?.array) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(mappedArray(sourceMesh.attributes.normal.array), 3));
  } else {
    geometry.computeVertexNormals();
  }
  const indices = sourceMesh.index.array;
  const IndexArray = sourceMesh.attributes.position.array.length / 3 > 65535 ? Uint32Array : Uint16Array;
  geometry.setIndex(new THREE.BufferAttribute(IndexArray.from(indices), 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = sourceMesh.name || `Mesh ${meshIndex + 1}`;
  mesh.userData.nodePath = nodePath;
  mesh.userData.meshIndex = meshIndex;
  return mesh;
}

function buildNode(result, sourceNode, parent, path, groupMap, meshes, materialCache) {
  const group = new THREE.Group();
  group.name = sourceNode.name || `Part ${path}`;
  group.userData.nodePath = path;
  group.userData.homePosition = group.position.clone();
  parent.add(group);
  groupMap.set(path, group);

  for (const meshIndex of sourceNode.meshes || []) {
    const sourceMesh = result.meshes[meshIndex];
    if (!sourceMesh) continue;
    const mesh = meshFromOcct(sourceMesh, materialFor(sourceMesh, materialCache), path, meshIndex);
    group.add(mesh);
    meshes.push(mesh);
  }
  for (let index = 0; index < (sourceNode.children || []).length; index += 1) {
    const childPath = path === "root" ? String(index) : `${path}/${index}`;
    buildNode(result, sourceNode.children[index], group, childPath, groupMap, meshes, materialCache);
  }
  return group;
}

function boxFor(object) {
  const box = new THREE.Box3().setFromObject(object);
  return box.isEmpty() ? null : box;
}

function isEffectivelyVisible(object) {
  for (let current = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

export const CadViewport = forwardRef(function CadViewport({
  result,
  selectedPath,
  hiddenPaths,
  explode,
  measureMode,
  onSelect,
  onMeasurement,
}, ref) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRef = useRef(null);
  const controllerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    fit(path = selectedPath) {
      controllerRef.current?.fit(path);
    },
    clearMeasurement() {
      controllerRef.current?.clearMeasurement();
    },
    resetView() {
      controllerRef.current?.fit("root");
    },
  }), [selectedPath]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.measureMode = measureMode;
    controller.renderer.domElement.style.cursor = measureMode ? "crosshair" : "grab";
  }, [measureMode]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    for (const [path, group] of controller.groupMap) group.visible = !hiddenPaths.has(path);
    controller.updateSelection();
  }, [hiddenPaths]);

  useEffect(() => {
    controllerRef.current?.setExplode(explode);
  }, [explode]);

  useEffect(() => {
    controllerRef.current?.updateSelection(selectedPath);
  }, [selectedPath]);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    const measureLabel = labelRef.current;
    if (!shell || !canvas || !measureLabel || !result) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setClearColor(0x171a18, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x171a18, 7000, 24000);
    const camera = new THREE.PerspectiveCamera(34, 1, 1, 100000);
    camera.position.set(3200, 2400, 3600);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.screenSpacePanning = true;
    controls.minDistance = 30;
    controls.maxDistance = 40000;

    scene.add(new THREE.HemisphereLight(0xf6f1df, 0x18201c, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(3200, 5200, 2800);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8de8b5, 1.15);
    rim.position.set(-4200, 1800, -3200);
    scene.add(rim);

    const grid = new THREE.GridHelper(12000, 48, 0x38443e, 0x252b28);
    grid.material.transparent = true;
    grid.material.opacity = 0.7;
    scene.add(grid);

    const modelRoot = new THREE.Group();
    modelRoot.name = "CAD_MODEL_ROOT";
    scene.add(modelRoot);
    const groupMap = new Map();
    const meshes = [];
    const materialCache = new Map();
    buildNode(result, result.root, modelRoot, "root", groupMap, meshes, materialCache);

    const initialBox = boxFor(modelRoot);
    if (initialBox) {
      const center = initialBox.getCenter(new THREE.Vector3());
      modelRoot.position.sub(center);
      modelRoot.updateMatrixWorld(true);
    }

    const assemblySource = result.root.children?.length === 1 && result.root.children[0].children?.length > 1
      ? result.root.children[0]
      : result.root;
    const assemblyPath = assemblySource === result.root ? "root" : "0";
    const assemblyGroup = groupMap.get(assemblyPath) || groupMap.get("root");
    const assemblyBox = boxFor(assemblyGroup);
    const assemblyCenter = assemblyBox?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
    const assemblyRadius = assemblyBox?.getSize(new THREE.Vector3()).length() || 1000;
    const explodeEntries = [];
    for (const child of assemblyGroup?.children || []) {
      if (!child.isGroup) continue;
      const childBox = boxFor(child);
      if (!childBox) continue;
      const direction = childBox.getCenter(new THREE.Vector3()).sub(assemblyCenter);
      if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
      explodeEntries.push({
        group: child,
        home: child.position.clone(),
        offset: direction.normalize().multiplyScalar(assemblyRadius * 0.48),
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const measureObjects = new THREE.Group();
    scene.add(measureObjects);
    const measurement = { start: null, midpoint: null };
    let selectionHelper = null;
    let disposed = false;
    let animationFrame = 0;

    const clearMeasurement = () => {
      while (measureObjects.children.length) {
        const child = measureObjects.children.pop();
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
      measurement.start = null;
      measurement.midpoint = null;
      measureLabel.hidden = true;
      onMeasurement(null);
    };

    const addMeasureMarker = (point) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(5, assemblyRadius * 0.004), 16, 10),
        new THREE.MeshBasicMaterial({ color: 0x9cff6d }),
      );
      marker.position.copy(point);
      measureObjects.add(marker);
    };

    const finishMeasurement = (end) => {
      addMeasureMarker(end);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([measurement.start, end]),
        new THREE.LineBasicMaterial({ color: 0x9cff6d, depthTest: false }),
      );
      line.renderOrder = 20;
      measureObjects.add(line);
      const distance = measurement.start.distanceTo(end);
      measurement.midpoint = measurement.start.clone().add(end).multiplyScalar(0.5);
      measureLabel.textContent = `${distance.toFixed(2)} mm`;
      measureLabel.hidden = false;
      onMeasurement(distance);
      measurement.start = null;
    };

    const fit = (path = "root") => {
      const target = groupMap.get(path) || modelRoot;
      const box = boxFor(target);
      if (!box) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.5, 20);
      const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
      const direction = camera.position.clone().sub(controls.target).normalize();
      controls.target.copy(center);
      camera.position.copy(center).add(direction.multiplyScalar(distance * 1.12));
      camera.near = Math.max(0.2, distance / 5000);
      camera.far = Math.max(10000, distance * 20);
      camera.updateProjectionMatrix();
      controls.update();
    };

    const controller = {
      renderer,
      groupMap,
      measureMode,
      selectedPath,
      explode,
      fit,
      clearMeasurement,
      setExplode(value) {
        this.explode = value;
        for (const entry of explodeEntries) {
          entry.group.position.copy(entry.home).addScaledVector(entry.offset, value);
        }
        modelRoot.updateMatrixWorld(true);
        this.updateSelection();
      },
      updateSelection(path = this.selectedPath) {
        this.selectedPath = path;
        if (selectionHelper) {
          scene.remove(selectionHelper);
          selectionHelper.geometry?.dispose?.();
          selectionHelper.material?.dispose?.();
          selectionHelper = null;
        }
        const target = path ? groupMap.get(path) : null;
        if (!target || !isEffectivelyVisible(target)) return;
        const box = boxFor(target);
        if (!box) return;
        selectionHelper = new THREE.Box3Helper(box, 0x9cff6d);
        selectionHelper.renderOrder = 10;
        selectionHelper.material.depthTest = false;
        scene.add(selectionHelper);
      },
    };
    controllerRef.current = controller;

    const resize = () => {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const pick = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(meshes.filter(isEffectivelyVisible), false)[0];
      if (!hit) return;
      if (controller.measureMode) {
        if (!measurement.start) {
          clearMeasurement();
          measurement.start = hit.point.clone();
          addMeasureMarker(measurement.start);
        } else {
          finishMeasurement(hit.point.clone());
        }
      } else {
        onSelect(hit.object.userData.nodePath || null);
      }
    };

    canvas.addEventListener("pointerdown", pick);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    resize();
    fit("root");
    controller.setExplode(explode);
    controller.updateSelection(selectedPath);

    const render = () => {
      if (disposed) return;
      controls.update();
      if (measurement.midpoint && !measureLabel.hidden) {
        const projected = measurement.midpoint.clone().project(camera);
        measureLabel.style.left = `${(projected.x * 0.5 + 0.5) * shell.clientWidth}px`;
        measureLabel.style.top = `${(-projected.y * 0.5 + 0.5) * shell.clientHeight}px`;
      }
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", pick);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose?.();
      });
      renderer.dispose();
      controllerRef.current = null;
    };
  }, [result]);

  return (
    <div ref={shellRef} className="cad-viewport">
      <canvas ref={canvasRef} aria-label="CAD 三维预览" />
      <div ref={labelRef} className="measure-label" hidden />
      <div className="viewport-axis" aria-hidden="true"><i /> Y UP</div>
    </div>
  );
});
