export class NodeHighlighter {
  constructor(graphElement, drawingManager) {
    this.graphElement = graphElement;
    this.drawingManager = drawingManager;
    this.injectStyles();
    this.setupListeners();
  }

  injectStyles() {
    const styleId = 'mermaid-highlight-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .node.highlightable {
        cursor: pointer;
        transition: filter 0.2s ease;
      }
      .node.highlightable:not([data-highlight-state]):hover {
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.6));
      }

      /* Base Highlight Style: Thick glowing border, no fill change */
      .node[data-highlight-state] :is(rect, circle, polygon, path, ellipse) {
        stroke-width: 6px !important;
        paint-order: stroke fill;
      }

      .node[data-highlight-state] .label {
        font-weight: normal !important;
      }

      /* Ensure subgraphs/containers maintain dark aesthetics and good contrast */
      .cluster rect {
        fill: rgba(2, 6, 23, 0.3) !important;
        stroke: rgba(255, 255, 255, 0.1) !important;
        rx: 8px; /* Slightly round the corners for a more modern look */
      }
      .cluster .label {
        fill: #64748b !important;
      }

      /* Intensified Persistent Glow States */
      .node[data-highlight-state="1"] {
        filter: drop-shadow(0 0 15px #facc15);
      }
      .node[data-highlight-state="1"] :is(rect, circle, polygon, path, ellipse) {
        stroke: #facc15 !important;
      }

      .node[data-highlight-state="2"] {
        filter: drop-shadow(0 0 15px #4ade80);
      }
      .node[data-highlight-state="2"] :is(rect, circle, polygon, path, ellipse) {
        stroke: #4ade80 !important;
      }

      .node[data-highlight-state="3"] {
        filter: drop-shadow(0 0 15px #f87171);
      }
      .node[data-highlight-state="3"] :is(rect, circle, polygon, path, ellipse) {
        stroke: #f87171 !important;
      }

      .node[data-highlight-state="4"] {
        filter: drop-shadow(0 0 15px #60a5fa);
      }
      .node[data-highlight-state="4"] :is(rect, circle, polygon, path, ellipse) {
        stroke: #60a5fa !important;
      }
    `;
    document.head.appendChild(style);
  }

  setupListeners() {
    // We use a global mousedown listener with capture: true.
    window.addEventListener('mousedown', (e) => {
      if (this.drawingManager.currentTool !== 'select') return;

      const node = e.target.closest('.node');
      if (!node || !this.graphElement.contains(node)) return;

      e.preventDefault();
      e.stopPropagation();

      const currentState = parseInt(node.getAttribute('data-highlight-state') || '0', 10);
      const nextState = (currentState + 1) % 5;

      if (nextState === 0) {
        node.removeAttribute('data-highlight-state');
      } else {
        node.setAttribute('data-highlight-state', nextState);
      }
    }, true);

    // Add global shortcut to clear all highlights
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

      if (e.key === 'H' && e.shiftKey) { // Shift + H
        e.preventDefault();
        this.clearAll();
      }
    });
  }

  clearAll() {
    const nodes = this.graphElement.querySelectorAll('.node[data-highlight-state]');
    nodes.forEach(node => node.removeAttribute('data-highlight-state'));
  }

  init() {
    const svg = this.graphElement.querySelector('svg');
    if (!svg) return;

    // Ensure all current nodes have the highlightable class for hover effects
    const nodes = svg.querySelectorAll('.node');
    nodes.forEach(node => node.classList.add('highlightable'));
  }
}
