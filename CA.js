(function () {
    const FONT = {
        H: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
        R: [[1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0], [1, 0, 1, 0, 0], [1, 0, 0, 1, 1]],
        O: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        N: [[1, 0, 0, 0, 1], [1, 1, 0, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 1, 1], [1, 0, 0, 0, 1]],
        A: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
        D: [[1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 0]]
    };

    const GOSPER_GUN_PATTERN = [
        [24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
        [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4],
        [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5],
        [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]
    ];
    const PULSAR_PATTERN = [
        [2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
        [0, 2], [5, 2], [7, 2], [12, 2],
        [0, 3], [5, 3], [7, 3], [12, 3],
        [0, 4], [5, 4], [7, 4], [12, 4],
        [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
        [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
        [0, 8], [5, 8], [7, 8], [12, 8],
        [0, 9], [5, 9], [7, 9], [12, 9],
        [0, 10], [5, 10], [7, 10], [12, 10],
        [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]
    ];
    const PENTADECATHLON_PATTERN = [
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0],
        [0, -1], [0, 1], [9, -1], [9, 1]
    ];
    const GLIDER_PATTERNS = [
        [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
        [[0, 0], [0, 1], [0, 2], [1, 0], [2, 1]],
        [[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]],
        [[2, 0], [0, 1], [2, 1], [1, 2], [2, 2]]
    ];

    class CAEngine {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d", {
                alpha: false,
                desynchronized: true
            }) || canvas.getContext("2d");

            this.colorBackground = options.colorBackground || "#ffffff";
            this.colorGrid = options.colorGrid || "#e0e0e0";
            this.word = options.word || "HRONRAD";
            this.performanceProfile = options.performanceProfile || {};
            this.currentHue = options.themeHue || 210;
            this.targetHue = this.currentHue;
            this.transitionFromHue = this.currentHue;
            this.transitionStartTime = 0;
            this.transitionDuration = 650;
            this.isRuntimeSuspended = false;

            this.resolution = 8;
            this.cols = 0;
            this.rows = 0;

            this.statesCount = options.statesCount || 10;
            this.fps = options.fps || 15;
            this.evolveLimit = this.fps * 20;
            this.defaultHoldFrames = options.defaultHoldFrames || 2;
            this.currentHoldFrames = this.defaultHoldFrames;

            this.historyGrid = [];
            this.currentPhase = "HOLD_TEXT";
            this.previousPhase = this.currentPhase;
            this.phaseTimer = 0;
            this.strokeRadius = 1;
            this.grid = [];
            this.lastFrameTime = 0;
        }

        normalizeHue(hue) {
            return ((hue % 360) + 360) % 360;
        }

        shortestHueDistance(from, to) {
            return ((to - from + 540) % 360) - 180;
        }

        easeInOut(progress) {
            return progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        }

        start() {
            window.addEventListener("resize", () => this.resizeCanvas());
            this.resizeCanvas();
            window.requestAnimationFrame((timestamp) => this.loop(timestamp));
        }

        setRuntimeSuspended(value) {
            this.isRuntimeSuspended = Boolean(value);
            if (!this.isRuntimeSuspended) {
                this.lastFrameTime = 0;
            }
        }

        setStatesCount(value) {
            this.statesCount = value;
        }

        setFps(value) {
            this.fps = value;
            this.evolveLimit = this.fps * 20;
        }

        getFrameCountForSeconds(seconds) {
            return Math.max(1, Math.round(seconds * this.fps));
        }

        setThemeHue(nextHue, timestamp = performance.now()) {
            const normalizedHue = this.normalizeHue(nextHue);
            this.updateThemeHue(timestamp);
            this.transitionFromHue = this.currentHue;
            this.targetHue = normalizedHue;
            this.transitionStartTime = timestamp;
        }

        reset(options = {}) {
            if (typeof options.statesCount === "number") {
                this.statesCount = options.statesCount;
            }
            if (typeof options.fps === "number") {
                this.fps = options.fps;
                this.evolveLimit = this.fps * 20;
            }
            if (typeof options.themeHue === "number") {
                const hue = this.normalizeHue(options.themeHue);
                this.currentHue = hue;
                this.targetHue = hue;
                this.transitionFromHue = hue;
                this.transitionStartTime = performance.now();
            }

            this.lastFrameTime = 0;
            this.initTextGrid({
                holdFrames: typeof options.holdSeconds === "number"
                    ? this.getFrameCountForSeconds(options.holdSeconds)
                    : this.defaultHoldFrames
            });
            this.drawGrid();
        }

        restartShowcase(options = {}) {
            this.lastFrameTime = 0;
            this.initTextGrid({
                holdFrames: typeof options.holdSeconds === "number"
                    ? this.getFrameCountForSeconds(options.holdSeconds)
                    : this.defaultHoldFrames
            });
            this.drawGrid();
        }

        updateThemeHue(timestamp) {
            if (this.currentHue === this.targetHue) {
                return false;
            }

            const elapsed = Math.max(0, timestamp - this.transitionStartTime);
            const progress = Math.min(1, elapsed / this.transitionDuration);
            const easedProgress = this.easeInOut(progress);
            const hueDistance = this.shortestHueDistance(this.transitionFromHue, this.targetHue);
            this.currentHue = this.normalizeHue(this.transitionFromHue + hueDistance * easedProgress);

            if (progress >= 1) {
                this.currentHue = this.targetHue;
            }

            return true;
        }

        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            if (this.performanceProfile.useLowEffects) {
                this.resolution = window.innerWidth < 600 ? 11 : 9;
            } else {
                this.resolution = window.innerWidth < 600 ? 7 : 8;
            }
            this.cols = Math.floor(this.canvas.width / this.resolution);
            this.rows = Math.floor(this.canvas.height / this.resolution);
            this.initTextGrid();
        }

        createEmptyGrid() {
            return new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(0));
        }

        cloneGrid(sourceGrid) {
            return sourceGrid.map((col) => [...col]);
        }

        getExpandFrames() {
            const baseExpansion = Math.max(4, this.statesCount);
            return Math.max(3, Math.floor(baseExpansion * 0.75));
        }

        getRenderState(state, expandFrames) {
            if (state < 100) {
                return state;
            }

            const layer = state - 100;
            if (layer === 0) {
                return 1;
            }

            const distanceFromOuter = expandFrames - layer;
            const value = (this.statesCount - 1) - distanceFromOuter;
            return Math.max(2, Math.min(this.statesCount - 1, value));
        }

        addGosperGun() {
            const safeCols = Math.max(1, this.cols - 40);
            const safeRows = Math.max(1, this.rows - 15);
            const startX = Math.floor(Math.random() * safeCols);
            const startY = Math.floor(Math.random() * safeRows);
            const flipX = Math.random() > 0.5 ? 1 : -1;
            const flipY = Math.random() > 0.5 ? 1 : -1;

            for (const [dx, dy] of GOSPER_GUN_PATTERN) {
                const x = (((startX + dx * flipX) % this.cols) + this.cols) % this.cols;
                const y = (((startY + dy * flipY) % this.rows) + this.rows) % this.rows;
                this.grid[x][y] = 1;
            }
        }

        addPattern(pattern, width, height) {
            const safeCols = Math.max(1, this.cols - width - 2);
            const safeRows = Math.max(1, this.rows - height - 2);
            const startX = Math.floor(Math.random() * safeCols);
            const startY = Math.floor(Math.random() * safeRows);

            for (const [dx, dy] of pattern) {
                const x = (((startX + dx) % this.cols) + this.cols) % this.cols;
                const y = (((startY + dy) % this.rows) + this.rows) % this.rows;
                this.grid[x][y] = 1;
            }
        }

        addSpecialOscillators() {
            const patterns = [
                { pattern: PULSAR_PATTERN, width: 13, height: 13 },
                { pattern: PENTADECATHLON_PATTERN, width: 10, height: 3 }
            ];
            const totalCount = Math.random() < 0.5 ? 1 : 2;

            for (let index = 0; index < totalCount; index++) {
                const choice = patterns[Math.floor(Math.random() * patterns.length)];
                this.addPattern(choice.pattern, choice.width, choice.height);
            }
        }

        spawnGliderAt(col, row, orientation) {
            const pattern = GLIDER_PATTERNS[orientation % GLIDER_PATTERNS.length];

            for (const [dx, dy] of pattern) {
                const x = (((col + dx) % this.cols) + this.cols) % this.cols;
                const y = (((row + dy) % this.rows) + this.rows) % this.rows;
                this.grid[x][y] = 1;
            }
        }

        spawnRandomGliderAtClientPoint(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            const col = Math.floor((clientX - rect.left) / this.resolution);
            const row = Math.floor((clientY - rect.top) / this.resolution);

            if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
                return false;
            }

            const orientation = Math.floor(Math.random() * GLIDER_PATTERNS.length);
            this.spawnGliderAt(col, row, orientation);
            this.drawGrid();
            return true;
        }

        initTextGrid(options = {}) {
            this.grid = this.createEmptyGrid();
            this.historyGrid = [];

            const baseWidth = this.word.length * 5 + (this.word.length - 1) * 2;
            let scale = Math.floor((this.cols * 0.8) / baseWidth);
            scale = Math.max(1, Math.min(6, scale));

            const letterWidth = 5 * scale;
            const spacing = 2 * scale;
            const totalWidth = this.word.length * letterWidth + (this.word.length - 1) * spacing;

            let startX = Math.floor((this.cols - totalWidth) / 2);
            let startY = Math.floor((this.rows - 5 * scale) / 2);
            startX = Math.max(0, startX);
            startY = Math.max(0, startY);

            for (const character of this.word) {
                const pattern = FONT[character];
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (pattern[row][col] !== 1) {
                            continue;
                        }

                        for (let deltaRow = 0; deltaRow < scale; deltaRow++) {
                            for (let deltaCol = 0; deltaCol < scale; deltaCol++) {
                                const posX = startX + col * scale + deltaCol;
                                const posY = startY + row * scale + deltaRow;
                                if (posX >= 0 && posX < this.cols && posY >= 0 && posY < this.rows) {
                                    this.grid[posX][posY] = 100;
                                }
                            }
                        }
                    }
                }
                startX += letterWidth + spacing;
            }

            this.currentPhase = "HOLD_TEXT";
            this.phaseTimer = 0;
            this.strokeRadius = 1;
            this.currentHoldFrames = typeof options.holdFrames === "number"
                ? Math.max(1, Math.round(options.holdFrames))
                : this.defaultHoldFrames;
        }

        drawGrid() {
            const isGlassMode = document.body.classList.contains("glass-mode");
            const isMonochromeGlassMode = isGlassMode && document.body.classList.contains("mono-ca-page");
            this.ctx.globalCompositeOperation = "source-over";
            this.ctx.fillStyle = isGlassMode ? "rgba(0, 0, 0, 0.9)" : this.colorBackground;
            if (isGlassMode) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.strokeStyle = this.colorGrid;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let col = 0; col <= this.cols; col++) {
                    this.ctx.moveTo(col * this.resolution, 0);
                    this.ctx.lineTo(col * this.resolution, this.canvas.height);
                }
                for (let row = 0; row <= this.rows; row++) {
                    this.ctx.moveTo(0, row * this.resolution);
                    this.ctx.lineTo(this.canvas.width, row * this.resolution);
                }
                this.ctx.stroke();
            }

            const totalExpandFrames = this.getExpandFrames();

            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    const state = this.grid[col][row];
                    const renderState = this.getRenderState(state, totalExpandFrames);

                    const pxX = col * this.resolution;
                    const pxY = row * this.resolution;
                    const centerX = pxX + this.resolution / 2;
                    const centerY = pxY + this.resolution / 2;
                    const circleRadius = this.resolution * 0.34;

                    if (renderState <= 0) {
                        if (isGlassMode) {
                            if (isMonochromeGlassMode) {
                                this.ctx.fillStyle = "rgba(70, 70, 70, 0.82)";
                                this.ctx.beginPath();
                                this.ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
                                this.ctx.fill();
                            }
                        }
                        continue;
                    }

                    let lightness = 60;
                    if (this.statesCount > 2) {
                        lightness = 60 + ((renderState - 1) / (this.statesCount - 2)) * 40;
                    } else if (renderState > 1) {
                        lightness = 100;
                    }

                    if (isMonochromeGlassMode) {
                        const grayscale = Math.round(150 + (lightness / 100) * 105);
                        this.ctx.fillStyle = `rgb(${grayscale}, ${grayscale}, ${grayscale})`;
                    } else {
                        this.ctx.fillStyle = `hsl(${this.currentHue}, 100%, ${lightness}%)`;
                    }

                    if (isGlassMode) {
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else {
                        this.ctx.fillRect(pxX, pxY, this.resolution - 1, this.resolution - 1);
                    }
                }
            }
        }

        getNextGOLState(col, row, currentGrid) {
            const state = currentGrid[col][row];
            let activeNeighbors = 0;

            for (let offsetX = -1; offsetX < 2; offsetX++) {
                for (let offsetY = -1; offsetY < 2; offsetY++) {
                    if (offsetX === 0 && offsetY === 0) {
                        continue;
                    }

                    const x = (col + offsetX + this.cols) % this.cols;
                    const y = (row + offsetY + this.rows) % this.rows;
                    if (currentGrid[x][y] === 1) {
                        activeNeighbors++;
                    }
                }
            }

            if (state === 0) {
                return activeNeighbors === 3 ? 1 : 0;
            }
            if (state === 1) {
                return activeNeighbors < 2 || activeNeighbors > 3 ? 2 : 1;
            }
            if (activeNeighbors === 3) {
                return 1;
            }

            const nextState = state + 1;
            return nextState >= this.statesCount ? 0 : nextState;
        }

        computeNextGeneration() {
            const nextGrid = this.createEmptyGrid();
            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    nextGrid[col][row] = this.getNextGOLState(col, row, this.grid);
                }
            }
            this.grid = nextGrid;
        }

        expandStroke() {
            const totalExpandFrames = this.getExpandFrames();
            const interval = Math.max(2, Math.floor(totalExpandFrames / 2));
            const isRegularLayer = this.phaseTimer % interval === 0;
            const expandProbability = isRegularLayer ? 1 : 0.4;
            const targetState = 100 + this.strokeRadius - 1;
            const nextGrid = this.createEmptyGrid();

            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    const state = this.grid[col][row];
                    if (state !== 0) {
                        nextGrid[col][row] = state;
                        continue;
                    }

                    let hasTargetNeighbor = false;
                    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    for (const [dx, dy] of directions) {
                        const x = (col + dx + this.cols) % this.cols;
                        const y = (row + dy + this.rows) % this.rows;
                        if (this.grid[x][y] === targetState) {
                            hasTargetNeighbor = true;
                            break;
                        }
                    }

                    nextGrid[col][row] = hasTargetNeighbor && Math.random() < expandProbability
                        ? 100 + this.strokeRadius
                        : 0;
                }
            }

            this.grid = nextGrid;
            this.strokeRadius++;
            this.phaseTimer++;

            if (this.phaseTimer < totalExpandFrames) {
                return;
            }

            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    if (this.grid[col][row] >= 100) {
                        this.grid[col][row] = this.getRenderState(this.grid[col][row], totalExpandFrames);
                    }
                }
            }

            this.addGosperGun();
            this.addGosperGun();
            this.addSpecialOscillators();
            this.currentPhase = "EVOLVE";
            this.phaseTimer = 0;
        }

        advancePhase() {
            const phaseBeforeUpdate = this.currentPhase;

            if (this.currentPhase === "HOLD_TEXT") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.phaseTimer++;
                if (this.phaseTimer >= this.currentHoldFrames) {
                    this.currentPhase = "STROKE_EXPAND";
                    this.phaseTimer = 0;
                    this.strokeRadius = 1;
                }
            } else if (this.currentPhase === "STROKE_EXPAND") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.expandStroke();
            } else if (this.currentPhase === "EVOLVE") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.computeNextGeneration();
                if (this.historyGrid.length >= this.evolveLimit) {
                    this.currentPhase = "REVERSE";
                    this.phaseTimer = 0;
                }
            } else if (this.historyGrid.length > 0) {
                this.grid = this.historyGrid.pop();
            } else {
                this.currentPhase = "HOLD_TEXT";
                this.phaseTimer = 0;
                this.currentHoldFrames = this.defaultHoldFrames;
            }

            if (phaseBeforeUpdate !== this.currentPhase) {
                window.dispatchEvent(new CustomEvent("ca-phase-change", {
                    detail: {
                        previousPhase: phaseBeforeUpdate,
                        currentPhase: this.currentPhase
                    }
                }));
            }
        }

        loop(timestamp) {
            if (this.isRuntimeSuspended) {
                this.lastFrameTime = timestamp;
                window.requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
                return;
            }

            const themeIsTransitioning = this.updateThemeHue(timestamp);
            let didAdvance = false;

            if (timestamp - this.lastFrameTime >= 1000 / this.fps) {
                this.advancePhase();
                this.lastFrameTime = timestamp;
                didAdvance = true;
            }

            if (didAdvance || themeIsTransitioning) {
                this.drawGrid();
            }

            window.requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
        }
    }

    window.CAEngine = CAEngine;
})();
