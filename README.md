# Wikipedia Navigation Tree

## Overview

This React application provides an interactive visualization of Wikipedia page navigation, allowing users to explore Wikipedia content through an intuitive tree-like interface. The app lets you:
- Load Wikipedia pages by URL
- Navigate through a visual graph of connected pages
- Zoom and pan the navigation graph
- View Wikipedia content in real-time

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or later)
- npm (Node Package Manager)
- A modern web browser

## Installation

1. Clone the repository:
```bash
git clone https://github.com/whosawme/wikinav.git
cd wikinav
```

2. Install dependencies:
```bash
npm install
```

## Available Scripts

In the project directory, you can run:

### `npm start`
Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm run build`
Builds the app for production to the `build` folder.

## Features

- **Interactive Navigation Graph**: 
  - Visualize connections between Wikipedia pages
  - Zoom in/out using mouse wheel (Ctrl + Scroll)
  - Pan the graph by clicking and dragging

- **Content Viewer**:
  - Load Wikipedia pages by entering a URL
  - Click internal Wikipedia links to explore related pages
  - Quick access to Wikipedia home page

## Usage Tips

1. Enter a full Wikipedia URL (e.g., `https://en.wikipedia.org/wiki/React_(JavaScript_library)`)
2. Click "Load" or use the "Load Wikipedia Home Page" button
3. Navigate through pages by:
   - Clicking nodes in the graph
   - Clicking internal links in the content area

## Technical Details

- Built with React
- Uses SVG for navigation graph rendering (open to other visualization approaches)
- Utilizes Wikipedia's public API for content fetching

## Limitations
- Some dynamic content may not render perfectly

## Contributing

Contribs welcome..

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- React
- Wikipedia API