/**
 * StorageManager — Local storage and IndexedDB handler for PDF Reader
 * Manages PDF binary files in IndexedDB and book metadata in localStorage.
 * Completely local, zero cloud/Firebase dependencies.
 */

const StorageManager = (() => {
  const IDB_NAME = 'readpdf_db';
  const IDB_VER = 1;
  const IDB_STORE = 'pdfs';
  const META_KEY = 'readpdf_books_meta';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  // --- IndexedDB Binary Storage ---
  async function savePDF(bookId, arrayBuffer, fileName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        // Store cloned buffer so it cannot be neutered or detached by workers
        const dataToStore = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
        store.put({
          id: bookId,
          name: fileName,
          buf: dataToStore,
          savedAt: Date.now()
        });
        tx.oncomplete = () => resolve(bookId);
        tx.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function getPDF(bookId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(bookId);
        req.onsuccess = () => {
          if (!req.result) return resolve(null);
          const buf = req.result.buf || req.result.data || req.result.file;
          if (!buf) return resolve(null);
          // Return a fresh copy of the ArrayBuffer
          resolve(buf.slice ? buf.slice(0) : buf);
        };
        req.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function deletePDF(bookId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(bookId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Metadata Storage (localStorage) ---
  function getAllBooks() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveAllBooks(books) {
    localStorage.setItem(META_KEY, JSON.stringify(books));
  }

  function getBook(bookId) {
    const books = getAllBooks();
    return books.find((b) => b.id === bookId) || null;
  }

  function saveBook(bookMeta) {
    const books = getAllBooks();
    const idx = books.findIndex((b) => b.id === bookMeta.id);
    if (idx >= 0) {
      books[idx] = { ...books[idx], ...bookMeta, lastRead: Date.now() };
    } else {
      books.unshift({
        ...bookMeta,
        savedAt: Date.now(),
        lastRead: Date.now(),
        currentPage: bookMeta.currentPage || 1,
        currentChapter: bookMeta.currentChapter || '',
        progress: bookMeta.progress || 0,
        emoji: bookMeta.emoji || getBookEmoji(bookMeta.name)
      });
    }
    saveAllBooks(books);
    return bookMeta;
  }

  async function deleteBook(bookId) {
    const books = getAllBooks().filter((b) => b.id !== bookId);
    saveAllBooks(books);
    try {
      await deletePDF(bookId);
    } catch (e) {
      console.warn('Could not remove binary from IndexedDB:', e);
    }
    return true;
  }

  function updateProgress(bookId, currentPage, currentChapter, progress, totalPages) {
    const books = getAllBooks();
    const book = books.find((b) => b.id === bookId);
    if (book) {
      book.currentPage = currentPage;
      if (currentChapter) book.currentChapter = currentChapter;
      if (typeof progress === 'number') book.progress = progress;
      if (totalPages) book.totalPages = totalPages;
      book.lastRead = Date.now();
      saveAllBooks(books);
    }
  }

  function getBookEmoji(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('code') || n.includes('js') || n.includes('python') || n.includes('react') || n.includes('program') || n.includes('dev') || n.includes('git') || n.includes('web') || n.includes('css') || n.includes('algo')) return '💻';
    if (n.includes('math') || n.includes('physic') || n.includes('calc') || n.includes('algebra') || n.includes('stat')) return '📐';
    if (n.includes('histor') || n.includes('war') || n.includes('ancient') || n.includes('century') || n.includes('empire')) return '🏛️';
    if (n.includes('money') || n.includes('finance') || n.includes('invest') || n.includes('stock') || n.includes('rich') || n.includes('market') || n.includes('crypto')) return '💰';
    if (n.includes('habit') || n.includes('atomic') || n.includes('mind') || n.includes('psych') || n.includes('think') || n.includes('focus') || n.includes('power')) return '🧠';
    if (n.includes('story') || n.includes('novel') || n.includes('fiction') || n.includes('tale') || n.includes('potter') || n.includes('lotr')) return '✨';
    if (n.includes('bio') || n.includes('life') || n.includes('memoir') || n.includes('steve') || n.includes('musk')) return '👤';
    if (n.includes('design') || n.includes('art') || n.includes('ui') || n.includes('ux') || n.includes('color')) return '🎨';
    if (n.includes('health') || n.includes('fit') || n.includes('diet') || n.includes('body') || n.includes('workout')) return '💪';
    return '📖';
  }

  return {
    savePDF,
    getPDF,
    deletePDF,
    getAllBooks,
    getBook,
    saveBook,
    deleteBook,
    updateProgress,
    getBookEmoji
  };
})();
