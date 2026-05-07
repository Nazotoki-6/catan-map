// ==============================
// 固定プレイヤー設定（6人）
// ==============================
const DEFAULT_PLAYERS = ["かず", "たけ", "たろう", "つよし", "ゆか", "りさ"];

// 最初からチェックを外すメンバー
const DEFAULT_UNCHECKED_PLAYERS = ["つよし", "りさ"];

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

    // つよし・りさは最初からチェックを外す
    cb.checked = !DEFAULT_UNCHECKED_PLAYERS.includes(name);

    cb.addEventListener("change", syncFiveModeByPlayerCountFromDOM);

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
    syncFiveModeByPlayerCountFromDOM();
  };

  wrap.appendChild(toggle);

  // 初期状態でも人数に合わせて5人用モードを自動設定
  syncFiveModeByPlayerCountFromDOM();
});

// ==============================
// ユーティリティ
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
// 選択人数に応じて5人用モードを自動ON/OFF
// ==============================
function getCheckedPlayers() {
  return Array.from(
    document.querySelectorAll("#playerInputArea input[type=checkbox]:checked")
  ).map(cb => cb.value);
}

function syncFiveModeByPlayerCountFromDOM() {
  const checked = getCheckedPlayers();
  const fiveMode = document.getElementById("fiveMode");

  if (!fiveMode) return;

  // 5人以上なら5人用マップを自動ON
  // 4人以下なら通常マップ
  fiveMode.checked = checked.length >= 5;
}

// ==============================
// 「順番決定＆マップ生成」ボタン
// ==============================
document.getElementById("decideAndGenerate").addEventListener("click", () => {
  const checked = getCheckedPlayers();

  if (checked.length < 2) {
    alert("プレイヤーは最低2人必要です。");
    return;
  }

  // 生成前にも人数に合わせて5人用モードを自動設定
  syncFiveModeByPlayerCountFromDOM();

  const order = shuffleCopy(checked);
  const modeText = isFiveSelected() ? "5人用マップ" : "通常マップ";

  document.getElementById("playerOrder").textContent =
    `順番（${modeText}）: ` + order.join(" → ");

  generateMap();

  document.getElementById("decideAndGenerate").textContent = "もう一度生成";
});

// ==============================
// カタンマップ生成に必要な定数・変数
// ==============================
const hexRadius = 50;
const hexWidth = Math.sqrt(3) * hexRadius;
const hexHeight = 2 * hexRadius;

// 4人用の数字チップ袋（18個）
const numberTokens4p = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// 4人用の固定レイアウト（3-4-5-4-3）
const axialLayout = [
  { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
  { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }
];

// 5人用：指定した段数から軸座標を生成
function genAxialsByRows(rows) {
  const radius = Math.max(...rows);
  const all = [];

  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);

    for (let r = r1; r <= r2; r++) {
      all.push({ q, r });
    }
  }

  const rMin = -Math.floor(rows.length / 2);
  const rMax = rMin + rows.length - 1;

  const byR = new Map();

  for (const p of all) {
    if (p.r < rMin || p.r > rMax) continue;

    const arr = byR.get(p.r) || [];
    arr.push(p);
    byR.set(p.r, arr);
  }

  const out = [];

  for (let r = rMin; r <= rMax; r++) {
    const line = (byR.get(r) || []).sort((a, b) => a.q - b.q);
    const L = rows[r - rMin];
    const start = Math.floor((line.length - L) / 2);
    out.push(...line.slice(start, start + L));
  }

  return out;
}

// 地形タイプ定義
const terrainTypes = [
  { type: "木", color: "#228B22" },
  { type: "煉瓦", color: "#B22222" },
  { type: "羊", color: "#7CFC00" },
  { type: "麦", color: "#DAA520" },
  { type: "岩", color: "#A9A9A9" },
  { type: "砂漠", color: "#EDC9AF" }
];

let positions = [];
let coordToIndex = new Map();

// ==============================
// 5人モード判定
// ==============================
function isFiveSelected() {
  return document.getElementById("fiveMode")?.checked === true;
}

// ==============================
// 地形プール（4人用）
// ==============================
function getShuffledTerrainList() {
  const fixed = document.getElementById("fixedTerrain")?.checked;
  let pool;

  if (fixed) {
    // 4人用・固定設定
    pool = [
      ...Array(4).fill("木"),
      ...Array(3).fill("煉瓦"),
      ...Array(4).fill("羊"),
      ...Array(4).fill("麦"),
      ...Array(3).fill("岩"),
      "砂漠"
    ];
  } else {
    // 4人用・ランダム設定
    // 木・煉瓦・羊・麦・岩の中からランダムで2種類を3枚にする
    // 残り3種類は4枚にする
    // 砂漠は1枚
    const resources = ["木", "煉瓦", "羊", "麦", "岩"];
    const threeResources = shuffleCopy(resources).slice(0, 2);

    const counts = {
      木: 4,
      煉瓦: 4,
      羊: 4,
      麦: 4,
      岩: 4,
      砂漠: 1
    };

    threeResources.forEach(resource => {
      counts[resource] = 3;
    });

    pool = [
      ...Array(counts["木"]).fill("木"),
      ...Array(counts["煉瓦"]).fill("煉瓦"),
      ...Array(counts["羊"]).fill("羊"),
      ...Array(counts["麦"]).fill("麦"),
      ...Array(counts["岩"]).fill("岩"),
      ...Array(counts["砂漠"]).fill("砂漠")
    ];
  }

  const arr = pool.map(t => terrainTypes.find(x => x.type === t));
  return shuffleCopy(arr);
}

// ==============================
// 地形プール（5人用）
// ==============================
function getShuffledTerrainList5p() {
  // 5人用・ランダム設定
  // 木・煉瓦・羊・麦・岩の中からランダムで2種類を4枚にする
  // 残り3種類は5枚にする
  // 砂漠は1枚
  const resources = ["木", "煉瓦", "羊", "麦", "岩"];
  const fourResources = shuffleCopy(resources).slice(0, 2);

  const counts = {
    木: 5,
    煉瓦: 5,
    羊: 5,
    麦: 5,
    岩: 5,
    砂漠: 1
  };

  fourResources.forEach(resource => {
    counts[resource] = 4;
  });

  const pool = [
    ...Array(counts["木"]).fill("木"),
    ...Array(counts["煉瓦"]).fill("煉瓦"),
    ...Array(counts["羊"]).fill("羊"),
    ...Array(counts["麦"]).fill("麦"),
    ...Array(counts["岩"]).fill("岩"),
    ...Array(counts["砂漠"]).fill("砂漠")
  ];

  const arr = pool.map(t => terrainTypes.find(x => x.type === t));
  return shuffleCopy(arr);
}

// ==============================
// 隣接計算
// ==============================
function preparePositions(axials) {
  positions = axials.map(({ q, r }, index) => {
    const { x, y } = axialToPixel(q, r);

    return {
      index,
      q,
      r,
      x,
      y,
      neighbors: [],
      tile: null
    };
  });

  coordToIndex = new Map(
    positions.map((p, i) => [`${p.q},${p.r}`, i])
  );

  positions.forEach((a, i) => {
    positions.forEach((b, j) => {
      if (i === j) return;

      const dq = Math.abs(a.q - b.q);
      const dr = Math.abs(a.r - b.r);
      const ds = Math.abs((a.q + a.r) - (b.q + b.r));

      if (Math.max(dq, dr, ds) === 1) {
        a.neighbors.push(j);
      }
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
// 地形割り当て
// ==============================
function assignTerrainWithConstraints(terrainPool) {
  const banAdj = document.getElementById("banSameTerrainAdj")?.checked;

  const order = positions
    .map((p, i) => ({ i, deg: p.neighbors.length }))
    .sort((a, b) => b.deg - a.deg)
    .map(o => o.i);

  function dfs(posIdx, pool) {
    if (posIdx >= order.length) return true;

    const idx = order[posIdx];

    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];

      if (banAdj) {
        const conflict = positions[idx].neighbors.some(
          nIdx => positions[nIdx].tile?.type === t.type
        );

        if (conflict) continue;
      }

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
// 数字袋
// ==============================
function buildNumberBag5p() {
  const bag = [];

  const twoIsDouble = Math.random() < 0.5;
  const twoCount = twoIsDouble ? 2 : 1;
  const twelveCount = twoIsDouble ? 1 : 2;

  for (let i = 0; i < twoCount; i++) bag.push(2);
  for (let i = 0; i < twelveCount; i++) bag.push(12);

  bag.push(3, 3, 11, 11, 11);
  bag.push(4, 4, 10, 10, 10);
  bag.push(5, 5, 9, 9, 9);
  bag.push(6, 6, 8, 8, 8);

  return shuffleCopy(bag);
}

function buildNumberBag(need) {
  if (isFiveSelected()) return buildNumberBag5p();

  const bag = [];

  while (bag.length < need) {
    bag.push(...numberTokens4p);
  }

  bag.length = need;

  return shuffleCopy(bag);
}

// ==============================
// 数字割り当て
// ==============================
function assignNumbersWithConstraints() {
  const landIndices = positions
    .map((p, i) => p.tile?.type !== "砂漠" ? i : -1)
    .filter(i => i >= 0);

  const nums = buildNumberBag(landIndices.length);

  const usedByTerrain = new Map();

  positions.forEach(p => {
    if (p.tile && !usedByTerrain.has(p.tile.type)) {
      usedByTerrain.set(p.tile.type, new Set());
    }
  });

  const placed = Array(positions.length).fill(null);

  const order = positions
    .map((p, i) => ({ i, deg: p.neighbors.length }))
    .sort((a, b) => b.deg - a.deg)
    .map(o => o.i);

  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 1]
  ];

  const neighborAt = (q, r, dx, dy) => {
    return coordToIndex.get(`${q + dx},${r + dy}`);
  };

  function wouldMakeThreeInRow(i, num) {
    const { q, r } = positions[i];

    for (const [dx, dy] of dirs) {
      let count = 1;

      for (let step = 1; step <= 2; step++) {
        const j = neighborAt(q, r, dx * step, dy * step);

        if (j == null || placed[j] !== num) break;

        count++;
      }

      for (let step = 1; step <= 2; step++) {
        const j = neighborAt(q, r, -dx * step, -dy * step);

        if (j == null || placed[j] !== num) break;

        count++;
      }

      if (count >= 3) return true;
    }

    return false;
  }

  function okToPlace(i, num) {
    const tileType = positions[i].tile.type;

    if (tileType === "砂漠") return false;

    const used = usedByTerrain.get(tileType);

    // 同じ地形で同じ数字はNG
    if (used.has(num)) return false;

    // 6・8の隣接は禁止
    if (num === 6 || num === 8) {
      for (const nIdx of positions[i].neighbors) {
        const nNum = placed[nIdx];

        if (nNum === 6 || nNum === 8) return false;
      }
    }

    // 同じ数字の直線3連は禁止
    if (wouldMakeThreeInRow(i, num)) return false;

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

      set.delete(num);
      placed[i] = null;
    }

    return false;
  }

  if (!dfs(0, nums)) return null;

  return placed;
}

// ==============================
// 描画
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
  const isHot = num === 6 || num === 8;

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", 16);
  circle.setAttribute("fill", "white");
  circle.setAttribute("stroke", isHot ? "red" : "#000");
  circle.setAttribute("stroke-width", isHot ? "2.5" : "1.5");

  svg.appendChild(circle);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

  text.setAttribute("x", cx);
  text.setAttribute("y", cy + 5);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "16");
  text.setAttribute("font-weight", "bold");
  text.setAttribute("fill", isHot ? "red" : "black");
  text.textContent = num;

  svg.appendChild(text);
}

function drawStartTile(svg) {
  const x = 400;
  const y = 80;
  const width = 260;
  const height = 70;
  const offset = 50;

  const points = [
    `${x - width / 2},${y}`,
    `${x + width / 2},${y}`,
    `${x + width / 2 - offset},${y + height}`,
    `${x - width / 2 + offset},${y + height}`
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
  arrow.setAttribute("font-size", "36");
  arrow.setAttribute("font-weight", "900");
  arrow.setAttribute("fill", "red");
  arrow.setAttribute("stroke", "red");
  arrow.setAttribute("stroke-width", "1.5");
  arrow.setAttribute("paint-order", "stroke");
  arrow.textContent = Math.random() < 0.5 ? "→" : "←";

  svg.appendChild(arrow);
}

// ==============================
// 生成フロー
// ==============================
function generateMap() {
  const svg = document.getElementById("map");

  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 800 700");

  drawStartTile(svg);

  const five = isFiveSelected();

  const axials = five
    ? genAxialsByRows([4, 5, 6, 5, 4])
    : axialLayout.slice();

  preparePositions(axials);

  const terrainPool = five
    ? getShuffledTerrainList5p()
    : getShuffledTerrainList();

  let ok = assignTerrainWithConstraints(terrainPool);
  let tries = 0;

  // 生成失敗を減らすため、50回まで再挑戦します
  while (!ok && tries < 50) {
    shuffleArray(terrainPool);
    ok = assignTerrainWithConstraints(terrainPool);
    tries++;
  }

  if (!ok) {
    alert("地形配置に失敗しました。もう一度お試しください。");
    return;
  }

  positions.forEach(pos => {
    drawHex(svg, pos.x, pos.y, pos.tile.color);
  });

  let placed = assignNumbersWithConstraints();
  let numTries = 0;

  // 数字配置も50回まで再挑戦します
  while (!placed && numTries < 50) {
    placed = assignNumbersWithConstraints();
    numTries++;
  }

  if (!placed) {
    alert("数字配置に失敗しました。再生成してください。");
    return;
  }

  placed.forEach((num, i) => {
    if (num !== null) {
      drawNumber(svg, positions[i].x, positions[i].y, num);
    }
  });

  showTerrainCounts();
  showSeaOrder();
}

// ==============================
// 情報表示
// ==============================
function showTerrainCounts() {
  const counts = {
    木: 0,
    煉瓦: 0,
    羊: 0,
    麦: 0,
    岩: 0,
    砂漠: 0
  };

  for (const p of positions) {
    if (!p.tile?.type) continue;

    counts[p.tile.type] = (counts[p.tile.type] || 0) + 1;
  }

  const resources = ["木", "煉瓦", "羊", "麦", "岩"];
  const fixed = document.getElementById("fixedTerrain")?.checked;
  const five = isFiveSelected();

  let html = "<strong>地形タイルの内訳:</strong><br>";

  // 今回のランダム設定をわかりやすく表示
  if (five) {
    const fourResources = resources.filter(r => counts[r] === 4);
    const fiveResources = resources.filter(r => counts[r] === 5);

    html += "<div style='margin: 6px 0; padding: 6px; background: #eef6ff; border-radius: 4px;'>";
    html += "<strong>今回の5人用ランダム設定:</strong><br>";
    html += `4枚の資源：${fourResources.join("・")}<br>`;
    html += `5枚の資源：${fiveResources.join("・")}`;
    html += "</div>";
  } else if (fixed) {
    html += "<div style='margin: 6px 0; padding: 6px; background: #fff8dc; border-radius: 4px;'>";
    html += "<strong>今回の4人用設定:</strong><br>";
    html += "固定設定です";
    html += "</div>";
  } else {
    const threeResources = resources.filter(r => counts[r] === 3);
    const fourResources = resources.filter(r => counts[r] === 4);

    html += "<div style='margin: 6px 0; padding: 6px; background: #eef6ff; border-radius: 4px;'>";
    html += "<strong>今回の4人用ランダム設定:</strong><br>";
    html += `3枚の資源：${threeResources.join("・")}<br>`;
    html += `4枚の資源：${fourResources.join("・")}`;
    html += "</div>";
  }

  const order = ["木", "煉瓦", "羊", "麦", "岩", "砂漠"];

  for (const key of order) {
    html += `${key} --- ${counts[key]}枚<br>`;
  }

  document.getElementById("terrainCountDisplay").innerHTML = html;
}

function showSeaOrder() {
  const baseLabels = ["木", "煉瓦", "羊", "麦", "岩", "？"];

  if (!isFiveSelected()) {
    const shuffled = shuffleCopy(baseLabels);

    const html =
      "🧭 <strong>海タイルの順番:</strong><br>スタート から " +
      shuffled.join(" → ");

    document.getElementById("seaOrderDisplay").innerHTML = html;

    return;
  }

  const smallPool = ["小無", "小無", "小？", "小羊"];
  const base = shuffleCopy(baseLabels);
  const small = shuffleCopy(smallPool);
  const seq = [];

  if (base.length) seq.push(base.pop());

  seq.push(small.length ? small.pop() : "小無");

  for (let i = 0; i < 3; i++) {
    if (base.length === 0) {
      base.push(...shuffleCopy(baseLabels));
    }

    seq.push(base.pop());
  }

  seq.push(small.length ? small.pop() : "小？");

  for (let i = 0; i < 2; i++) {
    if (base.length === 0) {
      base.push(...shuffleCopy(baseLabels));
    }

    seq.push(base.pop());
  }

  const html =
    "🧭 <strong>海タイルの順番（5人用）:</strong><br>スタート から " +
    seq.join(" → ");

  document.getElementById("seaOrderDisplay").innerHTML = html;
}
