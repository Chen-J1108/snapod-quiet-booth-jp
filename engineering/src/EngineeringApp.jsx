import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ChevronRight,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FileBox,
  Focus,
  Maximize2,
  MousePointer2,
  Ruler,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { CadViewport } from "./CadViewport.jsx";

const MAX_FILE_BYTES = 90 * 1024 * 1024;
const MODULE_OPTIONS = [
  ["base", "底座・换气"],
  ["frame-core", "结构框架"],
  ["rear-wall", "背面吸音板"],
  ["service-wall", "设备侧板"],
  ["fixed-glass", "固定玻璃"],
  ["roof", "顶部单元"],
  ["door-jamb", "门樘"],
  ["door-leaf", "活动门扇"],
  ["column-covers", "立柱扣盖"],
  ["carpet", "地毯"],
];

function safeName(raw, fallback) {
  const value = String(raw || "").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
  if (value.length < 2) return fallback;
  const suspicious = [...value].filter((character) => {
    const code = character.codePointAt(0);
    return code > 0x7e && !(code >= 0x3400 && code <= 0x9fff);
  }).length;
  return suspicious / value.length > 0.28 ? fallback : value;
}

function countMeshes(node) {
  return (node.meshes?.length || 0) + (node.children || []).reduce((sum, child) => sum + countMeshes(child), 0);
}

function getNodeAtPath(root, path) {
  if (!root || !path) return null;
  if (path === "root") return root;
  let node = root;
  for (const token of path.split("/")) {
    node = node.children?.[Number(token)];
    if (!node) return null;
  }
  return node;
}

function firstPartPath(root) {
  if (!root?.children?.length) return "root";
  if (root.children.length === 1 && root.children[0].children?.length) return "0/0";
  return "0";
}

function bytesLabel(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function partIdFrom(value, fallback = "part") {
  const normalized = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || fallback;
}

function TreeNode({ node, path, depth, selectedPath, hiddenPaths, onSelect, onToggle, onFrame, counter }) {
  const fallback = `Part ${String(counter.current++).padStart(3, "0")}`;
  const label = safeName(node.name, fallback);
  const children = node.children || [];
  const hidden = hiddenPaths.has(path);
  const row = (
    <div className={`tree-row ${selectedPath === path ? "is-selected" : ""}`} style={{ "--depth": depth }}>
      <button
        className="tree-visibility"
        type="button"
        aria-label={hidden ? `显示 ${label}` : `隐藏 ${label}`}
        onClick={(event) => { event.stopPropagation(); onToggle(path); }}
      >
        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button className="tree-label" type="button" onClick={() => onSelect(path)}>
        <span>{label}</span>
        <small>{countMeshes(node)}</small>
      </button>
      <button className="tree-frame" type="button" aria-label={`聚焦 ${label}`} onClick={() => onFrame(path)}>
        <Focus size={13} />
      </button>
    </div>
  );

  if (!children.length) return row;
  return (
    <details className="tree-branch" open={depth < 2}>
      <summary>{row}</summary>
      <div>
        {children.map((child, index) => (
          <TreeNode
            key={`${path}/${index}`}
            node={child}
            path={path === "root" ? String(index) : `${path}/${index}`}
            depth={depth + 1}
            selectedPath={selectedPath}
            hiddenPaths={hiddenPaths}
            onSelect={onSelect}
            onToggle={onToggle}
            onFrame={onFrame}
            counter={counter}
          />
        ))}
      </div>
    </details>
  );
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function meshFingerprint(mesh) {
  const positions = mesh.attributes.position.array;
  const positionBytes = new ArrayBuffer(positions.length * 4);
  const positionView = new DataView(positionBytes);
  for (let index = 0; index < positions.length; index += 1) {
    positionView.setInt32(index * 4, Math.round(positions[index] * 1e6), true);
  }
  const indices = mesh.index.array;
  const indexBytes = new ArrayBuffer(indices.length * 4);
  const indexView = new DataView(indexBytes);
  for (let index = 0; index < indices.length; index += 1) {
    indexView.setUint32(index * 4, indices[index], true);
  }
  const combined = new Uint8Array(positionBytes.byteLength + indexBytes.byteLength);
  combined.set(new Uint8Array(positionBytes), 0);
  combined.set(new Uint8Array(indexBytes), positionBytes.byteLength);
  return (await sha256Hex(combined)).slice(0, 20);
}

async function nodeFingerprint(result, node) {
  const fingerprints = await Promise.all((node.meshes || []).map((index) => meshFingerprint(result.meshes[index])));
  fingerprints.sort();
  return (await sha256Hex(new TextEncoder().encode(fingerprints.join("|")))).slice(0, 20);
}

export function EngineeringApp() {
  const inputRef = useRef(null);
  const workerRef = useRef(null);
  const activeRequestRef = useRef(null);
  const viewportRef = useRef(null);
  const fingerprintCache = useRef(new Map());
  const [result, setResult] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [status, setStatus] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [hiddenPaths, setHiddenPaths] = useState(() => new Set());
  const [explode, setExplode] = useState(0);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurement, setMeasurement] = useState(null);
  const [moduleId, setModuleId] = useState("base");
  const [partId, setPartId] = useState("");
  const [assignments, setAssignments] = useState({});
  const [assigning, setAssigning] = useState(false);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const selectedNode = useMemo(() => getNodeAtPath(result?.root, selectedPath), [result, selectedPath]);
  const selectedLabel = selectedNode ? safeName(selectedNode.name, selectedPath || "Part") : "未选择部件";
  const triangleCount = useMemo(() => result?.meshes?.reduce((sum, mesh) => sum + mesh.index.array.length / 3, 0) || 0, [result]);

  useEffect(() => {
    if (!selectedNode) return;
    setPartId(partIdFrom(selectedLabel, `${moduleId}-part`));
  }, [selectedPath]);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./cad.worker.js", window.location.href), { type: "classic" });
    worker.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.id !== activeRequestRef.current) return;
      if (message.type === "progress") {
        setStatus("loading");
        setStatusText(message.message || "解析中");
        setProgress(message.phase === "WASM" ? 28 : 68);
      } else if (message.type === "result") {
        setResult(message.result);
        setSelectedPath(firstPartPath(message.result.root));
        setHiddenPaths(new Set());
        setAssignments({});
        fingerprintCache.current.clear();
        setExplode(0);
        setProgress(100);
        setStatus("ready");
        setStatusText("模型已就绪");
      } else if (message.type === "error") {
        setError(message.message || "CAD 解析失败");
        setStatus("error");
        setProgress(0);
      }
    });
    workerRef.current = worker;
    return worker;
  };

  const openFile = async (file) => {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["step", "stp", "iges", "igs", "brep"].includes(extension)) {
      setError("请选择 STEP、IGES 或 BREP 文件。");
      setStatus("error");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("文件超过 90 MB，当前浏览器解析内存可能不足。");
      setStatus("error");
      return;
    }
    setError("");
    setResult(null);
    setFileInfo({ name: file.name, size: file.size, modified: file.lastModified });
    setStatus("loading");
    setStatusText("读取本地文件");
    setProgress(8);
    const id = crypto.randomUUID();
    activeRequestRef.current = id;
    const buffer = await file.arrayBuffer();
    if (activeRequestRef.current !== id) return;
    ensureWorker().postMessage({ id, filename: file.name, buffer }, [buffer]);
  };

  const toggleHidden = (path) => {
    setHiddenPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const assignSelected = async () => {
    if (!result || !selectedNode || !(selectedNode.meshes || []).length || !partId.trim()) return;
    setAssigning(true);
    try {
      let fingerprint = fingerprintCache.current.get(selectedPath);
      if (!fingerprint) {
        fingerprint = await nodeFingerprint(result, selectedNode);
        fingerprintCache.current.set(selectedPath, fingerprint);
      }
      setAssignments((current) => ({
        ...current,
        [fingerprint]: {
          partId: partIdFrom(partId, `${moduleId}-part`),
          moduleId,
          sourcePath: selectedPath,
          sourceName: selectedLabel,
        },
      }));
    } finally {
      setAssigning(false);
    }
  };

  const exportManifest = () => {
    if (!fileInfo || !Object.keys(assignments).length) return;
    const payload = {
      schema: "snapod-cad-module-map/v1",
      generatedAt: new Date().toISOString(),
      sourceFile: fileInfo.name,
      fingerprintVersion: 1,
      nodes: assignments,
    };
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileInfo.name.replace(/\.[^.]+$/, "")}.module-map.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const treeCounter = { current: 1 };
  return (
    <div
      className={`engineering-app ${dragActive ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        openFile(event.dataTransfer.files?.[0]);
      }}
    >
      <header className="lab-header">
        <div className="lab-brand">
          <Box size={19} strokeWidth={1.6} />
          <strong>SNAPOD</strong>
          <span>CAD LAB / INTERNAL</span>
        </div>
        <div className="lab-header__actions">
          <span className="local-badge"><ShieldCheck size={14} /> 本机解析 · 不上传</span>
          <button className="header-file-button" type="button" onClick={() => inputRef.current?.click()}>
            <Upload size={15} /> {fileInfo ? "更换文件" : "打开 CAD"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".step,.stp,.iges,.igs,.brep"
            hidden
            onChange={(event) => openFile(event.target.files?.[0])}
          />
        </div>
      </header>

      <aside className="assembly-panel">
        <div className="panel-heading">
          <div><span>ASSEMBLY</span><h2>装配树</h2></div>
          {result && <small>{result.meshes.length} meshes</small>}
        </div>
        <div className="assembly-tree">
          {result ? (
            <TreeNode
              node={result.root}
              path="root"
              depth={0}
              selectedPath={selectedPath}
              hiddenPaths={hiddenPaths}
              onSelect={setSelectedPath}
              onToggle={toggleHidden}
              onFrame={(path) => { setSelectedPath(path); viewportRef.current?.fit(path); }}
              counter={treeCounter}
            />
          ) : (
            <div className="panel-placeholder"><FileBox size={22} /><p>打开文件后显示装配层级</p></div>
          )}
        </div>
        {fileInfo && (
          <div className="file-summary">
            <FileBox size={16} />
            <div><strong title={fileInfo.name}>{fileInfo.name}</strong><span>{bytesLabel(fileInfo.size)}</span></div>
          </div>
        )}
      </aside>

      <main className="workspace-panel">
        {result ? (
          <CadViewport
            ref={viewportRef}
            result={result}
            selectedPath={selectedPath}
            hiddenPaths={hiddenPaths}
            explode={explode}
            measureMode={measureMode}
            onSelect={setSelectedPath}
            onMeasurement={setMeasurement}
          />
        ) : (
          <button className="drop-zone" type="button" onClick={() => inputRef.current?.click()}>
            <span className="drop-zone__icon"><Upload size={30} strokeWidth={1.25} /></span>
            <span className="drop-zone__eyebrow">LOCAL CAD VIEWER</span>
            <strong>拖入 SNAPOD STEP 总装</strong>
            <small>STEP / IGES / BREP · 最大 90 MB · 文件仅在当前浏览器解析</small>
          </button>
        )}

        {status === "loading" && (
          <div className="loading-overlay">
            <div className="loading-card">
              <span>OCCT / WASM</span>
              <strong>{statusText}</strong>
              <div><i style={{ width: `${progress}%` }} /></div>
              <small>{String(progress).padStart(2, "0")}%</small>
            </div>
          </div>
        )}
        {error && <div className="error-toast">{error}</div>}
        {dragActive && <div className="drag-overlay"><Upload size={34} /> 松开以在本机打开 CAD</div>}

        <div className="viewport-toolbar" aria-label="三维视图工具">
          <button type="button" className={!measureMode ? "is-active" : ""} onClick={() => setMeasureMode(false)} title="选择">
            <MousePointer2 size={16} /><span>选择</span>
          </button>
          <button type="button" className={measureMode ? "is-active" : ""} onClick={() => setMeasureMode((value) => !value)} title="两点测量">
            <Ruler size={16} /><span>测量</span>
          </button>
          <button type="button" onClick={() => viewportRef.current?.fit(selectedPath)} title="聚焦选择">
            <Focus size={16} /><span>聚焦</span>
          </button>
          <button type="button" onClick={() => viewportRef.current?.resetView()} title="适配全部">
            <Maximize2 size={16} /><span>全览</span>
          </button>
        </div>

        <label className="explode-control">
          <span><Crosshair size={14} /> 爆炸视图</span>
          <input type="range" min="0" max="1" step="0.01" value={explode} onChange={(event) => setExplode(Number(event.target.value))} disabled={!result} />
          <b>{Math.round(explode * 100)}%</b>
        </label>
      </main>

      <aside className="inspector-panel">
        <div className="panel-heading"><div><span>INSPECTOR</span><h2>部件检查</h2></div></div>
        <section className="selection-card">
          <span>当前选择</span>
          <h3>{selectedLabel}</h3>
          <dl>
            <div><dt>节点路径</dt><dd>{selectedPath || "—"}</dd></div>
            <div><dt>直属网格</dt><dd>{selectedNode?.meshes?.length || 0}</dd></div>
            <div><dt>子树网格</dt><dd>{selectedNode ? countMeshes(selectedNode) : 0}</dd></div>
          </dl>
        </section>

        <section className="measure-card">
          <div><Ruler size={16} /><span>两点测量</span></div>
          <strong>{measurement == null ? "等待选择两个表面点" : `${measurement.toFixed(2)} mm`}</strong>
          {measurement != null && <button type="button" onClick={() => viewportRef.current?.clearMeasurement()}>清除测量</button>}
        </section>

        <section className="mapping-card">
          <div className="mapping-card__title">
            <div><span>MODULE MAP</span><h3>语义模块指派</h3></div>
            <b>{Object.keys(assignments).length}</b>
          </div>
          <label>
            <span>模块</span>
            <select value={moduleId} onChange={(event) => setModuleId(event.target.value)}>
              {MODULE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label} / {value}</option>)}
            </select>
          </label>
          <label>
            <span>稳定部件 ID</span>
            <input value={partId} onChange={(event) => setPartId(event.target.value)} placeholder="例如 door-leaf" />
          </label>
          <button
            className="assign-button"
            type="button"
            disabled={!selectedNode?.meshes?.length || assigning}
            onClick={assignSelected}
          >
            {assigning ? "计算几何指纹…" : "指派当前节点"}<ChevronRight size={15} />
          </button>
          <button className="export-button" type="button" disabled={!Object.keys(assignments).length} onClick={exportManifest}>
            <Download size={15} /> 导出模块清单
          </button>
          <p>导出的指纹与品牌 GLB 转换脚本使用同一算法，可用于审核下一版 CAD 映射。</p>
        </section>

        <footer className="model-stats">
          <span>MODEL STATISTICS</span>
          <div><b>{result?.meshes?.length || 0}</b><small>网格</small></div>
          <div><b>{triangleCount.toLocaleString()}</b><small>三角面</small></div>
        </footer>
      </aside>
    </div>
  );
}
