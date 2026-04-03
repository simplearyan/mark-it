(function() {
    const canvasStatic = document.getElementById('demo-canvas-static');
    const ctxStatic = canvasStatic.getContext('2d');
    const canvasDynamic = document.getElementById('demo-canvas-dynamic');
    const ctxDynamic = canvasDynamic.getContext('2d');
    let rcStatic = null;
    let rcDynamic = null;
    let isDrawing = false;
    let currentTool = 'pen';
    let currentColor = '#4f46e5';
    let currentWeight = 5;
    let elements = [];
    let tempElement = null;
    let activePointerId = null; // 🚩 FIXED: Added missing variable declaration

    function init() {
        console.log("Markit Demo: Initializing...");
        
        if (typeof rough !== 'undefined') {
            rcStatic = rough.canvas(canvasStatic);
            rcDynamic = rough.canvas(canvasDynamic);
        } else {
            setTimeout(init, 500); 
            return;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        setupToolbar();

        canvasDynamic.onpointerdown = handleDown;
        canvasDynamic.onpointermove = handleMove;
        canvasDynamic.onpointerup = handleUp;
        canvasDynamic.onpointerout = handleUp;
        canvasDynamic.onpointercancel = handleUp;
    }

    function setupToolbar() {
        // Tools
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.onclick = () => {
                currentTool = btn.dataset.tool;
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        // Colors
        document.querySelectorAll('.color-dot').forEach(btn => {
            btn.onclick = () => {
                currentColor = btn.dataset.color;
                document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        // Weights
        document.querySelectorAll('.weight-btn').forEach(btn => {
            btn.onclick = () => {
                currentWeight = parseInt(btn.dataset.weight);
                document.querySelectorAll('.weight-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
        });

        document.getElementById('clear-btn').onclick = () => {
            elements = [];
            redraw();
        };
    }

    function resizeCanvas() {
        const wrap = canvasDynamic.parentElement;
        [canvasStatic, canvasDynamic].forEach(c => {
            c.width = wrap.clientWidth;
            c.height = 450; 
        });
        redraw();
    }

    function getLocalCoords(e) {
        const rect = canvasStatic.getBoundingClientRect();
        return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
    }

    function handleDown(e) {
        if (!rcStatic || activePointerId !== null) return;
        activePointerId = e.pointerId;
        canvasDynamic.setPointerCapture(e.pointerId);

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
        redraw();
    }

    function handleMove(e) {
        if (!isDrawing || !rcStatic || e.pointerId !== activePointerId) return;
        const pos = getLocalCoords(e);
        
        if (currentTool === 'eraser') {
            eraseAt(pos);
        } else if (tempElement) {
            if (currentTool === 'pen') {
                tempElement.points.push([pos.x, pos.y]);
            } else {
                tempElement.points = [tempElement.points[0], [pos.x, pos.y]];
            }
            // ⚡ Optimize
            ctxDynamic.clearRect(0, 0, canvasDynamic.width, canvasDynamic.height);
            drawElementInContext(rcDynamic, tempElement);
        }
    }

    function handleUp(e) {
        if (isDrawing && tempElement && e.pointerId === activePointerId) {
            elements.push(tempElement);
            tempElement = null;
            
            ctxDynamic.clearRect(0, 0, canvasDynamic.width, canvasDynamic.height);
            redraw();
        }
        if (e.pointerId === activePointerId) {
            isDrawing = false;
            activePointerId = null;
            canvasDynamic.releasePointerCapture(e.pointerId);
        }
    }

    function redraw() {
        if (!ctxStatic) return;
        ctxStatic.clearRect(0, 0, canvasStatic.width, canvasStatic.height);
        elements.forEach(el => drawElementInContext(rcStatic, el));
    }

    function drawElementInContext(roughCanvas, el) {
        if (!roughCanvas) return;
        const opts = { 
            stroke: el.stroke, 
            strokeWidth: el.strokeWidth, 
            roughness: (el.type === 'pen' || el.type === 'line') ? 0.3 : 1,
            seed: el.seed 
        };
        
        if (el.type === 'pen') {
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
            const midX = (p1[0] + p2[0]) / 2, midY = (p1[1] + p2[1]) / 2;
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
            
            // 🚩 SURGICAL ERASER: Check proximity to the actual lines/borders of the shape
            const [p1, p2] = el.points;
            
            if (el.type === 'line' || el.type === 'arrow') {
                return distToSegment([pos.x, pos.y], p1, p2) > 12;
            } else if (el.type === 'rectangle') {
                const minX = Math.min(p1[0], p2[0]), maxX = Math.max(p1[0], p2[0]);
                const minY = Math.min(p1[1], p2[1]), maxY = Math.max(p1[1], p2[1]);
                const d1 = distToSegment([pos.x, pos.y], [minX, minY], [maxX, minY]);
                const d2 = distToSegment([pos.x, pos.y], [maxX, minY], [maxX, maxY]);
                const d3 = distToSegment([pos.x, pos.y], [maxX, maxY], [minX, maxY]);
                const d4 = distToSegment([pos.x, pos.y], [minX, maxY], [minX, minY]);
                return Math.min(d1, d2, d3, d4) > 12;
            } else if (el.type === 'graph') {
                const midX = (p1[0] + p2[0]) / 2, midY = (p1[1] + p2[1]) / 2;
                const d1 = distToSegment([pos.x, pos.y], [p1[0], midY], [p2[0], midY]);
                const d2 = distToSegment([pos.x, pos.y], [midX, p1[1]], [midX, p2[1]]);
                return Math.min(d1, d2) > 12;
            }
            
            // Proximity Fallback for Ellipses/Triangles
            const minX = Math.min(p1[0], p2[0]), maxX = Math.max(p1[0], p2[0]);
            const minY = Math.min(p1[1], p2[1]), maxY = Math.max(p1[1], p2[1]);
            const distToEdge = Math.min(Math.abs(pos.x - minX), Math.abs(pos.x - maxX), Math.abs(pos.y - minY), Math.abs(pos.y - maxY));
            const isInside = pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
            
            return !(isInside && distToEdge < 15);
        });
        redraw();
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
