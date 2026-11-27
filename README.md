# <img src="assets/chapt-logo.png" width="48" align="center" alt="CHAPT Logo"> CHAPT

### Read. Navigate. Understand.

**CHAPT** is a smart, installable PDF reader designed to make navigating lengthy documents easier. It automatically extracts chapters and subtopics from PDF files, transforming lengthy documents into structured, searchable reading experiences.

Built with a local-first approach, CHAPT stores your documents and reading progress directly on your device using IndexedDB.

**Add a book once, and read it anytime. No internet connection is required to reopen and read previously added books, provided the application has been loaded and its required resources are available offline.**

---

## Features

### Personal PDF Library

- Add individual PDFs or batch import multiple books.
- Manage your personal document collection with reading progress tracking.
- Store PDF files and metadata locally using IndexedDB.
- Access previously imported documents without repeatedly downloading them.
- No cloud storage or external account required.

### Automatic Chapter and Subtopic Extraction

CHAPT uses a multi-stage extraction engine to identify document structure:

- **PDF Outline Detection:** Extracts native bookmarks and document outlines, including documents whose outlines contain only top-level chapters.
- **Table of Contents Scanning:** Detects subtopics from TOC entries and matches them to their parent chapters.
- **Regex-Based Heading Detection:** Falls back to scanning document pages for numbered sub-headings when subtopics are not available from the outline or TOC.
- **Hierarchical Organization:** Groups numbered sections under their corresponding parent chapters instead of displaying them as separate top-level entries.

The extracted hierarchy makes it easier to explore lengthy books, notes, manuals, and academic documents.

### Smart Chapter Navigation

- Browse extracted chapters and subtopics.
- Instantly search and filter the document structure.
- Jump directly to selected chapters or sections.
- Automatically highlight the current chapter while reading.

### Reading Progress Tracking

- Automatically remembers your last-read page.
- Tracks reading progress for individual PDFs.
- Resume reading from where you left off.
- Maintains reading information locally.

### Enhanced Reading Experience

- Page thumbnail sidebar for quick navigation.
- Adjustable zoom controls from 50% to 250%.
- PDF rendering powered by PDF.js.
- Dedicated reading interface with chapter navigation.

### Progressive Web App (PWA)

CHAPT can be installed as a Progressive Web App through supported browsers.

- Install CHAPT directly on your desktop.
- Launch it in a standalone application window.
- Custom application name, icons, and theme.
- Service Worker-based application resource caching.
- Offline access to previously imported books when the application resources are available locally.

---

## How It Works

CHAPT follows a simple document-processing workflow:

1. **Import:** Add a PDF to your personal library.
2. **Analyze:** The extraction engine examines bookmarks, TOC pages, and heading patterns.
3. **Organize:** Detected chapters and subtopics are converted into a navigable hierarchy.
4. **Read:** Open the document and navigate through its structure.
5. **Resume:** Your reading position and progress are saved locally.

---

## Offline Functionality

CHAPT follows a local-first architecture.

Once a book has been imported, its PDF file and associated information are stored in IndexedDB on your device.

This means:

- Previously imported books can be reopened without downloading them again.
- Reading progress remains stored locally.
- Chapter navigation and document processing work without requiring cloud services.
- You can continue reading without an active internet connection, provided CHAPT's application resources and PDF.js are available offline.

**Your books stay on your device, ready whenever you want to read.**

---

## Tech Stack

| Technology       | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| HTML5            | Application structure                            |
| CSS3             | Styling and responsive interface                 |
| JavaScript       | Application logic and functionality              |
| PDF.js           | PDF rendering and document processing            |
| IndexedDB        | Local PDF and metadata storage                   |
| Service Worker   | Application resource caching and offline support |
| Web App Manifest | PWA identity and installation configuration      |

---

## Project Structure

```text
Chapt/
│
├── assets/
│   └── chapt-logo.png
│
├── css/
│   ├── base/
│   │   ├── reset.css
│   │   └── variables.css
│   │
│   ├── components/
│   │   ├── modals.css
│   │   └── nav.css
│   │
│   ├── views/
│   │   ├── chapters.css
│   │   ├── library.css
│   │   └── reader.css
│   │
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── chapters.js
│   ├── library.js
│   ├── reader.js
│   └── storage.js
│
├── .gitignore
├── icon-192.png
├── index.html
├── LICENSE
├── manifest.json
├── README.md
└── sw.js
```

---

## Getting Started

### Prerequisites

- A modern web browser.
- Python or Node.js for running a local development server.
- An internet connection for the initial application load and externally hosted resources.

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/shreybaba/Chapt.git
```

**2. Navigate to the project directory**

```bash
cd Chapt
```

**3. Start a local development server**

Using Python:

```bash
python -m http.server 3000
```

Alternatively, using Node.js:

```bash
npx serve .
```

**4. Open CHAPT**

Visit:

```text
http://localhost:3000
```

A local server is recommended for proper Service Worker and PWA functionality.

---

## Installing CHAPT

CHAPT can be installed as a desktop application through supported browsers.

1. Open the deployed CHAPT website.
2. Locate the browser's Install option.
3. Select Install CHAPT.
4. Launch CHAPT from your desktop or application launcher.

CHAPT opens in a standalone application window, providing an application-like reading experience.

---

## Privacy First

CHAPT is designed around local document storage and user privacy.

- PDF files are stored locally using IndexedDB.
- Reading progress and document metadata are maintained on the device.
- Documents are not uploaded to a cloud server.
- No external account or registration is required.

**Your documents stay in your browser's local storage.**

---

<div align="center">

### CHAPT

**Read. Navigate. Understand.**

Developed by **Shreyansh Pandey**

</div>
