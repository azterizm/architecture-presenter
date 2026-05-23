export class DrawingManager {
  constructor(graphElement) {
    this.graphElement = graphElement;
    this.toolbar = document.getElementById('drawing-toolbar');
    this.tools = {
      select: document.getElementById('tool-select'),
      pencil: document.getElementById('tool-pencil'),
      arrow: document.getElementById('tool-arrow'),
      rect: document.getElementById('tool-rect'),
      circle: document.getElementById('tool-circle'),
      text: document.getElementById('tool-text'),
      color: document.getElementById('tool-color'),
      undo: document.getElementById('tool-undo'),
      clear: document.getElementById('tool-clear'),
    };
    
    this.currentTool = 'select';
    this.currentColor = this.tools.color.value;
    this.isDrawing = false;
    this.isVisible = false;
    this.elements = [];
    this.currentElement = null;
    this.startX = 0;
    this.startY = 0;
    
    this.setupListeners();
  }

  setupListeners() {
    // Toolbar visibility toggle
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

      if (e.key === 'd') {
        this.toggleToolbar();
      }
      if (e.key === 'p') this.setTool('pencil');
      if (e.key === 'a') this.setTool('arrow');
      if (e.key === 'r') this.setTool('rect');
      if (e.key === 'c') this.setTool('circle');
      if (e.key === 't') this.setTool('text');
      if (e.key === 's') this.setTool('select');
      if (e.key.toLowerCase() === 'x' && e.shiftKey) {
        e.preventDefault();
        this.clearAll();
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undo();
      }
      if (e.key === 'Escape') this.setTool('select');
    });

    // Tool selection
    Object.keys(this.tools).forEach(key => {
      if (key === 'color') {
        this.tools[key].addEventListener('input', (e) => {
          this.currentColor = e.target.value;
        });
      } else if (key === 'undo') {
        this.tools[key].addEventListener('click', () => this.undo());
      } else if (key === 'clear') {
        this.tools[key].addEventListener('click', () => this.clear());
      } else {
        this.tools[key].addEventListener('click', () => this.setTool(key));
      }
    });
  }

  toggleToolbar() {
    this.isVisible = !this.isVisible;
    this.toolbar.classList.toggle('visible', this.isVisible);
  }

  setTool(tool) {
    this.currentTool = tool;
    const isDrawingTool = tool !== 'select';
    
    // Toggle class on body to prevent text selection
    document.body.classList.toggle('drawing-active', isDrawingTool);

    Object.keys(this.tools).forEach(key => {
      if (this.tools[key] instanceof HTMLButtonElement) {
        this.tools[key].classList.toggle('active', key === tool);
      }
    });
    
    this.updateCursor();
  }

  updateCursor() {
    const svg = this.graphElement.querySelector('svg');
    if (!svg) return;
    
    if (this.currentTool === 'select') {
      svg.style.cursor = 'default';
      if (this.layer) this.layer.style.pointerEvents = 'none';
    } else {
      svg.style.cursor = 'crosshair';
      if (this.layer) this.layer.style.pointerEvents = 'auto';
    }
  }

  ensureMarker(color) {
    if (!this.currentSvg) return;
    let defs = this.currentSvg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.currentSvg.prepend(defs);
    }

    const id = `arrowhead-${color.replace('#', '')}`;
    if (!defs.querySelector(`#${id}`)) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', id);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '6');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto-start-reverse');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
    }
    return id;
  }

  initLayer() {
    const svg = this.graphElement.querySelector('svg');
    if (!svg) return;

    const viewport = svg.querySelector('.svg-pan-zoom_viewport') || svg;

    // Check if layer already exists
    let layer = svg.getElementById('drawing-layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'drawing-layer');
      viewport.appendChild(layer);
    } else if (layer.parentNode !== viewport) {
      viewport.appendChild(layer);
    }
    this.layer = layer;
    this.currentSvg = svg;

    // Re-attach elements if any (for HMR or re-renders)
    this.elements.forEach(el => this.layer.appendChild(el));

    this.attachDrawingEvents(svg);
    this.updateCursor();
  }

  attachDrawingEvents(svg) {
    // Remove old listeners if any (though svg is usually new)
    svg.removeEventListener('mousedown', this._onMouseDown);
    
    this._onMouseDown = (e) => this.onMouseDown(e, svg);
    this._onMouseMove = (e) => this.onMouseMove(e, svg);
    this._onMouseUp = (e) => this.onMouseUp(e, svg);

    svg.addEventListener('mousedown', this._onMouseDown, true);
    // Mousemove and mouseup should be on window to capture out-of-bounds
    window.removeEventListener('mousemove', this._onMouseMoveGlobal);
    window.removeEventListener('mouseup', this._onMouseUpGlobal);
    
    this._onMouseMoveGlobal = (e) => this.onMouseMove(e, svg);
    this._onMouseUpGlobal = (e) => this.onMouseUp(e, svg);
    
    window.addEventListener('mousemove', this._onMouseMoveGlobal);
    window.addEventListener('mouseup', this._onMouseUpGlobal);
  }

  getSVGPoint(e, svg) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    // We need to find the viewport group which is what svg-pan-zoom transforms
    const viewport = svg.querySelector('.svg-pan-zoom_viewport') || svg;
    return pt.matrixTransform(viewport.getScreenCTM().inverse());
  }

  onMouseDown(e, svg) {
    if (this.currentTool === 'select') return;
    
    // Prevent svg-pan-zoom from starting a pan
    e.stopPropagation();

    this.isDrawing = true;
    const point = this.getSVGPoint(e, svg);
    this.startX = point.x;
    this.startY = point.y;

    if (this.currentTool === 'pencil') {
      this.currentElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.currentElement.setAttribute('fill', 'none');
      this.currentElement.setAttribute('stroke', this.currentColor);
      this.currentElement.setAttribute('stroke-width', '2');
      this.currentElement.setAttribute('stroke-linecap', 'round');
      this.currentElement.setAttribute('d', `M ${this.startX} ${this.startY}`);
    } else if (this.currentTool === 'arrow') {
      const markerId = this.ensureMarker(this.currentColor);
      this.currentElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.currentElement.setAttribute('stroke', this.currentColor);
      this.currentElement.setAttribute('stroke-width', '2');
      this.currentElement.setAttribute('x1', this.startX);
      this.currentElement.setAttribute('y1', this.startY);
      this.currentElement.setAttribute('x2', this.startX);
      this.currentElement.setAttribute('y2', this.startY);
      this.currentElement.setAttribute('marker-end', `url(#${markerId})`);
    } else if (this.currentTool === 'rect') {
      this.currentElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.currentElement.setAttribute('fill', 'none');
      this.currentElement.setAttribute('stroke', this.currentColor);
      this.currentElement.setAttribute('stroke-width', '2');
      this.currentElement.setAttribute('x', this.startX);
      this.currentElement.setAttribute('y', this.startY);
    } else if (this.currentTool === 'circle') {
      this.currentElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.currentElement.setAttribute('fill', 'none');
      this.currentElement.setAttribute('stroke', this.currentColor);
      this.currentElement.setAttribute('stroke-width', '2');
      this.currentElement.setAttribute('cx', this.startX);
      this.currentElement.setAttribute('cy', this.startY);
    } else if (this.currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        this.currentElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.currentElement.setAttribute('fill', this.currentColor);
        this.currentElement.setAttribute('x', this.startX);
        this.currentElement.setAttribute('y', this.startY);
        this.currentElement.setAttribute('font-family', 'sans-serif');
        this.currentElement.setAttribute('font-size', '16');
        this.currentElement.textContent = text;
        this.layer.appendChild(this.currentElement);
        this.elements.push(this.currentElement);
        this.currentElement = null;
        this.isDrawing = false;
      } else {
        this.isDrawing = false;
      }
      return;
    }

    if (this.currentElement) {
      this.layer.appendChild(this.currentElement);
    }
  }

  onMouseMove(e, svg) {
    if (!this.isDrawing || !this.currentElement) return;

    const point = this.getSVGPoint(e, svg);
    const x = point.x;
    const y = point.y;

    if (this.currentTool === 'pencil') {
      const d = this.currentElement.getAttribute('d');
      this.currentElement.setAttribute('d', `${d} L ${x} ${y}`);
    } else if (this.currentTool === 'arrow') {
      this.currentElement.setAttribute('x2', x);
      this.currentElement.setAttribute('y2', y);
    } else if (this.currentTool === 'rect') {
      const width = Math.abs(x - this.startX);
      const height = Math.abs(y - this.startY);
      this.currentElement.setAttribute('x', Math.min(x, this.startX));
      this.currentElement.setAttribute('y', Math.min(y, this.startY));
      this.currentElement.setAttribute('width', width);
      this.currentElement.setAttribute('height', height);
    } else if (this.currentTool === 'circle') {
      const r = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
      this.currentElement.setAttribute('r', r);
    }
  }

  onMouseUp(e, svg) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentElement) {
      this.elements.push(this.currentElement);
      this.currentElement = null;
    }
  }

  undo() {
    if (this.elements.length > 0) {
      const el = this.elements.pop();
      el.remove();
    }
  }

  clear() {
    if (confirm('Clear all drawings?')) {
      this.clearAll();
    }
  }

  clearAll() {
    this.elements.forEach(el => el.remove());
    this.elements = [];
  }
}
