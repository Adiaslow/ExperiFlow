import * as gsap from './gsap/gsap-core.js';

export class GraphEdge {
  constructor(parentNode, childNode) {
    this.parentNode = parentNode;
    this.childNode = childNode;
    this.element = this.createElement();
    this.path = this.element.querySelector('path');
    this.markerId = `arrowhead-${this.parentNode.id}-${this.childNode.id}`;

    this.physics = {
      springConstant: 0.5,
      damping: 0.2,
      mass: 0.15,
      gravity: 98.0
    };

    this.controlPoints = {
      c1: { x: 0, y: 0, vx: 0, vy: 0 },
      c2: { x: 0, y: 0, vx: 0, vy: 0 }
    };

    this.nodeState = {
      parent: 0,
      child: 0
    };

    this.config = {
      nodeOffset: 10,
      verticalDistance: 500,
      transitionRatio: 100,
      offset: -5,
      stateEase: 0.5
    };

    this.startAnimation();
  }

  createElement() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("edge", "edge-container");
    const svgAttributes = {
      width: '100%',
      height: '100%',
      style: 'position: absolute; top: 0; left: 0; pointer-events: none;'
    };
    Object.entries(svgAttributes).forEach(([attr, value]) => {
      svg.setAttribute(attr, value);
    });
    svg.innerHTML = `
      <defs>
        <marker id="${this.markerId}"
          markerWidth="10" markerHeight="10"
          refX="0" refY="5"
          orient="90"
          markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 5, 0 10" class="edge-arrow"/>
        </marker>
      </defs>
      <path
        marker-end="url(#${this.markerId})"
        class="edge-path"
        stroke="#999"
        stroke-width="2"
        fill="none"/>
    `;
    return svg;
  }

  calculatePoints(nodeWidth, nodeHeight) {
    // Transition states smoothly - hover or selected triggers the offset
    this.nodeState.parent += ((this.parentNode.element.classList.contains('selected') || this.parentNode.element.matches(':hover') ? 1 : 0) - this.nodeState.parent) * this.config.stateEase;
    this.nodeState.child += ((this.childNode.element.classList.contains('selected') || this.childNode.element.matches(':hover') ? 1 : 0) - this.nodeState.child) * this.config.stateEase;

    return {
      start: {
        x: this.parentNode.position.x + nodeWidth / 2,
        y: this.parentNode.position.y + nodeHeight + (this.nodeState.parent * this.config.offset)
      },
      end: {
        x: this.childNode.position.x + nodeWidth / 2,
        y: this.childNode.position.y - this.config.nodeOffset + (this.nodeState.child * this.config.offset)
      }
    };
  }

  calculateTargetControlPoints({ start, end }) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const verticalDistance = Math.min(distance * 0.3, this.config.verticalDistance);

    return {
      c1: {
        x: start.x,
        y: start.y + verticalDistance
      },
      c2: {
        x: end.x,
        y: end.y - verticalDistance
      }
    };
  }

  updatePhysics(dt) {
    const points = this.calculatePoints(
      this.parentNode.element.offsetWidth,
      this.parentNode.element.offsetHeight
    );

    const targetPoints = this.calculateTargetControlPoints(points);

    ['c1', 'c2'].forEach(point => {
      const current = this.controlPoints[point];
      const target = targetPoints[point];

      // Spring force
      const fx = (target.x - current.x) * this.physics.springConstant;
      const fy = (target.y - current.y) * this.physics.springConstant;

      // Update velocity with gravity
      current.vx += fx * dt / this.physics.mass;
      current.vy += (fy + this.physics.gravity * this.physics.mass) * dt / this.physics.mass;

      // Apply damping
      current.vx *= Math.pow(this.physics.damping, dt);
      current.vy *= Math.pow(this.physics.damping, dt);

      // Update position
      current.x += current.vx * dt;
      current.y += current.vy * dt;
    });

    const pathData = `M ${points.start.x},${points.start.y} ` +
      `C ${this.controlPoints.c1.x},${this.controlPoints.c1.y} ` +
      `${this.controlPoints.c2.x},${this.controlPoints.c2.y} ` +
      `${points.end.x},${points.end.y}`;

    this.path.setAttribute('d', pathData);
  }

  startAnimation() {
    let lastTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const dt = (currentTime - lastTime) / 100;
      lastTime = currentTime;
      this.updatePhysics(dt);
      requestAnimationFrame(animate);
    };

    const points = this.calculatePoints(
      this.parentNode.element.offsetWidth,
      this.parentNode.element.offsetHeight
    );
    const initialControls = this.calculateTargetControlPoints(points);
    this.controlPoints.c1 = { ...initialControls.c1, vx: 0, vy: 0 };
    this.controlPoints.c2 = { ...initialControls.c2, vx: 0, vy: 0 };

    animate();
  }

  update() {
    this.updatePhysics(1 / 60);
  }
}

export default GraphEdge;
