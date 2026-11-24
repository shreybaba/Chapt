/**
 * App — Main Application Controller
 * Initializes PDF.js, handles navigation, toasts, overlays, and drag-and-drop file imports.
 */

const App = (() => {
  let toastTimer = null;

  function init() {
    // 1. Configure PDF.js Worker
    if (window.pdfjsLib) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } catch (e) {
        console.warn('PDF.js worker setup warning:', e);
      }
    }

    // 2. Setup Global File Upload Events
    setupFileUpload();

    // 3. Setup Search & Filter Listeners
    setupSearchAndFilters();

    // 4. Setup Drag & Drop
    setupDragAndDrop();

    // 5. Load Library View
    showView('library');
    LibraryManager.renderLibrary();
  }

  function showView(viewName) {
    const libView = document.getElementById('libView');
    const readerView = document.getElementById('readerView');

    if (viewName === 'library') {
      ReaderManager.closeReader();
      if (readerView) readerView.classList.add('off');
      if (libView) libView.classList.remove('off');
      LibraryManager.renderLibrary();
    } else if (viewName === 'reader') {
      if (libView) libView.classList.add('off');
      if (readerView) readerView.classList.remove('off');
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function showLoading(show, message = 'Loading...', sub = '') {
    const overlay = document.getElementById('loadOv');
    const msgEl = document.getElementById('loadMsg');
    const subEl = document.getElementById('loadSub');
    if (overlay) overlay.classList.toggle('on', show);
    if (msgEl) msgEl.textContent = message;
    if (subEl) subEl.textContent = sub;
  }

  function triggerUpload() {
    const inp = document.getElementById('fileInput');
    if (inp) {
      inp.value = ''; // clear previous value so selecting same file triggers change
      inp.click();
    }
  }

  function triggerMultiUpload() {
    const inp = document.getElementById('fileInputMulti');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  }

  function setupFileUpload() {
    const inp = document.getElementById('fileInput');
    if (inp) {
      inp.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        if (files.length === 1) {
          LibraryManager.handleFileUpload(files[0]);
        } else {
          LibraryManager.handleMultipleFiles(Array.from(files));
        }
      });
    }

    const inpMulti = document.getElementById('fileInputMulti');
    if (inpMulti) {
      inpMulti.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        if (files.length === 1) {
          LibraryManager.handleFileUpload(files[0]);
        } else {
          LibraryManager.handleMultipleFiles(Array.from(files));
        }
      });
    }
  }

  function setupSearchAndFilters() {
    // Library Search
    const libSearchInp = document.getElementById('libSearchInp');
    if (libSearchInp) {
      libSearchInp.addEventListener('input', (e) => {
        LibraryManager.applySearch(e.target.value);
      });
    }

    // Library Sort
    const libSortSelect = document.getElementById('libSortSelect');
    if (libSortSelect) {
      libSortSelect.addEventListener('change', (e) => {
        LibraryManager.applySort(e.target.value);
      });
    }

    // Chapter Filter
    const chSearchInp = document.getElementById('chSearchInp');
    if (chSearchInp) {
      chSearchInp.addEventListener('input', (e) => {
        ChaptersManager.filterCh(e.target.value);
      });
    }
  }

  function setupDragAndDrop() {
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        const pdfFiles = Array.from(dt.files).filter(
          (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
        );
        if (!pdfFiles.length) {
          showToast('Please drop valid .pdf file(s).');
          return;
        }
        if (pdfFiles.length === 1) {
          LibraryManager.handleFileUpload(pdfFiles[0]);
        } else {
          LibraryManager.handleMultipleFiles(pdfFiles);
        }
      }
    });
  }

  return {
    init,
    showView,
    showToast,
    showLoading,
    triggerUpload,
    triggerMultiUpload
  };
})();

// Bootstrap App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
