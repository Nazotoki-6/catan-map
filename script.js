// ==============================
// 固定プレイヤー設定（6人）
// ==============================
const DEFAULT_PLAYERS = ["かず", "たけ", "たろう", "つよし", "ゆか", "りさ"];

// 起動時：プレイヤー選択チェックボックスを描画
document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("playerInputArea");
  if (!wrap) return;

  const title = document.createElement("div");
  title.style.marginBottom = "6px";
  title.style.fontWeight = "bold";
  title.textContent = "参加するプレイヤーを選んでください";
  wrap.appendChild(title);

  const list = document.createElement("div");
  list.className = "player-list";
  DEFAULT_PLAYERS.forEach((name, i) => {
    const id = `player_${i}`;
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = id;
    cb.value = name;
    cb.checked = true; // デフォルトで全員ON
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + name));
    list.appendChild(label);
  });
  wrap.appendChild(list);

  const toggle = document.createElement("button");
  toggle.textContent = "全員ON/OFF";
  toggle.style.marginBottom = "10px";
  toggle.onclick = () => {
    const inputs = list.querySelectorAll("input[type=checkbox]");
    const allChecked = Array.from(inputs).every(i => i.checked);
    inputs.forEach(i => i.checked = !allChecked);
  };
  wrap.appendChild(toggle);
});

// ==============================
// ユーティリティ（シャッフル）
// ==============================
function shuffleCopy(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ==============================
// 「順番決定＆マップ生成」ボタン
// ==============================
document.getElementById("decideAndGenerate").addEventListener("click", () => {
  const checked = Array.from(document.querySelectorAll("#playerInputArea input[type=checkbox]:checked"))
                        .map(cb => cb.value);

  if (checked.length < 2) {
    alert("プレイヤーは最低2人必要です。");
    return;
  }

  const order = shuffleCopy(checked);
  document.getElementById("playerOrder").textContent = "順番: " + order.join(" → ");

  generateMap();
});

// ==============================
// カタンマップ生成に必要な定数・変数
// ==============================
const hexRadius = 50;
const hexWidth = Math.sqrt(3) * hexRadius;
const hexHeight = 2 * hexRadius;

// 基本の数字チップ袋（4人用 18個）
const numberTokens4p = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// 4人用の固定レイアウト（3-4-5-4-3）
const axialLayout = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }
];

const terrainTypes = [
  { type: "木",  color: "#228B22" },
  { type: "煉瓦", color: "#B22222" },
  { type: "羊",  color: "#7CFC00" },
  { type: "麦",  color: "#DAA520" },
  { type: "岩",  color: "#A9A9A9" },
  { type: "砂漠", color: "#EDC9Af" }
];

let positions = []; // { index, q, r, x, y, neighbors[], tile }

// ==============================
// 人数選択UI
// ==============================
function isFiveSelected() {
  return document.getElementById("playerCount")?.value === "5";
}

// 任意段数 rows → 軸座標を生成（行ごと中央寄せ）
function genAxialsByRows(rows) {
  const radius = Math.max(...rows);
  const all = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius,  -q + radius);
    for (let r = r1; r <= r2; r++) all.push({ q, r });
  }
  const rMin = -Math.floor(rows.length / 2);
  const rMax = rMin + rows.length - 1;

  const byR = new Map();
  for (const p of all) {
    if (p.r < rMin || p.r > rMax) continue;
    const arr = byR.get(p.r) || [];
    arr.push(p); byR.set(p.r, arr);
  }

  const out = [];
  for (let r = rMin; r <= rMax; r++) {
    const line = (byR.get(r) || []).sort((a,b)=>a.q-b.q);
    const L = rows[r - rMin];
    const start = Math.floor((line.length - L) / 2);
    out.push(...line.slice(start, start + L));
  }
  return out;
}

// ==============================
// 地形プール（4人用＝14枚ルール／5人用＝前回どおり）
// ==============================

// 4人用：木・煉瓦・麦・岩の合計14枚（＝4枚×2種＋3枚×2種）／羊=4／砂漠=1
// 固定チェックONなら従来の固定配分（木4, 煉瓦3, 羊4, 麦4, 岩3）も選べます。
function getShuffledTerrainList() {
  const fixed = document.getElementById("fixedTerrain")?.checked;
  let pool;

  if (fixed) {
    // 従来の固定配分（19枚）
    pool = [
      ...Array(4).fill("木"),
      ...Array(3).fill("煉瓦"),
      ...Array(4).fill("羊"),
      ...Array(4).fill("麦"),
      ...Array(3).fill("岩"),
      "砂漠"
    ];
  } else {
    // 新ランダム：4になる資源を2つランダムに選び、残り2つは3（木2枚などは発生しない）
    const majors = ["木","煉瓦","麦","岩"];
    const fourUps = shuffleCopy(majors).slice(0, 2);  // 4枚になる資源 2種
    const counts = { 木:3, 煉瓦:3, 麦:3, 岩:3, 羊:4, 砂漠:1 };
    for (const r of fourUps) counts[r] = 4;

    pool = [
      ...Array(counts["木"]).fill("木"),
      ...Array(counts["煉瓦"]).fill("煉瓦"),
      ...Array(counts["羊"]).fill("羊"),
      ...Array(counts["麦"]).fill("麦"),
      ...Array(counts["岩"]).fill("岩"),
      ...Array(counts["砂漠"]).fill("砂漠"),
    ];
  }

  const arr = pool.map(t => terrainTypes.find(x => x.type === t));
  return shuffleCopy(arr);
}

// 5人用：木/煉瓦/麦/岩は各4〜5（2資源だけ5枚）、羊=5、砂漠=1 → 合計24
function getShuffledTerrainList5p() {
  const majors = ["木","煉瓦","麦","岩"];
  const picks  = shuffleCopy(majors).slice(0, 2); // 5枚にする2資源
  const counts = { 木:4, 煉瓦:4, 麦:4, 岩:4, 羊:5, 砂漠:1 };
  for (const p of picks) counts[p] = 5;

  const pool = [
    ...Array(counts["木"]).fill("木"),
    ...Array(counts["煉瓦"]).fill("煉瓦"),
    ...Array(counts["羊"]).fill("羊"),
    ...Array(counts["麦"]).fill("麦"),
    ...Array(counts["岩"]).fill("岩"),
    ...Array(counts["砂漠"]).fill("砂漠"),
  ];
  const arr = pool.map(t => terrainTypes.find(x => x.type === t));
  return shuffleCopy(arr);
}

// ==============================
// 隣接計算（六角グリッド）
// ==============================
function preparePositions(axials) {
  positions = axials.map(({ q, r }, index) => {
    const { x, y } = axialToPixel(q, r);
    return { index, q, r, x, y, neighbors: [], tile: null };
  });

  // 六角距離1を隣接とする
  positions.forEach((a, i) => {
    positions.forEach((b, j) => {
      if (i === j) return;
      const dq = Math.abs(a.q - b.q);
      const dr = Math.abs(a.r - b.r);
      const ds = Math.abs((a.q + a.r) - (b.q + b.r));
      if (Math.max(dq, dr, ds) === 1) a.neighbors.push(j);
    });
  });
}

function axialToPixel(q, r) {
  return {
    x: 400 + hexWidth * (q + r / 2),
    y: 350 + hexHeight * 0.75 * r
  };
}

// ==============================
// 地形割り当て：同地形の隣接禁止（バックトラッキング）
// ==============================
function assignTerrainWithConstraints(terrainPool) {
  // 難しい地点から埋めると成功率UP：次数（隣接数）が多い順
  const order = positions
    .map((p, i) => ({ i, deg: p.neighbors.length }))
    .sort((a, b) => b.deg - a.deg)
    .map(o => o.i);

  function dfs(posIdx, pool) {
    if (posIdx >= order.length) return true;
    const idx = order[posIdx];

    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      // 隣接に同種があれば不可
      const conflict = positions[idx].neighbors.some(nIdx => positions[nIdx].tile?.type === t.type);
      if (conflict) continue;

      positions[idx].tile = t;

      const next = pool.slice();
      next.splice(i, 1);
      if (dfs(posIdx + 1, next)) return true;

      positions[idx].tile = null;
    }
    return false;
  }

  return dfs(0, terrainPool.slice());
}

// ==============================
// 数字割り当て：同地形で同じ数字NG、6/8隣接NG（バックトラッキング）
// ==============================

// 5人用専用の数字袋（計23枚）
// 2×2, 12×1, 3×2 & 11×3, 4×2 & 10×3, 5×2 & 9×3, 6×2 & 8×3
function buildNumberBag5p() {
  const bag = [];
  bag.push(2,2,12);               // 2:2, 12:1
  bag.push(3,3,11,11,11);         // 3:2, 11:3
  bag.push(4,4,10,10,10);         // 4:2, 10:3
  bag.push(5,5,9,9,9);            // 5:2, 9:3
  bag.push(6,6,8,8,8);            // 6:2, 8:3
  return shuffleCopy(bag);         // ランダム順にして配置
}

// 4人用は必要数（18）に合わせて基本袋を使用、5人用は上記の専用袋
function buildNumberBag(need) {
  if (isFiveSelected()) {
    // 5人用は常に上の固定比率袋（needは理論上23）
    return buildNumberBag5p();
  }
  // 4人用：必要数に応じて基本袋を繰り返して切り出し
  const bag = [];
  while (bag.length < need) bag.push(...numberTokens4p);
  bag.length = need;
  return shuffleCopy(bag);
}

function assignNumbersWithConstraints() {
  // 砂漠以外のセル
  const landIndices = positions.map((p,i)=> p.tile?.type !== "砂漠" ? i : -1).filter(i=>i>=0);
  const nums = buildNumberBag(landIndices.length);

  const usedByTerrain = new Map(); // 地形タイプ -> Set(使った数字)
  positions.forEach(p => {
    if (p.tile && !usedByTerrain.has(p.tile.type)) usedByTerrain.set(p.tile.type, new Set());
  });

  const placed = Array(positions.length).fill(null);

  // 難所（隣接多い）から（砂漠は順番上で飛ばす）
  const order = positions
    .map((p, i) => ({ i, deg: p.neighbors.length }))
    .sort((a, b) => (b.deg - a.deg))
    .map(o => o.i);

  function okToPlace(i, num) {
    const tileType = positions[i].tile.type;
    if (tileType === "砂漠") return false;

    // 同地形で同じ数字はNG
    const used = usedByTerrain.get(tileType);
    if (used.has(num)) return false;

    // 6 or 8 は隣接NG
    if (num === 6 || num === 8) {
      for (const nIdx of positions[i].neighbors) {
        const nNum = placed[nIdx];
        if (nNum === 6 || nNum === 8) return false;
      }
    }
    return true;
  }

  function dfs(k, pool) {
    if (k >= order.length) return true;
    const i = order[k];
    if (positions[i].tile.type === "砂漠") {
      placed[i] = null;
      return dfs(k + 1, pool);
    }

    for (let p = 0; p < pool.length; p++) {
      const num = pool[p];
      if (!okToPlace(i, num)) continue;

      placed[i] = num;
      const set = usedByTerrain.get(positions[i].tile.type);
      set.add(num);

      const next = pool.slice();
      next.splice(p, 1);
      if (dfs(k + 1, next)) return true;

      // backtrack
      set.delete(num);
      placed[i] = null;
    }
    return false;
  }

  if (!dfs(0, nums)) return null;
  return placed;
}

// ==============================
// 描画系
// ==============================
function drawHex(svg, cx, cy, fill) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 2;
    const x = cx + hexRadius * Math.cos(angle);
    const y = cy + hexRadius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", points.join(" "));
  polygon.setAttribute("fill", fill);
  polygon.setAttribute("stroke", "#333");
  polygon.setAttribute("stroke-width", "2");
  svg.appendChild(polygon);
}

function drawNumber(svg, cx, cy, num) {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", 15);
  circle.setAttribute("fill", "white");
  circle.setAttribute("stroke", "#000");
  svg.appendChild(circle);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", cx);
  text.setAttribute("y", cy + 5);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "16");
  text.setAttribute("font-weight", "bold");
  text.setAttribute("fill", num === 6 || num === 8 ? "red" : "black");
  text.textContent = num;
  svg.appendChild(text);
}

// スタート台形（上部に表示・矢印は左右ランダム）
function drawStartTile(svg) {
  const x = 400, y = 80;
  const width = 260, height = 70, offset = 50;
  const points = [
    `${x - width/2},${y}`,
    `${x + width/2},${y}`,
    `${x + width/2 - offset},${y + height}`,
    `${x - width/2 + offset},${y + height}`
  ];
  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", points.join(" "));
  polygon.setAttribute("fill", "#87CEEB");
  polygon.setAttribute("stroke", "#333");
  polygon.setAttribute("stroke-width", "2");
  svg.appendChild(polygon);

  const textStart = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textStart.setAttribute("x", x);
  textStart.setAttribute("y", y + 26);
  textStart.setAttribute("text-anchor", "middle");
  textStart.setAttribute("font-size", "20");
  textStart.setAttribute("font-weight", "bold");
  textStart.setAttribute("fill", "black");
  textStart.textContent = "スタート";
  svg.appendChild(textStart);

  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "text");
  arrow.setAttribute("x", x);
  arrow.setAttribute("y", y + 56);
  arrow.setAttribute("text-anchor", "middle");
  arrow.setAttribute("font-size", "34");
  arrow.setAttribute("font-weight", "900");
  arrow.setAttribute("fill", "red");
  arrow.textContent = Math.random() < 0.5 ? "→" : "←";
  svg.appendChild(arrow);
}

// ==============================
// 生成フロー
// ==============================
function generateMap() {
  const svg = document.getElementById("map");
  svg.innerHTML = "";

  drawStartTile(svg);

  const five = isFiveSelected();

  // 段数→座標
  const axials = five ? genAxialsByRows([4,5,6,5,4]) : axialLayout.slice();
  preparePositions(axials);

  // 資源プール（4人用は14枚ルール／5人用は既出ルール）
  const terrainPool = five ? getShuffledTerrainList5p() : getShuffledTerrainList();

  // 地形割り当て（隣接同種なし）— リトライで安定化
  let ok = assignTerrainWithConstraints(terrainPool);
  let tries = 0;
  while (!ok && tries < 8) {
    shuffleArray(terrainPool);
    ok = assignTerrainWithConstraints(terrainPool);
    tries++;
  }
  if (!ok) {
    alert("地形配置（隣接同種なし）に失敗しました。もう一度お試しください。");
    return;
  }

  // 地形描画
  positions.forEach(pos => drawHex(svg, pos.x, pos.y, pos.tile.color));

  // 数字割り当て（同地形で同数字NG、6/8隣接NG）— 5人用は固定比率袋
  const placed = assignNumbersWithConstraints();
  if (!placed) {
    alert("数字配置（制約付き）に失敗しました。再生成してください。");
    return;
  }

  // 数字描画
  placed.forEach((num, i) => {
    if (num !== null) drawNumber(svg, positions[i].x, positions[i].y, num);
  });

  // 表示
  showTerrainCounts();
  showSeaOrder();
}

// ==============================
// 情報表示
// ==============================
function showTerrainCounts() {
  const counts = { "木": 0, "煉瓦": 0, "羊": 0, "麦": 0, "岩": 0, "砂漠": 0 };
  for (const p of positions) {
    if (!p.tile?.type) continue;
    counts[p.tile.type] = (counts[p.tile.type] || 0) + 1;
  }
  let html = "<strong>地形タイルの内訳:</strong><br>";
  const order = ["木", "煉瓦", "羊", "麦", "岩", "砂漠"];
  for (const key of order) html += `${key} --- ${counts[key]}枚<br>`;
  document.getElementById("terrainCountDisplay").innerHTML = html;
}

// 5人用：海タイル順番（新）＝ E → N → E×3 → N → E×2
// E=既存（木/煉瓦/羊/麦/岩/？）、N=小無/小無/小？/小羊（Nは2回出現）
function showSeaOrder() {
  const baseLabels = ["木", "煉瓦", "羊", "麦", "岩", "？"];

  // 4人用は従来通り
  if (!isFiveSelected?.() || !isFiveSelected()) {
    const shuffled = shuffleCopy(baseLabels);
    const html = "<strong>海タイルの順番:</strong><br>スタート から " + shuffled.join(" → ");
    document.getElementById("seaOrderDisplay").innerHTML = html;
    return;
  }

  // 5人用：新たな海タイル（小）
  const smallPool = ["小無", "小無", "小？", "小羊"];
  const base = shuffleCopy(baseLabels);
  const small = shuffleCopy(smallPool);
  const seq = [];

  // E → N → E×3 → N → E×2
  if (base.length) seq.push(base.pop());
  const idxFirstSmall = small.findIndex(s => s === "小無");
  if (idxFirstSmall >= 0) {
    seq.push(small.splice(idxFirstSmall, 1)[0]);
  } else {
    seq.push(small.length ? small.pop() : "小無");
  }
  for (let i = 0; i < 3; i++) {
    if (base.length === 0) base.push(...shuffleCopy(baseLabels));
    seq.push(base.pop());
  }
  seq.push(small.length ? small.pop() : "小？");
  for (let i = 0; i < 2; i++) {
    if (base.length === 0) base.push(...shuffleCopy(baseLabels));
    seq.push(base.pop());
  }

  const html = "<strong>海タイルの順番（5人用）:</strong><br>スタート から " + seq.join(" → ");
  document.getElementById("seaOrderDisplay").innerHTML = html;
}
