/**
 * IITM Annotation Extension - Content Script (V6 Final Accuracy)
 * (Viewport-Fixed Canvas with Scroll-Translation Engine)
 */

(function() {
  let isEnabled = false;
  let isMinimized = false;
  let isDrawing = false;
  let currentTool = 'pen';
  let currentColor = '#4f46e5';
  let currentWeight = 5;
  let elements = [];
  let tempElement = null;

  let overlay, canvas, ctx, rc;

  // ── 1. Initialization ──────────────────────────────────────────────────────
  function init() {
    console.log("IITM Annotator: Initializing V6 (Final Accuracy)...");
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggle_whiteboard") {
          toggleWhiteboard();
        }
      });
    }

    createToggleFAB();
    loadAnnotations();
    
    // Heartbeat for SPA stability
    setInterval(ensureUIPresence, 2000);
    
    // 🚩 SCROLL WATCHER: Trigger redraw when page scrolls
    window.addEventListener('scroll', () => {
       if (isEnabled) requestAnimationFrame(redraw);
    }, { passive: true });

    setupDOMWatcher();
  }

  function setupDOMWatcher() {
    const observer = new MutationObserver(() => {
       if (isEnabled) ensureUIPresence();
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  function ensureUIPresence() {
    if (!document.getElementById('iitm-anno-fab')) {
       createToggleFAB();
       const fab = document.getElementById('iitm-anno-fab');
       if (fab && isEnabled) fab.classList.remove('hidden');
    }
    
    if (isEnabled) {
       if (!overlay) setupOverlay();
       if (!document.body.contains(overlay)) document.body.appendChild(overlay);
       if (!document.body.contains(toolbar)) document.body.appendChild(toolbar);
    }
  }

  function createToggleFAB() {
    if (document.getElementById('iitm-anno-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'iitm-toggle-fab hidden'; 
    fab.id = 'iitm-anno-fab';
    fab.innerHTML = `
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
      </svg>
    `;
    fab.title = "Toggle Whiteboard (Annotator)";
    fab.onclick = toggleWhiteboard;
    document.body.appendChild(fab);
  }

  function toggleWhiteboard() {
    isEnabled = !isEnabled;
    const fab = document.getElementById('iitm-anno-fab');
    
    if (isEnabled) {
      if (!overlay) setupOverlay();
      overlay.classList.remove('hidden');
      toolbar.classList.remove('hidden');
      if (fab) fab.classList.remove('hidden');
      resizeCanvas(); 
      redraw();
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
    }
  }

  function setupOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'iitm-whiteboard-overlay';
    
    canvas = document.createElement('canvas');
    canvas.className = 'iitm-whiteboard-canvas';
    overlay.appendChild(canvas);
    
    createToolbar();
    document.body.appendChild(overlay);
    
    ctx = canvas.getContext('2d');
    rc = rough.canvas(canvas);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    canvas.onpointerdown = handleDown;
    canvas.onpointermove = handleMove;
    canvas.onpointerup = handleUp;
    canvas.onpointerout = handleUp;
  }

  let toolbar;
  function createToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'iitm-annotation-toolbar hidden';
    toolbar.innerHTML = `
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn active" data-tool="pen" title="Pen"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.5 1.5M7.5 9l-1.5 1.5"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="line" title="Line"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="arrow" title="Arrow"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14m-7-7l7 7-7 7"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="rectangle" title="Rectangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg></button>
        <button class="iitm-tool-btn" data-tool="ellipse" title="Circle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle></svg></button>
        <button class="iitm-tool-btn" data-tool="triangle" title="Triangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3l9 16H3L12 3z"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="graph" title="Graph"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12h18M12 3v18"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="eraser" title="Eraser"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path><path d="M17 17L7 7"></path></svg></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-color-dot active" style="background: #4f46e5" data-color="#4f46e5"></button>
        <button class="iitm-color-dot" style="background: #10b981" data-color="#10b981"></button>
        <button class="iitm-color-dot" style="background: #ef4444" data-color="#ef4444"></button>
        <button class="iitm-color-dot" style="background: #f59e0b" data-color="#f59e0b"></button>
        <button class="iitm-color-dot" style="border: 2px solid #e2e8f0; background: #ffffff" data-color="#1e293b"></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn" data-weight="2" title="Fine"><div style="width: 4px; height: 4px; background: currentColor; border-radius: 50%"></div></button>
        <button class="iitm-tool-btn active" data-weight="5" title="Medium"><div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%"></div></button>
        <button class="iitm-tool-btn" data-weight="9" title="Thick"><div style="width: 12px; height: 12px; background: currentColor; border-radius: 50%"></div></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn" data-tool="minimize" title="Minimize UI"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="clear" title="Clear All"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="close" title="Disable Overlay"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
      </div>
    `;

    toolbar.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (isMinimized) { minimizeToolbar(); return; }
      if (btn.dataset.tool) {
        const tool = btn.dataset.tool;
        if (tool === 'close') toggleWhiteboard();
        else if (tool === 'minimize') minimizeToolbar();
        else if (tool === 'clear') { if (confirm("Clear all annotations?")) { elements = []; saveAnnotations(); redraw(); } }
        else setTool(tool);
      } else if (btn.dataset.color) setColor(btn.dataset.color);
      else if (btn.dataset.weight) setWeight(parseInt(btn.dataset.weight));
    };

    document.body.appendChild(toolbar);
  }

  function minimizeToolbar() {
    isMinimized = !isMinimized;
    toolbar.classList.toggle('minimized', isMinimized);
  }

  function setTool(tool) {
    currentTool = tool;
    toolbar.querySelectorAll('[data-tool]').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
  }

  function setColor(color) {
    currentColor = color;
    toolbar.querySelectorAll('[data-color]').forEach(btn => btn.classList.toggle('active', btn.dataset.color === color));
  }

  function setWeight(w) {
    currentWeight = w;
    toolbar.querySelectorAll('[data-weight]').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.weight) === w));
  }

  function resizeCanvas() {
    if (!canvas) return;
    // 🚩 Accuracy Fix: Match EXACT viewport dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  }

  // ── 2. Drawing Logic ───────────────────────────────────────────────────────
  function handleDown(e) {
    if (!isEnabled) return;
    if (e.target.closest('.iitm-annotation-toolbar') || e.target.closest('.iitm-toggle-fab')) return;

    isDrawing = true;
    
    // 🚩 ACCURACY FIX: Store Absolute Page Coordinates (Viewport Mouse + Global Scroll)
    const pos = { 
      x: e.clientX + window.scrollX, 
      y: e.clientY + window.scrollY 
    };

    if (currentTool === 'eraser') {
      eraseAt(pos);
    } else {
      tempElement = {
        type: currentTool,
        points: currentTool === 'pen' ? [[pos.x, pos.y]] : [[pos.x, pos.y], [pos.x, pos.y]],
        stroke: currentColor,
        strokeWidth: currentWeight,
        seed: Math.floor(Math.random() * 100000)
      };
    }
  }

  function handleMove(e) {
    if (!isDrawing || !isEnabled || !tempElement) return;
    
    const pos = { 
      x: e.clientX + window.scrollX, 
      y: e.clientY + window.scrollY 
    };

    if (currentTool === 'pen') {
      tempElement.points.push([pos.x, pos.y]);
    } else {
      tempElement.points = [tempElement.points[0], [pos.x, pos.y]];
    }
    
    // During move, we redraw the entire viewport including the ghost
    redraw();
    drawTranslatedElement(tempElement);
  }

  function handleUp() {
    if (isDrawing && tempElement) {
      elements.push(tempElement);
      tempElement = null;
      isDrawing = false;
      saveAnnotations();
      redraw();
    }
    isDrawing = false;
  }

  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.forEach(drawTranslatedElement);
  }

  /**
   * 🚩 THE ENGINE: Core Translation Mapper
   * Transforms stored absolute coordinates -> viewport positions
   */
  function drawTranslatedElement(el) {
    // Translate all stored points by current scroll offset
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    const translatedEl = {
       ...el,
       points: el.points.map(p => [p[0] - scrollX, p[1] - scrollY])
    };

    const isPen = el.type === 'pen';
    const opts = { stroke: el.stroke, strokeWidth: el.strokeWidth, roughness: isPen ? 0 : 1.5, seed: el.seed };
    
    if (isPen) {
      rc.linearPath(translatedEl.points, opts);
    } else if (el.type === 'line') {
      const [p1, p2] = translatedEl.points;
      rc.line(p1[0], p1[1], p2[0], p2[1], opts);
    } else if (el.type === 'rectangle') {
      const [p1, p2] = translatedEl.points;
      rc.rectangle(Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]), opts);
    } else if (el.type === 'ellipse') {
      const [p1, p2] = translatedEl.points;
      rc.ellipse(p1[0] + (p2[0]-p1[0])/2, p1[1] + (p2[1]-p1[1])/2, Math.abs(p2[0]-p1[0]), Math.abs(p2[1]-p1[1]), opts);
    } else if (el.type === 'arrow') {
      const [[x1, y1], [x2, y2]] = translatedEl.points;
      rc.line(x1, y1, x2, y2, opts);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 15;
      rc.line(x2, y2, x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6), opts);
      rc.line(x2, y2, x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6), opts);
    } else if (el.type === 'triangle') {
      const [p1, p2] = translatedEl.points;
      const x1 = Math.min(p1[0], p2[0]), x2 = Math.max(p1[0], p2[0]);
      const y1 = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]);
      rc.polygon([[x1 + (x2 - x1) / 2, y1], [x1, y2], [x2, y2]], opts);
    } else if (el.type === 'graph') {
      const [p1, p2] = translatedEl.points;
      const xMid = p1[0] + (p2[0] - p1[0]) / 2;
      const yMid = p1[1] + (p2[1] - p1[1]) / 2;
      rc.line(xMid, Math.min(p1[1], p2[1]), xMid, Math.max(p1[1], p2[1]), opts);
      rc.line(Math.min(p1[0], p2[0]), yMid, Math.max(p1[0], p2[0]), yMid, opts);
    }
  }

  function eraseAt(pos) {
    const originalLen = elements.length;
    elements = elements.filter(el => {
       if (el.type === 'pen') return !el.points.some(p => Math.hypot(p[0] - pos.x, p[1] - pos.y) < 25);
       const [p1, p2] = el.points;
       const minX = Math.min(p1[0], p2[0]) - 20, maxX = Math.max(p1[0], p2[0]) + 20;
       const minY = Math.min(p1[1], p2[1]) - 20, maxY = Math.max(p1[1], p2[1]) + 20;
       return !(pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY);
    });
    if (elements.length !== originalLen) { redraw(); saveAnnotations(); }
  }

  // ── 3. Persistence Logic ───────────────────────────────────────────────────
  function saveAnnotations() {
    const key = `iitm_anno_${window.location.pathname}${window.location.search}`;
    const data = {}; data[key] = elements;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data, () => console.log("Saved V6:", elements.length));
    }
  }

  function loadAnnotations() {
    const key = `iitm_anno_${window.location.pathname}${window.location.search}`;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([key], (result) => {
          if (result[key]) {
            elements = result[key];
            if (elements.length > 0) { if (!overlay) setupOverlay(); redraw(); }
          }
        });
    }
  }

  init();
})();
