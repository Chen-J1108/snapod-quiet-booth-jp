/* global occtimportjs */
let occtPromise = null;

function getOcct() {
  if (!occtPromise) {
    const libraryUrl = new URL("occt-import-js/occt-import-js.js", self.location.href).href;
    const wasmBase = new URL("occt-import-js/", self.location.href).href;
    self.importScripts(libraryUrl);
    occtPromise = occtimportjs({ locateFile: (file) => `${wasmBase}${file}` });
  }
  return occtPromise;
}

self.addEventListener("message", async (event) => {
  const { id, buffer, filename } = event.data || {};
  if (!id || !buffer) return;

  try {
    self.postMessage({ id, type: "progress", phase: "WASM", message: "OpenCascade を初期化中" });
    const occt = await getOcct();
    const extension = String(filename || "").toLowerCase().split(".").pop();
    const bytes = new Uint8Array(buffer);
    const params = {
      linearUnit: "millimeter",
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0015,
      angularDeflection: 0.35,
    };

    self.postMessage({ id, type: "progress", phase: "PARSE", message: "CAD 形状を解析中" });
    let result;
    if (extension === "step" || extension === "stp") result = occt.ReadStepFile(bytes, params);
    else if (extension === "iges" || extension === "igs") result = occt.ReadIgesFile(bytes, params);
    else if (extension === "brep") result = occt.ReadBrepFile(bytes, params);
    else throw new Error("対応形式は STEP / IGES / BREP です。");

    if (!result?.success) throw new Error("CAD データを読み取れませんでした。");
    self.postMessage({ id, type: "result", result });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "CAD の解析に失敗しました。",
    });
  }
});
