export class Minimap {
  constructor(flowChart) {
    this.flowChart = flowChart;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.container = document.createElement("div");
    this.container.className = "minimap";
    this.container.appendChild(this.canvas);
    this.flowChart.canvas.parentElement.appendChild(this.container);

    // Store the original canvas aspect ratio
    this.canvasAspectRatio = null;

    this.resize();
    this.setupEventListeners();

    // Add resize observer to handle canvas size changes
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.flowChart.canvas);

    // Trigger initial update to show viewport immediately
    requestAnimationFrame(() => this.update());
  }

  resize() {
    const containerRect = this.container.getBoundingClientRect();
    const canvasRect = this.flowChart.canvas.getBoundingClientRect();

    // Calculate the canvas aspect ratio
    this.canvasAspectRatio = canvasRect.width / canvasRect.height;

    // Determine minimap dimensions while maintaining aspect ratio
    let minimapWidth = containerRect.width;
    let minimapHeight = containerRect.height;

    const minimapAspectRatio = minimapWidth / minimapHeight;

    if (this.canvasAspectRatio > minimapAspectRatio) {
      // Canvas is wider relative to height
      minimapHeight = minimapWidth / this.canvasAspectRatio;
    } else {
      // Canvas is taller relative to width
      minimapWidth = minimapHeight * this.canvasAspectRatio;
    }

    // Set canvas dimensions
    this.canvas.width = minimapWidth;
    this.canvas.height = minimapHeight;

    // Center the minimap canvas in its container
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${(containerRect.width - minimapWidth) / 2}px`;
    this.canvas.style.top = `${(containerRect.height - minimapHeight) / 2}px`;

    // Calculate the scale factor
    this.scale = Math.min(
      minimapWidth / canvasRect.width,
      minimapHeight / canvasRect.height
    ) * 0.9; // Slightly smaller to leave margin

    // Update immediately after resize
    this.update();
  }

  setupEventListeners() {
    let isDragging = false;

    this.canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      this.handleMinimapInteraction(e);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (isDragging) {
        this.handleMinimapInteraction(e);
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  handleMinimapInteraction(e) {
    const rect = this.canvas.getBoundingClientRect();
    const containerRect = this.flowChart.canvas.parentElement.getBoundingClientRect();

    // Calculate position in minimap coordinates
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;

    // Convert to canvas coordinates
    const canvasX = minimapX / this.scale;
    const canvasY = minimapY / this.scale;

    // Update flowchart offset to center on clicked point
    this.flowChart.offset.x = containerRect.width / 2 - canvasX * this.flowChart.scale;
    this.flowChart.offset.y = containerRect.height / 2 - canvasY * this.flowChart.scale;

    this.flowChart.updateTransform();
  }

  update() {
    if (!this.ctx) return;

    // Clear and set background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw edges
    this.flowChart.edges.forEach(edge => {
      const parent = edge.parentNode;
      const child = edge.childNode;

      this.ctx.beginPath();
      this.ctx.moveTo(
        parent.position.x * this.scale,
        parent.position.y * this.scale
      );
      this.ctx.lineTo(
        child.position.x * this.scale,
        child.position.y * this.scale
      );
      this.ctx.strokeStyle = "#999";
      this.ctx.stroke();
    });

    // Draw nodes
    this.flowChart.nodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.arc(
        node.position.x * this.scale,
        node.position.y * this.scale,
        2,
        0,
        2 * Math.PI
      );
      this.ctx.fillStyle = node.element.classList.contains("true") ? "#d4edda" :
        node.element.classList.contains("false") ? "#f8d7da" :
          "#fff";
      this.ctx.fill();
      this.ctx.strokeStyle = "#666";
      this.ctx.stroke();
    });

    // Draw viewport
    const containerRect = this.flowChart.canvas.parentElement.getBoundingClientRect();
    const viewportX = -this.flowChart.offset.x * this.scale / this.flowChart.scale;
    const viewportY = -this.flowChart.offset.y * this.scale / this.flowChart.scale;
    const viewportWidth = containerRect.width * this.scale / this.flowChart.scale;
    const viewportHeight = containerRect.height * this.scale / this.flowChart.scale;

    // Changed viewport color to red
    this.ctx.strokeStyle = "#ff0000";
    this.ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }
}
