/* Markit Landing Demo Logic (V1.1.0 Robust Release) */

(function() {
    const canvas = document.getElementById('demo-canvas');
    const ctx = canvas.getContext('2d');
    let rc = null;
    let isDrawing = false;
    let currentTool = 'pen';
    let elements = [];
    let tempElement = null;

    function init() {
        console.log("Markit Demo: Initializing...");
        
        // 🚩 Check for RoughJS with multiple attempts
        if (typeof rough !== 'undefined') {
            rc = rough.canvas(canvas);
            console.log("Markit Demo: RoughJS Loaded.");
        } else {
            console.error("Markit Demo: RoughJS not found. Retrying...");
            setTimeout(init, 500); 
            return;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        setupToolbar();

        // 🚩 ENSURE POINTER EVENTS WORK
        canvas.style.touchAction = 'none'; // Critical for mobile demos
        
        canvas.onpointerdown = handleDown;
        canvas.onpointermove = handleMove;
        canvas.onpointerup = handleUp;
        canvas.onpointerout = handleUp;
        canvas.onpointercancel = handleUp;
    }

    function setupToolbar() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                currentTool = btn.dataset.tool;
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
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
        return { 
            x: (e.clientX - rect.left), 
            y: (e.clientY - rect.top) 
        };
    }

    function handleDown(e) {
        if (!rc) return;
        isDrawing = true;
        const pos = getLocalCoords(e);
        
        if (currentTool === 'eraser') {
            eraseAt(pos);
        } else {
            tempElement = {
                type: currentTool,
                points: currentTool === 'pen' ? [[pos.x, pos.y]] : [[pos.x, pos.y], [pos.x, pos.y]],
                // 🚩 Seed Persistence: Prevent jittering
                seed: Math.floor(Math.random() * 100000)
            };
        }
        // Redraw immediately to show start point
        redraw();
        if (tempElement) drawElement(tempElement);
    }

    function handleMove(e) {
        if (!isDrawing || !rc) return;
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

    function handleUp() {
        if (isDrawing && tempElement) {
            elements.push(tempElement);
            tempElement = null;
            redraw();
        }
        isDrawing = false;
    }

    function redraw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        elements.forEach(drawElement);
    }

    function drawElement(el) {
        if (!rc) return;
        // 🚩 Use the stored seed for consistency
        const opts = { 
            stroke: '#4f46e5', 
            strokeWidth: 3, 
            roughness: el.type === 'pen' ? 0.3 : 1,
            seed: el.seed 
        };
        
        try {
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
        } catch (err) {
            console.error("Draw Error:", err);
        }
    }

    function eraseAt(pos) {
        elements = elements.filter(el => {
            const p = el.points[0];
            return Math.hypot(p[0] - pos.x, p[1] - pos.y) > 30;
        });
        redraw();
    }

    // Start when ready
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);
})();
