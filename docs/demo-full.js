/* Markit Full-Page Demo Logic (V1.0.0 Global Release) */
/* Adapted from content.js for standalone browser demo */

(function() {
  let isEnabled = true; // 🚩 Always active for the demo page
  let isDrawing = false;
  let currentTool = 'cursor';
  let currentColor = '#4f46e5';
  let currentWeight = 5;
  let elements = [];
  let tempElement = null;
  let activePointerId = null;

  let isProMode = false;
  let overlay, canvasStatic, ctxStatic, rcStatic, canvasDynamic, ctxDynamic, rcDynamic, toolbar;

  // ── 1. Initialization ──────────────────────────────────────────────────────
  function init() {
    console.log("Markit Demo: Initializing Full-Page Studio (V1.4.0)...");
    
    injectPersistentStyles();

    // Check for RoughJS
    if (typeof rough !== 'undefined') {
        setupOverlay();
        loadAnnotations();
    } else {
        setTimeout(init, 500); 
        return;
    }

    // 🚩 In the demo page, the Whiteboard is toggled on by default
    toggleWhiteboard(true);
  }

  function injectPersistentStyles() {
    const styleId = 'iitm-zero-fail-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .iitm-annotation-toolbar { overflow-y: visible !important; }
      .iitm-confirm-popover {
        position: absolute !important;
        bottom: calc(100% + 15px) !important;
        right: 15px !important;
        left: auto !important;
        background: rgba(15, 23, 42, 0.98) !important;
        backdrop-filter: blur(25px);
        -webkit-backdrop-filter: blur(25px);
        color: white !important;
        padding: 10px 14px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
        min-width: 140px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
        z-index: 2147483647 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateY(10px);
        transition: all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        border: 1px solid rgba(255,255,255,0.15) !important;
      }
      .iitm-confirm-popover.active {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: translateY(0) !important;
      }
      .iitm-confirm-title { font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; }
      .iitm-confirm-btn { flex: 1 !important; padding: 6px 0 !important; border-radius: 8px !important; font-size: 12px !important; }
      .iitm-confirm-cancel { background: #334155 !important; color: white !important; }
      .iitm-confirm-yes { background: #ef4444 !important; color: white !important; }
    `;
    document.head.appendChild(style);
  }

  function setupOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'iitm-whiteboard-overlay';
    
    // 1. Static Canvas
    canvasStatic = document.createElement('canvas');
    canvasStatic.className = 'iitm-whiteboard-canvas iitm-canvas-static';
    overlay.appendChild(canvasStatic);
    
    // 2. Dynamic Canvas
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
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 300));
    resizeCanvas();

    // Interaction on TOP layer
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
    
    const proBtn = document.getElementById('iitm-pro-btn');
    if (proBtn) {
      proBtn.innerText = isProMode ? '⚡' : '🏝️';
      proBtn.style.color = isProMode ? '#fbbf24' : '#94a3b8';
      proBtn.style.background = isProMode ? 'rgba(251, 191, 36, 0.1)' : 'transparent';
    }
    
    resizeCanvas();
    saveAnnotations();
  }

  function toggleWhiteboard(forceState) {
    isEnabled = (forceState !== undefined) ? forceState : !isEnabled;
    
    if (isEnabled) {
      if (!overlay) setupOverlay();
      overlay.classList.remove('hidden');
      if (toolbar) toolbar.classList.remove('hidden');
      document.documentElement.style.overflowX = 'hidden'; 
      setTimeout(resizeCanvas, 100); 
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      document.documentElement.style.overflowX = ''; 
    }
  }

    function createToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'iitm-annotation-toolbar';
    toolbar.innerHTML = `
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn active" data-tool="cursor" title="Pointer (Select)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="M13 13l6 6"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="pen" title="Pen"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.5 1.5M7.5 9l-1.5 1.5"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="line" title="Line"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="rectangle" title="Rectangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg></button>
        <button class="iitm-tool-btn" data-tool="ellipse" title="Circle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle></svg></button>
        <button class="iitm-tool-btn" data-tool="triangle" title="Triangle"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3l9 16H3L12 3z"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="graph" title="Graph (X/Y Axis)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3v18m-9-9h18"></path><path d="M17 7l5 5-5 5m-10-10l-5 5 5 5"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="arrow" title="Arrow"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14m-4-4l4 4-4 4"></path></svg></button>
        <button class="iitm-tool-btn" data-tool="eraser" title="Eraser"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path><path d="M17 17L7 7"></path></svg></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-color-dot active" style="background: #4f46e5" data-color="#4f46e5" title="Indigo"></button>
        <button class="iitm-color-dot" style="background: #10b981" data-color="#10b981" title="Green"></button>
        <button class="iitm-color-dot" style="background: #ef4444" data-color="#ef4444" title="Red"></button>
        <button class="iitm-color-dot" style="background: #4b5563" data-color="#4b5563" title="Dark Gray"></button>
        <button class="iitm-color-dot" style="background: #facc15" data-color="#facc15" title="Yellow"></button>
        <button class="iitm-color-dot" style="background: #f97316" data-color="#f97316" title="Orange"></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn" data-weight="2" title="Fine"><div style="width: 4px; height: 4px; background: currentColor; border-radius: 50%"></div></button>
        <button class="iitm-tool-btn active" data-weight="5" title="Medium"><div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%"></div></button>
        <button class="iitm-tool-btn" data-weight="10" title="Bold"><div style="width: 12px; height: 12px; background: currentColor; border-radius: 50%"></div></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn" id="iitm-pro-btn" title="Adaptive Pro Mode (Speed Boost)">🏝️</button>
        <button class="iitm-tool-btn" id="iitm-clear-trigger" title="Clear All"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
      </div>

      <div class="iitm-confirm-popover" id="iitm-clear-popover">
        <div class="iitm-confirm-title">Clear all annotations?</div>
        <div class="iitm-confirm-footer">
          <button class="iitm-confirm-btn iitm-confirm-cancel" id="iitm-clear-no">Cancel</button>
          <button class="iitm-confirm-btn iitm-confirm-yes" id="iitm-clear-yes">Yes, Clear</button>
        </div>
      </div>
    `;

    toolbar.onpointerdown = (e) => e.stopPropagation(); 
    toolbar.onclick = (e) => {
      e.stopPropagation();
      const toolBtn = e.target.closest('[data-tool]');
      const colorBtn = e.target.closest('[data-color]');
      const weightBtn = e.target.closest('[data-weight]');
      const clearBtn = e.target.closest('#iitm-clear-trigger');

      const proBtn = e.target.closest('#iitm-pro-btn');

      if (toolBtn) {
        setTool(toolBtn.dataset.tool);
      } else if (colorBtn) {
        setColor(colorBtn.dataset.color);
      } else if (weightBtn) {
        setWeight(parseInt(weightBtn.dataset.weight));
      } else if (clearBtn) {
        showClearConfirm();
      } else if (proBtn) {
        toggleProMode();
      }
    };

    toolbar.querySelector('#iitm-clear-no').onclick = (e) => {
      e.stopPropagation();
      hideClearConfirm();
    };
    toolbar.querySelector('#iitm-clear-yes').onclick = (e) => {
      e.stopPropagation();
      elements = []; 
      saveAnnotations(); 
      redraw(); 
      hideClearConfirm();
    };

    document.body.appendChild(toolbar);
  }

  function showClearConfirm() {
    const popover = toolbar.querySelector('#iitm-clear-popover');
    if (popover) popover.classList.add('active');
  }

  function hideClearConfirm() {
    const popover = toolbar.querySelector('#iitm-clear-popover');
    if (popover) popover.classList.remove('active');
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
        fullHeight = window.innerHeight;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
    } else {
        fullHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
        overlay.style.width = viewWidth + 'px';
        overlay.style.height = fullHeight + 'px';
    }

    if (canvasStatic.width !== viewWidth || canvasStatic.height !== fullHeight) {
        canvasStatic.width = viewWidth;
        canvasStatic.height = fullHeight;
        canvasDynamic.width = viewWidth;
        canvasDynamic.height = fullHeight;
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
    if (!isEnabled || currentTool === 'cursor') return;
    if (e.target.closest('.iitm-annotation-toolbar')) return;
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

      if (isProMode) {
        tempElement.points[0][1] += window.scrollY;
        if (currentTool !== 'pen') tempElement.points[1][1] += window.scrollY;
      }
    }
  }

  function handleMove(e) {
    if (!isDrawing || !isEnabled || !tempElement || e.pointerId !== activePointerId) return;
    const pos = getLocalCoords(e);
    if (currentTool === 'pen') {
      const absY = isProMode ? (pos.y + window.scrollY) : pos.y;
      tempElement.points.push([pos.x, absY]);
    } else {
      const absY1 = isProMode ? (pos.y + window.scrollY) : pos.y;
      tempElement.points = [tempElement.points[0], [pos.x, absY1]];
    }
    
    // ⚡ Performance Fix
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
    } else if (el.type === 'graph') {
      const [p1, p2] = el.points;
      const midX = (p1[0] + p2[0]) / 2;
      const midY = (p1[1] + p2[1]) / 2;
      roughCanvas.line(p1[0], midY, p2[0], midY, opts); 
      roughCanvas.line(midX, p1[1], midX, p2[1], opts); 
    } else if (el.type === 'arrow') {
      const [p1, p2] = el.points;
      roughCanvas.line(p1[0], p1[1], p2[0], p2[1], opts);
      const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      const headSize = Math.max(10, el.strokeWidth * 3);
      const x1 = p2[0] - headSize * Math.cos(angle - Math.PI / 6);
      const y1 = p2[1] - headSize * Math.sin(angle - Math.PI / 6);
      const x2 = p2[0] - headSize * Math.cos(angle + Math.PI / 6);
      const y2 = p2[1] - headSize * Math.sin(angle + Math.PI / 6);
      roughCanvas.line(p2[0], p2[1], x1, y1, opts);
      roughCanvas.line(p2[0], p2[1], x2, y2, opts);
    }
  }

  function distToSegment(p, a, b) {
    const l2 = Math.hypot(b[0] - a[0], b[1] - a[1]) ** 2;
    if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * (b[0] - a[0])), p[1] - (a[1] + t * (b[1] - a[1])));
  }

  function eraseAt(pos) {
    elements = elements.filter(el => {
       if (el.type === 'pen') return !el.points.some(p => Math.hypot(p[0] - pos.x, p[1] - pos.y) < 12);
       
       const [p1, p2] = el.points;
       const p = [pos.x, pos.y];

       if (el.type === 'line' || el.type === 'arrow') {
         return distToSegment(p, p1, p2) > 12;
       } else if (el.type === 'rectangle') {
         const minX = Math.min(p1[0], p2[0]), maxX = Math.max(p1[0], p2[0]);
         const minY = Math.min(p1[1], p2[1]), maxY = Math.max(p1[1], p2[1]);
         const d1 = distToSegment(p, [minX, minY], [maxX, minY]);
         const d2 = distToSegment(p, [maxX, minY], [maxX, maxY]);
         const d3 = distToSegment(p, [maxX, maxY], [minX, maxY]);
         const d4 = distToSegment(p, [minX, maxY], [minX, minY]);
         return Math.min(d1, d2, d3, d4) > 12;
       } else if (el.type === 'graph') {
         const midX = (p1[0] + p2[0]) / 2, midY = (p1[1] + p2[1]) / 2;
         const d1 = distToSegment(p, [p1[0], midY], [p2[0], midY]);
         const d2 = distToSegment(p, [midX, p1[1]], [midX, p2[1]]);
         return Math.min(d1, d2) > 12;
       }

       // Fallback for Ellipses/Triangles
       const minX = Math.min(p1[0], p2[0]), maxX = Math.max(p1[0], p2[0]);
       const minY = Math.min(p1[1], p2[1]), maxY = Math.max(p1[1], p2[1]);
       const distToEdge = Math.min(Math.abs(pos.x - minX), Math.abs(pos.x - maxX), Math.abs(pos.y - minY), Math.abs(pos.y - maxY));
       const isInside = pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
       return !(isInside && distToEdge < 15);
    });
    redraw(); saveAnnotations();
  }

  function saveAnnotations() {
    // 🚩 In the demo page, use localStorage instead of chrome.storage
    localStorage.setItem('markit_demo_cache', JSON.stringify(elements));
  }

  function loadAnnotations() {
    const data = localStorage.getItem('markit_demo_cache');
    if (data) {
        elements = JSON.parse(data);
        redraw();
    }
  }

  init();
})();
