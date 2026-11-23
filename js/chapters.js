/**
 * ChaptersManager — PDF Index & Chapters Extraction Engine
 * Preserves the untouched chapter extraction logic:
 * 1. PDF Outline / Bookmark extraction (Built-in)
 * 2. Table of Contents text scanning (TOC Regex)
 * 3. Page heading regex pattern scanning (Scan Regex)
 */

const ChaptersManager = (() => {
  let allChapters = [];
  let currentChapters = [];
  let pageTexts = [];

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Untouched Index & Text Extraction ---
  async function extractText(pdfDoc) {
    pageTexts = [];
    const maxPages = Math.min(pdfDoc.numPages, 100);
    for (let i = 1; i <= maxPages; i++) {
      try {
        const pg = await pdfDoc.getPage(i);
        const tc = await pg.getTextContent();
        const lm = {};
        for (const it of tc.items) {
          if (!it.str || !it.str.trim()) continue;
          const y = Math.round(it.transform[5]);
          lm[y] = (lm[y] || '') + it.str;
        }
        pageTexts.push({ page: i, text: Object.values(lm).join('\n') });
      } catch (err) {
        console.warn(`Text extraction error on page ${i}:`, err);
      }
    }
    return pageTexts;
  }

  // --- Untouched Chapter Detection ---
  async function detectChapters(pdfDoc, totalPages) {
    // 1. Try Built-in Outline
    try {
      const ol = await pdfDoc.getOutline();
      if (ol && ol.length >= 2) {
        const r = await parseOutline(pdfDoc, ol);
        if (r && r.length >= 2) {
          setBadge('outline', '● Built-in');
          allChapters = r;
          currentChapters = [...r];
          return r;
        }
      }
    } catch (e) {
      console.warn('Outline extraction failed:', e);
    }

    // 2. Try TOC text scanning
    try {
      const toc = scanTOC(totalPages);
      if (toc && toc.length >= 3) {
        setBadge('outline', '● TOC');
        allChapters = toc;
        currentChapters = [...toc];
        return toc;
      }
    } catch (e) {
      console.warn('TOC scan failed:', e);
    }

    // 3. Fallback to Regex Scan across pages
    try {
      const r = regexScan();
      setBadge('scan', '○ Scan');
      allChapters = r;
      currentChapters = [...r];
      return r;
    } catch (e) {
      console.warn('Regex scan failed:', e);
    }

    allChapters = [];
    currentChapters = [];
    return [];
  }

  async function parseOutline(pdfDoc, ol) {
    const res = [];
    for (const item of ol) {
      if (!item.dest && !item.url) continue;
      let pn = 1;
      try {
        let d = item.dest;
        if (typeof d === 'string') d = await pdfDoc.getDestination(d);
        if (d) pn = (await pdfDoc.getPageIndex(d[0])) + 1;
      } catch (e) {}

      const children = [];
      for (const sub of (item.items || []).slice(0, 5)) {
        let sp = pn;
        try {
          let d = sub.dest;
          if (typeof d === 'string') d = await pdfDoc.getDestination(d);
          if (d) sp = (await pdfDoc.getPageIndex(d[0])) + 1;
        } catch (e) {}
        children.push({ title: sub.title, page: sp });
      }
      res.push({ title: item.title, page: pn, children });
    }
    return res;
  }

  function scanTOC(totalPages) {
    const re = /(.{3,60})\s+\.{2,}\s*(\d+)$|(.{3,60})\s{3,}(\d+)$/;
    const found = [];
    for (const pt of pageTexts.slice(0, 20)) {
      const lines = pt.text.split('\n');
      let cnt = 0;
      for (const ln of lines) {
        const m = ln.trim().match(re);
        if (m) {
          cnt++;
          const t = (m[1] || m[3]).trim();
          const pg = parseInt(m[2] || m[4], 10);
          if (t.length > 2 && pg > 0 && pg <= totalPages) {
            found.push({ title: t, page: pg, children: [] });
          }
        }
      }
      if (cnt >= 4) return found;
    }
    return [];
  }

  function regexScan() {
    const re = /^(chapter\s+[\divxlcIVXLC]+|part\s+[\divxlcIVXLC]+|\d{1,2}[\.\:]\s+[A-Z])/i;
    const res = [];
    const seen = new Set();
    for (const { page, text } of pageTexts) {
      for (const ln of text.split('\n')) {
        const t = ln.trim();
        if (t.length < 2 || t.length > 120) continue;
        const k = `${page}|${t}`;
        if (re.test(t) && !seen.has(k)) {
          seen.add(k);
          res.push({ title: t, page, children: [] });
        }
      }
    }
    return res.slice(0, 80);
  }

  // --- Chapter UI Rendering & Navigation ---
  function setBadge(type, label) {
    const b = document.getElementById('srcTag');
    if (b) {
      b.className = `src-tag src-${type}`;
      b.textContent = label;
      b.style.display = 'inline-block';
    }
    const rb = document.getElementById('rBadge');
    if (rb) {
      rb.textContent = label;
      rb.style.display = 'inline-block';
    }
  }

  function renderChList(list) {
    const el = document.getElementById('chScroll');
    if (!el) return;
    if (!list || !list.length) {
      el.innerHTML = '<div class="no-ch">No chapters detected.</div>';
      return;
    }

    el.innerHTML = list.map((ch, i) => {
      const subs = (ch.children || []).slice(0, 5).map((s) => `
        <div class="ci-sub-item" onclick="event.stopPropagation(); ReaderManager.goPage(${s.page})">
          <span style="opacity:.35;font-size:.6rem">↳</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(s.title)}</span>
          <span style="color:var(--txt3);margin-left:3px;font-size:.62rem">p.${s.page}</span>
        </div>
      `).join('');

      return `
        <div class="ch-item" id="chi${i}" data-page="${ch.page}" onclick="ReaderManager.goPage(${ch.page})">
          <span class="ci-num">${i + 1}</span>
          <div class="ci-body">
            <div class="ci-title" title="${esc(ch.title)}">${esc(ch.title)}</div>
            <div class="ci-pg">Page ${ch.page}</div>
            ${subs ? `<div class="ci-sub">${subs}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const cnt = document.getElementById('chCnt');
    if (cnt) cnt.textContent = `${list.length} found`;
  }

  function filterCh(q) {
    const query = (q || '').toLowerCase().trim();
    currentChapters = query
      ? allChapters.filter((c) => c.title.toLowerCase().includes(query))
      : [...allChapters];
    renderChList(currentChapters);
  }

  function hlChapter(page) {
    let activeIdx = -1;
    for (let i = 0; i < allChapters.length; i++) {
      if (allChapters[i].page <= page) activeIdx = i;
    }

    document.querySelectorAll('.ch-item').forEach((item, idx) => {
      const isCur = idx === activeIdx;
      item.classList.toggle('cur', isCur);
      if (isCur) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    const curCh = allChapters[activeIdx];
    const curChName = curCh ? curCh.title : 'Chapter';
    const cshCurCh = document.getElementById('cshCurCh');
    if (cshCurCh) cshCurCh.textContent = curChName;

    return curChName;
  }

  function setChapters(chs) {
    allChapters = chs || [];
    currentChapters = [...allChapters];
    renderChList(currentChapters);
  }

  function getChapters() {
    return allChapters;
  }

  return {
    extractText,
    detectChapters,
    renderChList,
    filterCh,
    hlChapter,
    setChapters,
    getChapters,
    setBadge
  };
})();
