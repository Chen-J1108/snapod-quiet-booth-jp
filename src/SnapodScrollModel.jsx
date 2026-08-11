import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const MODEL_URL = "/assets/models/snapod-assembly.glb";

function smoothstep(value) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function makeShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 64, 6, 128, 64, 112);
  gradient.addColorStop(0, "rgba(0,0,0,.34)");
  gradient.addColorStop(0.42, "rgba(0,0,0,.16)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function SnapodScrollModel({ stageRef }) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("loading");
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 40);
    camera.position.set(3.4, 1.7, 5.4);

    const target = new THREE.Vector3(0, -0.02, 0);
    camera.lookAt(target);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environmentTarget = pmrem.fromScene(room, 0.04);
    scene.environment = environmentTarget.texture;
    room.dispose();
    pmrem.dispose();

    const hemisphere = new THREE.HemisphereLight(0xf7f4ea, 0x252b28, 0.95);
    const keyLight = new THREE.DirectionalLight(0xfff8eb, 2.4);
    keyLight.position.set(3.8, 5.5, 4.2);
    const rimLight = new THREE.DirectionalLight(0xb8d8ca, 1.4);
    rimLight.position.set(-4.5, 2.8, -3.8);
    scene.add(hemisphere, keyLight, rimLight);

    const shadowTexture = makeShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.2), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.17, 0.06);
    scene.add(shadow);

    let disposed = false;
    let animationFrame = 0;
    let modelRoot = null;
    let currentExplosion = reducedMotion ? 1 : 0;
    const movingGroups = [];
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        modelRoot = gltf.scene;
        modelRoot.name = "SNAPOD_Web_Assembly";
        modelRoot.rotation.y = -0.5;
        modelRoot.scale.setScalar(0.92);
        modelRoot.traverse((object) => {
          if (!object.isMesh) return;
          object.frustumCulled = true;
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              if (material.transparent) material.depthWrite = false;
            });
          } else if (object.material?.transparent) {
            object.material.depthWrite = false;
          }
        });
        for (const group of modelRoot.children) {
          const offset = group.userData?.explodeOffset;
          if (!Array.isArray(offset)) continue;
          movingGroups.push({
            group,
            base: group.position.clone(),
            offset: new THREE.Vector3(...offset),
          });
        }
        scene.add(modelRoot);
        setLoadProgress(100);
        setState("ready");
      },
      (event) => {
        if (disposed || !event.total) return;
        setLoadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      },
      () => {
        if (!disposed) setState("error");
      },
    );

    const resize = () => {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const mobile = width < 700;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = mobile ? 34 : 27;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    resize();

    const animationStartedAt = performance.now();
    const render = () => {
      if (disposed) return;
      const styles = stageRef.current ? getComputedStyle(stageRef.current) : null;
      const requestedExplosion = reducedMotion
        ? 1
        : Number.parseFloat(styles?.getPropertyValue("--exploded-t")) || 0;
      const sceneLight = Number.parseFloat(styles?.getPropertyValue("--light")) || 0;
      currentExplosion += (smoothstep(requestedExplosion) - currentExplosion) * 0.085;

      for (const { group, base, offset } of movingGroups) {
        group.position.set(
          base.x + offset.x * currentExplosion,
          base.y + offset.y * currentExplosion,
          base.z + offset.z * currentExplosion,
        );
      }

      if (modelRoot) {
        modelRoot.rotation.y = -0.5 + currentExplosion * 0.16;
        const elapsedSeconds = (performance.now() - animationStartedAt) / 1000;
        modelRoot.rotation.x = Math.sin(elapsedSeconds * 0.32) * 0.006 * (1 - currentExplosion);
      }
      shadow.scale.setScalar(1 + currentExplosion * 0.44);
      shadowMaterial.opacity = 0.42 - currentExplosion * 0.12;
      renderer.toneMappingExposure = 0.74 + sceneLight * 0.12;
      keyLight.intensity = 2.15 + sceneLight * 0.35;
      rimLight.intensity = 1.2 + (1 - sceneLight) * 0.45;
      camera.position.x = 3.4 + currentExplosion * 1.3;
      camera.position.y = 1.7 + currentExplosion * 0.2;
      camera.position.z = 5.4 + currentExplosion * 2.3;
      camera.lookAt(target);
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose?.();
      });
      shadowTexture.dispose();
      environmentTarget.dispose();
      renderer.dispose();
    };
  }, [stageRef]);

  return (
    <div ref={shellRef} className="snapod-scroll-model" data-state={state}>
      <canvas ref={canvasRef} />
      <img src="/assets/products/pod-exploded-cutout.png" alt="" />
      <div className="snapod-scroll-model__loading">
        <span>3D MODEL</span>
        <b>{String(loadProgress).padStart(3, "0")}%</b>
      </div>
    </div>
  );
}
