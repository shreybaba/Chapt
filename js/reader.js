/**
 * ReaderManager — PDF Viewer, Canvas Rendering, Zoom, and Scroll Tracker
 * Uses PDF.js to render PDF pages smoothly, manage zoom, thumbnail strip,
 * and tracks reading progress to auto-save locally.
 */

const ReaderManager = (() => {
  let pdfDoc = null;
  let currentBookId = null;
  let totalPages = 0;
  let currentPage = 1;
  let scale = 1.35;
  let thumbsVisible = true;
  let chaptersVisible = true;
  let saveTimer = null;

  async function loadPDF(arrayBuffer, bookMeta) {
    currentBookId = bookMeta.id;
    currentPage = bookMeta.currentPage || 1;

    // Update Reader Top Bar
    const titleEl = document.getElementById('rFileName');
    if (titleEl) titleEl.textContent = bookMeta.name;

    updatePageCounter(currentPage, bookMeta.totalPages || 1);

    // Clean previous canvases
    const pagesContainer = document.getElementById('pdfPages');
    const thumbContainer = document.getElementById('thumbStrip');
    if (pagesContainer) pagesContainer.innerHTML = '';
    if (thumbContainer) thumbContainer.innerHTML = '';

    // Load PDF Document with PDF.js using an isolated Uint8Array copy
    const safeData = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: safeData });
    pdfDoc = await loadingTask.promise;
    totalPages = pdfDoc.numPages;

    updatePageCounter(currentPage, totalPages);

    // Render Pages and Thumbnails
    await renderAllPages();

    // Setup Scroll Listener
    setupScroll();

    // Jump to saved page if > 1
    if (currentPage > 1) {
      setTimeout(() => goPage(currentPage), 350);
    }
  }

  async function renderAllPages() {
    const pagesContainer = document.getElementById('pdfPages');
    const thumbContainer = document.getElementById('thumbStrip');
    if (!pagesContainer || !thumbContainer) return;

    pagesContainer.innerHTML = '';
    thumbContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
      // Main Page Element
      const wrap = document.createElement('div');
      wrap.className = 'pg-wrap';
      wrap.id = `p${i}`;
      wrap.dataset.page = i;

      const canvas = document.createElement('canvas');
      const lbl = document.createElement('div');
      lbl.className = 'pg-lbl';
      lbl.textContent = `Page ${i}`;

      wrap.appendChild(canvas);
      wrap.appendChild(lbl);
      pagesContainer.appendChild(wrap);

      // Render first 5 pages eagerly, lazy render the rest
      if (i <= 5) {
        await renderSinglePage(i, canvas, scale);
      } else {
        renderSinglePage(i, canvas, scale);
      }

      // Thumbnail Element
      const th = document.createElement('div');
      th.className = 'th-item';
      th.id = `th${i}`;
      if (i === currentPage) th.classList.add('active');

      const tc = document.createElement('canvas');
      const tn = document.createElement('div');
      tn.className = 'th-num';
      tn.textContent = i;

      th.appendChild(tc);
      th.appendChild(tn);
      th.onclick = () => goPage(i);
      thumbContainer.appendChild(th);

      // Stagger thumbnail renders
      setTimeout(() => renderSinglePage(i, tc, 0.16), i * 20);
    }
  }

  async function renderSinglePage(num, canvas, sc) {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: sc });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.warn(`Error rendering page ${num}:`, e);
    }
  }

  function changeZoom(delta) {
    if (!pdfDoc) return;
    scale = Math.max(0.6, Math.min(2.8, scale + delta));
    const zoomVal = document.getElementById('zoomVal');
    if (zoomVal) {
      zoomVal.textContent = Math.round((scale / 1.35) * 100) + '%';
    }
    // Re-render main pages with new scale
    document.querySelectorAll('.pg-wrap').forEach((wrap) => {
      const pgNum = parseInt(wrap.dataset.page, 10);
      const canvas = wrap.querySelector('canvas');
      if (canvas) renderSinglePage(pgNum, canvas, scale);
    });
  }

  function toggleThumbs() {
    thumbsVisible = !thumbsVisible;
    const strip = document.getElementById('thumbStrip');
    const btn = document.getElementById('btnToggleThumbs');
    if (strip) strip.classList.toggle('off', !thumbsVisible);
    if (btn) btn.classList.toggle('active', thumbsVisible);
  }

  function toggleChapters() {
    chaptersVisible = !chaptersVisible;
    const sidebar = document.getElementById('chSidebar');
    const btn = document.getElementById('btnToggleChapters');
    if (sidebar) sidebar.classList.toggle('off', !chaptersVisible);
    if (btn) btn.classList.toggle('active', chaptersVisible);
  }

  function goPage(n) {
    const el = document.getElementById(`p${n}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function hlThumb(page) {
    document.querySelectorAll('.th-item').forEach((t) => {
      t.classList.toggle('active', t.id === `th${page}`);
    });
    const activeThumb = document.getElementById(`th${page}`);
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function updatePageCounter(cur, total) {
    const curEl = document.getElementById('pcpNum');
    const totEl = document.getElementById('pcpTotal');
    if (curEl) curEl.textContent = cur;
    if (totEl) totEl.textContent = total;
  }

  function setupScroll() {
    const viewer = document.getElementById('pdfViewer');
    if (!viewer) return;
    viewer.removeEventListener('scroll', onScroll);
    viewer.addEventListener('scroll', onScroll, { passive: true });
  }

  function onScroll() {
    const viewer = document.getElementById('pdfViewer');
    if (!viewer || !pdfDoc) return;

    const scrollTop = viewer.scrollTop;
    const scrollHeight = viewer.scrollHeight - viewer.clientHeight;
    const pct = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

    // Update Progress Bars
    const rPfill = document.getElementById('rPfill');
    const cshBarFill = document.getElementById('cshBarFill');
    const cshProgPct = document.getElementById('cshProgPct');
    if (rPfill) rPfill.style.width = pct + '%';
    if (cshBarFill) cshBarFill.style.width = pct + '%';
    if (cshProgPct) cshProgPct.textContent = pct + '%';

    // Find Active Page in Viewport
    const viewerRect = viewer.getBoundingClientRect();
    let cur = 1;
    document.querySelectorAll('.pg-wrap').forEach((w) => {
      const rect = w.getBoundingClientRect();
      if (rect.top <= viewerRect.top + viewerRect.height * 0.45) {
        cur = parseInt(w.dataset.page, 10);
      }
    });

    if (cur !== currentPage) {
      currentPage = cur;
      updatePageCounter(cur, totalPages);
      hlThumb(cur);
      const curChapterName = ChaptersManager.hlChapter(cur);

      // Debounce saving progress to local storage
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (currentBookId) {
          StorageManager.updateProgress(currentBookId, cur, curChapterName, pct, totalPages);
        }
      }, 400);
    }
  }

  function closeReader() {
    clearTimeout(saveTimer);
    if (currentBookId) {
      const viewer = document.getElementById('pdfViewer');
      const scrollTop = viewer ? viewer.scrollTop : 0;
      const scrollHeight = viewer ? (viewer.scrollHeight - viewer.clientHeight) : 1;
      const pct = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
      StorageManager.updateProgress(currentBookId, currentPage, null, pct, totalPages);
    }
    pdfDoc = null;
    currentBookId = null;
  }

  function getPdfDoc() {
    return pdfDoc;
  }

  function getTotalPages() {
    return totalPages;
  }

  return {
    loadPDF,
    changeZoom,
    toggleThumbs,
    toggleChapters,
    goPage,
    closeReader,
    getPdfDoc,
    getTotalPages
  };
})();
