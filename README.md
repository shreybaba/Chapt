# CHAPT

### Read. Navigate. Understand.

**CHAPT** is a smart, browser-based PDF reader designed to make navigating long documents easier. It automatically extracts chapters and subtopics from PDF files, turning lengthy documents into structured, searchable reading experiences.

No cloud uploads. No external accounts. Just your documents, organized locally.

---

## Features

### Personal PDF Library
- Add PDFs through file upload or drag and drop.
- Manage your personal document collection.
- Store PDF files and metadata locally using IndexedDB.
- No cloud storage or external account required.

### Automatic Chapter and Subtopic Extraction

CHAPT uses a multi-stage extraction engine to identify document structure:

- **PDF Outline Detection:** Extracts native bookmarks and document outlines.
- **Table of Contents Scanning:** Analyzes TOC pages, including dotted page references.
- **Regex-Based Heading Detection:** Identifies chapter titles, parts, and numbered sections across document pages.

The extracted hierarchy makes it easier to explore lengthy books, notes, manuals, and academic documents.

### Smart Chapter Navigation
- Browse extracted chapters and subtopics.
- Instantly search and filter the document structure.
- Jump directly to selected chapters or sections.
- Highlight the current chapter automatically while reading.

### Reading Progress Tracking
- Automatically remembers your last-read page.
- Tracks reading progress for individual PDFs.
- Resume reading from where you left off.

### Enhanced Reading Experience
- Page thumbnail sidebar for quick navigation.
- Adjustable zoom controls from 50% to 250%.
- PDF rendering powered by PDF.js.
- Dedicated reading interface with chapter navigation.

---

## How It Works

CHAPT follows a simple document-processing workflow:

1. **Import:** Add a PDF to your local library.
2. **Analyze:** The extraction engine examines bookmarks, TOC pages, and heading patterns.
3. **Organize:** Detected chapters and subtopics are converted into a navigable hierarchy.
4. **Read:** Open the document and navigate through its structure.
5. **Resume:** Your reading position and progress are saved locally.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and responsive interface |
| JavaScript | Application logic and functionality |
| PDF.js | PDF rendering and document processing |
| IndexedDB | Local PDF and metadata storage |

---

## Project Structure

```text
project-pdf/
│
├── index.html
│
├── css/
│   ├── style.css
│   ├── base/
│   │   ├── variables.css
│   │   └── reset.css
│   ├── components/
│   │   ├── nav.css
│   │   └── modals.css
│   └── views/
│       ├── library.css
│       ├── reader.css
│       └── chapters.css
│
├── js/
│   ├── storage.js
│   ├── chapters.js
│   ├── reader.js
│   ├── library.js
│   └── app.js
│
├── icon-192.png
├── icon-512.png
└── LICENSE
```

---

## Getting Started

### Prerequisites
- A modern web browser.
- Node.js (optional, for using a local development server).

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/shreybaba/project-pdf-.git
```

**2. Navigate to the project directory**

```bash
cd project-pdf-
```

**3. Start a local server**

Using Python:

```bash
python -m http.server 3000
```

Or using Node.js:

```bash
npx serve .
```

**4. Open CHAPT**

Visit:

```text
http://localhost:3000
```

You can also open `index.html` directly in a compatible browser, although using a local server is recommended for consistent behavior.

### Using CHAPT

1. Open the application.
2. Click **+ Add PDF** or drag and drop a PDF into the library.
3. Let CHAPT analyze the document and extract its chapter hierarchy.
4. Select a chapter or subtopic to navigate directly to it.
5. Continue reading with your progress saved locally.

---

## Privacy First

CHAPT follows a local-first approach.

- PDF files are stored in your browser using IndexedDB.
- Reading progress and document metadata are maintained locally.
- Documents do not need to be uploaded to a cloud service.
- No external account is required.

**Your documents stay in your browser's local storage.**

---

<div align="center">

### CHAPT

**Read. Navigate. Understand.**

Developed by **Shreyansh Pandey**

</div>
