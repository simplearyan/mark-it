(function() {
    const canvas = document.getElementById('demo-canvas');
    const ctx = canvas.getContext('2d');
    let rc = null;
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
            rc = rough.canvas(canvas);
        } else {
            setTimeout(init, 500); 
            return;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        setupToolbar();

        canvas.style.touchAction = 'none';
        
        canvas.onpointerdown = handleDown;
        canvas.onpointermove = handleMove;
        canvas.onpointerup = handleUp;
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
        const wrap = canvas.parentElement;
        canvas.width = wrap.clientWidth;
        canvas.height = 450; 
        redraw();
    }

    function getLocalCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
    }

    function handleDown(e) {
        if (!rc || activePointerId !== null) return;
        activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);

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
        if (!isDrawing || !rc || e.pointerId !== activePointerId) return;
        const pos = getLocalCoords(e);
        
        if (currentTool === 'eraser') {
            eraseAt(pos);
        } else if (tempElement) {
            if (currentTool === 'pen') {
                tempElement.points.push([pos.x, pos.y]);
            } else {
                tempElement.points = [tempElement.points[0], [pos.x, pos.y]];
            }
            redraw();
            drawElement(tempElement);
        }
    }

    function handleUp(e) {
        if (isDrawing && tempElement && e.pointerId === activePointerId) {
            elements.push(tempElement);
            tempElement = null;
            redraw();
        }
        if (e.pointerId === activePointerId) {
            isDrawing = false;
            activePointerId = null;
            canvas.releasePointerCapture(e.pointerId);
        }
    }

    function redraw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        elements.forEach(drawElement);
    }

    function drawElement(el) {
        if (!rc) return;
        const opts = { 
            stroke: el.stroke, 
            strokeWidth: el.strokeWidth, 
            roughness: el.type === 'pen' ? 0.3 : 1,
            seed: el.seed 
        };
        
        if (el.type === 'pen') {
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
        }
    }

    function eraseAt(pos) {
        elements = elements.filter(el => {
            const p = el.points[0];
            return Math.hypot(p[0] - pos.x, p[1] - pos.y) > 30;
        });
        redraw();
    }

    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
