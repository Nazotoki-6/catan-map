(function () {
  "use strict";

  var TERRAIN_TYPES = ["木", "煉瓦", "羊", "麦", "岩"];
  var DESERT = "砂漠";

  var TERRAIN_COLORS = {
    "木": "#1B5E20",
    "煉瓦": "#B85C38",
    "羊": "#8BC34A",
    "麦": "#F2C94C",
    "岩": "#607D8B",
    "砂漠": "#D7B56D"
  };

  var NUMBER_WEIGHTS = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
  };

  function $(id) {
    return document.getElementById(id);
  }

  function shuffle(array) {
    var copied = array.slice();

    for (var i = copied.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copied[i];
      copied[i] = copied[j];
      copied[j] = temp;
    }

    return copied;
  }

  function choice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function repeat(value, count) {
    var list = [];

    for (var i = 0; i < count; i++) {
      list.push(value);
    }

    return list;
  }

  function safeText(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCheckedPlayers() {
    var checkboxes = document.querySelectorAll("#playerList input[type='checkbox']");
    var players = [];

    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        players.push(checkboxes[i].value);
      }
    }

    return players;
  }

  function syncLargeMode() {
    var players = getCheckedPlayers();
    var largeMapCheck = $("largeMapCheck");
    var fixedTerrainCheck = $("fixedTerrainCheck");

    if (largeMapCheck) {
      largeMapCheck.checked = players.length >= 5;
    }

    if (fixedTerrainCheck) {
      fixedTerrainCheck.disabled = players.length >= 5;
    }
  }

  function getMapMode() {
    var count = getCheckedPlayers().length;

    if (count >= 6) {
      return "6p";
    }

    if (count === 5) {
      return "5p";
    }

    return "4p";
  }

  function getMapModeLabel(mode) {
    if (mode === "6p") {
      return "6人用マップ（3-4-5-6-5-4-3）";
    }

    if (mode === "5p") {
      return "5人用マップ（4-5-6-5-4）";
    }

    return "通常マップ（3-4-5-4-3）";
  }

  function getRowSizes(mode) {
    if (mode === "6p") {
      return [3, 4, 5, 6, 5, 4, 3];
    }

    if (mode === "5p") {
      return [4, 5, 6, 5, 4];
    }

    return [3, 4, 5, 4, 3];
  }

  function buildTiles(mode) {
    var rowSizes = getRowSizes(mode);
    var size = 58;

    if (mode === "5p") {
      size = 52;
    }

    if (mode === "6p") {
      size = 46;
    }

    var hexWidth = Math.sqrt(3) * size;
    var verticalStep = size * 1.5;
    var tiles = [];
    var id = 0;

    for (var row = 0; row < rowSizes.length; row++) {
      var rowSize = rowSizes[row];
      var y = (row - (rowSizes.length - 1) / 2) * verticalStep;

      for (var col = 0; col < rowSize; col++) {
        var x = (col - (rowSize - 1) / 2) * hexWidth;

        tiles.push({
          id: id,
          x: x,
          y: y,
          size: size,
          terrain: null,
          number: null,
          neighbors: []
        });

        id++;
      }
    }

    connectNeighbors(tiles, hexWidth);

    return tiles;
  }

  function connectNeighbors(tiles, hexWidth) {
    var maxDistance = hexWidth * 1.08;

    for (var i = 0; i < tiles.length; i++) {
      for (var j = i + 1; j < tiles.length; j++) {
        var dx = tiles[i].x - tiles[j].x;
        var dy = tiles[i].y - tiles[j].y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1 && distance <= maxDistance) {
          tiles[i].neighbors.push(j);
          tiles[j].neighbors.push(i);
        }
      }
    }
  }

  function getTerrainList(mode) {
    var list = [];

    if (mode === "4p") {
      var fixedCheck = $("fixedTerrainCheck");
      var fixed = fixedCheck && fixedCheck.checked;

      if (fixed) {
        return shuffle([].concat(
          repeat("木", 4),
          repeat("煉瓦", 3),
          repeat("羊", 4),
          repeat("麦", 4),
          repeat("岩", 3),
          [DESERT]
        ));
      }

      var reduced = shuffle(TERRAIN_TYPES).slice(0, 2);

      for (var i = 0; i < TERRAIN_TYPES.length; i++) {
        var terrain = TERRAIN_TYPES[i];
        var count = reduced.indexOf(terrain) >= 0 ? 3 : 4;
        list = list.concat(repeat(terrain, count));
      }

      list.push(DESERT);
      return shuffle(list);
    }

    if (mode === "5p") {
      var reduced5 = shuffle(TERRAIN_TYPES).slice(0, 2);

      for (var j = 0; j < TERRAIN_TYPES.length; j++) {
        var terrain5 = TERRAIN_TYPES[j];
        var count5 = reduced5.indexOf(terrain5) >= 0 ? 4 : 5;
        list = list.concat(repeat(terrain5, count5));
      }

      list.push(DESERT);
      return shuffle(list);
    }

    var increased = shuffle(TERRAIN_TYPES).slice(0, 3);

    for (var k = 0; k < TERRAIN_TYPES.length; k++) {
      var terrain6 = TERRAIN_TYPES[k];
      var count6 = increased.indexOf(terrain6) >= 0 ? 6 : 5;
      list = list.concat(repeat(terrain6, count6));
    }

    list.push(DESERT);
    list.push(DESERT);

    return shuffle(list);
  }

  function sameTerrainIsNotNextToEachOther(tiles) {
    for (var i = 0; i < tiles.length; i++) {
      for (var n = 0; n < tiles[i].neighbors.length; n++) {
        var neighborId = tiles[i].neighbors[n];

        if (tiles[i].terrain === tiles[neighborId].terrain) {
          return false;
        }
      }
    }

    return true;
  }

  function assignTerrain(tiles, terrainList, noSameTerrain) {
    var attemptMax = 3000;

    for (var attempt = 0; attempt < attemptMax; attempt++) {
      var shuffled = shuffle(terrainList);

      for (var i = 0; i < tiles.length; i++) {
        tiles[i].terrain = shuffled[i];
        tiles[i].number = null;
      }

      if (!noSameTerrain || sameTerrainIsNotNextToEachOther(tiles)) {
        return true;
      }
    }

    var fallback = shuffle(terrainList);

    for (var j = 0; j < tiles.length; j++) {
      tiles[j].terrain = fallback[j];
      tiles[j].number = null;
    }

    return false;
  }

  function getNumberBag(mode) {
    if (mode === "6p") {
      return [
        2, 2,
        3, 3, 3,
        4, 4, 4,
        5, 5, 5,
        6, 6, 6,
        8, 8, 8,
        9, 9, 9,
        10, 10, 10,
        11, 11, 11,
        12, 12
      ];
    }

    if (mode === "5p") {
      return [
        2,
        3, 3,
        4, 4, 4,
        5, 5, 5,
        6, 6,
        8, 8,
        9, 9, 9,
        10, 10, 10,
        11, 11,
        12, 12
      ];
    }

    return [
      2,
      3, 3,
      4, 4,
      5, 5,
      6, 6,
      8, 8,
      9, 9,
      10, 10,
      11, 11,
      12
    ];
  }

  function decideMisfortuneRule(mode) {
    if (mode !== "4p") {
      return {
        active: false,
        resource: null
      };
    }

    if (Math.random() < 0.1) {
      return {
        active: true,
        resource: choice(TERRAIN_TYPES)
      };
    }

    return {
      active: false,
      resource: null
    };
  }

  function assignNumbers(tiles, mode, misfortuneRule) {
    var bestResult = null;
    var bestScore = -999999999;
    var attemptMax = 2000;

    if (mode === "5p") {
      attemptMax = 3000;
    }

    if (mode === "6p") {
      attemptMax = 4000;
    }

    for (var attempt = 0; attempt < attemptMax; attempt++) {
      var result = makeNumberPlacementCandidate(tiles, mode, misfortuneRule);
      var score = scoreNumberPlacement(tiles, result);

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    if (!bestResult) {
      bestResult = makeNumberPlacementCandidate(tiles, mode, misfortuneRule);
    }

    for (var i = 0; i < tiles.length; i++) {
      tiles[i].number = bestResult[i];
    }
  }

  function makeNumberPlacementCandidate(tiles, mode, misfortuneRule) {
    var numbers = shuffle(getNumberBag(mode));
    var result = [];
    var fixedTileIds = {};
    var i;

    for (i = 0; i < tiles.length; i++) {
      result.push(null);
    }

    if (misfortuneRule.active) {
      var targetTiles = [];

      for (i = 0; i < tiles.length; i++) {
        if (tiles[i].terrain === misfortuneRule.resource) {
          targetTiles.push(i);
        }
      }

      targetTiles = shuffle(targetTiles);

      var specialNumbers = [3, 3, 11, 11];

      for (var s = 0; s < targetTiles.length && s < specialNumbers.length; s++) {
        var targetId = targetTiles[s];
        var specialNumber = specialNumbers[s];

        if (removeNumberFromList(numbers, specialNumber)) {
          result[targetId] = specialNumber;
          fixedTileIds[targetId] = true;
        }
      }
    }

    numbers = shuffle(numbers);

    var numberIndex = 0;

    for (i = 0; i < tiles.length; i++) {
      if (tiles[i].terrain === DESERT) {
        result[i] = null;
      } else if (!fixedTileIds[i]) {
        result[i] = numbers[numberIndex];
        numberIndex++;
      }
    }

    return result;
  }

  function removeNumberFromList(list, number) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] === number) {
        list.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function scoreNumberPlacement(tiles, result) {
    var hotTileIds = [];

    for (var i = 0; i < tiles.length; i++) {
      if (result[i] === 6 || result[i] === 8) {
        hotTileIds.push(i);
      }
    }

    var score = 0;
    var minimumDistance = 999999;

    for (var a = 0; a < hotTileIds.length; a++) {
      for (var b = a + 1; b < hotTileIds.length; b++) {
        var tileA = tiles[hotTileIds[a]];
        var tileB = tiles[hotTileIds[b]];

        var distance = getTileDistance(tileA, tileB);
        var normalizedDistance = distance / (Math.sqrt(3) * tileA.size);

        if (normalizedDistance < minimumDistance) {
          minimumDistance = normalizedDistance;
        }

        score += normalizedDistance * 100;

        if (normalizedDistance < 1.2) {
          score -= 100000;
        } else if (normalizedDistance < 2.1) {
          score -= 20000;
        } else if (normalizedDistance < 3.1) {
          score -= 3000;
        }
      }
    }

    score += minimumDistance * 10000;
    score += scoreHotNumbersOnEdge(tiles, result);

    return score;
  }

  function getTileDistance(tileA, tileB) {
    var dx = tileA.x - tileB.x;
    var dy = tileA.y - tileB.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  function scoreHotNumbersOnEdge(tiles, result) {
    var score = 0;

    for (var i = 0; i < tiles.length; i++) {
      if (result[i] !== 6 && result[i] !== 8) {
        continue;
      }

      var neighborCount = tiles[i].neighbors.length;

      if (neighborCount <= 3) {
        score += 120;
      } else if (neighborCount === 4) {
        score += 60;
      }
    }

    return score;
  }

  function showOrder(playerOrder) {
    var display = $("orderDisplay");
    var html = '<ol class="order-list">';

    for (var i = 0; i < playerOrder.length; i++) {
      html += "<li>" + safeText(playerOrder[i]) + "</li>";
    }

    html += "</ol>";
    display.innerHTML = html;
  }

  function showCardRoles(playerOrder) {
    var display = $("cardRoleDisplay");
    var roleNames = ["木・レンガ", "麦・岩", "羊"];
    var yukaJoined = false;
    var developmentPlayer = null;
    var candidates = [];

    for (var i = 0; i < playerOrder.length; i++) {
      if (playerOrder[i] === "ゆか") {
        yukaJoined = true;
      }
    }

    if (yukaJoined) {
      developmentPlayer = "ゆか";

      for (var j = 0; j < playerOrder.length; j++) {
        if (playerOrder[j] !== "ゆか") {
          candidates.push(playerOrder[j]);
        }
      }
    } else {
      var shuffledPlayers = shuffle(playerOrder);
      developmentPlayer = shuffledPlayers[0];

      for (var k = 1; k < shuffledPlayers.length; k++) {
        candidates.push(shuffledPlayers[k]);
      }
    }

    candidates = shuffle(candidates);

    var html = '<div class="card-role-box">';

    html += '<div class="card-role-row card-role-fixed">';
    html += '<span>発展カード</span>';

    if (yukaJoined) {
      html += '<strong>' + safeText(developmentPlayer) + '（固定）</strong>';
    } else {
      html += '<strong>' + safeText(developmentPlayer) + '</strong>';
    }

    html += '</div>';

    for (var r = 0; r < roleNames.length; r++) {
      html += '<div class="card-role-row">';
      html += '<span>' + safeText(roleNames[r]) + '</span>';
      html += '<strong>' + safeText(candidates[r] || "未設定") + '</strong>';
      html += '</div>';
    }

    var helpers = candidates.slice(roleNames.length);

    if (helpers.length > 0) {
      html += '<div class="card-role-row card-role-helper">';
      html += '<span>補助係</span>';
      html += '<strong>' + helpers.map(safeText).join("・") + '</strong>';
      html += '</div>';
    }

    html += '</div>';

    display.innerHTML = html;
  }

  function showTerrainCounts(tiles) {
    var display = $("terrainCountDisplay");
    var counts = {
      "木": 0,
      "煉瓦": 0,
      "羊": 0,
      "麦": 0,
      "岩": 0,
      "砂漠": 0
    };

    for (var i = 0; i < tiles.length; i++) {
      counts[tiles[i].terrain]++;
    }

    var order = ["木", "煉瓦", "羊", "麦", "岩", "砂漠"];
    var html = '<div class="terrain-count-box">';

    for (var j = 0; j < order.length; j++) {
      var terrain = order[j];

      html += '<div>';
      html += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + TERRAIN_COLORS[terrain] + ';margin-right:8px;vertical-align:-3px;border:1px solid rgba(0,0,0,0.25);"></span>';
      html += terrain + '：' + counts[terrain] + '枚';
      html += '</div>';
    }

    html += '</div>';

    display.innerHTML = html;
  }

  function showSeaOrder(mode) {
    var display = $("seaOrderDisplay");
    var seaOrder;

    if (mode === "4p") {
      seaOrder = shuffle(["木", "煉瓦", "羊", "麦", "岩", "？"]);
    } else if (mode === "5p") {
      seaOrder = shuffle(["木", "煉瓦", "羊", "麦", "岩", "？", "小無", "小？"]);
    } else {
      seaOrder = shuffle(["木", "煉瓦", "羊", "麦", "岩", "？", "小無", "小？", "小羊", "小木"]);
    }

    display.innerHTML =
      '<div class="sea-order-box">海タイルの順番:<br>スタート から ' +
      seaOrder.join(" → ") +
      '</div>';
  }

  function getRichResource(tiles) {
    var scores = {
      "木": 0,
      "煉瓦": 0,
      "羊": 0,
      "麦": 0,
      "岩": 0
    };

    for (var i = 0; i < tiles.length; i++) {
      var terrain = tiles[i].terrain;

      if (terrain !== DESERT) {
        scores[terrain] += NUMBER_WEIGHTS[tiles[i].number] || 0;
      }
    }

    var best = "木";

    for (var key in scores) {
      if (scores[key] > scores[best]) {
        best = key;
      }
    }

    return best;
  }

  function showMapStory(tiles, misfortuneRule, mode) {
    var display = $("storyDisplay");

    var islandNames = [
      "アオハマ島",
      "風待ち島",
      "白霧のセタラ島",
      "星降るカタン島",
      "赤い灯台の島",
      "暁のロンド島"
    ];

    var places = {
      "木": "深緑の森",
      "煉瓦": "赤土の丘",
      "羊": "白羊の草原",
      "麦": "黄金の麦畑",
      "岩": "銀灰の鉱山"
    };

    var modeText = "静かな通常島";

    if (mode === "5p") {
      modeText = "少し広い海に囲まれた島";
    }

    if (mode === "6p") {
      modeText = "大人数の気配に満ちた広大な島";
    }

    var islandName = choice(islandNames);
    var richResource = getRichResource(tiles);

    var html = '<div class="story-box">';
    html += '<div class="story-title">' + islandName + '</div>';
    html += '<div class="story-subtitle">' + modeText + '</div>';

    html += '<p class="story-text">';
    html += '霧が晴れると、六角形の大地がゆっくりと姿を現しました。';
    html += '</p>';

    html += '<p class="story-text">';
    html += 'この島で特に豊かなのは、' + places[richResource] + 'です。';
    html += 'その土地には強い数字の気配が集まっています。';
    html += '</p>';

    html += '<p class="story-text">';
    html += '島のどこかに眠る砂漠からは、乾いた風が静かに吹き抜けます。';
    html += '</p>';

    if (misfortuneRule.active) {
      html += '<div class="story-warning">';
      html += '不遇資源ルール発動<br>';
      html += '今回の不遇資源：' + misfortuneRule.resource + '<br>';
      html += misfortuneRule.resource + 'には 3・3・11・11 が優先的に配置されます。';
      html += '</div>';
    }

    html += '<p class="story-text">';
    html += '誰が最初に道を伸ばし、誰が海の順番を読み切るのか。';
    html += '今日のカタン島では、資源と交渉と少しの運が、静かに勝者を選びはじめています。';
    html += '</p>';

    html += '</div>';

    display.innerHTML = html;
  }

  function drawHex(ctx, x, y, size, terrain) {
    ctx.beginPath();

    for (var i = 0; i < 6; i++) {
      var angle = Math.PI / 180 * (30 + 60 * i);
      var px = x + size * Math.cos(angle);
      var py = y + size * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();

    ctx.fillStyle = TERRAIN_COLORS[terrain] || "#cccccc";
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  function drawNumber(ctx, x, y, size, number) {
    if (!number) {
      return;
    }

    var radius = size * 0.28;
    var cy = y + size * 0.18;

    ctx.beginPath();
    ctx.arc(x, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f1df";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#5c4630";
    ctx.stroke();

    ctx.fillStyle = number === 6 || number === 8 ? "#c62828" : "#2f2f2f";
    ctx.font = "bold " + Math.round(size * 0.32) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number), x, cy);
  }

  function drawStartTile(ctx, centerX, centerY) {
    var width = 190;
    var height = 95;
    var topWidth = width * 0.62;
    var arrow = Math.random() < 0.5 ? "→" : "←";

    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2, centerY - height / 2);
    ctx.lineTo(centerX + topWidth / 2, centerY - height / 2);
    ctx.lineTo(centerX + width / 2, centerY + height / 2);
    ctx.lineTo(centerX - width / 2, centerY + height / 2);
    ctx.closePath();

    ctx.fillStyle = "#2f80ed";
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#111827";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("スタート", centerX, centerY - 10);

    ctx.fillStyle = "#d00000";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(arrow, centerX, centerY + 28);
  }

  function drawMap(tiles, mode) {
    var canvas = $("mapCanvas");

    if (!canvas) {
      alert("mapCanvas が見つかりません。index.htmlを確認してください。");
      return;
    }

    var ctx = canvas.getContext("2d");

    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    for (var i = 0; i < tiles.length; i++) {
      minX = Math.min(minX, tiles[i].x - tiles[i].size);
      maxX = Math.max(maxX, tiles[i].x + tiles[i].size);
      minY = Math.min(minY, tiles[i].y - tiles[i].size);
      maxY = Math.max(maxY, tiles[i].y + tiles[i].size);
    }

    var paddingX = 90;
    var topPadding = 150;
    var bottomPadding = 70;

    canvas.width = Math.max(760, Math.ceil(maxX - minX + paddingX * 2));
    canvas.height = Math.max(760, Math.ceil(maxY - minY + topPadding + bottomPadding));

    var offsetX = canvas.width / 2 - (minX + maxX) / 2;
    var offsetY = topPadding - minY;

    var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#bfe9ff");
    gradient.addColorStop(1, "#e8f7ff");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawStartTile(ctx, canvas.width / 2, 70);

    for (var j = 0; j < tiles.length; j++) {
      drawHex(
        ctx,
        tiles[j].x + offsetX,
        tiles[j].y + offsetY,
        tiles[j].size,
        tiles[j].terrain
      );
    }

    for (var k = 0; k < tiles.length; k++) {
      if (tiles[k].terrain !== DESERT) {
        drawNumber(
          ctx,
          tiles[k].x + offsetX,
          tiles[k].y + offsetY,
          tiles[k].size,
          tiles[k].number
        );
      }
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(getMapModeLabel(mode), 18, 18);
  }

  function generateMap() {
    try {
      var players = getCheckedPlayers();

      if (players.length < 3) {
        alert("プレイヤーを3人以上選んでください。");
        return;
      }

      syncLargeMode();

      var mode = getMapMode();
      var noSameTerrainCheck = $("noSameTerrainCheck");
      var noSameTerrain = noSameTerrainCheck ? noSameTerrainCheck.checked : true;

      var playerOrder = shuffle(players);
      var tiles = buildTiles(mode);
      var terrainList = getTerrainList(mode);
      var misfortuneRule = decideMisfortuneRule(mode);

      assignTerrain(tiles, terrainList, noSameTerrain);
      assignNumbers(tiles, mode, misfortuneRule);

      showOrder(playerOrder);
      showCardRoles(playerOrder);
      showTerrainCounts(tiles);
      showSeaOrder(mode);
      showMapStory(tiles, misfortuneRule, mode);
      drawMap(tiles, mode);

      $("generateButton").textContent = "もう一度生成";
    } catch (error) {
      alert("エラーが出ました：" + error.message);
      console.error(error);
    }
  }

  function setup() {
    var playerList = $("playerList");
    var toggleAllButton = $("toggleAllButton");
    var generateButton = $("generateButton");

    if (playerList) {
      playerList.addEventListener("change", syncLargeMode);
    }

    if (toggleAllButton) {
      toggleAllButton.addEventListener("click", function () {
        var checkboxes = document.querySelectorAll("#playerList input[type='checkbox']");
        var allChecked = true;

        for (var i = 0; i < checkboxes.length; i++) {
          if (!checkboxes[i].checked) {
            allChecked = false;
            break;
          }
        }

        for (var j = 0; j < checkboxes.length; j++) {
          checkboxes[j].checked = !allChecked;
        }

        syncLargeMode();
      });
    }

    if (generateButton) {
      generateButton.addEventListener("click", generateMap);
    }

    syncLargeMode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
