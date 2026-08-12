// Curated against the W1000 x D1000 x H2300 left-opening SNAPOD-S STEP.
// Geometry fingerprints deliberately replace positional child indexes. A changed
// CAD revision must be reviewed and receive a new manifest/source hash instead of
// silently inheriting an obsolete assembly map.
export const SNAPOD_ASSEMBLY_MANIFEST = {
  id: "SNAPOD-S-W1000D1000H2300-LH-v1",
  sourceSha256: "79ab7e5de60f5f7329a8d52c12e3778229ad92424691b7e2e64c09561d25d6f8",
  fingerprintVersion: 1,
  modules: {
    base: {
      label: "底座・換気",
      install: [0, 0],
      explodeOffset: [0, 0, 0],
    },
    "frame-core": {
      label: "構造フレーム",
      install: [0.02, 0.14],
      explodeOffset: [0, 0.46, 0],
    },
    "rear-wall": {
      label: "背面吸音パネル",
      install: [0.16, 0.32],
      explodeOffset: [0, 0, -0.78],
    },
    "service-wall": {
      label: "設備側パネル",
      install: [0.24, 0.4],
      explodeOffset: [0, 0, 0.78],
    },
    "fixed-glass": {
      label: "固定ガラス",
      install: [0.34, 0.5],
      explodeOffset: [0.72, 0, 0],
    },
    roof: {
      label: "トップユニット",
      install: [0.5, 0.62],
      explodeOffset: [0, 0.78, 0],
    },
    "door-jamb": {
      label: "ドア枠",
      install: [0.62, 0.72],
      explodeOffset: [-0.46, 0, -0.03],
    },
    "door-leaf": {
      label: "ドアユニット",
      install: [0.68, 0.88],
      explodeOffset: [-0.86, 0, -0.08],
    },
    "column-covers": {
      label: "コーナーカバー",
      install: [0.86, 0.94],
      explodeOffset: [0, 0, 0],
    },
    carpet: {
      label: "床カーペット",
      install: [0.94, 1],
      explodeOffset: [0, -0.34, 0.34],
    },
  },
  nodes: {
    e69a93b4b1f9a22f8415: { partId: "base-shell", moduleId: "base" },
    d7686a26fbc3bad90a58: { partId: "frame-core-xp-zn", moduleId: "frame-core" },
    "7ba83ca20de1ae24b389": {
      partId: "column-cover-xn-zp",
      moduleId: "column-covers",
      explodeOffset: [-0.2, 0, 0.2],
    },
    "3fc1ede087c9f0bafd35": {
      partId: "column-cover-xp-zn",
      moduleId: "column-covers",
      explodeOffset: [0.2, 0, -0.2],
    },
    "4bbdcc814e9285045903": {
      partId: "column-cover-xp-zp",
      moduleId: "column-covers",
      explodeOffset: [0.2, 0, 0.2],
    },
    c43fb84840e42fa5f228: { partId: "frame-core-xp-zp", moduleId: "frame-core" },
    "6a1fdde1d340dbd8fb1d": { partId: "frame-core-xn-zn", moduleId: "frame-core" },
    "1025c66a19073437c442": {
      partId: "column-cover-xn-zn",
      moduleId: "column-covers",
      explodeOffset: [-0.2, 0, -0.2],
    },
    d1ea32511e1d993f02e9: { partId: "roof-corner-xp-zn", moduleId: "roof" },
    a74182eb310889c4a666: { partId: "roof-corner-xn-zn", moduleId: "roof" },
    a965de6dcdc10ee7a88f: { partId: "roof-main", moduleId: "roof" },
    b69102667d9a7219f90f: { partId: "fixed-glass-assembly", moduleId: "fixed-glass" },
    f114e05c21ee2f2f3d14: { partId: "roof-corner-xp-zp", moduleId: "roof" },
    f859ac3bac8dfcaa83ad: { partId: "roof-corner-xn-zp", moduleId: "roof" },
    "9f4b8ac98fe5cacb7d7b": { partId: "base-power-inlet", moduleId: "base" },
    "8d36079eaa2fe2891ab3": { partId: "frame-core-xn-zp", moduleId: "frame-core" },
    "04da43b053f9d9fbc561": { partId: "door-assembly", moduleId: "door-special" },
    c8a6d8bc008f0b18ee11: { partId: "rear-wall-core", moduleId: "rear-wall" },
    "54595f413751398ca3ad": { partId: "service-wall-inner-skin", moduleId: "service-wall" },
    "98cadd5c866b210012c2": { partId: "service-wall-outer-skin", moduleId: "service-wall" },
    ed58b60f0ea761d471c0: { partId: "base-service-cover", moduleId: "base" },
    "8cd6343b0c3e104fa50d": { partId: "base-air-inlet", moduleId: "base" },
    "5b610b2c642de91c9851": { partId: "service-wall-core", moduleId: "service-wall" },
    "8c3ac5a131f9e795b9bc": { partId: "base-vent-grille", moduleId: "base" },
    "39701254933bd793a3c8": { partId: "rear-wall-inner-skin", moduleId: "rear-wall" },
    e60a63991e122a32d645: { partId: "rear-wall-outer-skin", moduleId: "rear-wall" },
  },
  carpetMeshFingerprint: "c7fccb1070c8f07acc3f",
  door: {
    hingePositionMeters: [-0.4808, 0, -0.408],
    hingeAxis: [0, 1, 0],
    openAngleDegrees: -72,
    jambMeshFingerprints: [
      "b45f62f51bf8311cd71f",
      "f5ce6066c829da5b0a0f",
      "9c0a796857a65462a30b",
      "8bf974482478e2aeb487",
      "10dc01ac4cb5c2685907",
      "efa1aa947493bf395b3a",
      "7dd7e6158e71ec99c7dc",
      "4c24f127e3b73dfa0ae2",
      "c7710872fb0e1092c330",
      "a08027b81cad994345a5",
    ],
  },
};
