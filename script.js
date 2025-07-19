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

const harborPositions = [
  { q: -3, r: 2 }, { q: -2, r: 3 }, { q: -1, r: -2 },
  { q: 1, r: -3 }, { q: 3, r: -3 }, { q: 3, r: -1 },
  { q: 0, r: 3 }, { q: -3, r: 0 }, { q: 2, r: 1 }
];

const harborLabels = ["木", "煉瓦", "羊", "麦", "岩", "？", "？", "？", "？"];

let positions = [];

document.getElementById("generateButton").addEventListener("click", generateMap);
function generateMap() {
  const svg = document.getElementById("map");
  svg.innerHTML = "";

  drawSeaTiles(svg);
  preparePositions();

  const terrainPool = getShuffledTerrainList();
  if (!assignTerrain(0, terrainPool)) {
    alert("地形配置に失敗しました。");
    return;
  }

  positions.forEach(pos => drawHex(svg, pos.x, pos.y, pos.tile.color));

  const numbers = [...numberTokens];
  let validNumbers = false;
  let placed = [];

  while (!validNumbers) {
    shuffleArray(numbers);
    placed = [];
    validNumbers = true;
    let idx = 0;
    const terrainToRedToken = {};

    for (let pos of positions) {
      if (pos.tile.type === "砂漠") {
        placed.push(null);
        continue;
      }

      const num = numbers[idx++];
      const terrainType = pos.tile.type;
      const neighbors = pos.neighbors.map(i => placed[i]).filter(n => n !== null);

      if ((num === 6 || num === 8) && (neighbors.includes(6) || neighbors.includes(8))) {
        validNumbers = false;
        break;
      }

      if ((num === 6 || num === 8) && terrainToRedToken[terrainType]) {
        validNumbers = false;
        break;
      }

      if (num === 6 || num === 8) {
        terrainToRedToken[terrainType] = num;
      }

      placed.push(num);
    }
  }

  placed.forEach((num, i) => {
    if (num !== null) drawNumber(svg, positions[i].x, positions[i].y, num);
  });

  drawHarbors(svg);
  showTerrainCounts(); // 地形枚数を表示
}
function preparePositions() {
  positions = axialLayout.map(({ q, r }, index) => {
    const { x, y } = axialToPixel(q, r);
    return { index, q, r, x, y, neighbors: [], tile: null };
  });

  positions.forEach((pos, i) => {
    positions.forEach((other, j) => {
      if (i !== j) {
        const dq = Math.abs(pos.q - other.q);
        const dr = Math.abs(pos.r - other.r);
        const ds = Math.abs((pos.q + pos.r) - (other.q + other.r));
        if (Math.max(dq, dr, ds) === 1) pos.neighbors.push(j);
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
  text.setAttribute("fill", num === 6 || num === 8 ? "red" : "black");
  text.textContent = num;
  svg.appendChild(text);
}
function getShuffledTerrainList() {
  const woodCount = Math.random() < 0.5 ? 4 : 3;
  const brickCount = 7 - woodCount;
  const wheatCount = Math.random() < 0.5 ? 4 : 3;
  const oreCount = 7 - wheatCount;

  return shuffleCopy([
    ...Array(woodCount).fill({ type: "木", color: "#228B22" }),
    ...Array(brickCount).fill({ type: "煉瓦", color: "#B22222" }),
    ...Array(4).fill({ type: "羊", color: "#ADFF2F" }),
    ...Array(wheatCount).fill({ type: "麦", color: "#FFD700" }),
    ...Array(oreCount).fill({ type: "岩", color: "#A9A9A9" }),
    { type: "砂漠", color: "#F5DEB3" }
  ]);
}

function assignTerrain(index, terrainPool) {
  if (index >= positions.length) return true;
  for (let i = 0; i < terrainPool.length; i++) {
    const terrain = terrainPool[i];
    if (!positions[index].neighbors.some(nIdx => positions[nIdx].tile?.type === terrain.type)) {
      positions[index].tile = terrain;
      const newPool = [...terrainPool];
      newPool.splice(i, 1);
      if (assignTerrain(index + 1, newPool)) return true;
      positions[index].tile = null;
    }
  }
  return false;
}

function getSeaTileCoordinates() {
  const islandSet = new Set(axialLayout.map(p => `${p.q},${p.r}`));
  const seaSet = new Set();
  const directions = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];

  axialLayout.forEach(({ q, r }) => {
    directions.forEach(([dq, dr]) => {
      const neighbor = `${q + dq},${r + dr}`;
      if (!islandSet.has(neighbor)) seaSet.add(neighbor);
    });
  });

  return Array.from(seaSet).map(str => {
    const [q, r] = str.split(",").map(Number);
    return { q, r };
  });
}

function drawSeaTiles(svg) {
  getSeaTileCoordinates().forEach(({ q, r }) => {
    const { x, y } = axialToPixel(q, r);
    drawHex(svg, x, y, "#87CEFA");
  });
}
function getShuffledHarborData() {
  let valid = false;
  let labels = [];

  while (!valid) {
    const shuffled = shuffleCopy(harborLabels);
    valid = true;
    for (let i = 0; i < shuffled.length - 1; i++) {
      if (shuffled[i] === "？" && shuffled[i + 1] === "？") {
        valid = false;
        break;
      }
    }
    if (valid) labels = shuffled;
  }

  return harborPositions.map((pos, i) => ({
    q: pos.q,
    r: pos.r,
    label: labels[i]
  }));
}

function drawHarbors(svg) {
  const harborData = getShuffledHarborData();

  harborData.forEach(({ q, r, label }) => {
    const { x, y } = axialToPixel(q, r);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "16");
    text.setAttribute("fill", "black");
    text.setAttribute("font-weight", "bold");
    text.textContent = label;
    svg.appendChild(text);
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function shuffleCopy(arr) {
  const copy = [...arr];
  shuffleArray(copy);
  return copy;
}
// プレイヤーの順番をランダムに表示
document.getElementById("shufflePlayers").addEventListener("click", () => {
  const inputs = document.querySelectorAll("#playerInputArea input");
  const names = Array.from(inputs)
    .map(input => input.value.trim())
    .filter(name => name !== "");

  if (names.length < 2) {
    alert("プレイヤーは最低2人必要です。");
    return;
  }

  const shuffled = shuffleCopy(names);
  document.getElementById("playerOrder").textContent = "順番: " + shuffled.join(" → ");

  document.getElementById("generateButton").disabled = false;
});

// 地形ごとの枚数を表示
function showTerrainCounts() {
  const counts = {};
  for (const pos of positions) {
    const type = pos.tile?.type;
    if (!type || type === "砂漠") continue;
    counts[type] = (counts[type] || 0) + 1;
  }

  let html = "<strong>地形タイルの内訳:</strong><br>";
  for (const [type, count] of Object.entries(counts)) {
    html += `${type} --- ${count}枚<br>`;
  }

  document.getElementById("terrainCountDisplay").innerHTML = html;
}
