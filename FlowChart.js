class FlowChart {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.selectedNode = null;
        this.canvas = document.getElementById("canvas");
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.minimap = new Minimap(this);

        // Initialize after DOM is ready
        requestAnimationFrame(() => {
            this.initializeCenteredView();
        });

        this.setupCanvasHandlers();
        this.setupChildNodeHandler();
        this.setupDeleteNodeHandler();
        this.setupNodeMoveHandler();
        this.setupPanAndZoom();
    }

    initializeCenteredView() {
        const containerRect = this.canvas.parentElement.getBoundingClientRect();
        this.offset.x =
            (containerRect.width - this.canvas.offsetWidth * this.scale) / 2;
        this.offset.y =
            (containerRect.height - this.canvas.offsetHeight * this.scale) / 2;
        this.updateTransform();
    }

    setupCanvasHandlers() {
        this.canvas.addEventListener("dragover", (e) => e.preventDefault());
        this.canvas.addEventListener("drop", (e) => {
            const nodeId = e.dataTransfer.getData("nodeId");
            const node = this.nodes.get(nodeId);
            if (node) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                node.updatePosition(x, y);
                this.updateEdges();
            }
        });
    }

    setupPanAndZoom() {
        let isPanning = false;
        let startX = 0;
        let startY = 0;

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.target === this.canvas) {
                isPanning = true;
                startX = e.clientX - this.offset.x;
                startY = e.clientY - this.offset.y;
                this.canvas.style.cursor = "grabbing";
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (!isPanning) return;

            this.offset.x = e.clientX - startX;
            this.offset.y = e.clientY - startY;
            this.updateTransform();
        });

        document.addEventListener("mouseup", () => {
            isPanning = false;
            this.canvas.style.cursor = "grab";
        });

        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();

            // Check if it's a pinch gesture by looking at the resolution of deltaY
            // Pinch gestures typically have fractional deltaY values
            const isPinch = e.deltaY % 1 !== 0;

            if (isPinch) {
                // Pinch zoom logic
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const canvasX = (mouseX - this.offset.x) / this.scale;
                const canvasY = (mouseY - this.offset.y) / this.scale;

                // Adjust the zoom sensitivity for pinch
                const delta = e.deltaY > 0 ? 0.98 : 1.02;
                const newScale = Math.min(Math.max(0.1, this.scale * delta), 3);
                const scaleDiff = newScale - this.scale;

                this.offset.x -= canvasX * scaleDiff;
                this.offset.y -= canvasY * scaleDiff;
                this.scale = newScale;
            } else {
                // Regular two-finger drag for panning
                this.offset.x -= e.deltaX;
                this.offset.y -= e.deltaY;
            }

            this.updateTransform();
        });
    }

    setupNodeMoveHandler() {
        document.addEventListener("nodeMove", () => {
            this.updateEdges();
        });
    }

    setupDeleteNodeHandler() {
        document.addEventListener("deleteNode", (e) => {
            const { nodeId } = e.detail;
            this.deleteNode(nodeId);
        });
    }

    setupChildNodeHandler() {
        document.addEventListener("addChild", (e) => {
            const { parentId, position } = e.detail;
            const parentNode = this.nodes.get(parentId);
            if (parentNode) {
                const childNode = this.addNode(position);
                childNode.parentId = parentId;
                this.addEdge(parentNode, childNode);
            }
        });
    }

    addNode(position = null, parentId = null) {
        const containerRect = this.canvas.parentElement.getBoundingClientRect();

        if (!position) {
            position = {
                x: containerRect.width / 2 - this.offset.x,
                y: containerRect.height / 2 - this.offset.y,
            };
            console.log("New node position:", position); // Add this
            console.log("Current offset:", this.offset); // And this
            console.log("Current scale:", this.scale); // And this
        }

        const id = Date.now().toString();
        const node = new Node(id, "New Hypothesis", "", position, parentId);
        this.nodes.set(id, node);
        this.canvas.appendChild(node.element);

        node.element.addEventListener("click", () => this.selectNode(node));
        return node;
    }

    addEdge(parentNode, childNode) {
        const edgeId = `${parentNode.id}-${childNode.id}`;
        const edge = new Edge(parentNode, childNode);
        this.canvas.appendChild(edge.element);
        this.edges.set(edgeId, edge);
        this.updateEdges();
    }

    selectNode(node) {
        this.selectedNode = node;
        this.showSidebar();
    }

    showSidebar() {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.remove("hidden");

        const titleInput = document.getElementById("nodeTitle");
        const notesInput = document.getElementById("nodeNotes");

        titleInput.value = this.selectedNode.title;
        notesInput.value = this.selectedNode.notes;
    }

    deleteNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Remove connected edges
        this.edges.forEach((edge, edgeId) => {
            if (edgeId.includes(nodeId)) {
                edge.element.remove();
                this.edges.delete(edgeId);
            }
        });

        // Remove node
        node.element.remove();
        this.nodes.delete(nodeId);

        if (this.selectedNode?.id === nodeId) {
            this.selectedNode = null;
            document.getElementById("sidebar").classList.add("hidden");
        }
    }

    deleteSelectedNode() {
        if (this.selectedNode) {
            this.deleteNode(this.selectedNode.id);
        }
    }

    centerView() {
        const containerRect = this.canvas.parentElement.getBoundingClientRect();

        if (this.nodes.size === 0) {
            this.offset.x =
                (containerRect.width - this.canvas.offsetWidth * this.scale) /
                2;
            this.offset.y =
                (containerRect.height - this.canvas.offsetHeight * this.scale) /
                2;
        } else {
            const bounds = this.getBounds();
            const centerX = (bounds.maxX + bounds.minX) / 2;
            const centerY = (bounds.maxY + bounds.minY) / 2;

            this.offset.x = containerRect.width / 2 - centerX * this.scale;
            this.offset.y = containerRect.height / 2 - centerY * this.scale;
        }

        this.updateTransform();
    }

    updateTransform() {
        if (!this.canvas) return;
        this.canvas.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;
        this.updateEdges();
        this.minimap.update(); // Add this line
    }

    updateEdges() {
        this.edges.forEach((edge) => edge.update());
    }

    getBounds() {
        if (this.nodes.size === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        const positions = Array.from(this.nodes.values()).map(
            (node) => node.position,
        );
        return {
            minX: Math.min(...positions.map((p) => p.x)),
            maxX: Math.max(...positions.map((p) => p.x)),
            minY: Math.min(...positions.map((p) => p.y)),
            maxY: Math.max(...positions.map((p) => p.y)),
        };
    }

    saveToJSON() {
        const data = Array.from(this.nodes.values()).map((node) =>
            node.toJSON(),
        );
        return JSON.stringify(data, null, 2);
    }

    loadFromJSON(jsonString) {
        try {
            this.nodes.clear();
            this.edges.clear();
            this.canvas.innerHTML = "";

            const data = JSON.parse(jsonString);
            data.forEach((nodeData) => {
                const node = new Node(
                    nodeData.id,
                    nodeData.title,
                    nodeData.notes,
                    nodeData.position,
                    nodeData.parentId,
                );
                node.update(nodeData);
                this.nodes.set(nodeData.id, node);
                this.canvas.appendChild(node.element);
                node.element.addEventListener("click", () =>
                    this.selectNode(node),
                );
            });

            // Recreate edges
            this.nodes.forEach((node) => {
                if (node.parentId) {
                    const parentNode = this.nodes.get(node.parentId);
                    if (parentNode) {
                        this.addEdge(parentNode, node);
                    }
                }
            });
        } catch (error) {
            console.error("Error loading project:", error);
        }
    }
}
