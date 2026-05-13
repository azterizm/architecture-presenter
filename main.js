import mermaid from 'mermaid';
import { themeClasses } from './theme.js';

const diagrams = import.meta.glob('./*.mmd', { query: '?raw', import: 'default' });

mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark',
  securityLevel: 'loose', 
});

const graphElement = document.getElementById('graph');
const selectElement = document.getElementById('diagram-select');

const getDiagramFromHash = () => {
  const hash = window.location.hash.slice(1);
  return hash && diagrams[`./${hash}`] ? `./${hash}` : './diagram.mmd';
};

let currentFile = './diagram.mmd'; // will be set below

const render = async (content) => {
  if (!content || content.trim() === "") {
    graphElement.innerHTML = `<p style="color: #64748b; font-family: sans-serif; margin-top: 2rem;">Waiting for Mermaid code...</p>`;
    return;
  }

  const themedContent = content.replace(/graph (TD|LR|BT|RL|TB)/i, `graph $1\n${themeClasses}`);

  graphElement.removeAttribute('data-processed');
  graphElement.innerHTML = themedContent;
  
  try {
    // Suppress default mermaid error SVG rendering to handle it custom
    await mermaid.parse(themedContent);
    await mermaid.run({ nodes: [graphElement], suppressErrors: true });
    
    const svg = graphElement.querySelector('svg');
    if (svg) {
      svg.style.maxWidth = '100%';
      svg.style.height = '100%';
      
      if (window.panZoomInstance) {
        window.panZoomInstance.destroy();
      }
      
      window.panZoomInstance = svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        minZoom: 0.1,
        maxZoom: 10
      });
    }
  } catch (e) {
    console.error("Mermaid Render Error:", e);
    const errorText = e.message || String(e);
    // Truncate to first 8 lines to keep it clean, escaping HTML
    const cleanError = errorText.split('\n').slice(0, 8).join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    graphElement.innerHTML = `
      <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 0.5rem; padding: 1.5rem; margin: 2rem; max-width: 800px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
        <div style="color: #ef4444; font-weight: 600; margin-bottom: 0.75rem; font-size: 1.125rem;">Diagram Syntax Error</div>
        <pre style="color: #fca5a5; font-size: 0.875rem; white-space: pre-wrap; word-wrap: break-word; margin: 0; line-height: 1.5;">${cleanError}${errorText.split('\n').length > 8 ? '\n...' : ''}</pre>
      </div>
    `;
  }
};

const loadDiagram = async (filename) => {
  currentFile = filename;
  const fileNameWithoutPath = filename.replace('./', '');
  document.title = `Memon Systems (${fileNameWithoutPath})`;
  window.location.hash = fileNameWithoutPath;
  
  if (diagrams[filename]) {
    const content = await diagrams[filename]();
    render(content);
  }
};

// Initial Load
currentFile = getDiagramFromHash();

// Setup select dropdown
selectElement.innerHTML = ''; // Clear previous options to prevent duplicating on HMR
Object.keys(diagrams).forEach(key => {
  const option = document.createElement('option');
  option.value = key;
  option.textContent = key.replace('./', '');
  if (key === currentFile) option.selected = true;
  selectElement.appendChild(option);
});

selectElement.addEventListener('change', (e) => {
  loadDiagram(e.target.value);
});

loadDiagram(currentFile);

window.addEventListener('hashchange', () => {
  const newFile = getDiagramFromHash();
  if (newFile !== currentFile) {
    selectElement.value = newFile;
    loadDiagram(newFile);
  }
});

// Correct HMR Logic: Capture the new module's data
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Vite will re-execute the module on HMR, preserving the hash state
  });
}

// Global keydown listener for reset functionality
window.addEventListener('keydown', (e) => {
  if (e.key === '0' && window.panZoomInstance) {
    window.panZoomInstance.resetZoom();
    window.panZoomInstance.resetPan();
    window.panZoomInstance.fit();
    window.panZoomInstance.center();
  }
});
