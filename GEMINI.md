# Architecture Vault (Memon Systems)

A high-performance web-based visualization tool for complex system architectures, specifically designed for high-scale infrastructure diagrams.

## Project Overview

- **Purpose:** Render and interact with Mermaid-based architecture diagrams.
- **Key Features:**
  - Interactive panning and zooming.
  - On-canvas drawing and annotation tools (pencil, arrows, shapes, text).
  - Multi-state node highlighting for presentation and analysis.
  - Dark-themed elegant aesthetics.
- **Main Technologies:**
  - **Mermaid.js**: Diagram rendering.
  - **Vite**: Development and build tooling.
  - **svg-pan-zoom**: Navigation controls.
  - **FontAwesome**: UI iconography.

## Architecture & Logic

### Core Components
- **`main.js`**: Orchestrates the application lifecycle, diagram loading via `import.meta.glob`, and integration between Mermaid and the navigation layer.
- **`drawing.js`**: Manages the SVG drawing layer (`#drawing-layer`), handling tool states, mouse events, and undo/clear operations.
- **`highlight.js`**: Injects custom CSS for node highlighting and handles click-to-cycle highlight states.
- **`theme.js`**: Contains reusable Mermaid `classDef` declarations injected into diagrams to ensure consistent styling.

### Data Flow
1. `.mmd` files are scanned from the root directory.
2. User selects a diagram via the dropdown or URL hash.
3. `themeClasses` are prepended to the Mermaid source.
4. Mermaid renders the SVG into `#graph`.
5. `svg-pan-zoom` is initialized on the new SVG.
6. `DrawingManager` and `NodeHighlighter` re-initialize their layers/listeners.

## Development

### Building and Running
- **Development:** `npm run dev` (Starts Vite development server)
- **Build:** `npm run build` (Generates optimized production assets)
- **Preview:** `npm run preview` (Previews the production build)

### Key Directories & Files
- `*.mmd`: Mermaid diagram source files.
- `index.html`: Main application container and UI overlay.
- `main.js`: Application entry point.
- `drawing.js`: Drawing/Annotation logic.
- `highlight.js`: Interactive highlighting logic.
- `theme.js`: Visual styling constants.

### Shortcuts
- **D**: Toggle Drawing Toolbar.
- **S**: Select Tool (Default).
- **P / A / R / C / T**: Pencil, Arrow, Rect, Circle, Text tools.
- **Shift + X**: Clear all drawings.
- **Ctrl/Cmd + Z**: Undo drawing.
- **0**: Reset zoom/pan.
- **Arrow Up/Down**: Cycle through diagrams.
- **Shift + H**: Clear all highlights.

## Development Conventions
- **Theming:** Always use the `classDef` markers defined in `theme.js` (e.g., `:::gold`, `:::sage`) within `.mmd` files for consistent dark-theme styling.
- **Diagrams:** New diagrams should be placed as `.mmd` files in the root directory to be automatically picked up by the loader.
- **SVG Interaction:** Any logic interacting with the diagram must account for the `svg-pan-zoom` viewport transform. Use `getSVGPoint` in `DrawingManager` as a reference for coordinate conversion.
