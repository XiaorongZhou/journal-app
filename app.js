const pageEl = document.getElementById("page");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const pageIndicator = document.getElementById("page-indicator");
const saveStatus = document.getElementById("save-status");
const layerMeta = document.getElementById("layer-meta");
const bringFrontBtn = document.getElementById("bring-front-btn");
const sendBackBtn = document.getElementById("send-back-btn");
const rotateTapeBtn = document.getElementById("rotate-tape-btn");
const removeBgBtn = document.getElementById("remove-bg-btn");
const toggleSnapBtn = document.getElementById("toggle-snap-btn");
const toggleLockBtn = document.getElementById("toggle-lock-btn");
const deleteItemBtn = document.getElementById("delete-item-btn");
const tapeList = document.getElementById("tape-list");
const stickerList = document.getElementById("sticker-list");
const textInput = document.getElementById("text-input");
const textFontFamilyInput = document.getElementById("text-font-family");
const textFontSizeInput = document.getElementById("text-font-size");
const textColorInput = document.getElementById("text-color");
const toggleTextBoldBtn = document.getElementById("toggle-text-bold-btn");
const applyTextStyleBtn = document.getElementById("apply-text-style-btn");
const dateFormatSelect = document.getElementById("date-format-select");
const addTextBtn = document.getElementById("add-text-btn");
const insertDateWeatherBtn = document.getElementById("insert-date-weather-btn");
const autoLayoutBtn = document.getElementById("auto-layout-btn");
const clearPageBtn = document.getElementById("clear-page-btn");
const versionSelect = document.getElementById("version-select");
const restoreVersionBtn = document.getElementById("restore-version-btn");
const saveVersionBtn = document.getElementById("save-version-btn");
const itemTpl = document.getElementById("item-template");
const imageStatus = document.getElementById("image-status");
const manualImageUrlInput = document.getElementById("manual-image-url");
const insertManualImageBtn = document.getElementById("insert-manual-image-btn");
const openEmojiSelectorBtn = document.getElementById("open-emoji-selector");
const closeEmojiSelectorBtn = document.getElementById("close-emoji-selector");
const emojiSelectorWrap = document.getElementById("emoji-selector-wrap");
const emojiPicker = document.getElementById("emoji-picker");

const PAGE_COUNT = 6;
const STORAGE_KEY = "journal_app_state_v1";
const VERSION_STORAGE_KEY = "journal_app_versions_v1";
const MAX_HISTORY = 80;
const MAX_VERSIONS = 30;
const VERSION_MIN_INTERVAL_MS = 2 * 60 * 1000;
const VERSION_MIN_ITEM_DELTA = 2;
const VERSION_MIN_OPS = 8;
const IMAGE_DB_NAME = "journal_app_assets";
const IMAGE_DB_STORE = "images";
const IMAGE_DB_VERSION = 1;
const GRID_SIZE = 12;
const SNAP_THRESHOLD = 8;
const pages = Array.from({ length: PAGE_COUNT }, () => []);

let currentPage = 0;
let selectedNode = null;
let historyStack = [];
let redoStack = [];
let emojiPickerBound = false;
let emojiPickerLoaded = false;
let saveTimer = null;
let wheelSnapshotAt = 0;
let nudgeSnapshotAt = 0;
let imageDbPromise = null;
let snapEnabled = true;
let copiedItem = null;
let versions = [];
let lastVersionAt = 0;
let lastVersionItemCount = 0;
let opsSinceLastVersion = 0;
const posterObjectUrls = new Map();
let guideVertical = null;
let guideHorizontal = null;

const tapes = [
  { name: "米色纸胶", color: "#d8c4a7" },
  { name: "天空蓝胶带", color: "#9bc5db" },
  { name: "薄荷绿胶带", color: "#a8d3bf" },
  { name: "杏粉胶带", color: "#e1b2a6" },
];

const stickers = ["🌼", "🧸", "🪴", "✨", "🍓", "📷", "🕯️", "🦊"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function defaultTextStyle() {
  return {
    fontFamily: "Ma Shan Zheng",
    fontSize: 30,
    color: "#4f5a55",
    fontWeight: "400",
  };
}

function normalizeHexColor(input, fallback = "#4f5a55") {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return value.toLowerCase();
}

function normalizeItem(raw) {
  const item = { ...raw };
  if (!item.id) item.id = uid();
  if (typeof item.x !== "number") item.x = 120;
  if (typeof item.y !== "number") item.y = 120;
  if (typeof item.scale !== "number") item.scale = 1;
  if (typeof item.locked !== "boolean") item.locked = false;
  if (item.type === "tape" && typeof item.width !== "number") item.width = 130;
  if (item.type === "tape" && typeof item.rotation !== "number") item.rotation = 0;
  if (item.type === "poster" && typeof item.width !== "number") item.width = 128;
  if (item.type === "poster" && typeof item.imageRef !== "string") item.imageRef = "";
  if (item.type === "poster" && typeof item.cutout !== "boolean") item.cutout = false;
  if (item.type === "poster" && !item.originalImageUrl && item.imageUrl) item.originalImageUrl = item.imageUrl;
  if (item.type === "text") {
    const defaults = defaultTextStyle();
    item.fontFamily = typeof item.fontFamily === "string" ? item.fontFamily : defaults.fontFamily;
    item.fontSize = clamp(Number(item.fontSize || defaults.fontSize), 14, 72);
    item.color = normalizeHexColor(item.color, defaults.color);
    item.fontWeight = item.fontWeight === "700" ? "700" : "400";
  }
  return item;
}

function openImageDb() {
  if (imageDbPromise) return imageDbPromise;
  imageDbPromise = new Promise((resolve) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGE_DB_STORE)) {
        db.createObjectStore(IMAGE_DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return imageDbPromise;
}

async function putImageBlob(ref, blob) {
  const db = await openImageDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(IMAGE_DB_STORE, "readwrite");
    tx.objectStore(IMAGE_DB_STORE).put(blob, ref);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

async function getImageBlob(ref) {
  if (!ref) return null;
  const db = await openImageDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(IMAGE_DB_STORE, "readonly");
    const req = tx.objectStore(IMAGE_DB_STORE).get(ref);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function deleteImageBlob(ref) {
  if (!ref) return;
  const db = await openImageDb();
  if (!db) return;
  const tx = db.transaction(IMAGE_DB_STORE, "readwrite");
  tx.objectStore(IMAGE_DB_STORE).delete(ref);
}

function revokePosterObjectUrls() {
  posterObjectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  posterObjectUrls.clear();
}

function releasePosterObjectUrl(itemId) {
  const prev = posterObjectUrls.get(itemId);
  if (prev) {
    URL.revokeObjectURL(prev);
    posterObjectUrls.delete(itemId);
  }
}

function ensureGuideElements() {
  if (guideVertical && guideHorizontal) return;
  guideVertical = document.createElement("div");
  guideVertical.className = "guide-line vertical";
  guideHorizontal = document.createElement("div");
  guideHorizontal.className = "guide-line horizontal";
  pageEl.appendChild(guideVertical);
  pageEl.appendChild(guideHorizontal);
}

function hideGuides() {
  if (guideVertical) guideVertical.style.opacity = "0";
  if (guideHorizontal) guideHorizontal.style.opacity = "0";
}

function showVerticalGuide(x) {
  ensureGuideElements();
  guideVertical.style.left = `${x}px`;
  guideVertical.style.opacity = "1";
}

function showHorizontalGuide(y) {
  ensureGuideElements();
  guideHorizontal.style.top = `${y}px`;
  guideHorizontal.style.opacity = "1";
}

function getTextStyleFromInputs() {
  const defaults = defaultTextStyle();
  return {
    fontFamily: textFontFamilyInput?.value || defaults.fontFamily,
    fontSize: clamp(Number(textFontSizeInput?.value || defaults.fontSize), 14, 72),
    color: normalizeHexColor(textColorInput?.value, defaults.color),
    fontWeight: toggleTextBoldBtn?.dataset.bold === "1" ? "700" : "400",
  };
}

function setBoldButtonState(isBold) {
  if (!toggleTextBoldBtn) return;
  toggleTextBoldBtn.dataset.bold = isBold ? "1" : "0";
  toggleTextBoldBtn.textContent = `加粗: ${isBold ? "开" : "关"}`;
}

function syncTextInputsFromItem(item) {
  if (!item || item.type !== "text") return;
  if (textFontFamilyInput) textFontFamilyInput.value = item.fontFamily || "Ma Shan Zheng";
  if (textFontSizeInput) textFontSizeInput.value = String(clamp(Number(item.fontSize || 30), 14, 72));
  if (textColorInput) textColorInput.value = normalizeHexColor(item.color, "#4f5a55");
  setBoldButtonState(item.fontWeight === "700");
}

function applyTextStyleToElement(textEl, item) {
  if (!textEl || !item) return;
  const family = item.fontFamily || "Ma Shan Zheng";
  const size = clamp(Number(item.fontSize || 30), 14, 72);
  const color = normalizeHexColor(item.color, "#4f5a55");
  const weight = item.fontWeight === "700" ? "700" : "400";
  textEl.style.fontFamily = `"${family}", "KaiTi", "STKaiti", "PingFang SC", "Microsoft YaHei", cursive`;
  textEl.style.fontSize = `${size}px`;
  textEl.style.color = color;
  textEl.style.fontWeight = weight;
}

function isTypingContext(target) {
  const tag = target?.tagName;
  if (target?.isContentEditable) return true;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function colorDistanceSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

async function imageToCanvas(image) {
  const maxSide = 1400;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("canvas unavailable");
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

async function fetchBlobFromUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob || blob.size <= 0) return null;
    return blob;
  } catch (_) {
    return null;
  }
}

async function resolvePosterBlob(item, node = null) {
  if (item.imageRef) {
    const blob = await getImageBlob(item.imageRef);
    if (blob) return blob;
  }

  const candidates = [];
  const pushCandidate = (value) => {
    if (!value || typeof value !== "string") return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  pushCandidate(node?.querySelector("img")?.src || "");
  pushCandidate(item.imageUrl || "");
  pushCandidate(item.originalImageUrl || "");
  if (item.imageUrl) pushCandidate(buildImageProxyUrl(item.imageUrl));
  if (item.originalImageUrl) pushCandidate(buildImageProxyUrl(item.originalImageUrl));

  for (const src of candidates) {
    if (!src) continue;
    if (src.startsWith("data:image/")) {
      try {
        return dataUrlToBlob(src);
      } catch (_) {
        continue;
      }
    }
    const blob = await fetchBlobFromUrl(src);
    if (blob) return blob;
  }
  return null;
}

async function removeBackgroundFromBlob(blob) {
  const image = await loadImageFromBlob(blob);
  const canvas = await imageToCanvas(image);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas unavailable");

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const idxOf = (x, y) => (y * width + x) * 4;

  const samples = [];
  const offsets = [0, 2, 6, 10];
  offsets.forEach((offset) => {
    const x1 = Math.min(width - 1, offset);
    const y1 = Math.min(height - 1, offset);
    const x2 = Math.max(0, width - 1 - offset);
    const y2 = Math.max(0, height - 1 - offset);
    samples.push([x1, y1], [x2, y1], [x1, y2], [x2, y2]);
  });
  const bgColors = samples.map(([x, y]) => {
    const i = idxOf(x, y);
    return [data[i], data[i + 1], data[i + 2]];
  });

  const toleranceSq = 52 * 52;
  const softSq = 72 * 72;
  const isBgLike = (x, y) => {
    const i = idxOf(x, y);
    const a = data[i + 3];
    if (a < 8) return true;
    let minDist = Infinity;
    for (const color of bgColors) {
      const dist = colorDistanceSq(data[i], data[i + 1], data[i + 2], color[0], color[1], color[2]);
      if (dist < minDist) minDist = dist;
    }
    return minDist <= toleranceSq;
  };

  const visited = new Uint8Array(width * height);
  const queue = [];
  let head = 0;
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pos = y * width + x;
    if (visited[pos]) return;
    if (!isBgLike(x, y)) return;
    visited[pos] = 1;
    queue.push(pos);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < queue.length) {
    const pos = queue[head];
    head += 1;
    const x = pos % width;
    const y = Math.floor(pos / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  for (let pos = 0; pos < visited.length; pos += 1) {
    const x = pos % width;
    const y = Math.floor(pos / width);
    const i = idxOf(x, y);
    if (visited[pos]) {
      data[i + 3] = 0;
      continue;
    }
    let minDist = Infinity;
    for (const color of bgColors) {
      const dist = colorDistanceSq(data[i], data[i + 1], data[i + 2], color[0], color[1], color[2]);
      if (dist < minDist) minDist = dist;
    }
    if (minDist < softSq) {
      const alpha = data[i + 3];
      const keep = clamp((minDist - toleranceSq) / (softSq - toleranceSq), 0, 1);
      data[i + 3] = Math.round(alpha * keep);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const outBlob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
  if (!outBlob) throw new Error("export failed");
  return outBlob;
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("invalid data url");
  }
  const header = parts[0];
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

async function compressImageBlob(blob, maxSide = 1280, quality = 0.84) {
  if (!(blob instanceof Blob) || !blob.type.startsWith("image/")) return blob;
  if (blob.size <= 380 * 1024) return blob;

  const dataUrl = await readBlobAsDataUrl(blob);
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = dataUrl;
  });

  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(image, 0, 0, width, height);

  const outBlob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || blob), "image/jpeg", quality);
  });
  return outBlob;
}

function clonePages(srcPages) {
  return srcPages.map((page) => page.map((item) => ({ ...item })));
}

function snapshotState() {
  return {
    pages: clonePages(pages),
    currentPage,
  };
}

function countAllItems() {
  return pages.reduce((sum, page) => sum + page.length, 0);
}

function formatVersionTime(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function saveVersions() {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions));
  } catch (_) {
    // ignore version save failures
  }
}

function renderVersionList() {
  if (!versionSelect) return;
  versionSelect.innerHTML = "";
  if (!versions.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无版本";
    versionSelect.appendChild(option);
    if (restoreVersionBtn) restoreVersionBtn.disabled = true;
    return;
  }
  versions.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${formatVersionTime(entry.createdAt)} | ${entry.reason} | ${entry.itemCount}个元素`;
    versionSelect.appendChild(option);
  });
  if (restoreVersionBtn) restoreVersionBtn.disabled = false;
}

function captureVersion(reason = "自动") {
  const snap = snapshotState();
  const entry = {
    id: `v_${Date.now()}_${uid()}`,
    createdAt: Date.now(),
    reason,
    itemCount: countAllItems(),
    snapshot: snap,
  };
  versions.unshift(entry);
  if (versions.length > MAX_VERSIONS) {
    versions = versions.slice(0, MAX_VERSIONS);
  }
  lastVersionAt = entry.createdAt;
  lastVersionItemCount = entry.itemCount;
  opsSinceLastVersion = 0;
  saveVersions();
  renderVersionList();
}

function maybeCaptureAutoVersion() {
  const now = Date.now();
  const itemCount = countAllItems();
  const itemDelta = Math.abs(itemCount - lastVersionItemCount);
  const byItems = itemDelta >= VERSION_MIN_ITEM_DELTA;
  const byTime = now - lastVersionAt >= VERSION_MIN_INTERVAL_MS && opsSinceLastVersion >= 2;
  const byOps = opsSinceLastVersion >= VERSION_MIN_OPS;
  if (!byItems && !byTime && !byOps) return;
  captureVersion("自动");
}

function replacePages(nextPages) {
  pages.splice(0, pages.length);
  for (let i = 0; i < PAGE_COUNT; i += 1) {
    const page = Array.isArray(nextPages[i]) ? nextPages[i] : [];
    pages.push(page.map((item) => normalizeItem(item)));
  }
}

function markSavedStatus(text) {
  if (saveStatus) saveStatus.textContent = text;
}

function saveStateNow() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotState()));
    maybeCaptureAutoVersion();
    markSavedStatus("已保存");
  } catch (error) {
    if (error && error.name === "QuotaExceededError") {
      markSavedStatus("保存失败：本地存储已满，请删除部分大图片后重试");
      return;
    }
    markSavedStatus("保存失败：本地存储不可用");
  }
}

function scheduleSave(delay = 160) {
  opsSinceLastVersion += 1;
  markSavedStatus("保存中...");
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveStateNow();
    saveTimer = null;
  }, delay);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages)) return false;
    replacePages(parsed.pages);
    currentPage = clamp(Number(parsed.currentPage || 0), 0, PAGE_COUNT - 1);
    return true;
  } catch (_) {
    return false;
  }
}

function loadVersions() {
  versions = [];
  try {
    const raw = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!raw) {
      renderVersionList();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      renderVersionList();
      return;
    }
    versions = parsed
      .filter((entry) => entry && entry.id && entry.snapshot && Array.isArray(entry.snapshot.pages))
      .slice(0, MAX_VERSIONS);
    if (versions.length) {
      lastVersionAt = Number(versions[0].createdAt || Date.now());
      lastVersionItemCount = Number(versions[0].itemCount || 0);
    }
  } catch (_) {
    versions = [];
  }
  renderVersionList();
}

function pushHistory() {
  historyStack.push(snapshotState());
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  redoStack = [];
  updateHistoryButtons();
}

function updateHistoryButtons() {
  if (undoBtn) undoBtn.disabled = historyStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function applySnapshot(snapshot) {
  if (!snapshot) return;
  replacePages(snapshot.pages || []);
  currentPage = clamp(Number(snapshot.currentPage || 0), 0, PAGE_COUNT - 1);
  clearSelection();
  renderPage();
  scheduleSave(0);
}

function restoreSelectedVersion() {
  const versionId = versionSelect?.value || "";
  if (!versionId) return;
  const entry = versions.find((item) => item.id === versionId);
  if (!entry || !entry.snapshot) return;
  pushHistory();
  replacePages(entry.snapshot.pages || []);
  currentPage = clamp(Number(entry.snapshot.currentPage || 0), 0, PAGE_COUNT - 1);
  clearSelection();
  renderPage();
  scheduleSave(0);
  markSavedStatus(`已恢复版本 ${formatVersionTime(entry.createdAt)}`);
}

function saveManualVersion() {
  captureVersion("手动");
  markSavedStatus("已创建手动版本");
}

function undoAction() {
  if (!historyStack.length) return;
  redoStack.push(snapshotState());
  const prev = historyStack.pop();
  applySnapshot(prev);
  updateHistoryButtons();
}

function redoAction() {
  if (!redoStack.length) return;
  historyStack.push(snapshotState());
  const next = redoStack.pop();
  applySnapshot(next);
  updateHistoryButtons();
}

function getItemById(itemId) {
  if (!itemId) return null;
  return pages[currentPage].find((item) => item.id === itemId) || null;
}

function getSelectedItem() {
  if (!selectedNode) return null;
  return getItemById(selectedNode.dataset.id);
}

function updateLayerControls() {
  const item = getSelectedItem();
  const enabled = Boolean(item);
  const textEnabled = enabled && item?.type === "text" && !item?.locked;
  const cutoutEnabled = enabled && item?.type === "poster" && !item?.locked;
  if (bringFrontBtn) bringFrontBtn.disabled = !enabled;
  if (sendBackBtn) sendBackBtn.disabled = !enabled;
  if (rotateTapeBtn) rotateTapeBtn.disabled = !enabled || item?.type !== "tape";
  if (removeBgBtn) removeBgBtn.disabled = !cutoutEnabled;
  if (toggleLockBtn) toggleLockBtn.disabled = !enabled;
  if (deleteItemBtn) deleteItemBtn.disabled = !enabled;
  if (applyTextStyleBtn) applyTextStyleBtn.disabled = !textEnabled;

  if (!item) {
    if (layerMeta) layerMeta.textContent = "未选中元素";
    if (toggleLockBtn) toggleLockBtn.textContent = "锁定";
    return;
  }

  const idx = pages[currentPage].findIndex((entry) => entry.id === item.id);
  if (layerMeta) layerMeta.textContent = `类型: ${item.type} | 图层: ${idx + 1}/${pages[currentPage].length}`;
  if (toggleLockBtn) toggleLockBtn.textContent = item.locked ? "解锁" : "锁定";
}

function setSelectedNode(node) {
  if (selectedNode && selectedNode !== node) {
    selectedNode.classList.remove("is-selected");
  }
  selectedNode = node;
  if (selectedNode) {
    selectedNode.classList.add("is-selected");
    if (pageEl && typeof pageEl.focus === "function") {
      pageEl.focus({ preventScroll: true });
    }
    const item = getSelectedItem();
    if (item && item.type === "text") {
      syncTextInputsFromItem(item);
    }
  }
  updateLayerControls();
}

function clearSelection() {
  if (selectedNode) {
    selectedNode.classList.remove("is-selected");
    selectedNode = null;
  }
  hideGuides();
  updateLayerControls();
}

function updateIndicator() {
  pageIndicator.textContent = `第 ${currentPage + 1} 页 / 共 ${PAGE_COUNT} 页`;
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage === PAGE_COUNT - 1;
}

function addItem(rawItem) {
  pushHistory();
  const item = normalizeItem(rawItem);
  pages[currentPage].push(item);
  appendItemNode(item);
  scheduleSave();
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

function addTextBlock() {
  const text = (textInput.value || "手帐记录").trim();
  const style = getTextStyleFromInputs();
  addItem({
    id: uid(),
    type: "text",
    text,
    ...style,
    x: 160,
    y: 230,
  });
}

function formatTodayZh() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const weekCn = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mode = dateFormatSelect?.value || "cn-week";
  if (mode === "lunar") {
    try {
      const lunar = new Intl.DateTimeFormat("zh-Hans-CN-u-ca-chinese", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
      return `农历 ${lunar}`;
    } catch (_) {
      return `${yyyy}年${Number(mm)}月${Number(dd)}日 ${weekCn[now.getDay()]}`;
    }
  }
  if (mode === "slash") return `${yyyy}/${mm}/${dd}`;
  if (mode === "dot-week") return `${yyyy}.${mm}.${dd} ${weekEn[now.getDay()]}`;
  return `${yyyy}年${Number(mm)}月${Number(dd)}日 ${weekCn[now.getDay()]}`;
}

function insertDateBlock() {
  if (insertDateWeatherBtn) {
    insertDateWeatherBtn.disabled = true;
    insertDateWeatherBtn.textContent = "正在插入...";
  }

  const style = getTextStyleFromInputs();
  addItem({
    id: uid(),
    type: "text",
    text: formatTodayZh(),
    ...style,
    x: 140,
    y: 150,
  });

  if (insertDateWeatherBtn) {
    insertDateWeatherBtn.disabled = false;
    insertDateWeatherBtn.textContent = "快速插入今日日期";
  }
}

function buildImageProxyUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return rawUrl;
    }
    const endpoint = new URL("api/image-proxy", window.location.href);
    endpoint.search = new URLSearchParams({ url: parsed.toString() }).toString();
    return endpoint.toString();
  } catch (_) {
    return rawUrl;
  }
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

async function addImageSticker(image) {
  const rawUrl = image.image_url || "";
  const isDataUrl = rawUrl.startsWith("data:image/");
  const nextItem = {
    id: uid(),
    type: "poster",
    text: image.title || "Beautiful Image",
    imageUrl: "",
    imageRef: "",
    cutout: false,
    originalImageUrl: rawUrl,
    x: 120,
    y: 120,
    width: 150,
  };

  if (isDataUrl) {
    try {
      const sourceBlob = dataUrlToBlob(rawUrl);
      const compressed = await compressImageBlob(sourceBlob);
      const ref = `img_${uid()}_${Date.now()}`;
      const stored = await putImageBlob(ref, compressed);
      if (stored) {
        nextItem.imageRef = ref;
        nextItem.originalImageUrl = "";
      } else {
        nextItem.imageUrl = rawUrl;
      }
    } catch (_) {
      nextItem.imageUrl = rawUrl;
    }
  } else {
    nextItem.imageUrl = buildImageProxyUrl(rawUrl);
  }

  addItem(nextItem);
}

async function insertManualImage() {
  const raw = (manualImageUrlInput.value || "").trim();
  if (!raw) {
    imageStatus.textContent = "请先粘贴图片URL。";
    return;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      imageStatus.textContent = "仅支持 http/https 图片链接。";
      return;
    }
    const rawUrl = url.toString();
    const proxied = buildImageProxyUrl(rawUrl);
    let canLoad = false;
    try {
      await preloadImage(proxied);
      canLoad = true;
    } catch (_) {
      try {
        await preloadImage(rawUrl);
        canLoad = true;
      } catch (_) {
        canLoad = false;
      }
    }
    if (!canLoad) {
      imageStatus.textContent = "图片加载失败，可能是链接失效或源站限制防盗链。";
      return;
    }
    await addImageSticker({
      title: "Manual Image",
      image_url: rawUrl,
    });
    imageStatus.textContent = "已插入手动贴图。";
    manualImageUrlInput.value = "";
  } catch (_) {
    imageStatus.textContent = "URL格式无效，请检查后重试。";
  }
}

async function handleClipboardPaste(event) {
  if (isTypingContext(event.target)) return;
  const clipboard = event.clipboardData;
  if (!clipboard || !clipboard.items || !clipboard.items.length) {
    if (copiedItem) {
      event.preventDefault();
      await duplicateFromCopiedItem();
    }
    return;
  }

  const imageItem = Array.from(clipboard.items).find((item) => item.type && item.type.startsWith("image/"));
  if (!imageItem) {
    if (copiedItem) {
      event.preventDefault();
      await duplicateFromCopiedItem();
    }
    return;
  }

  event.preventDefault();
  const blob = imageItem.getAsFile();
  if (!blob) {
    imageStatus.textContent = "粘贴失败：读取截图数据失败。";
    return;
  }

  try {
    const compressed = await compressImageBlob(blob);
    const dataUrl = await readBlobAsDataUrl(compressed);
    await addImageSticker({
      title: "Pasted Screenshot",
      image_url: dataUrl,
    });
    imageStatus.textContent = "已插入粘贴截图。";
  } catch (_) {
    imageStatus.textContent = "粘贴失败：无法解析截图。";
  }
}

function applyItemTransform(item, node) {
  const scale = clamp(item.scale || 1, 0.4, 3);
  const rotation = item.type === "tape" ? (item.rotation || 0) : 0;
  item.scale = scale;
  node.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
}

function buildTapeEmojiText(emoji, width) {
  const count = Math.max(2, Math.round(width / 22));
  return Array.from({ length: count }, () => emoji).join(" ");
}

function snapCoordinate(value, targets) {
  let best = null;
  for (const target of targets) {
    const diff = Math.abs(value - target);
    if (diff > SNAP_THRESHOLD) continue;
    if (!best || diff < best.diff) {
      best = { value: target, diff };
    }
  }
  return best;
}

function getApproxItemSize(item) {
  const scale = clamp(Number(item.scale || 1), 0.4, 3);
  if (item.type === "tape") {
    return { width: (item.width || 130) * scale, height: 34 * scale };
  }
  if (item.type === "poster") {
    return { width: (item.width || 128) * scale, height: (item.width || 128) * 1.5 * scale };
  }
  if (item.type === "sticker") {
    return { width: 44 * scale, height: 44 * scale };
  }
  return { width: 180 * scale, height: 72 * scale };
}

function snapPosition(item, x, y, width, height) {
  if (!snapEnabled) {
    hideGuides();
    return {
      x,
      y,
    };
  }

  let nextX = Math.round(x / GRID_SIZE) * GRID_SIZE;
  let nextY = Math.round(y / GRID_SIZE) * GRID_SIZE;
  hideGuides();

  const pageRect = pageEl.getBoundingClientRect();
  const centerTargetsX = [pageRect.width / 2];
  const centerTargetsY = [pageRect.height / 2];
  const edgeTargetsX = [10, pageRect.width - width - 10];
  const edgeTargetsY = [10, pageRect.height - height - 10];
  for (const other of pages[currentPage]) {
    if (other.id === item.id) continue;
    const size = getApproxItemSize(other);
    edgeTargetsX.push(other.x);
    edgeTargetsY.push(other.y);
    centerTargetsX.push(other.x + size.width / 2);
    centerTargetsY.push(other.y + size.height / 2);
  }

  const snapLeft = snapCoordinate(nextX, edgeTargetsX);
  if (snapLeft) {
    nextX = snapLeft.value;
    showVerticalGuide(nextX);
  }
  const snapTop = snapCoordinate(nextY, edgeTargetsY);
  if (snapTop) {
    nextY = snapTop.value;
    showHorizontalGuide(nextY);
  }

  const currentCenterX = nextX + width / 2;
  const currentCenterY = nextY + height / 2;
  const snapCenterX = snapCoordinate(currentCenterX, centerTargetsX);
  if (snapCenterX) {
    nextX += snapCenterX.value - currentCenterX;
    showVerticalGuide(snapCenterX.value);
  }
  const snapCenterY = snapCoordinate(currentCenterY, centerTargetsY);
  if (snapCenterY) {
    nextY += snapCenterY.value - currentCenterY;
    showHorizontalGuide(snapCenterY.value);
  }

  return {
    x: nextX,
    y: nextY,
  };
}

function bindItemDrag(node, item) {
  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (item.type === "text" && node.classList.contains("is-editing")) return;

    event.preventDefault();
    setSelectedNode(node);
    if (item.locked) return;
    pushHistory();

    const rect = pageEl.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const offsetX = event.clientX - nodeRect.left;
    const offsetY = event.clientY - nodeRect.top;
    const itemWidth = nodeRect.width;
    const itemHeight = nodeRect.height;

    const onMove = (moveEvent) => {
      const rawX = clamp(moveEvent.clientX - rect.left - offsetX, 10, rect.width - itemWidth - 10);
      const rawY = clamp(moveEvent.clientY - rect.top - offsetY, 10, rect.height - itemHeight - 10);
      const snapped = snapPosition(item, rawX, rawY, itemWidth, itemHeight);
      item.x = snapped.x;
      item.y = snapped.y;
      node.style.left = `${snapped.x}px`;
      node.style.top = `${snapped.y}px`;
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      hideGuides();
      scheduleSave();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function bindItemWheelScale(node, item) {
  node.addEventListener(
    "wheel",
    (event) => {
      if (item.locked) return;
      event.preventDefault();
      const now = Date.now();
      if (now - wheelSnapshotAt > 280) {
        pushHistory();
        wheelSnapshotAt = now;
      }
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      item.scale = clamp((item.scale || 1) + delta, 0.4, 3);
      applyItemTransform(item, node);
      scheduleSave();
    },
    { passive: false },
  );
}

function bindItemResize(node, item) {
  const handle = document.createElement("div");
  handle.className = "resize-handle";
  node.appendChild(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (item.locked) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    pushHistory();

    const startX = event.clientX;
    const startY = event.clientY;
    const startScale = item.scale || 1;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      item.scale = clamp(startScale + (dx + dy) / 220, 0.4, 3);
      applyItemTransform(item, node);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      scheduleSave();
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
    if (event.button !== 0) return;
    if (item.locked) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    pushHistory();

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
      scheduleSave();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function bindTextEditing(node, textEl, item) {
  const enterEdit = () => {
    if (item.locked) return;
    pushHistory();
    syncTextInputsFromItem(item);
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
    scheduleSave();
  };

  textEl.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

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

function toItemNode(item) {
  const node = itemTpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = item.id;
  node.style.left = `${item.x}px`;
  node.style.top = `${item.y}px`;
  applyItemTransform(item, node);
  if (item.locked) node.classList.add("is-locked");

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
    if (item.cutout) node.classList.add("cutout");
    const img = document.createElement("img");
    img.alt = item.text;
    img.loading = "lazy";
    img.draggable = false;
    const applyImageSrc = async () => {
      let src = item.imageUrl || "";
      if (item.imageRef) {
        const blob = await getImageBlob(item.imageRef);
        if (blob) {
          releasePosterObjectUrl(item.id);
          src = URL.createObjectURL(blob);
          posterObjectUrls.set(item.id, src);
        }
      }
      img.src = src || item.originalImageUrl || "";
    };
    void applyImageSrc();
    img.addEventListener("error", () => {
      const fallback = item.originalImageUrl || "";
      if (fallback && img.src !== fallback) {
        img.src = fallback;
        return;
      }
      img.style.opacity = "0.35";
      img.alt = `${item.text} (加载失败)`;
    });
    if (item.width) img.style.width = `${item.width}px`;
    node.appendChild(img);
  } else {
    node.classList.add("item-text");
    const textEl = document.createElement("div");
    textEl.className = "text-content";
    textEl.textContent = item.text;
    textEl.contentEditable = "false";
    applyTextStyleToElement(textEl, item);
    node.appendChild(textEl);
    bindTextEditing(node, textEl, item);
  }

  bindItemResize(node, item);
  if (item.type === "tape") bindTapeWidthResize(node, item);
  bindItemDrag(node, item);
  bindItemWheelScale(node, item);

  return node;
}

function appendItemNode(item) {
  const node = toItemNode(item);
  pageEl.appendChild(node);
  setSelectedNode(node);
  updateLayerControls();
}

function renderPage(selectedId = null) {
  const keepId = selectedId || (selectedNode ? selectedNode.dataset.id : null);
  revokePosterObjectUrls();
  guideVertical = null;
  guideHorizontal = null;
  pageEl.innerHTML = "";
  pageEl.classList.remove("flipping");
  void pageEl.offsetWidth;
  pageEl.classList.add("flipping");

  let nextSelectedNode = null;
  pages[currentPage].forEach((item) => {
    const node = toItemNode(item);
    pageEl.appendChild(node);
    if (keepId && item.id === keepId) {
      nextSelectedNode = node;
    }
  });

  updateIndicator();
  if (nextSelectedNode) {
    setSelectedNode(nextSelectedNode);
  } else {
    clearSelection();
  }
  ensureGuideElements();
  hideGuides();
  updateLayerControls();
}

function switchPage(direction) {
  const next = currentPage + direction;
  if (next < 0 || next >= PAGE_COUNT) return;
  currentPage = next;
  clearSelection();
  renderPage();
  scheduleSave();
}

function clearCurrentPage() {
  if (!pages[currentPage].length) return;
  pushHistory();
  const removedRefs = new Set(
    pages[currentPage]
      .filter((item) => item.type === "poster" && item.imageRef)
      .map((item) => item.imageRef),
  );
  pages[currentPage] = [];
  removedRefs.forEach((ref) => {
    if (!isImageRefStillUsed(ref)) {
      void deleteImageBlob(ref);
    }
  });
  clearSelection();
  renderPage();
  scheduleSave();
}

function autoLayout() {
  const page = pages[currentPage];
  if (!page.length) return;

  const pageWidth = pageEl.clientWidth || 780;
  const pageHeight = pageEl.clientHeight || 560;
  const alignThreshold = Math.max(6, Math.round(GRID_SIZE * 0.8));
  let changed = 0;
  const anchors = [];

  pushHistory();

  page.forEach((item) => {
    if (item.locked) {
      anchors.push({ x: item.x, y: item.y });
      return;
    }

    const size = getApproxItemSize(item);
    let nextX = clamp(Math.round(item.x / GRID_SIZE) * GRID_SIZE, 10, pageWidth - size.width - 10);
    let nextY = clamp(Math.round(item.y / GRID_SIZE) * GRID_SIZE, 10, pageHeight - size.height - 10);

    let nearestX = null;
    let minX = Infinity;
    let nearestY = null;
    let minY = Infinity;
    anchors.forEach((anchor) => {
      const dx = Math.abs(nextX - anchor.x);
      if (dx <= alignThreshold && dx < minX) {
        minX = dx;
        nearestX = anchor.x;
      }
      const dy = Math.abs(nextY - anchor.y);
      if (dy <= alignThreshold && dy < minY) {
        minY = dy;
        nearestY = anchor.y;
      }
    });
    if (nearestX !== null) nextX = nearestX;
    if (nearestY !== null) nextY = nearestY;

    const moved = Math.abs(nextX - item.x) > 0.5 || Math.abs(nextY - item.y) > 0.5;
    item.x = nextX;
    item.y = nextY;
    anchors.push({ x: nextX, y: nextY });
    if (!moved) return;

    changed += 1;
    const node = pageEl.querySelector(`.journal-item[data-id="${item.id}"]`);
    if (node) {
      node.style.left = `${nextX}px`;
      node.style.top = `${nextY}px`;
    }
  });

  hideGuides();
  if (changed > 0) {
    markSavedStatus(`已对齐 ${changed} 个元素`);
    scheduleSave();
  } else {
    markSavedStatus("无需对齐");
  }
}

function bringSelectedToFront() {
  const item = getSelectedItem();
  if (!item || !selectedNode) return;
  const page = pages[currentPage];
  const idx = page.findIndex((entry) => entry.id === item.id);
  if (idx < 0 || idx === page.length - 1) return;

  pushHistory();
  const [moved] = page.splice(idx, 1);
  page.push(moved);
  pageEl.appendChild(selectedNode);
  updateLayerControls();
  scheduleSave();
}

function sendSelectedToBack() {
  const item = getSelectedItem();
  if (!item || !selectedNode) return;
  const page = pages[currentPage];
  const idx = page.findIndex((entry) => entry.id === item.id);
  if (idx <= 0) return;

  pushHistory();
  const [moved] = page.splice(idx, 1);
  page.unshift(moved);
  pageEl.insertBefore(selectedNode, pageEl.firstChild);
  updateLayerControls();
  scheduleSave();
}

function rotateSelectedTape() {
  const item = getSelectedItem();
  if (!item || item.type !== "tape" || !selectedNode) return;
  pushHistory();
  item.rotation = item.rotation === 90 ? 0 : 90;
  applyItemTransform(item, selectedNode);
  scheduleSave();
}

function toggleSelectedLock() {
  const item = getSelectedItem();
  if (!item || !selectedNode) return;
  pushHistory();
  item.locked = !item.locked;
  selectedNode.classList.toggle("is-locked", item.locked);
  if (item.locked && item.type === "text") {
    const textEl = selectedNode.querySelector(".text-content");
    if (textEl) {
      textEl.contentEditable = "false";
    }
    selectedNode.classList.remove("is-editing");
  }
  updateLayerControls();
  scheduleSave();
}

function deleteSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;
  const page = pages[currentPage];
  const idx = page.findIndex((entry) => entry.id === item.id);
  if (idx < 0) return;

  pushHistory();
  page.splice(idx, 1);
  if (item.type === "poster" && item.imageRef && !isImageRefStillUsed(item.imageRef)) {
    void deleteImageBlob(item.imageRef);
  }
  if (selectedNode && selectedNode.parentNode === pageEl) {
    pageEl.removeChild(selectedNode);
  }
  clearSelection();
  scheduleSave();
}

function isImageRefStillUsed(ref, exceptItemId = "") {
  if (!ref) return false;
  for (const page of pages) {
    for (const item of page) {
      if (item.type !== "poster") continue;
      if (item.id === exceptItemId) continue;
      if (item.imageRef === ref) return true;
    }
  }
  return false;
}

function cloneItemForCopy(item) {
  if (!item) return null;
  return {
    ...item,
  };
}

async function duplicateFromCopiedItem() {
  if (!copiedItem) return;
  const clone = normalizeItem({
    ...copiedItem,
    id: uid(),
    x: copiedItem.x + 22,
    y: copiedItem.y + 22,
    locked: false,
  });
  if (clone.type === "poster" && clone.imageRef) {
    const blob = await getImageBlob(clone.imageRef);
    if (blob) {
      const ref = `img_${uid()}_${Date.now()}`;
      const stored = await putImageBlob(ref, blob);
      if (stored) {
        clone.imageRef = ref;
      } else {
        clone.imageRef = "";
      }
    }
  }
  addItem(clone);
}

function nudgeSelected(dx, dy) {
  const item = getSelectedItem();
  if (!item || item.locked || !selectedNode) return;
  const now = Date.now();
  if (now - nudgeSnapshotAt > 240) {
    pushHistory();
    nudgeSnapshotAt = now;
  }
  const rect = pageEl.getBoundingClientRect();
  const nodeRect = selectedNode.getBoundingClientRect();
  const nextX = clamp((item.x || 0) + dx, 10, rect.width - nodeRect.width - 10);
  const nextY = clamp((item.y || 0) + dy, 10, rect.height - nodeRect.height - 10);
  item.x = nextX;
  item.y = nextY;
  selectedNode.style.left = `${nextX}px`;
  selectedNode.style.top = `${nextY}px`;
  hideGuides();
  scheduleSave();
}

function applyCurrentStyleToSelectedText() {
  const item = getSelectedItem();
  if (!item || item.type !== "text" || item.locked || !selectedNode) return;
  pushHistory();
  const style = getTextStyleFromInputs();
  item.fontFamily = style.fontFamily;
  item.fontSize = style.fontSize;
  item.color = style.color;
  item.fontWeight = style.fontWeight;
  const textEl = selectedNode.querySelector(".text-content");
  applyTextStyleToElement(textEl, item);
  scheduleSave();
}

function toggleSnap() {
  snapEnabled = !snapEnabled;
  if (toggleSnapBtn) {
    toggleSnapBtn.textContent = `吸附网格: ${snapEnabled ? "开" : "关"}`;
  }
  if (!snapEnabled) hideGuides();
}

async function removeBackgroundForSelected() {
  const item = getSelectedItem();
  if (!item || item.type !== "poster" || item.locked || !selectedNode) return;
  pushHistory();
  imageStatus.textContent = "正在抠图...";
  const sourceBlob = await resolvePosterBlob(item, selectedNode);
  if (!sourceBlob) {
    imageStatus.textContent = "抠图失败：无法读取图片数据（可尝试重新插入图片后再试）。";
    return;
  }
  try {
    const cutoutBlob = await removeBackgroundFromBlob(sourceBlob);
    const ref = `img_${uid()}_${Date.now()}`;
    const stored = await putImageBlob(ref, cutoutBlob);
    if (!stored) {
      imageStatus.textContent = "抠图失败：本地存储不可用。";
      return;
    }
    const oldRef = item.imageRef || "";
    item.imageRef = ref;
    item.imageUrl = "";
    item.originalImageUrl = "";
    item.cutout = true;

    if (oldRef && oldRef !== ref && !isImageRefStillUsed(oldRef, item.id)) {
      void deleteImageBlob(oldRef);
    }

    const img = selectedNode.querySelector("img");
    if (img) {
      releasePosterObjectUrl(item.id);
      const url = URL.createObjectURL(cutoutBlob);
      posterObjectUrls.set(item.id, url);
      img.src = url;
    }
    selectedNode.classList.add("cutout");
    imageStatus.textContent = "已生成去背景贴纸。";
    scheduleSave();
  } catch (_) {
    imageStatus.textContent = "抠图失败：背景识别未完成，请换一张背景更纯的图重试。";
  }
}

function renderAssets() {
  tapes.forEach((tape) => {
    const el = document.createElement("button");
    el.className = "asset";
    el.textContent = tape.name;
    el.addEventListener("click", () => addTape(tape));
    tapeList.appendChild(el);
  });

  stickers.forEach((sticker) => {
    const el = document.createElement("button");
    el.className = "asset";
    el.textContent = sticker;
    el.addEventListener("click", () => addEmojiTape(sticker));
    stickerList.appendChild(el);
  });
}

async function ensureEmojiPickerLoaded() {
  if (emojiPickerLoaded) return true;
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
  if (!emojiSelectorWrap) return;
  const loaded = await ensureEmojiPickerLoaded();
  if (!loaded) {
    openEmojiSelectorBtn.textContent = "Emoji 组件加载失败（可用下方贴纸）";
    return;
  }

  emojiSelectorWrap.classList.add("is-open");
  emojiSelectorWrap.setAttribute("aria-hidden", "false");
  if (!emojiPickerBound) {
    emojiPicker.addEventListener("emoji-click", (event) => {
      const emoji = event?.detail?.unicode;
      if (emoji) addEmojiTape(emoji);
      closeEmojiSelector();
    });
    emojiPickerBound = true;
  }
}

function closeEmojiSelector() {
  if (!emojiSelectorWrap) return;
  emojiSelectorWrap.classList.remove("is-open");
  emojiSelectorWrap.setAttribute("aria-hidden", "true");
}

function isEmojiModalOpen() {
  if (!emojiSelectorWrap) return false;
  return emojiSelectorWrap.classList.contains("is-open");
}

function bindGlobalEvents() {
  if (pageEl) {
    pageEl.tabIndex = 0;
    pageEl.style.outline = "none";
  }
  prevBtn.addEventListener("click", () => switchPage(-1));
  nextBtn.addEventListener("click", () => switchPage(1));
  undoBtn.addEventListener("click", undoAction);
  redoBtn.addEventListener("click", redoAction);
  addTextBtn.addEventListener("click", addTextBlock);
  insertDateWeatherBtn.addEventListener("click", insertDateBlock);
  if (autoLayoutBtn) autoLayoutBtn.addEventListener("click", autoLayout);
  if (clearPageBtn) clearPageBtn.addEventListener("click", clearCurrentPage);
  if (restoreVersionBtn) restoreVersionBtn.addEventListener("click", restoreSelectedVersion);
  if (saveVersionBtn) saveVersionBtn.addEventListener("click", saveManualVersion);
  if (versionSelect) {
    versionSelect.addEventListener("change", () => {
      if (restoreVersionBtn) restoreVersionBtn.disabled = !versionSelect.value;
    });
  }
  insertManualImageBtn.addEventListener("click", insertManualImage);
  if (openEmojiSelectorBtn) openEmojiSelectorBtn.addEventListener("click", openEmojiSelector);
  if (closeEmojiSelectorBtn) {
    closeEmojiSelectorBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeEmojiSelector();
    });
    closeEmojiSelectorBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeEmojiSelector();
    });
  }
  document.addEventListener("click", (event) => {
    if (!isEmojiModalOpen()) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    const clickedOpenBtn = openEmojiSelectorBtn && openEmojiSelectorBtn.contains(target);
    const clickedInsideWrap = emojiSelectorWrap && emojiSelectorWrap.contains(target);
    if (!clickedOpenBtn && !clickedInsideWrap) {
      closeEmojiSelector();
    }
  });

  bringFrontBtn.addEventListener("click", bringSelectedToFront);
  sendBackBtn.addEventListener("click", sendSelectedToBack);
  rotateTapeBtn.addEventListener("click", rotateSelectedTape);
  removeBgBtn.addEventListener("click", () => {
    void removeBackgroundForSelected();
  });
  toggleSnapBtn.addEventListener("click", toggleSnap);
  toggleLockBtn.addEventListener("click", toggleSelectedLock);
  deleteItemBtn.addEventListener("click", deleteSelectedItem);
  applyTextStyleBtn.addEventListener("click", applyCurrentStyleToSelectedText);
  toggleTextBoldBtn.addEventListener("click", () => {
    const isBold = toggleTextBoldBtn.dataset.bold === "1";
    setBoldButtonState(!isBold);
    applyCurrentStyleToSelectedText();
  });
  textFontFamilyInput.addEventListener("change", applyCurrentStyleToSelectedText);
  textFontSizeInput.addEventListener("input", applyCurrentStyleToSelectedText);
  textColorInput.addEventListener("input", applyCurrentStyleToSelectedText);

  manualImageUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      insertManualImage();
    }
  });
  document.addEventListener("paste", handleClipboardPaste);

  pageEl.addEventListener("pointerdown", (event) => {
    if (event.target === pageEl) {
      clearSelection();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isEmojiModalOpen()) {
      closeEmojiSelector();
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoAction();
      return;
    }
    if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
      event.preventDefault();
      redoAction();
      return;
    }
    if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redoAction();
      return;
    }
    if (mod && event.key.toLowerCase() === "c") {
      if (isTypingContext(event.target)) return;
      event.preventDefault();
      const item = getSelectedItem();
      if (item) {
        copiedItem = cloneItemForCopy(item);
        markSavedStatus("已复制元素");
      }
      return;
    }
    if (mod && event.key.toLowerCase() === "v") {
      if (isTypingContext(event.target)) return;
      if (copiedItem) {
        event.preventDefault();
        void duplicateFromCopiedItem();
      }
      return;
    }
    if (isTypingContext(event.target)) return;

    if ((event.key === "Delete" || event.key === "Backspace") && selectedNode) {
      event.preventDefault();
      deleteSelectedItem();
      return;
    }
    if (event.key.startsWith("Arrow") && selectedNode) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft") nudgeSelected(-step, 0);
      if (event.key === "ArrowRight") nudgeSelected(step, 0);
      if (event.key === "ArrowUp") nudgeSelected(0, -step);
      if (event.key === "ArrowDown") nudgeSelected(0, step);
    }
  });
}

async function migrateLegacyPosterDataUrls() {
  let changed = false;
  for (let p = 0; p < pages.length; p += 1) {
    for (let i = 0; i < pages[p].length; i += 1) {
      const item = pages[p][i];
      if (item.type !== "poster") continue;
      if (item.imageRef) continue;
      if (!item.imageUrl || !item.imageUrl.startsWith("data:image/")) continue;
      try {
        const sourceBlob = dataUrlToBlob(item.imageUrl);
        const compressed = await compressImageBlob(sourceBlob);
        const ref = `img_${uid()}_${Date.now()}`;
        const stored = await putImageBlob(ref, compressed);
        if (!stored) continue;
        item.imageRef = ref;
        item.originalImageUrl = "";
        item.imageUrl = "";
        changed = true;
      } catch (_) {
        // keep original data URL if migration fails
      }
    }
  }
  if (changed) {
    saveStateNow();
    markSavedStatus("已保存（已迁移图片存储）");
  }
}

async function init() {
  loadState();
  loadVersions();
  await migrateLegacyPosterDataUrls();
  if (!versions.length && countAllItems() > 0) {
    captureVersion("初始");
  } else {
    opsSinceLastVersion = 0;
  }
  const defaults = defaultTextStyle();
  if (textFontFamilyInput) textFontFamilyInput.value = defaults.fontFamily;
  if (textFontSizeInput) textFontSizeInput.value = String(defaults.fontSize);
  if (textColorInput) textColorInput.value = defaults.color;
  closeEmojiSelector();
  setBoldButtonState(false);
  if (toggleSnapBtn) toggleSnapBtn.textContent = `吸附网格: ${snapEnabled ? "开" : "关"}`;
  renderAssets();
  bindGlobalEvents();
  updateHistoryButtons();
  renderPage();
  if (!saveStatus.textContent || saveStatus.textContent === "未保存") {
    markSavedStatus("已保存");
  }
}

void init();
