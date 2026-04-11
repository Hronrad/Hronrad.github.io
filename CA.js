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

    class CAEngine {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.colorBackground = options.colorBackground || "#ffffff";
            this.colorGrid = options.colorGrid || "#e0e0e0";
            this.word = options.word || "HRONRAD";

            this.resolution = 8;
            this.cols = 0;
            this.rows = 0;

            this.statesCount = options.statesCount || 10;
            this.fps = options.fps || 15;
            this.evolveLimit = this.fps * 20;

            this.historyGrid = [];
            this.currentPhase = "HOLD_TEXT";
            this.phaseTimer = 0;
            this.strokeRadius = 1;
            this.grid = [];
            this.lastFrameTime = 0;
        }

        start() {
            window.addEventListener("resize", () => this.resizeCanvas());
            this.resizeCanvas();
            window.requestAnimationFrame((timestamp) => this.loop(timestamp));
        }

        setStatesCount(value) {
            this.statesCount = value;
        }

        setFps(value) {
            this.fps = value;
            this.evolveLimit = this.fps * 20;
        }

        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.resolution = window.innerWidth < 600 ? 5 : 8;
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

        initTextGrid() {
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
        }

        drawGrid() {
            this.ctx.fillStyle = this.colorBackground;
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

            const totalExpandFrames = this.getExpandFrames();

            for (let col = 0; col < this.cols; col++) {
                for (let row = 0; row < this.rows; row++) {
                    const state = this.grid[col][row];
                    const renderState = this.getRenderState(state, totalExpandFrames);
                    if (renderState <= 0) {
                        continue;
                    }

                    let lightness = 60;
                    if (this.statesCount > 2) {
                        lightness = 60 + ((renderState - 1) / (this.statesCount - 2)) * 40;
                    } else if (renderState > 1) {
                        lightness = 100;
                    }

                    this.ctx.fillStyle = `hsl(210, 100%, ${lightness}%)`;
                    this.ctx.fillRect(
                        col * this.resolution,
                        row * this.resolution,
                        this.resolution - 1,
                        this.resolution - 1
                    );
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
            this.currentPhase = "EVOLVE";
            this.phaseTimer = 0;
        }

        advancePhase() {
            if (this.currentPhase === "HOLD_TEXT") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.phaseTimer++;
                if (this.phaseTimer >= 2) {
                    this.currentPhase = "STROKE_EXPAND";
                    this.phaseTimer = 0;
                    this.strokeRadius = 1;
                }
                return;
            }

            if (this.currentPhase === "STROKE_EXPAND") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.expandStroke();
                return;
            }

            if (this.currentPhase === "EVOLVE") {
                this.historyGrid.push(this.cloneGrid(this.grid));
                this.computeNextGeneration();
                if (this.historyGrid.length >= this.evolveLimit) {
                    this.currentPhase = "REVERSE";
                    this.phaseTimer = 0;
                }
                return;
            }

            if (this.historyGrid.length > 0) {
                this.grid = this.historyGrid.pop();
            } else {
                this.currentPhase = "HOLD_TEXT";
                this.phaseTimer = 0;
            }
        }

        loop(timestamp) {
            if (timestamp - this.lastFrameTime >= 1000 / this.fps) {
                this.advancePhase();
                this.drawGrid();
                this.lastFrameTime = timestamp;
            }

            window.requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
        }
    }

    window.CAEngine = CAEngine;
})();
