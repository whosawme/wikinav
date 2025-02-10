# Wikinav
<!-- ![WikiRabbit](src/assets/wikirabbit_transparent.jpg)
 -->
 <img src="public/wikirabbit_transparent.svg" width="200" height="200" alt="Image description">
 
Because going down the rabbit hole isnt linear.
Tool for navigating Wikipedia and plotting your page visits.  
Pull the repo locally or test it out at https://wikinav.com 

## Overview

- Search Wikipedia pages by terms or URL
- Navigate through a visual graph of your visits
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

### `npm start dev`
Runs the app in development mode.
Open [http://localhost:5173/] to view it in your browser.

### `npm run build`
Builds the app for production to the `build` or `dist` folder.

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

1. Search Wikipedia or enter full Wikipedia URL (e.g., `https://en.wikipedia.org/wiki/Machine_learning`)
3. Navigate through pages by:
   - Clicking internal links in the content area, or
   - Clicking nodes in the graph

## Technical Details

- Built with React
- Uses SVG for navigation graph rendering (open to other visualization approaches)
- D3.js for splayed graph mode
- Utilizes Wikipedia's public API for content fetching

## Limitations
- Some dynamic content may not render perfectly

## Contributing

Contribs welcome..

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/UsefulFeature`)
3. Commit your changes (`git commit -m 'Added some Useful Feature'`)
4. Push to the branch (`git push origin feature/UsefulFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- React
- Wikipedia API