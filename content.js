/**
 * IITM Annotation Extension - Content Script (V1.4.2)
 * (Responsive Toolbar, Touch Lock, and Mobile Scaling)
 */

(function() {
  let isEnabled = false;
  let isDrawing = false;
  let currentTool = 'cursor';
  let currentColor = '#4f46e5';
  let currentWeight = 5;
  let isProMode = false; // ⚡ New High-Performance Mode
  let elements = [];
  let tempElement = null;
  let activePointerId = null; // 🚩 For Touch/Palm Rejection

  let overlay, canvasStatic, ctxStatic, rcStatic, canvasDynamic, ctxDynamic, rcDynamic, toolbar;

  // ── 1. Initialization ──────────────────────────────────────────────────────
  function init() {
    console.log("IITM Annotator: Initializing V10 (Mobile & Touch)...");
    
    injectPersistentStyles();

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggle_whiteboard") {
          toggleWhiteboard();
        }
      });
    }

    createToggleFAB();
    loadAnnotations();
    
    setInterval(ensureUIPresence, 2000);
    setupDOMWatcher();
  }

  function setupDOMWatcher() {
    const observer = new MutationObserver(() => {
       if (isEnabled) ensureUIPresence();
    });
    observer.observe(document.body, { childList: true, subtree: false });

    if (typeof ResizeObserver !== 'undefined') {
      const resizeOb = new ResizeObserver(() => {
         if (isEnabled && canvas) resizeCanvas();
      });
      resizeOb.observe(document.body);
      resizeOb.observe(document.documentElement);
    }
    
    // 🚩 Orientation Change support
    window.addEventListener('orientationchange', () => {
       setTimeout(resizeCanvas, 300);
    });
  }

  function injectPersistentStyles() {
    const styleId = 'iitm-zero-fail-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .iitm-annotation-toolbar { overflow-y: visible !important; }
      .iitm-annotation-toolbar { overflow-y: visible !important; }

    `;
    document.head.appendChild(style);
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
    fab.onclick = (e) => {
      e.stopPropagation();
      toggleWhiteboard();
    };
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
      // 🚩 Force scroll-lock to prevent horizontal jitter
      document.documentElement.style.overflowX = 'hidden'; 
      setTimeout(resizeCanvas, 100); 
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      document.documentElement.style.overflowX = ''; 
    }
  }

  function setupOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'iitm-whiteboard-overlay';
    
    // 1. Static Canvas (The "Ink" that stays)
    canvasStatic = document.createElement('canvas');
    canvasStatic.className = 'iitm-whiteboard-canvas iitm-canvas-static';
    overlay.appendChild(canvasStatic);
    
    // 2. Dynamic Canvas (The "Pen" you see while moving)
    canvasDynamic = document.createElement('canvas');
    canvasDynamic.className = 'iitm-whiteboard-canvas iitm-canvas-dynamic';
    overlay.appendChild(canvasDynamic);
    
    createToolbar();
    document.body.appendChild(overlay);
    
    ctxStatic = canvasStatic.getContext('2d');
    rcStatic = rough.canvas(canvasStatic);
    ctxDynamic = canvasDynamic.getContext('2d');
    rcDynamic = rough.canvas(canvasDynamic);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Interaction on the TOP layer (Dynamic)
    canvasDynamic.onpointerdown = handleDown;
    canvasDynamic.onpointermove = handleMove;
    canvasDynamic.onpointerup = handleUp;
    canvasDynamic.onpointerout = handleUp;
    canvasDynamic.onpointercancel = handleUp;

    window.addEventListener('scroll', () => {
      if (isEnabled && isProMode) requestAnimationFrame(redraw);
    }, { passive: true });
  }

  function toggleProMode() {
    isProMode = !isProMode;
    if (overlay) overlay.classList.toggle('pro', isProMode);
    
    // 🚩 UI Feedback
    const proBtn = document.getElementById('iitm-pro-btn');
    if (proBtn) {
      proBtn.innerText = isProMode ? '⚡' : '🏝️';
      proBtn.style.color = isProMode ? '#fbbf24' : '#94a3b8';
      proBtn.style.background = isProMode ? 'rgba(251, 191, 36, 0.1)' : 'transparent';
    }
    
    resizeCanvas();
    saveAnnotations(); // Save mode preference? (optional)
  }

  function createToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'iitm-annotation-toolbar hidden';
    toolbar.innerHTML = `
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn active" data-tool="cursor" title="Pointer (Select)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="pen" title="Pen"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.5 1.5M7.5 9l-1.5 1.5"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="line" title="Line"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="rectangle" title="Rectangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg></button>
        <button class="iitm-tool-btn" data-tool="ellipse" title="Circle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle></svg></button>
        <button class="iitm-tool-btn" data-tool="triangle" title="Triangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3l9 16H3L12 3z"></path></svg></button>
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
        <button class="iitm-tool-btn" id="iitm-pro-btn" title="Adaptive Pro Mode (60fps on Wikipedia)">🏝️</button>
        <button class="iitm-tool-btn" id="iitm-clear-trigger" title="Reset All Annotations"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="close" title="Close"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
      </div>

    `;

    toolbar.onpointerdown = (e) => e.stopPropagation(); // 🚩 Don't draw when clicking toolbar
    
    toolbar.onclick = (e) => {
      e.stopPropagation();
      const toolBtn = e.target.closest('[data-tool]');
      const colorBtn = e.target.closest('[data-color]');
      const weightBtn = e.target.closest('[data-weight]');
      const clearBtn = e.target.closest('#iitm-clear-trigger');

      const proBtn = e.target.closest('#iitm-pro-btn');
      
      if (toolBtn) {
        const tool = toolBtn.dataset.tool;
        if (tool === 'close') toggleWhiteboard();
        else setTool(tool);
      } else if (colorBtn) {
        setColor(colorBtn.dataset.color);
      } else if (weightBtn) {
        setWeight(parseInt(weightBtn.dataset.weight));
      } else if (clearBtn) {
        elements = []; saveAnnotations(); redraw();
      } else if (proBtn) {
        toggleProMode();
      }
    };

    document.body.appendChild(toolbar);
  }



  function setTool(tool) {
    currentTool = tool;
    toolbar.querySelectorAll('[data-tool]').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool));
    canvas.style.cursor = tool === 'cursor' ? 'default' : 'crosshair';
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
    if (!canvasStatic || !overlay) return;
    
    let viewWidth = window.innerWidth;
    let fullHeight;

    if (isProMode) {
      // ⚡ Pro Mode: Screen-sized canvas
      fullHeight = window.innerHeight;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
    } else {
      // 🏝️ Sticky Mode: Document-sized canvas
      fullHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
      overlay.style.width = viewWidth + 'px';
      overlay.style.height = fullHeight + 'px';
    }
    
    if (canvasStatic.width !== viewWidth || canvasStatic.height !== fullHeight) {
       [canvasStatic, canvasDynamic].forEach(c => {
         c.width = viewWidth;
         c.height = fullHeight;
       });
       redraw();
    }
  }

  function getLocalCoords(e) {
    const rect = canvasStatic.getBoundingClientRect();
    if (isProMode) {
      return { x: e.clientX, y: e.clientY };
    } else {
      return { x: e.pageX, y: e.pageY };
    }
  }

  // ── 2. Drawing Logic ───────────────────────────────────────────────────────
  function handleDown(e) {
    if (!isEnabled) return;
    if (currentTool === 'cursor') return;
    if (e.target.closest('.iitm-annotation-toolbar') || e.target.closest('.iitm-toggle-fab')) return;
    
    // 🚩 PALM REJECTION: Only handle primary pointer (one finger/mouse)
    if (!e.isPrimary) return;
    activePointerId = e.pointerId;

    isDrawing = true;
    const pos = getLocalCoords(e);

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

      // ⚡ Correct for Pro Mode spawn
      if (isProMode) {
        tempElement.points[0][1] += window.scrollY;
        if (currentTool !== 'pen') tempElement.points[1][1] += window.scrollY;
      }
    }
  }

  function handleMove(e) {
    if (!isDrawing || !isEnabled || !tempElement) return;
    if (e.pointerId !== activePointerId) return; // Ignore secondary touches
    
    const pos = getLocalCoords(e);
    if (currentTool === 'pen') {
      // 🚩 Storage is ALWAYS absolute
      const absY = isProMode ? (pos.y + window.scrollY) : pos.y;
      tempElement.points.push([pos.x, absY]);
    } else {
      const absY0 = isProMode ? (tempElement.points[0][1]) : tempElement.points[0][1]; // Already abs
      const absY1 = isProMode ? (pos.y + window.scrollY) : pos.y;
      tempElement.points = [tempElement.points[0], [pos.x, absY1]];
    }
    
    // ⚡ ULTRA-PERFORMANCE: Only clear/draw the dynamic layer
    ctxDynamic.clearRect(0, 0, canvasDynamic.width, canvasDynamic.height);
    
    if (isProMode) {
      ctxDynamic.save();
      ctxDynamic.setTransform(1, 0, 0, 1, 0, -window.scrollY);
      drawElementInContext(rcDynamic, tempElement);
      ctxDynamic.restore();
    } else {
      drawElementInContext(rcDynamic, tempElement);
    }
  }

  function handleUp(e) {
    if (isDrawing && tempElement && e.pointerId === activePointerId) {
      elements.push(tempElement);
      tempElement = null;
      saveAnnotations();
      
      // ⚡ Finalize onto Static layer
      ctxDynamic.clearRect(0, 0, canvasDynamic.width, canvasDynamic.height);
      redraw();
    }
    isDrawing = false;
    activePointerId = null;
  }

  function redraw() {
    if (!ctxStatic) return;
    ctxStatic.clearRect(0, 0, canvasStatic.width, canvasStatic.height);
    
    if (isProMode) {
      ctxStatic.save();
      ctxStatic.setTransform(1, 0, 0, 1, 0, -window.scrollY);
      elements.forEach(el => drawElementInContext(rcStatic, el));
      ctxStatic.restore();
    } else {
      elements.forEach(el => drawElementInContext(rcStatic, el));
    }
  }

  function drawElementInContext(roughCanvas, el) {
    const isPen = el.type === 'pen';
    const opts = { stroke: el.stroke, strokeWidth: el.strokeWidth, roughness: (isPen || el.type === 'line') ? 0 : 1.2, seed: el.seed };
    
    if (isPen) {
      roughCanvas.linearPath(el.points, opts);
    } else if (el.type === 'line') {
      const [p1, p2] = el.points;
      roughCanvas.line(p1[0], p1[1], p2[0], p2[1], opts);
    } else if (el.type === 'rectangle') {
      const [p1, p2] = el.points;
      roughCanvas.rectangle(Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]), opts);
    } else if (el.type === 'ellipse') {
      const [p1, p2] = el.points;
      roughCanvas.ellipse(p1[0] + (p2[0]-p1[0])/2, p1[1] + (p2[1]-p1[1])/2, Math.abs(p2[0]-p1[0]), Math.abs(p2[1]-p1[1]), opts);
    } else if (el.type === 'triangle') {
      const [p1, p2] = el.points;
      const x1 = Math.min(p1[0], p2[0]), x2 = Math.max(p1[0], p2[0]);
      const y1 = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]);
      roughCanvas.polygon([[x1 + (x2 - x1) / 2, y1], [x1, y2], [x2, y2]], opts);
    }
  }

  function eraseAt(pos) {
    elements = elements.filter(el => {
       if (el.type === 'pen') return !el.points.some(p => Math.hypot(p[0] - pos.x, p[1] - pos.y) < 25);
       const [p1, p2] = el.points;
       const minX = Math.min(p1[0], p2[0]) - 20, maxX = Math.max(p1[0], p2[0]) + 20;
       const minY = Math.min(p1[1], p2[1]) - 20, maxY = Math.max(p1[1], p2[1]) + 20;
       return !(pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY);
    });
    redraw(); saveAnnotations();
  }

  function saveAnnotations() {
    const key = `iitm_anno_${window.location.pathname}${window.location.search}`;
    const data = {}; data[key] = elements;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data, () => console.log("Saved V10 (Mobile):", elements.length));
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
