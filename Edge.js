class Edge {
    constructor(parentNode, childNode) {
        this.parentNode = parentNode;
        this.childNode = childNode;
        this.element = this.createElement();
    }

    createElement() {
        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        );
        svg.classList.add("edge");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.pointerEvents = "none";
        svg.innerHTML = `
            <defs>
                <marker id="arrowhead-${this.parentNode.id}-${this.childNode.id}"
                        markerWidth="5" markerHeight="7"
                        refX="0" refY="3.5"
                        orient="auto-start-reverse">
                    <polygon points="0 0, 10 3.5, 0 7" class="edge-arrow"/>
                </marker>
            </defs>
            <path marker-end="url(#arrowhead-${this.parentNode.id}-${this.childNode.id})"
                  stroke="#999"
                  stroke-width="2"
                  fill="none"/>
        `;
        return svg;
    }

    update() {
        const nodeWidth = this.parentNode.element.offsetWidth;
        const nodeHeight = this.parentNode.element.offsetHeight;

        // Calculate start point (bottom center of parent)
        const startX = this.parentNode.position.x + nodeWidth / 2;
        const startY = this.parentNode.position.y + nodeHeight;

        // Calculate end point (top center of child)
        const endX = this.childNode.position.x + nodeWidth / 2;
        const endY = this.childNode.position.y; // Removed the -10 offset

        // Calculate the distance and midpoint
        const dx = endX - startX;
        const dy = endY - startY;
        const midY = startY + dy / 2;

        // Create control points for the Bezier curve
        const controlPoint1X = startX;
        const controlPoint1Y = midY;
        const controlPoint2X = endX;
        const controlPoint2Y = midY;

        const path = this.element.querySelector("path");
        path.setAttribute(
            "d",
            `M ${startX},${startY}
             C ${controlPoint1X},${controlPoint1Y}
               ${controlPoint2X},${controlPoint2Y}
               ${endX},${endY}`,
        );
    }
}
