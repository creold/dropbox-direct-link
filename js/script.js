/**
 * ============================================
 * Dropbox Direct Link Generator
 * ============================================
 * 
 * Features:
 * - Generate direct download links
 * - Generate direct view links
 * - Dark theme support
 * - Single and bulk links modes
 * - Save last URL
 * 
 * @version 2.0 | @date 2026-07-13
 * @author Sergey Osokin
 * ============================================
 */

// --- DOM Elements & Global State ---
const urlInput = document.getElementById("url-input");
const urlDownload = document.getElementById("url-download");
const urlView = document.getElementById("url-view");
const themeSwitcher = document.getElementById("theme-switch");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnClearMain = document.getElementById("btn-clear-main");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const linkCounter = document.getElementById("link-counter");

const copyAllButtons = document.querySelectorAll(".btn-copy-all");
const openFirstButtons = document.querySelectorAll(".btn-open-first");

let currentUrlsArray = []; 
let currentFileName = "links_processed";

// --- URL Validation & Transformation Helpers ---

/**
 * Validates if a string does not match a general URL pattern.
 */
const isNotURL = (str) => {
  const pattern = /^(https?:\/\/)?(www\.)?[a-z0-9]+\.[a-z]+(\/\S*)?$/i;
  return !pattern.test(str);
};

/**
 * Transforms a single valid Dropbox URL into download and view-ready formats.
 */
const processSingleUrl = (urlStr) => {
  let url = urlStr.trim();
  const result = { original: url, download: "", view: "", valid: false };

  if (isNotURL(url) || !/dropbox/i.test(url)) return result;
  if (!/(\?|&)dl=0$/i.test(url)) url += "&dl=0";

  result.download = url.replace(/dl=.*/, "dl=1");
  result.valid = true;

  const lastSlash = url.lastIndexOf("/");
  const dlIdx = url.lastIndexOf("dl=0");
  const dotIdx = url.lastIndexOf(".", dlIdx);

  if (dotIdx > lastSlash && dotIdx < dlIdx) {
    let viewUrl = url.replace(/^(.*dropbox)(?=.com)/, "https://dl.dropboxusercontent");
    result.view = viewUrl.replace(/(\?|&)dl=.*/, "");
  }
  
  return result;
};

// --- Core Processing & File Handling Functions ---

/**
 * Parses the main text input, extracts unique Dropbox links, and updates the UI state.
 */
const processBulkText = () => {
  const text = urlInput.value;

  localStorage.setItem("ddlLastURL", text);

  const urlRegex = /(https?:\/\/[^\s"',]+dropbox[^\s"',]+)/gi;
  const foundUrls = text.match(urlRegex) || [];
  
  const uniqueUrls = [...new Set(foundUrls)].filter(url => !isNotURL(url));
  currentUrlsArray = uniqueUrls;

  let downloadResults = [];
  let viewResults = [];

  uniqueUrls.forEach(url => {
    const p = processSingleUrl(url);
    if (p.valid) {
      downloadResults.push(p.download);
      viewResults.push(p.view ? p.view : "Folder link (View not supported)");
    }
  });

  urlDownload.value = downloadResults.join("\n");
  urlView.value = viewResults.join("\n");

  const hasLinks = uniqueUrls.length > 0;
  btnClearMain.disabled = text.trim().length === 0;

  if (hasLinks) {
    linkCounter.textContent = `${uniqueUrls.length} ${uniqueUrls.length === 1 ? 'link' : 'links'} found`;
    linkCounter.style.display = "inline-block";
  } else {
    linkCounter.style.display = "none";
  }

  btnExportCsv.disabled = !hasLinks;
  
  document.querySelectorAll('.output-column').forEach(column => {
    const textarea = column.querySelector('textarea');
    if (!textarea) return; 
    
    const buttons = column.querySelectorAll('.btn-copy-all, .btn-open-first');
    const columnHasContent = textarea.value.trim().length > 0;
    buttons.forEach(btn => btn.disabled = !columnHasContent);
  });
};

/**
 * Reads an uploaded text/csv file and passes extracted links to the bulk processor.
 */
const handleFile = (file) => {
  if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
    alert("Please upload a valid .txt or .csv file");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const fileText = e.target.result;
    const urlRegex = /(https?:\/\/[^\s"',]+dropbox[^\s"',]+)/gi;
    const foundUrls = fileText.match(urlRegex) || [];
    const uniqueUrls = [...new Set(foundUrls)].filter(url => !isNotURL(url));

    if (uniqueUrls.length > 0) {
      currentFileName = file.name.replace(/\.[^/.]+$/, "") + "_processed";
      urlInput.value = uniqueUrls.join("\n");
      processBulkText();
    } else {
      alert("No valid Dropbox links found inside the file.");
    }
  };
  reader.readAsText(file);
};

// --- UI Interaction & Setup Functions ---

/**
 * Initializes clipboard copy functionality for output columns.
 */
const setupCopyButtons = () => {
  copyAllButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const textarea = document.getElementById(targetId);
      
      if (!textarea.value.length) return;

      navigator.clipboard.writeText(textarea.value).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
        btn.classList.add("active-tooltip");

        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.remove("active-tooltip");
        }, 1500);
      });
    });
  });
};

/**
 * Initializes handlers to open the first valid link from a processed output list.
 */
const setupOpenButtons = () => {
  openFirstButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const textarea = document.getElementById(targetId);
      
      if (!textarea.value.trim().length) return;

      const lines = textarea.value.split("\n");
      const firstValidUrl = lines.find(line => {
        const url = line.trim();
        return url && !url.startsWith("Folder link") && !url.startsWith("Doesn't look like");
      });

      if (firstValidUrl) {
        window.open(firstValidUrl.trim(), '_blank');
      }
    });
  });
};

// --- Event Listeners ---

// Main text input listeners
urlInput.addEventListener("input", processBulkText);

btnClearMain.addEventListener("click", () => {
  urlInput.value = "";
  currentFileName = "links_processed";
  processBulkText();
  urlInput.focus();
});

// Drag and drop file listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

// CSV Export listener
btnExportCsv.addEventListener('click', () => {
  if (currentUrlsArray.length === 0) return;

  let csvContent = "\uFEFFOriginal URL,Download URL,View URL\n";
  
  currentUrlsArray.forEach(url => {
    const p = processSingleUrl(url);
    if (p.valid) {
      csvContent += `"${p.original}","${p.download}","${p.view || ''}"\n`;
    }
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${currentFileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
});

// Theme switcher listener
themeSwitcher.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ddlWebTheme", theme);
});

// --- Initialization ---

document.addEventListener("DOMContentLoaded", () => {
  setupCopyButtons();
  setupOpenButtons();

  // Load theme settings
  const savedTheme = localStorage.getItem("ddlWebTheme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeSwitcher.checked = (savedTheme === "dark");
  
  // 👉 ДОБАВЬТЕ СЮДУ: Восстанавливаем текст из localStorage при старте
  const lastUrl = localStorage.getItem("ddlLastURL");
  if (lastUrl) {
    urlInput.value = lastUrl;
  }
  
  // Initial calculation to properly set the initial UI disabled/enabled states
  processBulkText();
});