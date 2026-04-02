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

  let overlay, canvas, ctx, rc, toolbar;

  // ── 1. Initialization ──────────────────────────────────────────────────────
  function init() {
    console.log("Markit Demo: Initializing Full-Page Studio...");
    
    // Check for RoughJS in the local lib folder
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

  function setupOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'iitm-whiteboard-overlay';
    
    canvas = document.createElement('canvas');
    canvas.className = 'iitm-whiteboard-canvas';
    canvas.style.touchAction = 'none'; // 🚩 Crucial for mobile drawing
    overlay.appendChild(canvas);
    
    createToolbar();
    document.body.appendChild(overlay);
    
    ctx = canvas.getContext('2d');
    rc = rough.canvas(canvas);

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 300));
    resizeCanvas();

    // Universal Pointer Events (Touch, Mouse, Pen)
    canvas.onpointerdown = handleDown;
    canvas.onpointermove = handleMove;
    canvas.onpointerup = handleUp;
    canvas.onpointerout = handleUp;
    canvas.onpointercancel = handleUp;
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
    toolbar.className = 'iitm-annotation-toolbar'; // Uses extension CSS
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
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
        <button class="iitm-tool-btn" data-weight="2" title="Fine"><div style="width: 4px; height: 4px; background: currentColor; border-radius: 50%"></div></button>
        <button class="iitm-tool-btn active" data-weight="5" title="Medium"><div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%"></div></button>
      </div>
      <div class="iitm-divider"></div>
      <div class="iitm-toolbar-group">
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

      if (toolBtn) {
        setTool(toolBtn.dataset.tool);
      } else if (colorBtn) {
        setColor(colorBtn.dataset.color);
      } else if (weightBtn) {
        setWeight(parseInt(weightBtn.dataset.weight));
      } else if (clearBtn) {
        showClearConfirm();
      }
    };

    toolbar.querySelector('#iitm-clear-no').onclick = hideClearConfirm;
    toolbar.querySelector('#iitm-clear-yes').onclick = () => {
      elements = []; saveAnnotations(); redraw(); hideClearConfirm();
    };

    document.body.appendChild(toolbar);
  }

  function showClearConfirm() {
    const popover = document.getElementById('iitm-clear-popover');
    popover.classList.add('active');
  }

  function hideClearConfirm() {
    const popover = document.getElementById('iitm-clear-popover');
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
    if (!canvas || !overlay) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; // Full viewport for demo
    overlay.style.width = canvas.width + 'px';
    overlay.style.height = canvas.height + 'px';
    redraw();
  }

  function getLocalCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
    }
  }

  function handleMove(e) {
    if (!isDrawing || !isEnabled || !tempElement || e.pointerId !== activePointerId) return;
    const pos = getLocalCoords(e);
    if (currentTool === 'pen') {
      tempElement.points.push([pos.x, pos.y]);
    } else {
      tempElement.points = [tempElement.points[0], [pos.x, pos.y]];
    }
    redraw();
    drawElement(tempElement);
  }

  function handleUp(e) {
    if (isDrawing && tempElement && e.pointerId === activePointerId) {
      elements.push(tempElement);
      tempElement = null;
      saveAnnotations();
      redraw();
    }
    isDrawing = false;
    activePointerId = null;
  }

  function redraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.forEach(drawElement);
  }

  function drawElement(el) {
    const isPen = el.type === 'pen';
    const opts = { stroke: el.stroke, strokeWidth: el.strokeWidth, roughness: isPen ? 0 : 1.2, seed: el.seed };
    
    if (isPen) {
      rc.linearPath(el.points, opts);
    } else if (el.type === 'line') {
      const [p1, p2] = el.points;
      rc.line(p1[0], p1[1], p2[0], p2[1], opts);
    } else if (el.type === 'rectangle') {
      const [p1, p2] = el.points;
      rc.rectangle(Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1]), Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]), opts);
    } else if (el.type === 'ellipse') {
      const [p1, p2] = el.points;
      rc.ellipse(p1[0] + (p2[0]-p1[0])/2, p1[1] + (p2[1]-p1[1])/2, Math.abs(p2[0]-p1[0]), Math.abs(p2[1]-p1[1]), opts);
    } else if (el.type === 'triangle') {
      const [p1, p2] = el.points;
      const x1 = Math.min(p1[0], p2[0]), x2 = Math.max(p1[0], p2[0]);
      const y1 = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]);
      rc.polygon([[x1 + (x2 - x1) / 2, y1], [x1, y2], [x2, y2]], opts);
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
