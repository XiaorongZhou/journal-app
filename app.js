const pageEl = document.getElementById("page");
const notebookEl = document.querySelector(".notebook");
const pageFlipOverlayEl = document.getElementById("page-flip-overlay");
const journalMissingStateEl = document.getElementById("journal-missing-state");
const createNewJournalBtn = document.getElementById("create-new-journal-btn");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const pageIndicator = document.getElementById("page-indicator");
const saveStatus = document.getElementById("save-status");
const layerMeta = document.getElementById("layer-meta");
const selectionToolbar = document.getElementById("selection-toolbar");
const bringFrontBtn = document.getElementById("bring-front-btn");
const sendBackBtn = document.getElementById("send-back-btn");
const rotateTapeBtn = document.getElementById("rotate-tape-btn");
const removeBgBtn = document.getElementById("remove-bg-btn");
const toggleSnapBtn = document.getElementById("toggle-snap-btn");
const toggleLockBtn = document.getElementById("toggle-lock-btn");
const deleteItemBtn = document.getElementById("delete-item-btn");
const tapeSelect = document.getElementById("tape-select");
const textInput = document.getElementById("text-input");
const textFontFamilyInput = document.getElementById("text-font-family");
const textFontSizeInput = document.getElementById("text-font-size");
const textColorInput = document.getElementById("text-color");
const dateFormatSelect = document.getElementById("date-format-select");
const tapeGallery = document.getElementById("tape-gallery");
const favoritesGallery = document.getElementById("favorites-gallery");
const favoritesEmpty = document.getElementById("favorites-empty");
const fontPreviewList = document.getElementById("font-preview-list");
const colorChipList = document.getElementById("color-chip-list");
const dateFormatCards = document.getElementById("date-format-cards");
const pageThumbnailList = document.getElementById("page-thumbnail-list");
const addPageBtn = document.getElementById("add-page-btn");
const shareLinkInput = document.getElementById("share-link-input");
const copyShareLinkBtn = document.getElementById("copy-share-link-btn");
const fontSizeBadge = document.getElementById("font-size-badge");
const addTextBtn = document.getElementById("add-text-btn");
const autoLayoutBtn = document.getElementById("auto-layout-btn");
const clearPageBtn = document.getElementById("clear-page-btn");
const versionSelect = document.getElementById("version-select");
const restoreVersionBtn = document.getElementById("restore-version-btn");
const saveVersionBtn = document.getElementById("save-version-btn");
const exportPngBtn = document.getElementById("export-png-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const itemTpl = document.getElementById("item-template");
const imageStatus = document.getElementById("image-status");
const urlPreviewInput = document.getElementById("url-preview-input");
const insertUrlPreviewBtn = document.getElementById("insert-url-preview-btn");
const manualImageUrlInput = document.getElementById("manual-image-url");
const insertManualImageBtn = document.getElementById("insert-manual-image-btn");
const openEmojiSelectorBtn = document.getElementById("open-emoji-selector");
const closeEmojiSelectorBtn = document.getElementById("close-emoji-selector");
const emojiSelectorWrap = document.getElementById("emoji-selector-wrap");
const emojiPicker = document.getElementById("emoji-picker");
const emojiInsertMode = document.getElementById("emoji-insert-mode");
const emojiInsertLabel = document.getElementById("emoji-insert-label");
const insertEmojiStickerBtn = document.getElementById("insert-emoji-sticker-btn");
const insertEmojiTapeBtn = document.getElementById("insert-emoji-tape-btn");
const langZhBtn = document.getElementById("lang-zh");
const langEnBtn = document.getElementById("lang-en");
const panelTabs = Array.from(document.querySelectorAll(".panel-tab"));
const panelSections = Array.from(document.querySelectorAll(".panel-section"));

const INITIAL_PAGE_COUNT = 6;
const MAX_PAGE_COUNT = 20;
const STORAGE_KEY = "journal_app_state_v1";
const PAGE_INDEX_STORAGE_KEY = "journal_app_page_index_v1";
const VERSION_STORAGE_KEY = "journal_app_versions_v1";
const LANGUAGE_STORAGE_KEY = "journal_app_language_v1";
const FAVORITES_STORAGE_KEY = "journal_app_favorites_v1";
const JOURNAL_QUERY_KEY = "j";
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
const DRAG_EDGE_PADDING = 0;
const pages = [];
const pageLayers = [];
const pageLayerDirty = [];

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
let isPageFlipping = false;
let versions = [];
let lastVersionAt = 0;
let lastVersionItemCount = 0;
let opsSinceLastVersion = 0;
const posterObjectUrls = new Map();
let guideVertical = null;
let guideHorizontal = null;
const collapsedBlankGroups = new Set();
let pendingEmojiInsert = "";
let favoriteEmojis = [];
let html2canvasPromise = null;
let jsPdfPromise = null;
let currentLanguage = "zh";
let draggedPageIndex = null;
let journalId = "";
let remoteSaveSeq = 0;
let journalLoadedFromQuery = false;
let missingJournalLink = false;
try {
  currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "zh";
} catch (_) {
  currentLanguage = "zh";
}

const i18n = {
  zh: {
    document_title: "手帐工坊",
    app_title: "手帐工坊",
    app_subtitle: "像在翻一本会发光的纸本相册。",
    panel_badge: "Paper Room",
    tabs_aria: "工具分组",
    tab_materials: "素材",
    tab_text: "文字",
    tab_images: "图片",
    tab_pages: "页面",
    favorites: "最近使用",
    favorites_empty: "最近插入的 emoji 会出现在这里。",
    tape_library: "胶带库",
    stickers: "贴纸",
    open_emoji_selector: "打开 Emoji 选择器",
    emoji_selector_aria: "Emoji 选择器",
    choose_emoji_sticker: "选择 Emoji 贴纸",
    insert_as_sticker: "作为贴纸插入",
    insert_as_tape: "变成胶带",
    close: "关闭",
    emoji_hint: "点选任意 emoji 即可贴进页面。",
    input_content: "输入内容",
    content_label: "内容",
    text_input_default: "今天也要开心",
    add_text_block: "添加文字块",
    font: "字体",
    font_handwritten: "手写体",
    font_xiaowei: "小薇体",
    font_kaiti: "楷体",
    font_pingfang: "苹方",
    font_caveat: "英文手写",
    font_shadow: "轻松手写",
    font_dm_serif: "复古衬线",
    font_baskerville: "书页衬线",
    text_style: "字色和大小",
    font_size: "字号",
    color: "颜色",
    date_style: "日期样式",
    web_preview: "网页预览",
    web_preview_hint: "收藏网址时，会自动做成小预览卡。",
    url_placeholder: "粘贴网页 URL（https://...）",
    insert_web_preview: "插入网页预览",
    insert_web_preview_loading: "抓取中...",
    manual_image: "手动贴图",
    manual_image_hint: "也支持直接粘贴截图 `Cmd/Ctrl + V`。",
    image_placeholder: "粘贴图片 URL（https://...）",
    insert_manual_image: "手动贴图",
    export: "导出",
    export_hint: "把当前手帐页导出成图片或 PDF。",
    share_journal: "分享试用",
    share_journal_hint: "复制这个链接发给别人，他们就能打开同一本手帐。",
    journal_missing_title: "这本手帐没有找到",
    journal_missing_body: "这个分享链接对应的手帐可能不存在，或还没有同步到当前站点。",
    journal_missing_action: "新建一本手帐",
    copy_share_link: "复制分享链接",
    share_link_copied: "已复制分享链接",
    share_link_copy_failed: "复制失败，请手动复制链接",
    export_png: "导出 PNG",
    export_pdf: "导出 PDF",
    export_loading: "正在导出...",
    export_done_png: "已导出 PNG",
    export_done_pdf: "已导出 PDF",
    export_failed: "导出失败：{message}",
    page_overview: "页面列表",
    page_overview_hint: "点击快速跳页，拖拽页面即可调整顺序。",
    add_page: "添加页面",
    page_added: "已添加新页面",
    page_limit_reached: "最多只能添加到 20 页",
    version_history: "版本历史",
    version_history_hint: "自动保存关键版本，适合回看一整页的变化。",
    restore_selected_version: "恢复所选版本",
    save_manual_version: "手动保存版本",
    page_label_short: "第{page}页",
    page_item_count: "{count}个元素",
    page_empty: "空白页",
    page_move_left: "前移",
    page_move_right: "后移",
    page_moved: "已调整页面顺序",
    blank_pages_group: "空白页 {count} 页",
    expand_pages: "展开",
    collapse_pages: "收起",
    editing_tips: "编辑提示",
    editing_tips_hint: "`Cmd/Ctrl+C` 复制, `Cmd/Ctrl+V` 粘贴, `Delete` 删除, `方向键` 微调。",
    undo: "撤销",
    redo: "重做",
    unsaved: "未保存",
    prev_page: "上一页",
    next_page: "下一页",
    bring_front: "置顶",
    send_back: "置底",
    rotate: "旋转",
    remove_bg: "抠图",
    lock: "锁定",
    unlock: "解锁",
    delete: "删除",
    current_selection: "当前选中",
    no_selection: "未选中元素",
    snap_grid: "吸附网格: {state}",
    snap_on: "开",
    snap_off: "关",
    page_indicator: "第 {page} 页 / 共 {total} 页",
    tape_fallback: "胶带",
    note_fallback: "手帐记录",
    image_title_fallback: "Beautiful Image",
    manual_image_title: "Manual Image",
    pasted_screenshot_title: "Pasted Screenshot",
    web_preview_title: "网页预览",
    open: "打开",
    image_load_failed_alt: "{text} (加载失败)",
    version_empty: "暂无版本",
    version_reason_auto: "自动",
    version_reason_manual: "手动",
    version_reason_initial: "初始",
    version_entry: "{time} | {reason} | {count}个元素",
    save_saved: "已保存",
    save_saving: "保存中...",
    save_failed_quota: "保存失败：本地存储已满，请删除部分大图片后重试",
    save_failed_storage: "保存失败：本地存储不可用",
    save_failed_cloud: "保存失败：云端同步不可用",
    saved_version_restored: "已恢复版本 {time}",
    saved_manual_version: "已创建手动版本",
    item_meta: "类型: {type} | 图层: {index}/{total}",
    type_tape: "胶带",
    type_sticker: "贴纸",
    type_poster: "图片",
    type_text: "文字",
    type_link: "链接",
    manual_image_empty: "请先粘贴图片URL。",
    manual_image_protocol: "仅支持 http/https 图片链接。",
    manual_image_load_fail: "图片加载失败，可能是链接失效或源站限制防盗链。",
    manual_image_inserted: "已插入手动贴图。",
    invalid_url: "URL格式无效，请检查后重试。",
    invalid_web_url: "请输入有效网页 URL（http/https）。",
    fetching_web_preview: "正在抓取网页缩略图...",
    web_preview_thumb_fail: "缩略图加载失败，请稍后重试或直接贴图。",
    web_preview_inserted: "已插入网页预览贴图。",
    fetch_failed: "抓取失败：{message}",
    paste_read_fail: "粘贴失败：读取截图数据失败。",
    pasted_screenshot_inserted: "已插入粘贴截图。",
    paste_parse_fail: "粘贴失败：无法解析截图。",
    aligned_items: "已对齐 {count} 个元素",
    no_alignment_needed: "无需对齐",
    removing_bg: "正在抠图...",
    remove_bg_read_fail: "抠图失败：无法读取图片数据（可尝试重新插入图片后再试）。",
    remove_bg_storage_fail: "抠图失败：本地存储不可用。",
    remove_bg_done: "已生成去背景贴纸。",
    remove_bg_detect_fail: "抠图失败：背景识别未完成，请换一张背景更纯的图重试。",
    emoji_picker_load_fail: "Emoji 组件加载失败",
    copied_item: "已复制元素",
    migrated_image_storage: "已保存（已迁移图片存储）",
    font_sample: "手帐笔记",
    font_sample_en_script: "dear diary",
    font_sample_en_serif: "quiet notes",
    date_label_standard: "标准日期",
    date_label_lunar: "农历风格",
    pattern_grid: "网格",
    pattern_dot: "圆点",
    pattern_hatch: "斜纹",
    pattern_petal: "花瓣",
    pattern_diag: "条纹",
    tape_sun: "日光条纹",
    tape_sea: "海盐网格",
    tape_mint: "薄荷圆点",
    tape_peach: "蜜桃斜纹",
    tape_sakura: "樱花花纹",
  },
  en: {
    document_title: "Journal Studio",
    app_title: "Journal Studio",
    app_subtitle: "Like flipping through a glowing paper scrapbook.",
    panel_badge: "Paper Room",
    tabs_aria: "Tool groups",
    tab_materials: "Materials",
    tab_text: "Text",
    tab_images: "Images",
    tab_pages: "Pages",
    favorites: "Recent",
    favorites_empty: "Recently inserted emoji will appear here.",
    tape_library: "Tape Library",
    stickers: "Stickers",
    open_emoji_selector: "Open Emoji Picker",
    emoji_selector_aria: "Emoji Picker",
    choose_emoji_sticker: "Choose Emoji Sticker",
    insert_as_sticker: "Insert as Sticker",
    insert_as_tape: "Turn into Tape",
    close: "Close",
    emoji_hint: "Tap any emoji to place it on the page.",
    input_content: "Write Something",
    content_label: "Text",
    text_input_default: "Let's make today feel lovely",
    add_text_block: "Add Text Block",
    font: "Fonts",
    font_handwritten: "Handwritten",
    font_xiaowei: "XiaoWei",
    font_kaiti: "KaiTi",
    font_pingfang: "PingFang",
    font_caveat: "Caveat",
    font_shadow: "Shadows",
    font_dm_serif: "DM Serif",
    font_baskerville: "Baskerville",
    text_style: "Color & Size",
    font_size: "Size",
    color: "Color",
    date_style: "Date Styles",
    web_preview: "Web Preview",
    web_preview_hint: "Save a link and turn it into a tiny preview card.",
    url_placeholder: "Paste a page URL (https://...)",
    insert_web_preview: "Insert Web Preview",
    insert_web_preview_loading: "Fetching...",
    manual_image: "Manual Image",
    manual_image_hint: "You can also paste screenshots with `Cmd/Ctrl + V`.",
    image_placeholder: "Paste an image URL (https://...)",
    insert_manual_image: "Insert Image",
    export: "Export",
    export_hint: "Export the current journal page as an image or PDF.",
    share_journal: "Share Trial",
    share_journal_hint: "Copy this link and send it to someone so they can open the same journal.",
    journal_missing_title: "This journal could not be found",
    journal_missing_body: "The shared link may no longer exist, or this journal has not been synced to this site yet.",
    journal_missing_action: "Start a new journal",
    copy_share_link: "Copy Share Link",
    share_link_copied: "Share link copied",
    share_link_copy_failed: "Copy failed, please copy the link manually",
    export_png: "Export PNG",
    export_pdf: "Export PDF",
    export_loading: "Exporting...",
    export_done_png: "PNG exported",
    export_done_pdf: "PDF exported",
    export_failed: "Export failed: {message}",
    page_overview: "Page List",
    page_overview_hint: "Click to jump, then drag pages to reorder them.",
    add_page: "Add page",
    page_added: "New page added",
    page_limit_reached: "You can add up to 20 pages",
    version_history: "Version History",
    version_history_hint: "Auto-saves key versions so you can revisit major page changes.",
    restore_selected_version: "Restore Selected",
    save_manual_version: "Save Version",
    page_label_short: "Page {page}",
    page_item_count: "{count} items",
    page_empty: "Blank page",
    page_move_left: "Move Left",
    page_move_right: "Move Right",
    page_moved: "Page order updated",
    blank_pages_group: "{count} blank pages",
    expand_pages: "Expand",
    collapse_pages: "Collapse",
    editing_tips: "Editing Tips",
    editing_tips_hint: "`Cmd/Ctrl+C` copy, `Cmd/Ctrl+V` paste, `Delete` remove, arrow keys nudge.",
    undo: "Undo",
    redo: "Redo",
    unsaved: "Unsaved",
    prev_page: "Previous page",
    next_page: "Next page",
    bring_front: "Front",
    send_back: "Back",
    rotate: "Rotate",
    remove_bg: "Cutout",
    lock: "Lock",
    unlock: "Unlock",
    delete: "Delete",
    current_selection: "Selected",
    no_selection: "No element selected",
    snap_grid: "Snap Grid: {state}",
    snap_on: "On",
    snap_off: "Off",
    page_indicator: "Page {page} / {total}",
    tape_fallback: "Tape",
    note_fallback: "Journal Note",
    image_title_fallback: "Beautiful Image",
    manual_image_title: "Manual Image",
    pasted_screenshot_title: "Pasted Screenshot",
    web_preview_title: "Web Preview",
    open: "Open",
    image_load_failed_alt: "{text} (failed to load)",
    version_empty: "No versions yet",
    version_reason_auto: "Auto",
    version_reason_manual: "Manual",
    version_reason_initial: "Initial",
    version_entry: "{time} | {reason} | {count} items",
    save_saved: "Saved",
    save_saving: "Saving...",
    save_failed_quota: "Save failed: local storage is full. Remove some large images and try again.",
    save_failed_storage: "Save failed: local storage is unavailable.",
    save_failed_cloud: "Save failed: cloud sync is unavailable.",
    saved_version_restored: "Restored version {time}",
    saved_manual_version: "Manual version created",
    item_meta: "Type: {type} | Layer: {index}/{total}",
    type_tape: "Tape",
    type_sticker: "Sticker",
    type_poster: "Image",
    type_text: "Text",
    type_link: "Link",
    manual_image_empty: "Paste an image URL first.",
    manual_image_protocol: "Only http/https image links are supported.",
    manual_image_load_fail: "Image failed to load. The link may be invalid or hotlinking may be blocked.",
    manual_image_inserted: "Manual image inserted.",
    invalid_url: "Invalid URL. Please check it and try again.",
    invalid_web_url: "Enter a valid page URL (http/https).",
    fetching_web_preview: "Fetching webpage thumbnail...",
    web_preview_thumb_fail: "Thumbnail failed to load. Try again later or insert the image manually.",
    web_preview_inserted: "Web preview inserted.",
    fetch_failed: "Fetch failed: {message}",
    paste_read_fail: "Paste failed: could not read image data.",
    pasted_screenshot_inserted: "Pasted screenshot inserted.",
    paste_parse_fail: "Paste failed: could not parse screenshot.",
    aligned_items: "Aligned {count} elements",
    no_alignment_needed: "Nothing to align",
    removing_bg: "Removing background...",
    remove_bg_read_fail: "Cutout failed: could not read image data. Try reinserting the image first.",
    remove_bg_storage_fail: "Cutout failed: local storage is unavailable.",
    remove_bg_done: "Background-free sticker created.",
    remove_bg_detect_fail: "Cutout failed: background detection was incomplete. Try an image with a cleaner background.",
    emoji_picker_load_fail: "Emoji picker failed to load",
    copied_item: "Element copied",
    migrated_image_storage: "Saved (image storage migrated)",
    font_sample: "Journal Notes",
    font_sample_en_script: "dear diary",
    font_sample_en_serif: "quiet notes",
    date_label_standard: "Standard",
    date_label_lunar: "Lunar",
    pattern_grid: "Grid",
    pattern_dot: "Dots",
    pattern_hatch: "Hatch",
    pattern_petal: "Petal",
    pattern_diag: "Stripe",
    tape_sun: "Sunlit Stripe",
    tape_sea: "Sea Salt Grid",
    tape_mint: "Mint Dots",
    tape_peach: "Peach Hatch",
    tape_sakura: "Sakura Petals",
  },
};

const tapes = [
  { id: "sun", nameKey: "tape_sun", color: "#d8c4a7", pattern: "diag" },
  { id: "sea", nameKey: "tape_sea", color: "#9bc5db", pattern: "grid" },
  { id: "mint", nameKey: "tape_mint", color: "#a8d3bf", pattern: "dot" },
  { id: "peach", nameKey: "tape_peach", color: "#e1b2a6", pattern: "hatch" },
  { id: "sakura", nameKey: "tape_sakura", color: "#f1c7cf", pattern: "petal" },
];

const colorPresets = ["#4f5a55", "#7f6a58", "#d36f57", "#cc9d64", "#6ca687", "#5e88b2", "#b780a6"];

const FONT_PRESETS = {
  zh: [
    { value: "Ma Shan Zheng", labelKey: "font_handwritten", sampleKey: "font_sample" },
    { value: "ZCOOL XiaoWei", labelKey: "font_xiaowei", sampleKey: "font_sample" },
    { value: "KaiTi", labelKey: "font_kaiti", sampleKey: "font_sample" },
    { value: "PingFang SC", labelKey: "font_pingfang", sampleKey: "font_sample" },
  ],
  en: [
    { value: "Caveat", labelKey: "font_caveat", sampleKey: "font_sample_en_script" },
    { value: "Shadows Into Light", labelKey: "font_shadow", sampleKey: "font_sample_en_script" },
    { value: "DM Serif Text", labelKey: "font_dm_serif", sampleKey: "font_sample_en_serif" },
    { value: "Libre Baskerville", labelKey: "font_baskerville", sampleKey: "font_sample_en_serif" },
  ],
};

function t(key, vars = {}) {
  const table = i18n[currentLanguage] || i18n.zh;
  const fallback = i18n.zh[key];
  let text = table[key] ?? fallback ?? key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function getActiveFontPresets() {
  return FONT_PRESETS[currentLanguage] || FONT_PRESETS.zh;
}

function getDefaultFontFamily() {
  return getActiveFontPresets()[0]?.value || "Ma Shan Zheng";
}

function getFontStack(family) {
  const englishFamilies = new Set(["Caveat", "Shadows Into Light", "DM Serif Text", "Libre Baskerville"]);
  if (englishFamilies.has(family)) {
    return `"${family}", "Georgia", "Times New Roman", serif`;
  }
  return `"${family}", "KaiTi", "STKaiti", "PingFang SC", "Microsoft YaHei", cursive`;
}

function rebuildFontOptions() {
  if (!textFontFamilyInput) return;
  const presets = getActiveFontPresets();
  const currentValue = textFontFamilyInput.value;
  textFontFamilyInput.innerHTML = "";
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.value;
    option.dataset.i18n = preset.labelKey;
    option.textContent = t(preset.labelKey);
    textFontFamilyInput.appendChild(option);
  });
  const nextValue = presets.some((preset) => preset.value === currentValue) ? currentValue : getDefaultFontFamily();
  textFontFamilyInput.value = nextValue;
}

function getScopedStorageKey(baseKey) {
  return journalId ? `${baseKey}_${journalId}` : baseKey;
}

function generateJournalId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replaceAll("-", "");
  }
  return `journal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set(JOURNAL_QUERY_KEY, journalId);
  return url.toString();
}

function ensureJournalId() {
  const url = new URL(window.location.href);
  const fromQuery = (url.searchParams.get(JOURNAL_QUERY_KEY) || "").trim();
  journalLoadedFromQuery = Boolean(fromQuery);
  journalId = fromQuery || generateJournalId();
  url.searchParams.set(JOURNAL_QUERY_KEY, journalId);
  window.history.replaceState({}, "", url.toString());
}

function updateShareLinkUi() {
  if (shareLinkInput) {
    shareLinkInput.value = journalId ? getShareUrl() : "";
  }
}

function getLocalizedTapeName(tape) {
  return t(tape?.nameKey || "tape_fallback");
}

function getPatternLabel(pattern) {
  if (pattern === "grid") return t("pattern_grid");
  if (pattern === "dot") return t("pattern_dot");
  if (pattern === "hatch") return t("pattern_hatch");
  if (pattern === "petal") return t("pattern_petal");
  return t("pattern_diag");
}

function getDateFormatSamples() {
  return {
    "cn-week": currentLanguage === "en" ? "Mar 08, 2026 · Sun" : "2026年3月8日 周日",
    slash: "2026/03/08",
    "dot-week": currentLanguage === "en" ? "08 Mar 2026 · Sun" : "2026.03.08 Sun",
    lunar: currentLanguage === "en" ? "Chinese calendar · Feb 1" : "农历 二月初一",
  };
}

function localizeItemType(type) {
  if (type === "tape") return t("type_tape");
  if (type === "sticker") return t("type_sticker");
  if (type === "poster") return t("type_poster");
  if (type === "link") return t("type_link");
  return t("type_text");
}

function localizeVersionReason(reason) {
  if (reason === "自动" || reason === "Auto") return t("version_reason_auto");
  if (reason === "手动" || reason === "Manual") return t("version_reason_manual");
  if (reason === "初始" || reason === "Initial") return t("version_reason_initial");
  return reason;
}

function translateStatusText(text, previousLanguage) {
  const oldTable = i18n[previousLanguage] || i18n.zh;
  if (text === oldTable.unsaved) return t("unsaved");
  if (text === oldTable.save_saved) return t("save_saved");
  if (text === oldTable.save_saving) return t("save_saving");
  if (text === oldTable.save_failed_cloud) return t("save_failed_cloud");
  if (text === oldTable.saved_manual_version) return t("saved_manual_version");
  if (text === oldTable.copied_item) return t("copied_item");
  if (text === oldTable.migrated_image_storage) return t("migrated_image_storage");
  return text;
}

function updateStaticTranslations(previousLanguage = currentLanguage) {
  const existingSaveStatus = saveStatus?.textContent || "";
  document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
  document.title = t("document_title");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
  rebuildFontOptions();
  Array.from(textFontFamilyInput?.options || []).forEach((option) => {
    const key = option.dataset.i18n;
    if (key) option.textContent = t(key);
  });
  Array.from(dateFormatSelect?.options || []).forEach((option) => {
    const samples = getDateFormatSamples();
    option.textContent = samples[option.value] || option.value;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (key) node.setAttribute("placeholder", t(key));
  });
  document.querySelectorAll("[data-i18n-value]").forEach((node) => {
    const key = node.dataset.i18nValue;
    if (key && "value" in node && !node.readOnly) node.value = t(key);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.dataset.i18nAriaLabel;
    if (key) node.setAttribute("aria-label", t(key));
  });

  if (textInput) {
    const oldDefault = i18n[previousLanguage]?.text_input_default;
    if (!textInput.value || textInput.value === oldDefault) {
      textInput.value = t("text_input_default");
    }
  }
  if (saveStatus && existingSaveStatus) {
    saveStatus.textContent = translateStatusText(existingSaveStatus, previousLanguage);
  }
  if (langZhBtn) langZhBtn.classList.toggle("is-active", currentLanguage === "zh");
  if (langEnBtn) langEnBtn.classList.toggle("is-active", currentLanguage === "en");
  updateShareLinkUi();
}

function setLanguage(lang) {
  const nextLanguage = lang === "en" ? "en" : "zh";
  if (nextLanguage === currentLanguage) return;
  const previousLanguage = currentLanguage;
  currentLanguage = nextLanguage;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch (_) {
    // ignore language save failure
  }
  updateStaticTranslations(previousLanguage);
  renderVersionList();
  renderAssets();
  setAllLayersDirty();
  renderPage(null, true);
  if (toggleSnapBtn) {
    toggleSnapBtn.textContent = t("snap_grid", { state: snapEnabled ? t("snap_on") : t("snap_off") });
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function defaultTextStyle() {
  return {
    fontFamily: getDefaultFontFamily(),
    fontSize: currentLanguage === "en" ? 22 : 24,
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
    if (typeof item.width !== "number") item.width = 220;
  }
  if (item.type === "link") {
    if (typeof item.width !== "number") item.width = 220;
    if (typeof item.pageUrl !== "string") item.pageUrl = "";
    if (typeof item.imageUrl !== "string") item.imageUrl = "";
    if (typeof item.siteName !== "string") item.siteName = "";
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

function getCurrentLayer() {
  return pageLayers[currentPage] || pageEl;
}

function setAllLayersDirty() {
  for (let i = 0; i < pageLayerDirty.length; i += 1) {
    pageLayerDirty[i] = true;
  }
}

function initPageLayers() {
  pageLayers.forEach((layer, idx) => {
    layer.classList.toggle("is-active", idx === currentPage);
    if (!layer.dataset.bound) {
      layer.addEventListener("pointerdown", (event) => {
        if (event.target === layer) {
          clearSelection();
        }
      });
      layer.dataset.bound = "1";
    }
    if (layer.parentNode !== pageEl) {
      pageEl.appendChild(layer);
    }
  });
}

function updateLayerVisibility() {
  pageLayers.forEach((layer, idx) => {
    layer.classList.toggle("is-active", idx === currentPage);
  });
}

function getPageCount() {
  return pages.length;
}

function createPageLayer() {
  const layer = document.createElement("div");
  layer.className = "page-layer";
  return layer;
}

function ensurePageSlots(count) {
  const safeCount = clamp(Number(count) || 0, 1, MAX_PAGE_COUNT);
  while (pages.length < safeCount) {
    pages.push([]);
    pageLayers.push(createPageLayer());
    pageLayerDirty.push(true);
  }
}

function renderLayerAt(pageIndex, force = false) {
  const layer = pageLayers[pageIndex];
  if (!layer) return;
  if (!force && !pageLayerDirty[pageIndex]) return;
  const fragment = document.createDocumentFragment();
  pages[pageIndex].forEach((item) => {
    const node = toItemNode(item);
    fragment.appendChild(node);
  });
  layer.replaceChildren(fragment);
  pageLayerDirty[pageIndex] = false;
}

function warmAllLayers() {
  for (let i = 0; i < getPageCount(); i += 1) {
    if (i === currentPage) continue;
    renderLayerAt(i);
  }
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
    fontWeight: "400",
  };
}

function syncTextInputsFromItem(item) {
  if (!item || item.type !== "text") return;
  if (textFontFamilyInput) textFontFamilyInput.value = item.fontFamily || getDefaultFontFamily();
  if (textFontSizeInput) textFontSizeInput.value = String(clamp(Number(item.fontSize || 30), 14, 72));
  if (textColorInput) textColorInput.value = normalizeHexColor(item.color, "#4f5a55");
  refreshVisualSelections();
}

function applyTextStyleToElement(textEl, item) {
  if (!textEl || !item) return;
  const family = item.fontFamily || getDefaultFontFamily();
  const size = clamp(Number(item.fontSize || 30), 14, 72);
  const color = normalizeHexColor(item.color, "#4f5a55");
  const weight = item.fontWeight === "700" ? "700" : "400";
  textEl.style.fontFamily = getFontStack(family);
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
    localStorage.setItem(getScopedStorageKey(VERSION_STORAGE_KEY), JSON.stringify(versions));
  } catch (_) {
    // ignore version save failures
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({
        emojis: favoriteEmojis,
      }),
    );
  } catch (_) {
    // ignore favorite save failures
  }
}

function loadFavorites() {
  favoriteEmojis = [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.emojis)) {
      favoriteEmojis = parsed.emojis.filter((emoji) => typeof emoji === "string" && emoji.trim()).slice(0, 16);
    }
  } catch (_) {
    favoriteEmojis = [];
  }
}

function updateJournalMissingState() {
  if (!journalMissingStateEl || !notebookEl) return;
  journalMissingStateEl.hidden = !missingJournalLink;
  notebookEl.classList.toggle("is-journal-missing", missingJournalLink);
}

async function loadRemoteState() {
  if (!journalId) return "idle";
  try {
    const response = await fetch(`/api/journals/${encodeURIComponent(journalId)}`);
    if (response.status === 404) return "not_found";
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.state || !Array.isArray(payload.state.pages)) return "invalid";
    replacePages(payload.state.pages);
    currentPage = clamp(Number(payload.state.currentPage || 0), 0, getPageCount() - 1);
    try {
      localStorage.setItem(getScopedStorageKey(STORAGE_KEY), JSON.stringify(payload.state));
      localStorage.setItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY), String(currentPage));
    } catch (_) {
      // ignore local cache failures
    }
    return "loaded";
  } catch (_) {
    return "error";
  }
}

async function saveRemoteState(snapshot, saveSeq) {
  if (!journalId) return;
  const response = await fetch(`/api/journals/${encodeURIComponent(journalId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: snapshot }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (saveSeq === remoteSaveSeq) {
    markSavedStatus(t("save_saved"));
  }
}

function rememberEmojiFavorite(emoji) {
  if (!emoji) return;
  favoriteEmojis = [emoji, ...favoriteEmojis.filter((entry) => entry !== emoji)].slice(0, 16);
  saveFavorites();
  renderAssets();
}

function renderVersionList() {
  if (!versionSelect) return;
  versionSelect.innerHTML = "";
  if (!versions.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("version_empty");
    versionSelect.appendChild(option);
    if (restoreVersionBtn) restoreVersionBtn.disabled = true;
    return;
  }
  versions.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = t("version_entry", {
      time: formatVersionTime(entry.createdAt),
      reason: localizeVersionReason(entry.reason),
      count: entry.itemCount,
    });
    versionSelect.appendChild(option);
  });
  if (restoreVersionBtn) restoreVersionBtn.disabled = false;
}

function captureVersion(reason = t("version_reason_auto")) {
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
  captureVersion(t("version_reason_auto"));
}

function replacePages(nextPages) {
  pages.splice(0, pages.length);
  pageLayers.splice(0, pageLayers.length);
  pageLayerDirty.splice(0, pageLayerDirty.length);
  const normalizedCount = clamp(
    Array.isArray(nextPages) && nextPages.length ? nextPages.length : INITIAL_PAGE_COUNT,
    1,
    MAX_PAGE_COUNT,
  );
  for (let i = 0; i < normalizedCount; i += 1) {
    const page = Array.isArray(nextPages[i]) ? nextPages[i] : [];
    pages.push(page.map((item) => normalizeItem(item)));
    pageLayers.push(createPageLayer());
    pageLayerDirty.push(true);
  }
  setAllLayersDirty();
}

function markSavedStatus(text) {
  if (saveStatus) saveStatus.textContent = text;
}

async function saveStateNow() {
  const snapshot = snapshotState();
  const saveSeq = remoteSaveSeq + 1;
  remoteSaveSeq = saveSeq;
  try {
    localStorage.setItem(getScopedStorageKey(STORAGE_KEY), JSON.stringify(snapshot));
    localStorage.setItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY), String(currentPage));
    maybeCaptureAutoVersion();
  } catch (error) {
    if (error && error.name === "QuotaExceededError") {
      markSavedStatus(t("save_failed_quota"));
      return;
    }
    markSavedStatus(t("save_failed_storage"));
    return;
  }

  try {
    await saveRemoteState(snapshot, saveSeq);
  } catch (_) {
    if (saveSeq === remoteSaveSeq) {
      markSavedStatus(t("save_failed_cloud"));
    }
  }
}

function scheduleSave(delay = 160) {
  opsSinceLastVersion += 1;
  markSavedStatus(t("save_saving"));
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    void saveStateNow();
    saveTimer = null;
  }, delay);
}

function loadState() {
  try {
    const raw = localStorage.getItem(getScopedStorageKey(STORAGE_KEY));
    const fallbackPage = clamp(
      Number(localStorage.getItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY)) || 0),
      0,
      getPageCount() - 1,
    );
    if (!raw) {
      currentPage = fallbackPage;
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages)) {
      currentPage = fallbackPage;
      return false;
    }
    replacePages(parsed.pages);
    currentPage = clamp(Number(parsed.currentPage ?? fallbackPage), 0, getPageCount() - 1);
    return true;
  } catch (_) {
    currentPage = clamp(
      Number(localStorage.getItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY)) || 0),
      0,
      getPageCount() - 1,
    );
    return false;
  }
}

function loadVersions() {
  versions = [];
  try {
    const raw = localStorage.getItem(getScopedStorageKey(VERSION_STORAGE_KEY));
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
  currentPage = clamp(Number(snapshot.currentPage || 0), 0, getPageCount() - 1);
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
  currentPage = clamp(Number(entry.snapshot.currentPage || 0), 0, getPageCount() - 1);
  clearSelection();
  renderPage();
  scheduleSave(0);
  markSavedStatus(t("saved_version_restored", { time: formatVersionTime(entry.createdAt) }));
}

function saveManualVersion() {
  captureVersion(t("version_reason_manual"));
  markSavedStatus(t("saved_manual_version"));
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
  const cutoutEnabled = enabled && item?.type === "poster" && !item?.locked;
  if (bringFrontBtn) bringFrontBtn.disabled = !enabled;
  if (sendBackBtn) sendBackBtn.disabled = !enabled;
  if (rotateTapeBtn) rotateTapeBtn.disabled = !enabled || item?.type !== "tape";
  if (removeBgBtn) removeBgBtn.disabled = !cutoutEnabled;
  if (toggleLockBtn) toggleLockBtn.disabled = !enabled;
  if (deleteItemBtn) deleteItemBtn.disabled = !enabled;

  if (!item) {
    if (layerMeta) layerMeta.textContent = t("no_selection");
    if (toggleLockBtn) toggleLockBtn.textContent = t("lock");
    updateSelectionToolbar();
    return;
  }

  const idx = pages[currentPage].findIndex((entry) => entry.id === item.id);
  if (layerMeta) {
    layerMeta.textContent = t("item_meta", {
      type: localizeItemType(item.type),
      index: idx + 1,
      total: pages[currentPage].length,
    });
  }
  if (toggleLockBtn) toggleLockBtn.textContent = item.locked ? t("unlock") : t("lock");
  updateSelectionToolbar();
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

function updateSelectionToolbar() {
  if (!selectionToolbar) return;
  const item = getSelectedItem();
  if (!item || !selectedNode) {
    selectionToolbar.classList.remove("is-visible");
    selectionToolbar.setAttribute("aria-hidden", "true");
    return;
  }
  const pageRect = pageEl.getBoundingClientRect();
  const nodeRect = selectedNode.getBoundingClientRect();
  const toolbarRect = selectionToolbar.getBoundingClientRect();
  const desiredLeft = nodeRect.left - pageRect.left + nodeRect.width / 2 - toolbarRect.width / 2;
  const desiredTop = nodeRect.top - pageRect.top - toolbarRect.height - 12;
  const left = clamp(desiredLeft, 10, Math.max(10, pageRect.width - toolbarRect.width - 10));
  const top = desiredTop < 10 ? nodeRect.bottom - pageRect.top + 12 : desiredTop;
  selectionToolbar.style.left = `${left}px`;
  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.classList.add("is-visible");
  selectionToolbar.setAttribute("aria-hidden", "false");
}

function activatePanelTab(tabId) {
  panelTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === tabId);
  });
  panelSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.panel === tabId);
  });
}

async function createFreshJournalFromMissingLink() {
  journalId = generateJournalId();
  journalLoadedFromQuery = false;
  missingJournalLink = false;
  updateJournalMissingState();
  replacePages([]);
  ensurePageSlots(INITIAL_PAGE_COUNT);
  currentPage = 0;
  historyStack = [];
  redoStack = [];
  versions = [];
  lastVersionAt = 0;
  lastVersionItemCount = 0;
  opsSinceLastVersion = 0;
  clearSelection();
  updateHistoryButtons();
  renderVersionList();
  updateShareLinkUi();
  const url = new URL(window.location.href);
  url.searchParams.set(JOURNAL_QUERY_KEY, journalId);
  window.history.replaceState({}, "", url.toString());
  renderPage(null, true);
  markSavedStatus(t("save_saving"));
  await saveStateNow();
}

function refreshVisualSelections() {
  const selectedTapeId = tapeSelect?.value || tapes[0]?.id;
  if (tapeGallery) {
    tapeGallery.querySelectorAll(".tape-card").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.tapeId === selectedTapeId);
    });
  }
  if (fontPreviewList) {
    fontPreviewList.querySelectorAll(".font-card").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.font === textFontFamilyInput?.value);
    });
  }
  if (dateFormatCards) {
    dateFormatCards.querySelectorAll(".date-card").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.format === dateFormatSelect?.value);
    });
  }
  const activeColor = normalizeHexColor(textColorInput?.value, "#4f5a55");
  if (colorChipList) {
    colorChipList.querySelectorAll(".color-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.color === activeColor);
    });
  }
  if (fontSizeBadge) {
    fontSizeBadge.textContent = `${textFontSizeInput?.value || "24"} px`;
  }
}

function updateIndicator() {
  pageIndicator.textContent = t("page_indicator", { page: currentPage + 1, total: getPageCount() });
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage === getPageCount() - 1;
}

function clearPageDropMarkers() {
  if (!pageThumbnailList) return;
  pageThumbnailList.querySelectorAll(".page-thumb-card").forEach((node) => {
    node.classList.remove("is-drop-before", "is-drop-after", "is-dragging");
  });
}

function movePageByDrop(fromIndex, targetIndex, placeAfter) {
  if (
    fromIndex < 0 ||
    targetIndex < 0 ||
    fromIndex >= getPageCount() ||
    targetIndex >= getPageCount()
  ) return;
  let insertIndex = targetIndex + (placeAfter ? 1 : 0);
  if (fromIndex < insertIndex) insertIndex -= 1;
  if (insertIndex === fromIndex) return;

  pushHistory();

  const [movedPage] = pages.splice(fromIndex, 1);
  pages.splice(insertIndex, 0, movedPage);

  const [movedLayer] = pageLayers.splice(fromIndex, 1);
  pageLayers.splice(insertIndex, 0, movedLayer);

  const [movedDirty] = pageLayerDirty.splice(fromIndex, 1);
  pageLayerDirty.splice(insertIndex, 0, movedDirty);

  if (currentPage === fromIndex) {
    currentPage = insertIndex;
  } else if (fromIndex < currentPage && insertIndex >= currentPage) {
    currentPage -= 1;
  } else if (fromIndex > currentPage && insertIndex <= currentPage) {
    currentPage += 1;
  }

  clearSelection();
  initPageLayers();
  updateLayerVisibility();
  renderPage(null, true);
  markSavedStatus(t("page_moved"));
  scheduleSave();
}

function buildPageRow(index) {
  const page = pages[index] || [];
  const card = document.createElement("div");
  card.className = "page-thumb-card";
  card.classList.toggle("is-active", index === currentPage);
  card.draggable = true;

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "page-thumb-preview";
  previewBtn.addEventListener("click", () => {
    if (index === currentPage) return;
    currentPage = index;
    clearSelection();
    renderPage();
    try {
      localStorage.setItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY), String(currentPage));
    } catch (_) {
      // ignore page index save failure
    }
  });

  const meta = document.createElement("div");
  meta.className = "page-thumb-meta";
  const title = document.createElement("strong");
  title.textContent = t("page_label_short", { page: index + 1 });
  const count = document.createElement("span");
  count.textContent = page.length ? t("page_item_count", { count: page.length }) : t("page_empty");
  meta.appendChild(title);
  meta.appendChild(count);
  previewBtn.appendChild(meta);
  const dragHint = document.createElement("span");
  dragHint.className = "page-thumb-drag-hint";
  dragHint.textContent = "⋮⋮";
  previewBtn.appendChild(dragHint);

  card.addEventListener("dragstart", (event) => {
    draggedPageIndex = index;
    clearPageDropMarkers();
    card.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    }
  });
  card.addEventListener("dragover", (event) => {
    if (draggedPageIndex === null || draggedPageIndex === index) return;
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    const placeAfter = event.clientY > rect.top + rect.height / 2;
    card.classList.toggle("is-drop-before", !placeAfter);
    card.classList.toggle("is-drop-after", placeAfter);
  });
  card.addEventListener("dragleave", () => {
    card.classList.remove("is-drop-before", "is-drop-after");
  });
  card.addEventListener("drop", (event) => {
    if (draggedPageIndex === null || draggedPageIndex === index) return;
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    const placeAfter = event.clientY > rect.top + rect.height / 2;
    clearPageDropMarkers();
    movePageByDrop(draggedPageIndex, index, placeAfter);
    draggedPageIndex = null;
  });
  card.addEventListener("dragend", () => {
    draggedPageIndex = null;
    clearPageDropMarkers();
  });

  card.appendChild(previewBtn);
  return card;
}

function buildCollapsedBlankGroup(startIndex, endIndex) {
  const count = endIndex - startIndex + 1;
  const groupKey = `${startIndex}-${endIndex}`;
  const card = document.createElement("div");
  card.className = "page-thumb-card is-collapsed-group";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "page-thumb-preview page-thumb-group";
  toggleBtn.addEventListener("click", () => {
    if (collapsedBlankGroups.has(groupKey)) {
      collapsedBlankGroups.delete(groupKey);
    } else {
      collapsedBlankGroups.add(groupKey);
    }
    renderPageThumbnailList();
  });

  const meta = document.createElement("div");
  meta.className = "page-thumb-meta";
  const title = document.createElement("strong");
  title.textContent = t("blank_pages_group", { count });
  const helper = document.createElement("span");
  helper.textContent = collapsedBlankGroups.has(groupKey) ? t("collapse_pages") : t("expand_pages");
  meta.appendChild(title);
  meta.appendChild(helper);
  toggleBtn.appendChild(meta);

  card.appendChild(toggleBtn);
  return card;
}

function renderPageThumbnailList() {
  if (!pageThumbnailList) return;
  pageThumbnailList.innerHTML = "";

  for (let index = 0; index < getPageCount(); index += 1) {
    const page = pages[index] || [];
    if (page.length > 0) {
      pageThumbnailList.appendChild(buildPageRow(index));
      continue;
    }

    let endIndex = index;
    while (endIndex + 1 < getPageCount() && (pages[endIndex + 1] || []).length === 0) {
      endIndex += 1;
    }

    if (endIndex === index) {
      pageThumbnailList.appendChild(buildPageRow(index));
      continue;
    }

    const groupKey = `${index}-${endIndex}`;
    const containsCurrent = currentPage >= index && currentPage <= endIndex;
    const expanded = collapsedBlankGroups.has(groupKey) || containsCurrent;
    if (expanded) {
      collapsedBlankGroups.add(groupKey);
      for (let pageIndex = index; pageIndex <= endIndex; pageIndex += 1) {
        pageThumbnailList.appendChild(buildPageRow(pageIndex));
      }
    } else {
      pageThumbnailList.appendChild(buildCollapsedBlankGroup(index, endIndex));
    }
    index = endIndex;
  }
}

function addPage() {
  if (getPageCount() >= MAX_PAGE_COUNT) {
    markSavedStatus(t("page_limit_reached"));
    return;
  }
  pushHistory();
  const insertAt = currentPage + 1;
  pages.splice(insertAt, 0, []);
  pageLayers.splice(insertAt, 0, createPageLayer());
  pageLayerDirty.splice(insertAt, 0, true);
  currentPage = insertAt;
  clearSelection();
  initPageLayers();
  updateLayerVisibility();
  renderPage();
  markSavedStatus(t("page_added"));
  scheduleSave();
}

function addItem(rawItem) {
  pushHistory();
  const item = normalizeItem(rawItem);
  pages[currentPage].push(item);
  appendItemNode(item);
  renderPageThumbnailList();
  scheduleSave();
}

function addTape(tape) {
  addItem({
    id: uid(),
    type: "tape",
    text: getLocalizedTapeName(tape) || t("tape_fallback"),
    color: tape.color,
    pattern: tape.pattern || "diag",
    x: 120,
    y: 120,
    width: 130,
  });
}

function addEmojiSticker(emoji) {
  rememberEmojiFavorite(emoji);
  addItem({
    id: uid(),
    type: "sticker",
    text: emoji,
    x: 120,
    y: 120,
  });
}

function addEmojiTape(emoji) {
  rememberEmojiFavorite(emoji);
  addItem({
    id: uid(),
    type: "tape",
    text: emoji,
    emoji,
    color: "transparent",
    pattern: "diag",
    x: 120,
    y: 120,
    width: 168,
  });
}

function addTextBlock() {
  const text = (textInput.value || t("note_fallback")).trim();
  const style = getTextStyleFromInputs();
  addItem({
    id: uid(),
    type: "text",
    text,
    ...style,
    width: 220,
    x: 160,
    y: 230,
  });
}

function formatToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const weekCn = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mode = dateFormatSelect?.value || "cn-week";
  if (mode === "lunar") {
    try {
      const lunar = new Intl.DateTimeFormat(
        currentLanguage === "en" ? "en-u-ca-chinese" : "zh-Hans-CN-u-ca-chinese",
        {
        year: "numeric",
        month: "long",
        day: "numeric",
        },
      ).format(now);
      return currentLanguage === "en" ? `Lunar ${lunar}` : `农历 ${lunar}`;
    } catch (_) {
      return currentLanguage === "en"
        ? `${yyyy}-${mm}-${dd} ${weekEn[now.getDay()]}`
        : `${yyyy}年${Number(mm)}月${Number(dd)}日 ${weekCn[now.getDay()]}`;
    }
  }
  if (mode === "slash") return `${yyyy}/${mm}/${dd}`;
  if (mode === "dot-week") {
    return currentLanguage === "en"
      ? `${dd} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()]} ${yyyy} · ${weekEn[now.getDay()]}`
      : `${yyyy}.${mm}.${dd} ${weekEn[now.getDay()]}`;
  }
  return currentLanguage === "en"
    ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()]} ${dd}, ${yyyy} · ${weekEn[now.getDay()]}`
    : `${yyyy}年${Number(mm)}月${Number(dd)}日 ${weekCn[now.getDay()]}`;
}

function insertDateBlock() {
  const style = getTextStyleFromInputs();
  addItem({
    id: uid(),
    type: "text",
    text: formatToday(),
    ...style,
    width: 300,
    x: 140,
    y: 150,
  });
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
    text: image.title || t("image_title_fallback"),
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
    imageStatus.textContent = t("manual_image_empty");
    return;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      imageStatus.textContent = t("manual_image_protocol");
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
      imageStatus.textContent = t("manual_image_load_fail");
      return;
    }
    await addImageSticker({
      title: t("manual_image_title"),
      image_url: rawUrl,
    });
    imageStatus.textContent = t("manual_image_inserted");
    manualImageUrlInput.value = "";
  } catch (_) {
    imageStatus.textContent = t("invalid_url");
  }
}

function normalizeWebUrl(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const input = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const parsed = new URL(input);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed.toString();
}

function buildFallbackThumbnail(url) {
  return `https://image.thum.io/get/width/900/crop/560/noanimate/${url}`;
}

async function fetchUrlPreview(rawUrl) {
  const endpoint = new URL("api/url-preview", window.location.href);
  endpoint.search = new URLSearchParams({ url: rawUrl }).toString();
  const response = await fetch(endpoint.toString());
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    const message = payload?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function insertUrlPreview() {
  const normalized = normalizeWebUrl(urlPreviewInput?.value || "");
  if (!normalized) {
    imageStatus.textContent = t("invalid_web_url");
    return;
  }

  if (insertUrlPreviewBtn) {
    insertUrlPreviewBtn.disabled = true;
    insertUrlPreviewBtn.textContent = t("insert_web_preview_loading");
  }
  imageStatus.textContent = t("fetching_web_preview");

  try {
    const preview = await fetchUrlPreview(normalized);
    const thumbnailRaw = preview.thumbnail_url || buildFallbackThumbnail(normalized);
    let thumbnail = buildImageProxyUrl(thumbnailRaw);
    let canLoad = false;
    try {
      await preloadImage(thumbnail);
      canLoad = true;
    } catch (_) {
      const fallback = buildImageProxyUrl(buildFallbackThumbnail(normalized));
      try {
        await preloadImage(fallback);
        canLoad = true;
        thumbnail = fallback;
      } catch (_) {
        canLoad = false;
      }
    }
    if (!canLoad) {
      imageStatus.textContent = t("web_preview_thumb_fail");
      return;
    }
    addItem({
      id: uid(),
      type: "link",
      text: preview.title || t("web_preview_title"),
      pageUrl: normalized,
      imageUrl: thumbnail,
      siteName: preview.site_name || "",
      width: 220,
      x: 120,
      y: 120,
    });
    imageStatus.textContent = t("web_preview_inserted");
    if (urlPreviewInput) urlPreviewInput.value = "";
  } catch (error) {
    imageStatus.textContent = t("fetch_failed", { message: error?.message || "Unknown error" });
  } finally {
    if (insertUrlPreviewBtn) {
      insertUrlPreviewBtn.disabled = false;
      insertUrlPreviewBtn.textContent = t("insert_web_preview");
    }
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
    imageStatus.textContent = t("paste_read_fail");
    return;
  }

  try {
    const compressed = await compressImageBlob(blob);
    const dataUrl = await readBlobAsDataUrl(compressed);
    await addImageSticker({
      title: t("pasted_screenshot_title"),
      image_url: dataUrl,
    });
    imageStatus.textContent = t("pasted_screenshot_inserted");
  } catch (_) {
    imageStatus.textContent = t("paste_parse_fail");
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

function getTapeBackground(item) {
  if (item.emoji) return "transparent";
  const color = item.color || "#d8c4a7";
  const pattern = item.pattern || "diag";
  if (pattern === "grid") {
    return `linear-gradient(${color}cc, ${color}cc), repeating-linear-gradient(0deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 1px, transparent 1px, transparent 10px), repeating-linear-gradient(90deg, rgba(255,255,255,0.26), rgba(255,255,255,0.26) 1px, transparent 1px, transparent 10px)`;
  }
  if (pattern === "dot") {
    return `linear-gradient(${color}d8, ${color}d8), radial-gradient(circle at 4px 4px, rgba(255,255,255,0.35) 0 1.5px, transparent 1.5px)`;
  }
  if (pattern === "hatch") {
    return `repeating-linear-gradient(60deg, ${color}, ${color} 8px, rgba(255,255,255,0.24) 8px, rgba(255,255,255,0.24) 16px)`;
  }
  if (pattern === "petal") {
    return `linear-gradient(${color}d8, ${color}d8), radial-gradient(8px 5px at 7px 8px, rgba(255,255,255,0.35), transparent 70%), radial-gradient(7px 5px at 17px 14px, rgba(255,255,255,0.3), transparent 72%)`;
  }
  return `repeating-linear-gradient(135deg, ${color}, ${color} 12px, rgba(255,255,255,0.22) 12px, rgba(255,255,255,0.22) 24px)`;
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
  if (item.type === "link") {
    return { width: (item.width || 220) * scale, height: Math.max(170, (item.width || 220) * 0.8) * scale };
  }
  if (item.type === "sticker") {
    return { width: 44 * scale, height: 44 * scale };
  }
  return { width: (item.width || 220) * scale, height: 72 * scale };
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
  const edgeTargetsX = [DRAG_EDGE_PADDING, pageRect.width - width - DRAG_EDGE_PADDING];
  const edgeTargetsY = [DRAG_EDGE_PADDING, pageRect.height - height - DRAG_EDGE_PADDING];
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
      const rawX = clamp(
        moveEvent.clientX - rect.left - offsetX,
        DRAG_EDGE_PADDING,
        rect.width - itemWidth - DRAG_EDGE_PADDING,
      );
      const rawY = clamp(
        moveEvent.clientY - rect.top - offsetY,
        DRAG_EDGE_PADDING,
        rect.height - itemHeight - DRAG_EDGE_PADDING,
      );
      const snapped = snapPosition(item, rawX, rawY, itemWidth, itemHeight);
      item.x = snapped.x;
      item.y = snapped.y;
      node.style.left = `${snapped.x}px`;
      node.style.top = `${snapped.y}px`;
      updateSelectionToolbar();
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
      updateSelectionToolbar();
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
      updateSelectionToolbar();
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
      updateSelectionToolbar();
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

function bindTextWidthResize(node, item) {
  const handle = document.createElement("div");
  handle.className = "text-width-handle";
  node.appendChild(handle);

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (item.locked) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    pushHistory();

    const startX = event.clientX;
    const startWidth = item.width || node.getBoundingClientRect().width || 220;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      item.width = Math.max(120, startWidth + dx);
      node.style.width = `${item.width}px`;
      updateSelectionToolbar();
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
    setSelectedNode(node);
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
    node.style.background = getTapeBackground(item);
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
        const cached = posterObjectUrls.get(item.id);
        if (cached) {
          src = cached;
        } else {
          const blob = await getImageBlob(item.imageRef);
          if (blob) {
            releasePosterObjectUrl(item.id);
            src = URL.createObjectURL(blob);
            posterObjectUrls.set(item.id, src);
          }
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
      img.alt = t("image_load_failed_alt", { text: item.text });
    });
    if (item.width) img.style.width = `${item.width}px`;
    node.appendChild(img);
  } else if (item.type === "link") {
    node.classList.add("item-link-preview");
    node.style.width = `${item.width || 220}px`;

    const thumb = document.createElement("img");
    thumb.className = "link-thumb";
    thumb.alt = item.text || t("web_preview_title");
    thumb.loading = "lazy";
    thumb.draggable = false;
    thumb.src = item.imageUrl || buildImageProxyUrl(buildFallbackThumbnail(item.pageUrl || ""));
    thumb.addEventListener("error", () => {
      const fallback = buildImageProxyUrl(buildFallbackThumbnail(item.pageUrl || ""));
      if (thumb.src !== fallback) {
        thumb.src = fallback;
      }
    });
    node.appendChild(thumb);

    const body = document.createElement("div");
    body.className = "link-body";
    const title = document.createElement("div");
    title.className = "link-title";
    title.textContent = item.text || t("web_preview_title");
    const site = document.createElement("div");
    site.className = "link-site";
    if (item.siteName) {
      site.textContent = item.siteName;
    } else {
      try {
        site.textContent = new URL(item.pageUrl || "").hostname || t("type_link");
      } catch (_) {
        site.textContent = t("type_link");
      }
    }
    body.appendChild(title);
    body.appendChild(site);
    node.appendChild(body);

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "link-open-btn";
    openBtn.textContent = t("open");
    openBtn.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    openBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (item.pageUrl) window.open(item.pageUrl, "_blank", "noopener,noreferrer");
    });
    node.appendChild(openBtn);
  } else {
    node.classList.add("item-text");
    node.style.width = `${item.width || 220}px`;
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
  if (item.type === "text") bindTextWidthResize(node, item);
  bindItemDrag(node, item);
  bindItemWheelScale(node, item);

  return node;
}

function appendItemNode(item) {
  const node = toItemNode(item);
  getCurrentLayer().appendChild(node);
  setSelectedNode(node);
  updateLayerControls();
}

function renderPage(selectedId = null, force = false) {
  const keepId = selectedId || (selectedNode ? selectedNode.dataset.id : null);
  guideVertical = null;
  guideHorizontal = null;
  initPageLayers();

  renderLayerAt(currentPage, force);
  const layer = getCurrentLayer();
  updateLayerVisibility();

  let nextSelectedNode = null;
  if (keepId) {
    nextSelectedNode = layer.querySelector(`.journal-item[data-id="${keepId}"]`);
  }

  updateIndicator();
  renderPageThumbnailList();
  if (nextSelectedNode) {
    setSelectedNode(nextSelectedNode);
  } else {
    clearSelection();
  }
  ensureGuideElements();
  hideGuides();
  updateLayerControls();
}

function playPageFlip(direction, onMid) {
  isPageFlipping = true;
  if (pageFlipOverlayEl) {
    pageFlipOverlayEl.classList.remove("is-active", "to-next", "to-prev");
    pageFlipOverlayEl.classList.add("is-active");
  }
  window.requestAnimationFrame(() => {
    onMid();
    window.setTimeout(() => {
      if (pageFlipOverlayEl) pageFlipOverlayEl.classList.remove("is-active", "to-next", "to-prev");
      isPageFlipping = false;
    }, 70);
  });
}

function switchPage(direction) {
  if (isPageFlipping) return;
  const next = currentPage + direction;
  if (next < 0 || next >= getPageCount()) return;
  playPageFlip(direction, () => {
    currentPage = next;
    clearSelection();
    renderPage();
    try {
      localStorage.setItem(getScopedStorageKey(PAGE_INDEX_STORAGE_KEY), String(currentPage));
    } catch (_) {
      // ignore page index save failure
    }
  });
}

function clearCurrentPage() {
  if (!pages[currentPage].length) return;
  pushHistory();
  pages[currentPage].forEach((item) => {
    if (item.type === "poster") {
      releasePosterObjectUrl(item.id);
    }
  });
  const removedRefs = new Set(
    pages[currentPage]
      .filter((item) => item.type === "poster" && item.imageRef)
      .map((item) => item.imageRef),
  );
  pages[currentPage] = [];
  pageLayerDirty[currentPage] = false;
  getCurrentLayer().replaceChildren();
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
    let nextX = clamp(
      Math.round(item.x / GRID_SIZE) * GRID_SIZE,
      DRAG_EDGE_PADDING,
      pageWidth - size.width - DRAG_EDGE_PADDING,
    );
    let nextY = clamp(
      Math.round(item.y / GRID_SIZE) * GRID_SIZE,
      DRAG_EDGE_PADDING,
      pageHeight - size.height - DRAG_EDGE_PADDING,
    );

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
    const node = getCurrentLayer().querySelector(`.journal-item[data-id="${item.id}"]`);
    if (node) {
      node.style.left = `${nextX}px`;
      node.style.top = `${nextY}px`;
    }
  });

  hideGuides();
  updateSelectionToolbar();
  if (changed > 0) {
    markSavedStatus(t("aligned_items", { count: changed }));
    scheduleSave();
  } else {
    markSavedStatus(t("no_alignment_needed"));
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
  getCurrentLayer().appendChild(selectedNode);
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
  const layer = getCurrentLayer();
  layer.insertBefore(selectedNode, layer.firstChild);
  updateLayerControls();
  scheduleSave();
}

function rotateSelectedTape() {
  const item = getSelectedItem();
  if (!item || item.type !== "tape" || !selectedNode) return;
  pushHistory();
  item.rotation = item.rotation === 90 ? 0 : 90;
  applyItemTransform(item, selectedNode);
  updateSelectionToolbar();
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
  if (item.type === "poster") {
    releasePosterObjectUrl(item.id);
  }
  if (item.type === "poster" && item.imageRef && !isImageRefStillUsed(item.imageRef)) {
    void deleteImageBlob(item.imageRef);
  }
  const layer = getCurrentLayer();
  if (selectedNode && selectedNode.parentNode === layer) {
    layer.removeChild(selectedNode);
  }
  clearSelection();
  renderPageThumbnailList();
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
  const nextX = clamp((item.x || 0) + dx, DRAG_EDGE_PADDING, rect.width - nodeRect.width - DRAG_EDGE_PADDING);
  const nextY = clamp((item.y || 0) + dy, DRAG_EDGE_PADDING, rect.height - nodeRect.height - DRAG_EDGE_PADDING);
  item.x = nextX;
  item.y = nextY;
  selectedNode.style.left = `${nextX}px`;
  selectedNode.style.top = `${nextY}px`;
  hideGuides();
  updateSelectionToolbar();
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
    toggleSnapBtn.textContent = t("snap_grid", { state: snapEnabled ? t("snap_on") : t("snap_off") });
  }
  if (!snapEnabled) hideGuides();
}

async function removeBackgroundForSelected() {
  const item = getSelectedItem();
  if (!item || item.type !== "poster" || item.locked || !selectedNode) return;
  pushHistory();
  imageStatus.textContent = t("removing_bg");
  const sourceBlob = await resolvePosterBlob(item, selectedNode);
  if (!sourceBlob) {
    imageStatus.textContent = t("remove_bg_read_fail");
    return;
  }
  try {
    const cutoutBlob = await removeBackgroundFromBlob(sourceBlob);
    const ref = `img_${uid()}_${Date.now()}`;
    const stored = await putImageBlob(ref, cutoutBlob);
    if (!stored) {
      imageStatus.textContent = t("remove_bg_storage_fail");
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
    imageStatus.textContent = t("remove_bg_done");
    scheduleSave();
  } catch (_) {
    imageStatus.textContent = t("remove_bg_detect_fail");
  }
}

function renderAssets() {
  if (favoritesGallery) {
    favoritesGallery.innerHTML = "";
    favoriteEmojis.forEach((emoji) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "favorite-pill emoji-pill";
      button.dataset.kind = "emoji";
      button.textContent = emoji;
      button.addEventListener("click", () => addEmojiSticker(emoji));
      favoritesGallery.appendChild(button);
    });

    if (favoritesEmpty) {
      favoritesEmpty.hidden = favoriteEmojis.length > 0;
    }
  }

  if (tapeSelect) {
    tapeSelect.innerHTML = "";
    tapes.forEach((tape) => {
      const option = document.createElement("option");
      option.value = tape.id;
      const marker =
        tape.pattern === "grid"
          ? "▦"
          : tape.pattern === "dot"
            ? "◍"
            : tape.pattern === "hatch"
              ? "⟋"
              : tape.pattern === "petal"
                ? "✿"
                : "▤";
      option.textContent = `${marker} ${getLocalizedTapeName(tape)}`;
      option.style.background = getTapeBackground(tape);
      option.style.color = "#3f4b46";
      tapeSelect.appendChild(option);
    });
  }

  if (tapeGallery) {
    tapeGallery.innerHTML = "";
    tapes.forEach((tape) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-card tape-card";
      button.dataset.tapeId = tape.id;
      const swatch = document.createElement("div");
      swatch.className = "tape-swatch";
      swatch.style.background = getTapeBackground(tape);
      const label = document.createElement("div");
      label.className = "tape-label";
      const name = document.createElement("span");
      name.textContent = getLocalizedTapeName(tape);
      const kind = document.createElement("span");
      kind.textContent = getPatternLabel(tape.pattern);
      label.appendChild(name);
      label.appendChild(kind);
      button.appendChild(swatch);
      button.appendChild(label);
      button.addEventListener("click", () => {
        if (tapeSelect) tapeSelect.value = tape.id;
        refreshVisualSelections();
        addTape(tape);
      });
      tapeGallery.appendChild(button);
    });
  }

  if (fontPreviewList) {
    fontPreviewList.innerHTML = "";
    getActiveFontPresets().forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-card font-card";
      button.dataset.font = preset.value;
      const sample = document.createElement("span");
      sample.className = "font-sample";
      sample.textContent = t(preset.sampleKey || "font_sample");
      sample.style.fontFamily = getFontStack(preset.value);
      const label = document.createElement("span");
      label.className = "font-label";
      label.textContent = t(preset.labelKey);
      button.appendChild(sample);
      button.appendChild(label);
      button.addEventListener("click", () => {
        if (textFontFamilyInput) textFontFamilyInput.value = preset.value;
        refreshVisualSelections();
        applyCurrentStyleToSelectedText();
      });
      fontPreviewList.appendChild(button);
    });
  }

  if (dateFormatCards) {
    dateFormatCards.innerHTML = "";
    Array.from(dateFormatSelect?.options || []).forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "visual-card date-card";
      button.dataset.format = option.value;
      const sample = document.createElement("span");
      sample.className = "date-sample";
      sample.textContent = getDateFormatSamples()[option.value] || option.textContent || option.value;
      const label = document.createElement("span");
      label.className = "date-label";
      label.textContent = option.value === "lunar" ? t("date_label_lunar") : t("date_label_standard");
      button.appendChild(sample);
      button.appendChild(label);
      button.addEventListener("click", () => {
        if (dateFormatSelect) dateFormatSelect.value = option.value;
        refreshVisualSelections();
        insertDateBlock();
      });
      dateFormatCards.appendChild(button);
    });
  }

  if (colorChipList) {
    colorChipList.innerHTML = "";
    colorPresets.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-chip";
      button.dataset.color = color;
      button.style.background = color;
      button.addEventListener("click", () => {
        if (textColorInput) textColorInput.value = color;
        refreshVisualSelections();
        applyCurrentStyleToSelectedText();
      });
      colorChipList.appendChild(button);
    });
  }

  const refreshTapeSelectStyle = () => {
    if (!tapeSelect) return;
    const selected = tapes.find((tape) => tape.id === tapeSelect.value) || tapes[0];
    if (!selected) return;
    tapeSelect.style.background = getTapeBackground(selected);
    refreshVisualSelections();
  };

  if (tapeSelect) {
    tapeSelect.addEventListener("change", refreshTapeSelectStyle);
  }
  refreshTapeSelectStyle();
  refreshVisualSelections();
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      if (existing.dataset.loaded === "1") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureExportLibraries() {
  if (!html2canvasPromise) {
    html2canvasPromise = loadExternalScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
  }
  if (!jsPdfPromise) {
    jsPdfPromise = loadExternalScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
  }
  await Promise.all([html2canvasPromise, jsPdfPromise]);
}

function makeExportFileBase() {
  return `journal-page-${currentPage + 1}`;
}

async function captureNotebookCanvas() {
  if (!notebookEl) {
    throw new Error("Notebook unavailable");
  }
  clearSelection();
  notebookEl.classList.add("is-exporting");
  try {
    await ensureExportLibraries();
    return await window.html2canvas(notebookEl, {
      backgroundColor: "#fffef8",
      scale: Math.min(2, window.devicePixelRatio || 2),
      useCORS: true,
      logging: false,
    });
  } finally {
    notebookEl.classList.remove("is-exporting");
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportCurrentPage(kind) {
  try {
    markSavedStatus(t("export_loading"));
    const canvas = await captureNotebookCanvas();
    const fileBase = makeExportFileBase();
    if (kind === "png") {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG generation failed");
      triggerBlobDownload(blob, `${fileBase}.png`);
      markSavedStatus(t("export_done_png"));
      return;
    }

    const imageData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileBase}.pdf`);
    markSavedStatus(t("export_done_pdf"));
  } catch (error) {
    markSavedStatus(t("export_failed", { message: error?.message || "unknown error" }));
  }
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
    openEmojiSelectorBtn.textContent = t("emoji_picker_load_fail");
    return;
  }

  emojiSelectorWrap.classList.add("is-open");
  emojiSelectorWrap.setAttribute("aria-hidden", "false");
  if (!emojiPickerBound) {
    emojiPicker.addEventListener("emoji-click", (event) => {
      const emoji = event?.detail?.unicode;
      if (emoji) {
        pendingEmojiInsert = emoji;
        if (emojiInsertLabel) emojiInsertLabel.textContent = emoji;
        if (emojiInsertMode) {
          emojiInsertMode.classList.add("is-visible");
          emojiInsertMode.setAttribute("aria-hidden", "false");
        }
      }
    });
    emojiPickerBound = true;
  }
}

function closeEmojiSelector() {
  if (!emojiSelectorWrap) return;
  emojiSelectorWrap.classList.remove("is-open");
  emojiSelectorWrap.setAttribute("aria-hidden", "true");
  pendingEmojiInsert = "";
  if (emojiInsertLabel) emojiInsertLabel.textContent = "✨";
  if (emojiInsertMode) {
    emojiInsertMode.classList.remove("is-visible");
    emojiInsertMode.setAttribute("aria-hidden", "true");
  }
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
  if (autoLayoutBtn) autoLayoutBtn.addEventListener("click", autoLayout);
  if (clearPageBtn) clearPageBtn.addEventListener("click", clearCurrentPage);
  if (restoreVersionBtn) restoreVersionBtn.addEventListener("click", restoreSelectedVersion);
  if (saveVersionBtn) saveVersionBtn.addEventListener("click", saveManualVersion);
  if (exportPngBtn) exportPngBtn.addEventListener("click", () => void exportCurrentPage("png"));
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", () => void exportCurrentPage("pdf"));
  if (addPageBtn) addPageBtn.addEventListener("click", addPage);
  if (copyShareLinkBtn) copyShareLinkBtn.addEventListener("click", () => void copyShareLink());
  if (shareLinkInput) {
    shareLinkInput.addEventListener("focus", () => {
      shareLinkInput.select();
    });
  }
  if (versionSelect) {
    versionSelect.addEventListener("change", () => {
      if (restoreVersionBtn) restoreVersionBtn.disabled = !versionSelect.value;
    });
  }
  insertManualImageBtn.addEventListener("click", insertManualImage);
  if (insertUrlPreviewBtn) insertUrlPreviewBtn.addEventListener("click", () => void insertUrlPreview());
  if (openEmojiSelectorBtn) openEmojiSelectorBtn.addEventListener("click", openEmojiSelector);
  if (insertEmojiStickerBtn) {
    insertEmojiStickerBtn.addEventListener("click", () => {
      if (!pendingEmojiInsert) return;
      addEmojiSticker(pendingEmojiInsert);
      closeEmojiSelector();
    });
  }
  if (insertEmojiTapeBtn) {
    insertEmojiTapeBtn.addEventListener("click", () => {
      if (!pendingEmojiInsert) return;
      addEmojiTape(pendingEmojiInsert);
      closeEmojiSelector();
    });
  }
  if (langZhBtn) langZhBtn.addEventListener("click", () => setLanguage("zh"));
  if (langEnBtn) langEnBtn.addEventListener("click", () => setLanguage("en"));
  panelTabs.forEach((tab) => {
    tab.addEventListener("click", () => activatePanelTab(tab.dataset.tab || "materials"));
  });
  if (createNewJournalBtn) {
    createNewJournalBtn.addEventListener("click", () => {
      void createFreshJournalFromMissingLink();
    });
  }
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
  textFontFamilyInput.addEventListener("change", applyCurrentStyleToSelectedText);
  textFontFamilyInput.addEventListener("change", refreshVisualSelections);
  textFontSizeInput.addEventListener("input", () => {
    refreshVisualSelections();
    applyCurrentStyleToSelectedText();
  });
  textColorInput.addEventListener("input", () => {
    refreshVisualSelections();
    applyCurrentStyleToSelectedText();
  });

  manualImageUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      insertManualImage();
    }
  });
  if (urlPreviewInput) {
    urlPreviewInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void insertUrlPreview();
      }
    });
  }
  document.addEventListener("paste", handleClipboardPaste);
  window.addEventListener("resize", updateSelectionToolbar);
  window.addEventListener("scroll", updateSelectionToolbar, true);

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
        markSavedStatus(t("copied_item"));
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
    await saveStateNow();
    markSavedStatus(t("migrated_image_storage"));
  }
}

async function copyShareLink() {
  const shareUrl = getShareUrl();
  if (!shareUrl) return;
  try {
    await navigator.clipboard.writeText(shareUrl);
    markSavedStatus(t("share_link_copied"));
  } catch (_) {
    if (shareLinkInput) {
      shareLinkInput.focus();
      shareLinkInput.select();
    }
    markSavedStatus(t("share_link_copy_failed"));
  }
}

async function init() {
  ensureJournalId();
  updateShareLinkUi();
  ensurePageSlots(INITIAL_PAGE_COUNT);
  const hasStoredState = loadState();
  loadFavorites();
  loadVersions();
  const remoteStateStatus = await loadRemoteState();
  const hasRemoteState = remoteStateStatus === "loaded";
  missingJournalLink = journalLoadedFromQuery && !hasStoredState && remoteStateStatus === "not_found";
  updateJournalMissingState();
  if (!hasRemoteState && hasStoredState) {
    await saveStateNow();
  }
  await migrateLegacyPosterDataUrls();
  if (!versions.length && countAllItems() > 0) {
    captureVersion(t("version_reason_initial"));
  } else {
    opsSinceLastVersion = 0;
  }
  const defaults = defaultTextStyle();
  if (textFontFamilyInput) textFontFamilyInput.value = defaults.fontFamily;
  if (textFontSizeInput) textFontSizeInput.value = String(defaults.fontSize);
  if (textColorInput) textColorInput.value = defaults.color;
  updateStaticTranslations();
  closeEmojiSelector();
  if (toggleSnapBtn) {
    toggleSnapBtn.textContent = t("snap_grid", { state: snapEnabled ? t("snap_on") : t("snap_off") });
  }
  initPageLayers();
  renderAssets();
  activatePanelTab("materials");
  bindGlobalEvents();
  updateHistoryButtons();
  renderPage();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => warmAllLayers(), { timeout: 900 });
  } else {
    window.setTimeout(() => warmAllLayers(), 240);
  }
  if (
    !saveStatus.textContent ||
    saveStatus.textContent === i18n.zh.unsaved ||
    saveStatus.textContent === i18n.en.unsaved
  ) {
    markSavedStatus(t("save_saved"));
  }
}

void init();
