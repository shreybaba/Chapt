# 📖 ReadPDF — Personal PDF Reader & Chapter Navigator

A clean, modular, and privacy-focused web-based PDF reader with automatic chapter and Table of Contents (TOC) extraction.

---

## ✨ Features

- **📚 Personal Local Library**: Add and manage PDFs directly in your browser. All files are stored locally in **IndexedDB** — zero cloud dependencies or external accounts needed.
- **📑 Automatic Chapter Extraction**: Untouched multi-stage index extraction engine:
  - **Built-in Outline**: Reads native PDF document bookmarks.
  - **TOC Text Scanner**: Analyzes Table of Contents pages and page dots (`...`).
  - **Regex Scan**: Detects chapter headings (`Chapter 1`, `Part I`, numbered sections) across pages.
- **🚀 Modular Architecture**: Cleanly separated HTML, CSS, and JavaScript files for readability and maintainability.
- **🔍 Chapter Navigation & Search**: Instantly filter chapters, click to jump to any chapter or sub-section, and see your current chapter highlighted in real-time as you scroll.
- **📈 Reading Progress Tracker**: Automatically remembers your last read page and completion progress for every book.
- **🖼️ Page Thumbnails & Zoom**: Quick-jump thumbnail sidebar and adjustable zoom controls (`50%` to `250%`).

---

## 📁 Project Structure

```text
project-pdf/
├── index.html                   # Clean semantic HTML layout
├── css/
│   ├── style.css                # Master stylesheet importing all modules
│   ├── base/
│   │   ├── variables.css        # Colors, theme variables & tokens
│   │   └── reset.css            # Resets, scrollbars & keyframes
│   ├── components/
│   │   ├── nav.css              # Top navigation bar
│   │   └── modals.css           # Loading overlays, delete modal & toasts
│   └── views/
│       ├── library.css          # Book cards, grid & library controls
│       ├── reader.css           # PDF canvas viewer, zoom & thumbnails
│       └── chapters.css         # Chapters sidebar & TOC index
├── js/
│   ├── storage.js               # IndexedDB binary storage & metadata manager
│   ├── chapters.js              # Untouched chapter/index extraction engine
│   ├── reader.js                # PDF.js page rendering, zoom & scroll tracker
│   ├── library.js               # Library view, book cards, search & delete
│   └── app.js                   # App lifecycle, file upload & event bindings
├── icon-192.png                 # App icons
├── icon-512.png
└── LICENSE                      # MIT License
```

---

## 🚀 Getting Started

Simply open `index.html` in any modern web browser:

```bash
# Or start a simple local server if preferred:
npx serve .
# Or Python:
python -m http.server 3000
```

1. Click **"+ Add PDF"** or drag-and-drop any PDF file onto the library screen.
2. The app parses the document, extracts the chapter hierarchy, and opens the reader.
3. Your books and reading progress are saved locally in your browser!
