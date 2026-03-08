const pageEl = document.getElementById("page");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageIndicator = document.getElementById("page-indicator");
const tapeList = document.getElementById("tape-list");
const stickerList = document.getElementById("sticker-list");
const textInput = document.getElementById("text-input");
const addTextBtn = document.getElementById("add-text-btn");
const insertDateWeatherBtn = document.getElementById("insert-date-weather-btn");
const autoLayoutBtn = document.getElementById("auto-layout-btn");
const clearPageBtn = document.getElementById("clear-page-btn");
const itemTpl = document.getElementById("item-template");
const posterSource = document.getElementById("poster-source");
const posterQuery = document.getElementById("poster-query");
const posterSearchBtn = document.getElementById("poster-search-btn");
const posterStatus = document.getElementById("poster-status");
const posterResults = document.getElementById("poster-results");
const openEmojiSelectorBtn = document.getElementById("open-emoji-selector");
const emojiSelectorWrap = document.getElementById("emoji-selector-wrap");
const emojiPicker = document.getElementById("emoji-picker");

const PAGE_COUNT = 6;
const pages = Array.from({ length: PAGE_COUNT }, () => []);
let currentPage = 0;
let selectedNode = null;

const tapes = [
  { name: "米色纸胶", color: "#d8c4a7" },
  { name: "天空蓝胶带", color: "#9bc5db" },
  { name: "薄荷绿胶带", color: "#a8d3bf" },
  { name: "杏粉胶带", color: "#e1b2a6" },
];

const stickers = ["🌼", "🧸", "🪴", "✨", "🍓", "📷", "🕯️", "🦊"];
let emojiPickerBound = false;
let emojiPickerLoaded = false;
const mockPosters = [
  { title: "Casablanca", year: "1942", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/CasablancaPoster-Gold.jpg" },
  { title: "A Streetcar Named Desire", year: "1951", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/A%20Streetcar%20Named%20Desire%20%281951%29.jpg" },
  { title: "Dial M for Murder", year: "1954", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Dial%20M%20For%20Murder.jpg" },
  { title: "Mister Roberts", year: "1955", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Mister%20Roberts%20%281955%20movie%20poster%29.jpg" },
  { title: "Giant", year: "1956", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Giant%20%281956%29%20poster.jpg" },
  { title: "The Searchers", year: "1956", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/SearchersPoster-BillGold.jpg" },
  { title: "Strangers on a Train", year: "1951", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Strangers%20on%20a%20Train%20%28film%29.jpg" },
  { title: "The Old Man and the Sea", year: "1958", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Old%20Man%20and%20the%20Sea%20%281958%20film%29.jpg" },
  { title: "Yankee Doodle Dandy", year: "1942", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Yankee%20Doodle%20Dandy%20%281942%20poster%29.jpg" },
  { title: "The Music Man", year: "1962", poster_url: "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Music%20Man%20%281962%20film%20poster%20-%20three-sheet%29.jpg" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function renderAssets() {
  tapes.forEach((tape) => {
    const el = document.createElement("button");
    el.className = "asset";
    el.textContent = tape.name;
    el.addEventListener("click", () => addTape(tape));
    tapeList.appendChild(el);
  });

  // Fallback/quick stickers.
  stickers.forEach((sticker) => {
    const el = document.createElement("button");
    el.className = "asset";
    el.textContent = sticker;
    el.addEventListener("click", () => addEmojiTape(sticker));
    stickerList.appendChild(el);
  });
}

async function ensureEmojiPickerLoaded() {
  if (emojiPickerLoaded) {
    return true;
  }
  if (customElements.get("emoji-picker")) {
    emojiPickerLoaded = true;
    return true;
  }
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    emojiPickerLoaded = true;
    return true;
  } catch (_) {
    return false;
  }
}

async function openEmojiSelector() {
  const loaded = await ensureEmojiPickerLoaded();
  if (!loaded) {
    openEmojiSelectorBtn.textContent = "Emoji 组件加载失败（可用下方贴纸）";
    return;
  }
  emojiSelectorWrap.hidden = !emojiSelectorWrap.hidden;
  if (!emojiPickerBound) {
    emojiPicker.addEventListener("emoji-click", (event) => {
      const emoji = event?.detail?.unicode;
      if (emoji) {
        addEmojiTape(emoji);
      }
    });
    emojiPickerBound = true;
  }
}

function updateIndicator() {
  pageIndicator.textContent = `第 ${currentPage + 1} 页 / 共 ${PAGE_COUNT} 页`;
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage === PAGE_COUNT - 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addItem(item) {
  const normalized = { ...item };
  if (typeof normalized.scale !== "number") {
    normalized.scale = 1;
  }
  pages[currentPage].push(normalized);
  appendItemNode(normalized);
}

function addTape(tape) {
  addItem({
    id: uid(),
    type: "tape",
    text: tape.name,
    color: tape.color,
    x: 120,
    y: 120,
    width: 130,
  });
}

function addEmojiTape(emoji) {
  addItem({
    id: uid(),
    type: "tape",
    text: `${emoji} 胶带`,
    color: "#efe3c9",
    emoji,
    x: 120,
    y: 120,
    width: 170,
  });
}

function addSticker(sticker) {
  addItem({
    id: uid(),
    type: "sticker",
    text: sticker,
    x: 220,
    y: 180,
  });
}

function addTextBlock() {
  const text = (textInput.value || "手帐记录").trim();
  addItem({
    id: uid(),
    type: "text",
    text,
    x: 160,
    y: 230,
  });
}

function formatTodayZh() {
  const now = new Date();
  const weekMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}年${m}月${d}日 ${weekMap[now.getDay()]}`;
}

async function insertDateWeatherBlock() {
  if (insertDateWeatherBtn) {
    insertDateWeatherBtn.disabled = true;
    insertDateWeatherBtn.textContent = "正在插入...";
  }
  const dateText = formatTodayZh();
  if (insertDateWeatherBtn) {
    insertDateWeatherBtn.disabled = false;
    insertDateWeatherBtn.textContent = "快速插入今日日期";
  }

  addItem({
    id: uid(),
    type: "text",
    text: dateText,
    x: 140,
    y: 150,
  });
}

function addPosterSticker(poster) {
  addItem({
    id: uid(),
    type: "poster",
    text: poster.title || "Movie Poster",
    imageUrl: poster.poster_url,
    x: 120,
    y: 120,
    width: 128,
  });
}

function toItemNode(item) {
  const node = itemTpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = item.id;
  node.style.left = `${item.x}px`;
  node.style.top = `${item.y}px`;
  node.style.transformOrigin = "center center";
  applyItemScale(item, node);

  if (item.type === "tape") {
    node.classList.add("item-tape");
    node.style.width = `${item.width || 130}px`;
    node.style.background = item.emoji
      ? "transparent"
      : `repeating-linear-gradient(135deg, ${item.color}, ${item.color} 12px, rgba(255,255,255,0.22) 12px, rgba(255,255,255,0.22) 24px)`;
    node.style.borderColor = item.emoji ? "transparent" : "rgba(122, 112, 90, 0.24)";
    node.title = item.text;
    if (item.emoji) {
      const fill = document.createElement("span");
      fill.className = "tape-emoji-fill";
      fill.textContent = buildTapeEmojiText(item.emoji, item.width || 130);
      node.appendChild(fill);
    }
  } else if (item.type === "sticker") {
    node.classList.add("item-sticker");
    node.textContent = item.text;
  } else if (item.type === "poster") {
    node.classList.add("item-poster");
    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.text;
    img.loading = "lazy";
    img.draggable = false;
    if (item.width) {
      img.style.width = `${item.width}px`;
    }
    node.appendChild(img);
  } else {
    node.classList.add("item-text");
    const textEl = document.createElement("div");
    textEl.className = "text-content";
    textEl.textContent = item.text;
    textEl.contentEditable = "false";
    node.appendChild(textEl);
    bindTextEditing(node, textEl, item);
  }

  bindItemResize(node, item);
  if (item.type === "tape") {
    bindTapeWidthResize(node, item);
  }
  bindItemDrag(node, item);
  bindItemWheelScale(node, item);

  return node;
}

function appendItemNode(item) {
  const node = toItemNode(item);
  pageEl.appendChild(node);
  setSelectedNode(node);
}

function applyItemScale(item, node) {
  const scale = clamp(item.scale || 1, 0.4, 3);
  item.scale = scale;
  node.style.transform = `scale(${scale})`;
}

function renderPage() {
  pageEl.innerHTML = "";
  pageEl.classList.remove("flipping");
  void pageEl.offsetWidth;
  pageEl.classList.add("flipping");

  pages[currentPage].forEach((item) => {
    pageEl.appendChild(toItemNode(item));
  });

  updateIndicator();
}

function switchPage(direction) {
  const next = currentPage + direction;
  if (next < 0 || next >= PAGE_COUNT) {
    return;
  }
  currentPage = next;
  renderPage();
}

function bindItemDrag(node, item) {
  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (item.type === "text" && node.classList.contains("is-editing")) {
      return;
    }
    event.preventDefault();
    setSelectedNode(node);

    const rect = pageEl.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const offsetX = event.clientX - nodeRect.left;
    const offsetY = event.clientY - nodeRect.top;

    const onMove = (moveEvent) => {
      const x = clamp(moveEvent.clientX - rect.left - offsetX, 10, rect.width - nodeRect.width - 10);
      const y = clamp(moveEvent.clientY - rect.top - offsetY, 10, rect.height - nodeRect.height - 10);
      item.x = x;
      item.y = y;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function bindTextEditing(node, textEl, item) {
  const stopPointer = (event) => {
    event.stopPropagation();
  };

  const enterEdit = () => {
    node.classList.add("is-editing");
    textEl.contentEditable = "true";
    textEl.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(textEl);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const exitEdit = () => {
    textEl.contentEditable = "false";
    node.classList.remove("is-editing");
    item.text = textEl.textContent || "";
  };

  textEl.addEventListener("pointerdown", stopPointer);
  textEl.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    setSelectedNode(node);
    enterEdit();
  });
  textEl.addEventListener("input", () => {
    item.text = textEl.textContent || "";
  });
  textEl.addEventListener("blur", () => {
    exitEdit();
  });
  textEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      textEl.blur();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      textEl.blur();
    }
  });
}

function setSelectedNode(node) {
  if (selectedNode && selectedNode !== node) {
    selectedNode.classList.remove("is-selected");
  }
  selectedNode = node;
  if (selectedNode) {
    selectedNode.classList.add("is-selected");
  }
}

function clearSelection() {
  if (selectedNode) {
    selectedNode.classList.remove("is-selected");
    selectedNode = null;
  }
}

function bindItemWheelScale(node, item) {
  node.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      item.scale = clamp((item.scale || 1) + delta, 0.4, 3);
      applyItemScale(item, node);
    },
    { passive: false },
  );
}

function bindItemResize(node, item) {
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  node.appendChild(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startScale = item.scale || 1;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const next = clamp(startScale + (dx + dy) / 220, 0.4, 3);
      item.scale = next;
      applyItemScale(item, node);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function bindTapeWidthResize(node, item) {
  const handle = document.createElement("div");
  handle.className = "tape-width-handle";
  node.appendChild(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = item.width || 130;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      item.width = Math.max(72, startWidth + dx);
      node.style.width = `${item.width}px`;
      const fill = node.querySelector(".tape-emoji-fill");
      if (fill && item.emoji) {
        fill.textContent = buildTapeEmojiText(item.emoji, item.width);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function buildTapeEmojiText(emoji, width) {
  const count = Math.max(2, Math.round(width / 22));
  return Array.from({ length: count }, () => emoji).join(" ");
}

function clearCurrentPage() {
  pages[currentPage] = [];
  clearSelection();
  renderPage();
}

function autoLayout() {
  const tapePool = [...tapes];
  const stickerPool = [...stickers];

  pages[currentPage] = [
    {
      id: uid(),
      type: "tape",
      text: tapePool[0].name,
      color: tapePool[0].color,
      x: 70,
      y: 56,
    },
    {
      id: uid(),
      type: "tape",
      text: tapePool[1].name,
      color: tapePool[1].color,
      x: 320,
      y: 330,
    },
    {
      id: uid(),
      type: "sticker",
      text: stickerPool[Math.floor(Math.random() * stickerPool.length)],
      x: 150,
      y: 150,
    },
    {
      id: uid(),
      type: "sticker",
      text: stickerPool[Math.floor(Math.random() * stickerPool.length)],
      x: 420,
      y: 190,
    },
    {
      id: uid(),
      type: "text",
      text: textInput.value.trim() || "今天完成了自动排版！",
      x: 100,
      y: 260,
    },
    {
      id: uid(),
      type: "text",
      text: "记录心情、计划与灵感",
      x: 280,
      y: 96,
    },
  ];

  clearSelection();
  renderPage();
}

function renderPosterResults(posters) {
  posterResults.innerHTML = "";
  posters.forEach((poster) => {
    const card = document.createElement("button");
    card.className = "poster-card";
    card.type = "button";
    card.title = `插入 ${poster.title}`;

    const img = document.createElement("img");
    img.src = poster.poster_url;
    img.alt = poster.title;
    img.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = poster.year ? `${poster.title} (${poster.year})` : poster.title;

    card.appendChild(img);
    card.appendChild(label);
    card.addEventListener("click", () => addPosterSticker(poster));
    posterResults.appendChild(card);
  });
}

function searchMockPosters(query, limit = 10) {
  const q = (query || "").trim().toLowerCase();
  const matched = !q ? mockPosters : mockPosters.filter((p) => p.title.toLowerCase().includes(q));
  return (matched.length ? matched : mockPosters).slice(0, limit);
}

async function searchPosters() {
  const query = (posterQuery.value || "").trim();
  if (!query) {
    posterStatus.textContent = "请先输入电影名。";
    return;
  }

  posterSearchBtn.disabled = true;
  posterStatus.textContent = "正在搜索海报...";
  posterResults.innerHTML = "";

  try {
    if (posterSource.value === "mock") {
      const posters = searchMockPosters(query, 10);
      posterStatus.textContent = `找到 ${posters.length} 张海报，点击即可插入。`;
      renderPosterResults(posters);
      return;
    }

    const endpoint = new URL("api/posters/search", window.location.href);
    const params = new URLSearchParams({
      source: posterSource.value,
      q: query,
      limit: "10",
    });
    endpoint.search = params.toString();
    const res = await fetch(endpoint.toString());

    const contentType = res.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      throw new Error(`接口未返回 JSON（HTTP ${res.status}）。`);
    }

    if (!res.ok) {
      throw new Error(data.error || "海报搜索失败");
    }
    if (!data.posters.length) {
      posterStatus.textContent = "没有找到可用海报。";
      return;
    }
    posterStatus.textContent = `找到 ${data.posters.length} 张海报，点击即可插入。`;
    renderPosterResults(data.posters);
  } catch (err) {
    const fallback = searchMockPosters(query, 10);
    renderPosterResults(fallback);
    posterStatus.textContent = `接口不可用，已切换到本地 Mock 海报（${fallback.length} 张）。`;
  } finally {
    posterSearchBtn.disabled = false;
  }
}

prevBtn.addEventListener("click", () => switchPage(-1));
nextBtn.addEventListener("click", () => switchPage(1));
addTextBtn.addEventListener("click", addTextBlock);
insertDateWeatherBtn.addEventListener("click", insertDateWeatherBlock);
autoLayoutBtn.addEventListener("click", autoLayout);
clearPageBtn.addEventListener("click", clearCurrentPage);
posterSearchBtn.addEventListener("click", searchPosters);
openEmojiSelectorBtn.addEventListener("click", openEmojiSelector);
posterQuery.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchPosters();
  }
});
pageEl.addEventListener("pointerdown", (event) => {
  if (event.target === pageEl) {
    clearSelection();
  }
});

renderAssets();
renderPage();
