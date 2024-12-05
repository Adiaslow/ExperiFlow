export class Minimap {
  constructor(flowChart) {
    this.flowChart = flowChart;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.container = document.createElement("div");
    this.container.className = "minimap";
    this.container.appendChild(this.canvas);
    this.flowChart.canvas.parentElement.appendChild(this.container);

    this.styles = getComputedStyle(this.container);
    this.canvasAspectRatio = null;
    this.resize();
    this.setupEventListeners();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.flowChart.canvas);
    requestAnimationFrame(() => this.update());
  }

  resize() {
    const containerRect = this.container.getBoundingClientRect();
    const canvasRect = this.flowChart.canvas.getBoundingClientRect();

    this.canvasAspectRatio = canvasRect.width / canvasRect.height;

    let minimapWidth = containerRect.width;
    let minimapHeight = containerRect.height;
    const minimapAspectRatio = minimapWidth / minimapHeight;

    if (this.canvasAspectRatio > minimapAspectRatio) {
      minimapHeight = minimapWidth / this.canvasAspectRatio;
    } else {
      minimapWidth = minimapHeight * this.canvasAspectRatio;
    }

    this.canvas.width = minimapWidth;
    this.canvas.height = minimapHeight;
    this.canvas.style.left = `${(containerRect.width - minimapWidth) / 2}px`;
    this.canvas.style.top = `${(containerRect.height - minimapHeight) / 2}px`;
    this.scale = Math.min(
      minimapWidth / canvasRect.width,
      minimapHeight / canvasRect.height
    ) * 0.9;
    this.update();
  }

  setupEventListeners() {
    let isDragging = false;
    this.canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      this.handleMinimapInteraction(e);
    });
    this.canvas.addEventListener("mousemove", (e) => {
      if (isDragging) this.handleMinimapInteraction(e);
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  handleMinimapInteraction(e) {
    const rect = this.canvas.getBoundingClientRect();
    const containerRect = this.flowChart.canvas.parentElement.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;
    const canvasX = minimapX / this.scale;
    const canvasY = minimapY / this.scale;

    this.flowChart.offset.x = containerRect.width / 2 - canvasX * this.flowChart.scale;
    this.flowChart.offset.y = containerRect.height / 2 - canvasY * this.flowChart.scale;
    this.flowChart.updateTransform();
  }

  update() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = this.styles.getPropertyValue('--minimap-background');
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.flowChart.edges.forEach(edge => {
      this.ctx.beginPath();
      this.ctx.moveTo(
        edge.parentNode.position.x * this.scale,
        edge.parentNode.position.y * this.scale
      );
      this.ctx.lineTo(
        edge.childNode.position.x * this.scale,
        edge.childNode.position.y * this.scale
      );
      this.ctx.strokeStyle = this.styles.getPropertyValue('--minimap-edge-color');
      this.ctx.stroke();
    });

    this.flowChart.nodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.arc(
        node.position.x * this.scale,
        node.position.y * this.scale,
        2,
        0,
        2 * Math.PI
      );

      const nodeType = node.element.classList.contains("true") ? "node-true" :
        node.element.classList.contains("false") ? "node-false" : "node-fill";
      this.ctx.fillStyle = this.styles.getPropertyValue(`--minimap-${nodeType}`);
      this.ctx.fill();

      this.ctx.strokeStyle = this.styles.getPropertyValue('--minimap-node-stroke');
      this.ctx.stroke();
    });

    const containerRect = this.flowChart.canvas.parentElement.getBoundingClientRect();
    const viewportX = -this.flowChart.offset.x * this.scale / this.flowChart.scale;
    const viewportY = -this.flowChart.offset.y * this.scale / this.flowChart.scale;
    const viewportWidth = containerRect.width * this.scale / this.flowChart.scale;
    const viewportHeight = containerRect.height * this.scale / this.flowChart.scale;

    this.ctx.strokeStyle = this.styles.getPropertyValue('--minimap-viewport');
    this.ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
  }
}
