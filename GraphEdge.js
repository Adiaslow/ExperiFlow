import * as gsap from './gsap/gsap-core.js';

export class GraphEdge {
  constructor(parentNode, childNode) {
    this.parentNode = parentNode;
    this.childNode = childNode;
    this.element = this.createElement();
    this.path = this.element.querySelector('path');
    this.markerId = `arrowhead-${this.parentNode.id}-${this.childNode.id}`;
    this.config = {
      nodeOffset: 10,           // Distance from node
      verticalDistance: 500,     // Initial vertical segment length
      transitionRatio: 100     // Controls the "roundness" of the curve
    };
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
    return {
      start: {
        x: this.parentNode.position.x + nodeWidth / 2,
        y: this.parentNode.position.y + nodeHeight
      },
      end: {
        x: this.childNode.position.x + nodeWidth / 2,
        y: this.childNode.position.y - this.config.nodeOffset
      }
    };
  }

  calculateControlPoints({ start, end }) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Adjust vertical distance based on total distance
    const verticalDistance = Math.min(distance * 0.3, this.config.verticalDistance);

    // First control point - extends vertically from start
    const c1 = {
      x: start.x,
      y: start.y + verticalDistance
    };

    // Second control point - approaches end vertically
    const c2 = {
      x: end.x,
      y: end.y - verticalDistance
    };

    return { c1, c2 };
  }

  update() {
    const {
      offsetWidth: nodeWidth,
      offsetHeight: nodeHeight
    } = this.parentNode.element;

    const points = this.calculatePoints(nodeWidth, nodeHeight);
    const { c1, c2 } = this.calculateControlPoints(points);

    const pathData = `M ${points.start.x},${points.start.y} ` +
      `C ${c1.x},${c1.y} ${c2.x},${c2.y} ${points.end.x},${points.end.y}`;

    this.path.setAttribute('d', pathData);
  }
}

export default GraphEdge;
