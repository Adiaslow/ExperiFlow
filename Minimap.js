class Minimap {
    constructor(flowChart) {
        this.flowChart = flowChart;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.scale = 0.1; // Scale for the minimap view

        // Create and append minimap container
        this.container = document.createElement("div");
        this.container.className = "minimap";
        this.container.appendChild(this.canvas);
        this.flowChart.canvas.parentElement.appendChild(this.container);

        // Set canvas size
        this.resize();
        this.setupEventListeners();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    setupEventListeners() {
        // Add click and drag handling for the minimap
        this.canvas.addEventListener("mousedown", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.centerViewOnPoint(x, y);
        });
    }

    centerViewOnPoint(x, y) {
        const containerRect =
            this.flowChart.canvas.parentElement.getBoundingClientRect();
        const scale = this.flowChart.scale;

        // Convert minimap coordinates to main canvas coordinates
        const mainX = (x / this.scale) * scale;
        const mainY = (y / this.scale) * scale;

        // Center the view on the clicked point
        this.flowChart.offset.x = containerRect.width / 2 - mainX;
        this.flowChart.offset.y = containerRect.height / 2 - mainY;
        this.flowChart.updateTransform();
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw nodes
        this.flowChart.nodes.forEach((node) => {
            const position = node.position;
            this.ctx.fillStyle = node.element.classList.contains("true")
                ? "#d4edda"
                : node.element.classList.contains("false")
                  ? "#f8d7da"
                  : "#fff";
            this.ctx.strokeStyle = "#000";
            this.ctx.beginPath();
            this.ctx.arc(
                position.x * this.scale,
                position.y * this.scale,
                7.5 * this.scale, // Half of node width/height
                0,
                2 * Math.PI,
            );
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Draw viewport rectangle
        const containerRect =
            this.flowChart.canvas.parentElement.getBoundingClientRect();
        const viewportX =
            (-this.flowChart.offset.x * this.scale) / this.flowChart.scale;
        const viewportY =
            (-this.flowChart.offset.y * this.scale) / this.flowChart.scale;
        const viewportWidth =
            (containerRect.width * this.scale) / this.flowChart.scale;
        const viewportHeight =
            (containerRect.height * this.scale) / this.flowChart.scale;

        this.ctx.strokeStyle = "#0066cc";
        this.ctx.strokeRect(
            viewportX,
            viewportY,
            viewportWidth,
            viewportHeight,
        );
    }
}
