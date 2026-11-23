/**
 * LibraryManager — Local Books Library UI, Search, Filter, and File Uploads
 * Displays book cards, tracks reading stats, and manages book opening/deletion.
 */

const LibraryManager = (() => {
  let searchQuery = '';
  let currentSort = 'recent';
  let pendingDeleteId = null;

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderLibrary() {
    const grid = document.getElementById('bookGrid');
    if (!grid) return;

    let books = StorageManager.getAllBooks();

    // Render Top Stats
    renderStats(books);

    // Apply Search Filter
    if (searchQuery) {
      books = books.filter((b) => b.name.toLowerCase().includes(searchQuery));
    }

    // Apply Sorting
    books.sort((a, b) => {
      if (currentSort === 'recent') return (b.lastRead || 0) - (a.lastRead || 0);
      if (currentSort === 'name') return a.name.localeCompare(b.name);
      if (currentSort === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (currentSort === 'pages') return (b.totalPages || 0) - (a.totalPages || 0);
      return 0;
    });

    // Check if Empty
    if (!books.length) {
      grid.innerHTML = `
        <div class="empty-library" onclick="App.triggerUpload()" style="grid-column: 1 / -1;">
          <div class="empty-icon">📚</div>
          <div class="empty-title">${searchQuery ? 'No matching books found' : 'Your Library is Empty'}</div>
          <div class="empty-sub">${searchQuery ? 'Try another search term.' : 'Click here or "+ Add PDF" to add a book from your device.'}</div>
        </div>
      `;
      return;
    }

    // Render Cards
    grid.innerHTML = books.map((b) => {
      const pct = b.progress || 0;
      let statusClass = 'new';
      let statusText = 'New';
      if (pct >= 95) {
        statusClass = 'done';
        statusText = 'Completed';
      } else if (pct > 0 || (b.currentPage && b.currentPage > 1)) {
        statusClass = 'reading';
        statusText = `p. ${b.currentPage || 1}`;
      }

      const totalPages = b.totalPages ? `${b.totalPages} pages` : 'PDF Document';

      return `
        <div class="book-card" onclick="LibraryManager.openBook('${b.id}')">
          <div class="bc-thumb">
            ${b.emoji || '📖'}
          </div>
          <div class="bc-body">
            <div class="bc-title" title="${esc(b.name)}">${esc(b.name)}</div>
            <div class="bc-meta">
              <span>${totalPages}</span>
              ${b.chapters && b.chapters.length ? `<span>${b.chapters.length} chapters</span>` : ''}
            </div>
            <div class="bc-prog-row">
              <div class="bc-prog-bar">
                <div class="bc-prog-fill" style="width: ${pct}%"></div>
              </div>
              <div class="bc-prog-pct">${pct}%</div>
            </div>
            <div class="bc-footer">
              <span class="bc-status ${statusClass}">${statusText}</span>
              <button class="bc-del-btn" title="Delete book" onclick="event.stopPropagation(); LibraryManager.confirmDelete('${b.id}', '${esc(b.name)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderStats(books) {
    const total = books.length;
    const completed = books.filter((b) => (b.progress || 0) >= 95).length;
    const pages = books.reduce((sum, b) => sum + (b.totalPages || 0), 0);

    const statTotal = document.getElementById('statTotal');
    const statPages = document.getElementById('statPages');
    const statDone = document.getElementById('statDone');
    const subTitle = document.getElementById('libSubtitle');

    if (statTotal) statTotal.textContent = total;
    if (statPages) statPages.textContent = pages.toLocaleString();
    if (statDone) statDone.textContent = completed;
    if (subTitle) {
      subTitle.textContent = total
        ? `${total} book${total !== 1 ? 's' : ''} in local library · ${completed} completed`
        : 'Your personal reading collection';
    }
  }

  function applySearch(q) {
    searchQuery = (q || '').toLowerCase().trim();
    renderLibrary();
  }

  function applySort(sortBy) {
    currentSort = sortBy;
    renderLibrary();
  }

  async function openBook(bookId) {
    const meta = StorageManager.getBook(bookId);
    if (!meta) {
      App.showToast('Book not found in library.');
      return;
    }

    App.showLoading(true, 'Opening book...', 'Retrieving file from local storage');

    try {
      const buffer = await StorageManager.getPDF(bookId);
      if (!buffer) {
        throw new Error('PDF file data not found in local database.');
      }

      App.showView('reader');

      // Initialize Reader with fresh PDF buffer copy
      await ReaderManager.loadPDF(buffer.slice(0), meta);

      // Check Chapters
      if (meta.chapters && meta.chapters.length) {
        ChaptersManager.setChapters(meta.chapters);
        ChaptersManager.setBadge('outline', '● Stored Index');
      } else {
        App.showLoading(true, 'Extracting chapters...', 'Scanning table of contents');
        const pdfDoc = ReaderManager.getPdfDoc();
        await ChaptersManager.extractText(pdfDoc);
        const chs = await ChaptersManager.detectChapters(pdfDoc, ReaderManager.getTotalPages());
        meta.chapters = chs;
        StorageManager.saveBook(meta);
        ChaptersManager.setChapters(chs);
      }

      ChaptersManager.hlChapter(meta.currentPage || 1);
      App.showLoading(false);
      App.showToast(`Opened: ${meta.name}`);
    } catch (e) {
      console.error('Open book error:', e);
      App.showLoading(false);
      App.showToast(`⚠️ Could not open book: ${e.message}`);
      App.showView('library');
    }
  }

  async function handleFileUpload(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      App.showToast('Please select a valid PDF file.');
      return;
    }

    if (!window.pdfjsLib) {
      App.showToast('⚠️ PDF parser library is still loading. Please try again.');
      return;
    }

    const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();
    const bookId = 'book_' + Date.now();

    App.showLoading(true, 'Reading PDF...', file.name);

    try {
      // 1. Read buffer from the uploaded file
      const rawBuffer = await file.arrayBuffer();

      // 2. Save directly to IndexedDB first (using a clean slice so nothing can ever detach it)
      App.showLoading(true, 'Saving to library...', 'Saving to local storage');
      await StorageManager.savePDF(bookId, rawBuffer.slice(0), file.name);

      // 3. Switch to Reader View
      App.showView('reader');

      // 4. Initial book metadata
      const meta = {
        id: bookId,
        name: cleanName,
        totalPages: 1,
        currentPage: 1,
        progress: 0,
        chapters: [],
        emoji: StorageManager.getBookEmoji(cleanName)
      };

      // 5. Load document into Reader
      App.showLoading(true, 'Rendering pages...', 'Preparing document');
      await ReaderManager.loadPDF(rawBuffer.slice(0), meta);

      const pdfDoc = ReaderManager.getPdfDoc();
      const totalPages = ReaderManager.getTotalPages();
      meta.totalPages = totalPages;

      // 6. Extract chapters using untouched extraction engine
      App.showLoading(true, 'Extracting chapters & index...', 'Analyzing document structure');
      await ChaptersManager.extractText(pdfDoc);
      const chapters = await ChaptersManager.detectChapters(pdfDoc, totalPages);
      meta.chapters = chapters;

      // 7. Save metadata and render chapters
      StorageManager.saveBook(meta);
      ChaptersManager.setChapters(chapters);
      ChaptersManager.hlChapter(1);

      App.showLoading(false);
      App.showToast(`✅ "${cleanName}" added to Library!`);
    } catch (e) {
      console.error('Upload error:', e);
      App.showLoading(false);
      App.showToast(`⚠️ Upload error: ${e.message}`);
      App.showView('library');
    }
  }

  function confirmDelete(bookId, bookName) {
    pendingDeleteId = bookId;
    const nameEl = document.getElementById('delBookName');
    const modal = document.getElementById('delOv');
    if (nameEl) nameEl.textContent = `"${bookName}"`;
    if (modal) modal.classList.remove('off');
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    pendingDeleteId = null;
    closeDeleteModal();

    await StorageManager.deleteBook(id);
    renderLibrary();
    App.showToast('Book removed from library.');
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    const modal = document.getElementById('delOv');
    if (modal) modal.classList.add('off');
  }

  return {
    renderLibrary,
    applySearch,
    applySort,
    openBook,
    handleFileUpload,
    confirmDelete,
    executeDelete,
    closeDeleteModal
  };
})();
