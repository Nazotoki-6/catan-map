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

const numberTokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const axialLayout = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }
];

const terrainTypes = [
  { type: "木", color: "#228B22" },
  { type: "煉瓦", color: "#B22222" },
  { type: "羊", color: "#7CFC00" },
  { type: "麦", color: "#DAA520" },
  { type: "岩", color: "#A9A9A9" },
  { type: "砂漠", color: "#EDC9Af" }
];

let positions = []; // { index, q, r, x, y, neighbors[], tile }

// ==============================
// 地形プール（固定/ランダム切り替え）
// ==============================
function getShuffledTerrainList() {
  const fixed = document.getElementById("fixedTerrain")?.checked;
  let pool;

  if (fixed) {
    pool = [
      ...Array(4).fill("木"),
      ...Array(3).fill("煉瓦"),
      ...Array(4).fill("羊"),
      ...Array(4).fill("麦"),
      ...Array(3).fill("岩"),
      "砂漠"
    ];
  } else {
    // ランダム：木＋煉瓦=7、麦＋岩=7、羊=4、砂漠=1
    const woodCount = Math.random() < 0.5 ? 4 : 3;
    const brickCount = 7 - woodCount;
    const wheatCount = Math.random() < 0.5 ? 4 : 3;
    const oreCount = 7 - wheatCount;
    pool = [
      ...Array(woodCount).fill("木"),
      ...Array(brickCount).fill("煉瓦"),
      ...Array(4).fill("羊"),
      ...Array(wheatCount).fill("麦"),
      ...Array(oreCount).fill("岩"),
      "砂漠"
    ];
  }

  // オブジェクト化してシャッフル
  const arr = pool.map(t => terrainTypes.find(x => x.type === t));
  return shuffleCopy(arr);
}

// ==============================
// 隣接計算（六角グリッド）
// ==============================
function preparePositions() {
  positions = axialLayout.map(({ q, r }, index) => {
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
  // 難しい地点から埋めると成功率UP：次数（隣接数）が多い順に並べ替え
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
function assignNumbersWithConstraints() {
  const nums = shuffleCopy(numberTokens); // ちょっとランダム性を出す
  const usedByTerrain = new Map(); // 地形タイプ -> Set(使った数字)
  positions.forEach(p => {
    if (p.tile && !usedByTerrain.has(p.tile.type)) usedByTerrain.set(p.tile.type, new Set());
  });

  const placed = Array(positions.length).fill(null);

  // 難所（隣接多い）から置く
  const order = positions
    .map((p, i) => ({ i, deg: p.neighbors.length, desert: p.tile.type === "砂漠" }))
    .sort((a, b) => (b.deg - a.deg)) // 砂漠は後回しになる
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
  const width = 160, height = 70, offset = 50;
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
  preparePositions();

  const terrainPool = getShuffledTerrainList();

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

  // 数字割り当て（同地形で同数字NG、6/8隣接NG）
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

function showSeaOrder() {
  const labels = ["木", "煉瓦", "羊", "麦", "岩", "？"];
  const shuffled = shuffleCopy(labels);
  const html = "<strong>海タイルの順番:</strong><br>スタート から " + shuffled.join(" → ");
  document.getElementById("seaOrderDisplay").innerHTML = html;
}
