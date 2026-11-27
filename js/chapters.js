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

  async function getPageLines(pg) {
    const tc = await pg.getTextContent();
    const linesMap = new Map();
    for (const it of tc.items) {
      if (!it.str) continue;
      const x = it.transform[4];
      const y = Math.round(it.transform[5] / 2) * 2;
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y).push({ x, w: it.width || 0, str: it.str });
    }
    const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const lines = [];
    for (const y of sortedYs) {
      const items = linesMap.get(y).sort((a, b) => a.x - b.x);
      let line = '';
      let prevEnd = null;
      for (const item of items) {
        if (!item.str.trim()) {
          if (line && !line.endsWith(' ')) line += ' ';
          if (prevEnd === null) prevEnd = item.x + item.w;
          else prevEnd = Math.max(prevEnd, item.x + item.w);
          continue;
        }
        if (prevEnd !== null) {
          const gap = item.x - prevEnd;
          if (gap > 14) {
            line += '   ';
          } else if (gap > 2 && !line.endsWith(' ') && !item.str.startsWith(' ')) {
            line += ' ';
          }
        }
        line += item.str;
        prevEnd = item.x + item.w;
      }
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
    return lines.join('\n');
  }

  // --- Index & Text Extraction ---
  async function extractText(pdfDoc, maxLimit = 100) {
    pageTexts = [];
    const maxPages = Math.min(pdfDoc.numPages, maxLimit);
    for (let i = 1; i <= maxPages; i++) {
      try {
        const pg = await pdfDoc.getPage(i);
        const text = await getPageLines(pg);
        pageTexts.push({ page: i, text });
      } catch (err) {
        console.warn(`Text extraction error on page ${i}:`, err);
      }
    }
    return pageTexts;
  }

  function hasAnyChildren(chapters) {
    return Array.isArray(chapters) && chapters.some((c) => c.children && c.children.length > 0);
  }

  // --- Chapter Detection ---
  async function detectChapters(pdfDoc, totalPages) {
    // 1. Try Built-in Outline
    try {
      const ol = await pdfDoc.getOutline();
      if (ol && ol.length >= 2) {
        const r = await parseOutline(pdfDoc, ol);
        if (r && r.length >= 2) {
          // If outline has no sub-topics, enrich from TOC or page headings
          if (!hasAnyChildren(r)) {
            await enrichWithSubtopics(pdfDoc, r, totalPages);
          }
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
      for (const sub of (item.items || [])) {
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

  function parseTOCLines(pagesSubset, totalPages) {
    const gapRe = /^(.{2,90}?)\s*(?:\.{2,}|\s{2,})\s*(\d{1,4})$/;
    const numberedRe = /^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\s+.{2,80}?)\s+(\d{1,4})$/;
    const entries = [];
    for (const pt of pagesSubset) {
      const lines = pt.text.split('\n');
      for (const ln of lines) {
        const t = ln.trim();
        const m = t.match(gapRe) || t.match(numberedRe);
        if (m) {
          const title = m[1].trim();
          const pg = parseInt(m[2], 10);
          if (title.length > 2 && pg > 0 && pg <= totalPages) {
            entries.push({ title, page: pg });
          }
        }
      }
    }
    return entries;
  }

  function normalizeTitle(s) {
    return (s || '')
      .toLowerCase()
      .replace(/^(chapter|part)\s+/i, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function extractChapterNumber(title) {
    const m = (title || '').trim().match(/^(?:chapter\s+)?(\d{1,3})\b/i);
    return m ? m[1] : null;
  }

  function extractSubNumber(title) {
    const m = (title || '').trim().match(/^(\d{1,3})\.\d+(?:\.\d+)*/);
    return m ? m[1] : null;
  }

  async function enrichWithSubtopics(pdfDoc, chapters, totalPages) {
    if (!pageTexts.length && pdfDoc) {
      await extractText(pdfDoc, 30);
    }

    // 1. Try extracting sub-topics from TOC pages (first 30 pages)
    const tocEntries = parseTOCLines(pageTexts.slice(0, 30), totalPages);
    if (tocEntries.length >= 4) {
      // Estimate page offset between printed TOC pages and PDF pages
      let offset = 0;
      const offsets = [];
      for (const ch of chapters) {
        const chNorm = normalizeTitle(ch.title);
        const match = tocEntries.find((e) => {
          const eNorm = normalizeTitle(e.title);
          return eNorm === chNorm || (chNorm.length > 5 && eNorm.includes(chNorm));
        });
        if (match) {
          offsets.push(ch.page - match.page);
        }
      }
      if (offsets.length > 0) {
        offsets.sort((a, b) => a - b);
        offset = offsets[Math.floor(offsets.length / 2)];
      }

      // Attach non-chapter TOC entries as sub-topics
      const chNormSet = new Set(chapters.map((c) => normalizeTitle(c.title)));
      for (const entry of tocEntries) {
        const eNorm = normalizeTitle(entry.title);
        if (chNormSet.has(eNorm)) continue;

        const pdfPage = Math.max(1, Math.min(totalPages, entry.page + offset));
        const subNum = extractSubNumber(entry.title);

        let targetCh = null;
        if (subNum) {
          targetCh = chapters.find((c) => extractChapterNumber(c.title) === subNum);
        }
        if (!targetCh) {
          for (let i = 0; i < chapters.length; i++) {
            const startPg = chapters[i].page;
            const endPg = i + 1 < chapters.length ? chapters[i + 1].page : totalPages + 1;
            if (pdfPage >= startPg && pdfPage < endPg) {
              targetCh = chapters[i];
              break;
            }
          }
        }

        if (targetCh) {
          if (!targetCh.children) targetCh.children = [];
          if (!targetCh.children.some((s) => s.title === entry.title && s.page === pdfPage)) {
            targetCh.children.push({ title: entry.title, page: pdfPage });
          }
        }
      }

      if (hasAnyChildren(chapters)) return;
    }

    // 2. Fallback: scan document pages for numbered sub-headings (e.g. "1.1 Overview")
    if (!pdfDoc) return;
    const subRe = /^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+([A-Za-z][^\n]{2,90})$/;
    const seen = new Set();
    const scanLimit = Math.min(totalPages, 600);

    for (let p = 1; p <= scanLimit; p++) {
      let text = '';
      const cached = pageTexts.find((pt) => pt.page === p);
      if (cached) {
        text = cached.text;
      } else {
        try {
          const pg = await pdfDoc.getPage(p);
          text = await getPageLines(pg);
        } catch (e) {
          continue;
        }
      }

      for (const ln of text.split('\n')) {
        const t = ln.trim();
        const m = t.match(subRe);
        if (!m) continue;
        const parentNum = m[1].split('.')[0];
        let targetCh = chapters.find((c) => extractChapterNumber(c.title) === parentNum);
        if (!targetCh) {
          for (let i = 0; i < chapters.length; i++) {
            const startPg = chapters[i].page;
            const endPg = i + 1 < chapters.length ? chapters[i + 1].page : totalPages + 1;
            if (p >= startPg && p < endPg) {
              targetCh = chapters[i];
              break;
            }
          }
        }
        if (targetCh) {
          const key = `${targetCh.title}|${t}`;
          if (!seen.has(key)) {
            seen.add(key);
            if (!targetCh.children) targetCh.children = [];
            targetCh.children.push({ title: t, page: p });
          }
        }
      }
    }
  }

  function groupSubEntries(flatList) {
    const chapters = [];
    const subRe = /^(\d{1,3})\.\d+/;
    for (const item of flatList) {
      const m = item.title.trim().match(subRe);
      if (m && chapters.length > 0) {
        const parentNum = m[1];
        const parent =
          chapters.find((c) => extractChapterNumber(c.title) === parentNum) ||
          chapters[chapters.length - 1];
        parent.children.push({ title: item.title, page: item.page });
      } else {
        chapters.push({ title: item.title, page: item.page, children: [] });
      }
    }
    return chapters;
  }

  function scanTOC(totalPages) {
    const re = /(.{3,60})\s+\.{2,}\s*(\d+)$|(.{3,60})\s{3,}(\d+)$/;
    const found = [];
    for (const pt of pageTexts.slice(0, 25)) {
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
      if (cnt >= 4) return groupSubEntries(found);
    }
    return [];
  }

  function regexScan() {
    const re = /^(chapter\s+[\divxlcIVXLC]+|part\s+[\divxlcIVXLC]+|\d{1,2}(?:\.\d{1,2})?[\.\:\s]+\s*[A-Z])/i;
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
    return groupSubEntries(res).slice(0, 80);
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
      const subs = (ch.children || []).map((s) => `
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
      ? allChapters.filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            (c.children || []).some((s) => s.title.toLowerCase().includes(query))
        )
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
    parseOutline,
    renderChList,
    filterCh,
    hlChapter,
    setChapters,
    getChapters,
    setBadge
  };
})();
