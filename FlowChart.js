import { GraphNode } from "./GraphNode.js";
import { GraphEdge } from "./GraphEdge.js";
import { Minimap } from "./Minimap.js";

export class FlowChart {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.selectedNode = null;
    this.canvas = document.getElementById("canvas");
    this.scale = 1;
    this.offset = { x: 150, y: 150 };
    this.isPanning = false;
    this.projectTitle = "Untitled Project";

    // Initialize minimap after canvas setup
    this.minimap = new Minimap(this);

    // Initialize after DOM is ready
    requestAnimationFrame(() => {
      this.initializeCenteredView();
      this.setupCanvasHandlers();
      this.setupChildNodeHandler();
      this.setupDeleteNodeHandler();
      this.setupNodeMoveHandler();
      this.setupPanAndZoom();
      this.setupProjectTitle();
    });
  }

  initializeCenteredView() {
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // Calculate the offset needed to center the canvas
    // We need to consider the scale when calculating the offset
    this.offset.x = (containerRect.width - (canvasRect.width * this.scale)) / 2;
    this.offset.y = (containerRect.height - (canvasRect.height * this.scale)) / 2;

    // Apply the initial transform
    this.updateTransform();
  }

  setupCanvasHandlers() {
    this.canvas.addEventListener("dragover", (e) => e.preventDefault());
    this.canvas.addEventListener("drop", (e) => {
      const nodeId = e.dataTransfer.getData("nodeId");
      const node = this.nodes.get(nodeId);
      if (node) {
        const rect = this.canvas.getBoundingClientRect();
        const rawX = (e.clientX - rect.left - this.offset.x) / this.scale;
        const rawY = (e.clientY - rect.top - this.offset.y) / this.scale;

        // Animate the repositioning of all affected nodes
        this.repositionNodesFromDrop({ x: rawX, y: rawY }, node);
      }
    });
  }


  setupPanAndZoom() {
    let startX = 0;
    let startY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.target === this.canvas) {
        this.isPanning = true;
        startX = e.clientX - this.offset.x;
        startY = e.clientY - this.offset.y;
        this.canvas.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isPanning) return;

      this.offset.x = e.clientX - startX;
      this.offset.y = e.clientY - startY;
      this.updateTransform();
    });

    document.addEventListener("mouseup", () => {
      this.isPanning = false;
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

  setupProjectTitle() {
    const titleInput = document.getElementById("projectTitle");
    titleInput.value = this.projectTitle;

    let isFirstClick = true;
    titleInput.addEventListener("focus", () => {
      if (isFirstClick) {
        titleInput.value = "";
        isFirstClick = false;
      }
    });

    titleInput.addEventListener("change", (e) => {
      this.projectTitle = e.target.value || "Untitled Project";
    });
  }

  // Add this helper method to force a complete update
  forceUpdate() {
    this.updateEdges();
    if (this.minimap) {
      this.minimap.update();
    }
  }

  setupChildNodeHandler() {
    document.addEventListener("addChild", (e) => {
      const { parentId, position } = e.detail;
      const parentNode = this.nodes.get(parentId);

      if (parentNode) {
        // Deselect the parent node
        parentNode.close();

        // Calculate initial position for the new child
        const childPosition = this.calculateChildPosition(parentNode);

        // Create child node at calculated position
        const childNode = this.addNode(childPosition);
        childNode.parentId = parentId;

        // Add edge between parent and child
        this.addEdge(parentNode, childNode);

        // Select the new child node
        this.selectNode(childNode);
      }
    });
  }

  calculateChildPosition(parentNode) {
    const NODE_SIZE = 150;
    const PREFERRED_DISTANCE = NODE_SIZE + 100;
    const ANGLE_STEP = Math.PI / 6; // 30 degrees
    // const ANGLE_STEP = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399963229728653 radians or about 137.5°
    const MIN_ACCEPTABLE_DISTANCE = NODE_SIZE + 20; // Minimum distance between nodes

    // Get all existing children of this parent
    const existingChildren = Array.from(this.nodes.values())
      .filter(node => node.parentId === parentNode.id);

    // If this is the first child, place it directly below the parent
    if (existingChildren.length === 0) {
      const position = {
        x: parentNode.position.x,
        y: parentNode.position.y + PREFERRED_DISTANCE
      };

      // Even for first child, ensure no overlap with other nodes
      return this.findNonOverlappingPosition(position);
    }

    // Calculate the angle of the first child relative to the parent
    const firstChild = existingChildren[0];
    const firstChildAngle = Math.atan2(
      firstChild.position.y - parentNode.position.y,
      firstChild.position.x - parentNode.position.x
    );

    // Function to check if a position has enough space
    const hasEnoughSpace = (position) => {
      for (const node of this.nodes.values()) {
        const dx = position.x - node.position.x;
        const dy = position.y - node.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < MIN_ACCEPTABLE_DISTANCE) {
          return false;
        }
      }
      return true;
    };

    // Try different distances, starting from preferred
    const distances = [PREFERRED_DISTANCE, PREFERRED_DISTANCE * 1.5, PREFERRED_DISTANCE * 2];

    for (const distance of distances) {
      // Try angles around the circle, starting from the first child's angle
      for (let i = 0; i < 12; i++) {
        const testAngle = firstChildAngle + (i * ANGLE_STEP);

        const testPosition = {
          x: parentNode.position.x + Math.cos(testAngle) * distance,
          y: parentNode.position.y + Math.sin(testAngle) * distance
        };

        if (hasEnoughSpace(testPosition)) {
          return testPosition;
        }
      }
    }

    // If no good position found, try a larger distance in the direction of the first child
    return {
      x: parentNode.position.x + Math.cos(firstChildAngle) * (PREFERRED_DISTANCE * 2.5),
      y: parentNode.position.y + Math.sin(firstChildAngle) * (PREFERRED_DISTANCE * 2.5)
    };
  }

  addNode(position = null, parentId = null) {
    const containerRect = this.canvas.parentElement.getBoundingClientRect();

    if (!position) {
      const screenCenterX = containerRect.width / 2;
      const screenCenterY = containerRect.height / 2;
      position = {
        x: (screenCenterX - this.offset.x) / this.scale,
        y: (screenCenterY - this.offset.y) / this.scale
      };
    }

    position = this.findNonOverlappingPosition(position);

    const id = Date.now().toString();
    const node = new GraphNode(id, "New Hypothesis", "", "", position, parentId);
    this.nodes.set(id, node);
    this.canvas.appendChild(node.element);

    // Update minimap without triggering edge updates
    if (this.minimap) {
      this.minimap.update();
    }

    return node;
  }

  deleteNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove connected edges
    Array.from(this.edges.entries()).forEach(([edgeId, edge]) => {
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

    // Update minimap after modifications
    if (this.minimap) {
      this.minimap.update();
    }
  }


  selectNode(node) {
    // Deselect current node if one exists
    if (this.selectedNode && this.selectedNode !== node) {
      this.selectedNode.close();
    }

    this.selectedNode = node;
    node.open();
    this.showSidebar();
  }

  showSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("hidden");

    const titleInput = document.getElementById("nodeTitle");
    const notesInput = document.getElementById("nodeNotes");

    if (this.selectedNode) {
      titleInput.value = this.selectedNode.title;
      notesInput.value = this.selectedNode.notes;
    }
  }

  findNonOverlappingPosition(position) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 20;
    const MAX_ITERATIONS = 100;
    const FORCE_MULTIPLIER = 0.5;

    let newPosition = { ...position };
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      let totalForceX = 0;
      let totalForceY = 0;
      let hasOverlap = false;

      // Calculate repulsive forces from all other nodes
      for (const node of this.nodes.values()) {
        const dx = newPosition.x - node.position.x;
        const dy = newPosition.y - node.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MIN_DISTANCE && distance > 0) {
          hasOverlap = true;

          // Calculate force magnitude (stronger when closer)
          const forceMagnitude = (MIN_DISTANCE - distance) / MIN_DISTANCE;

          // Calculate normalized direction components
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;

          // Add to total force with dampening
          totalForceX += normalizedDx * forceMagnitude * FORCE_MULTIPLIER;
          totalForceY += normalizedDy * forceMagnitude * FORCE_MULTIPLIER;
        }
      }

      // If no overlap, we're done
      if (!hasOverlap) {
        break;
      }

      // Apply forces with "sliding" behavior
      if (Math.abs(totalForceX) > Math.abs(totalForceY)) {
        // Node slides horizontally
        newPosition.x += totalForceX * MIN_DISTANCE;
        newPosition.y += totalForceY * MIN_DISTANCE * 0.2; // Reduced vertical movement
      } else {
        // Node slides vertically
        newPosition.x += totalForceX * MIN_DISTANCE * 0.2; // Reduced horizontal movement
        newPosition.y += totalForceY * MIN_DISTANCE;
      }

      // Add small random offset to prevent stable oscillations
      if (iterations > MAX_ITERATIONS / 2) {
        newPosition.x += (Math.random() - 0.5) * 5;
        newPosition.y += (Math.random() - 0.5) * 5;
      }

      iterations++;
    }

    return newPosition;
  }

  hasOverlap(position) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 20;

    for (const node of this.nodes.values()) {
      const dx = position.x - node.position.x;
      const dy = position.y - node.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_DISTANCE) {
        return true;
      }
    }

    return false;
  }

  findClosestOverlappingNode(position) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 20;
    let closestNode = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const dx = position.x - node.position.x;
      const dy = position.y - node.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_DISTANCE && distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }

    return closestNode;
  }

  // Add this helper method to calculate forces for dragging
  calculateNodeForces(nodeId, currentPosition) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 20;
    const FORCE_MULTIPLIER = 0.3;

    let totalForceX = 0;
    let totalForceY = 0;

    for (const [id, node] of this.nodes.entries()) {
      if (id === nodeId) continue;

      const dx = currentPosition.x - node.position.x;
      const dy = currentPosition.y - node.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_DISTANCE) {
        const forceMagnitude = (MIN_DISTANCE - distance) / MIN_DISTANCE;
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        totalForceX += normalizedDx * forceMagnitude * FORCE_MULTIPLIER;
        totalForceY += normalizedDy * forceMagnitude * FORCE_MULTIPLIER;
      }
    }

    return {
      x: currentPosition.x + totalForceX * MIN_DISTANCE,
      y: currentPosition.y + totalForceY * MIN_DISTANCE
    };
  }

  addEdge(parentNode, childNode) {
    if (!parentNode || !childNode) return;

    const edgeId = `${parentNode.id}-${childNode.id}`;

    // Check if edge already exists
    if (this.edges.has(edgeId)) return;

    const edge = new GraphEdge(parentNode, childNode);
    this.canvas.appendChild(edge.element);
    this.edges.set(edgeId, edge);

    // Update the edge's position
    edge.update();

    // Update minimap after adding edge
    if (this.minimap) {
      this.minimap.update();
    }
  }

  updateEdges(skipMinimapUpdate = false) {
    this.edges.forEach(edge => edge.update());

    // Only update minimap if not skipped and minimap exists
    if (!skipMinimapUpdate && this.minimap) {
      this.minimap.update();
    }
  }

  setupCanvasHandlers() {
    this.canvas.addEventListener("dragover", (e) => e.preventDefault());
    this.canvas.addEventListener("drop", (e) => {
      const nodeId = e.dataTransfer.getData("nodeId");
      const node = this.nodes.get(nodeId);
      if (node) {
        const rect = this.canvas.getBoundingClientRect();
        const rawX = (e.clientX - rect.left - this.offset.x) / this.scale;
        const rawY = (e.clientY - rect.top - this.offset.y) / this.scale;

        // Animate the repositioning of all affected nodes
        this.repositionNodesFromDrop({ x: rawX, y: rawY }, node);
      }
    });
  }

  repositionNodesFromDrop(dropPosition, droppedNode) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 100;
    const ANIMATION_DURATION = 500; // milliseconds
    const FORCE_MULTIPLIER = 1.2;

    // First, collect all nodes that need to be moved
    const affectedNodes = new Map();
    const startPositions = new Map();
    const targetPositions = new Map();

    // Set dropped node's target position
    droppedNode.updatePosition(dropPosition.x, dropPosition.y);
    affectedNodes.set(droppedNode.id, droppedNode);
    startPositions.set(droppedNode.id, { ...droppedNode.position });
    targetPositions.set(droppedNode.id, { ...dropPosition });

    // Find all nodes that need to be repositioned
    const findAffectedNodes = (position, depth = 0) => {
      if (depth > 10) return; // Prevent infinite recursion

      for (const [id, node] of this.nodes.entries()) {
        if (affectedNodes.has(id)) continue;

        const dx = position.x - node.position.x;
        const dy = position.y - node.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MIN_DISTANCE) {
          affectedNodes.set(id, node);
          startPositions.set(id, { ...node.position });

          // Calculate push direction
          const angle = Math.atan2(dy, dx);
          const pushDistance = (MIN_DISTANCE - distance) * FORCE_MULTIPLIER;

          // Calculate new position being pushed away from the drop point
          const newPosition = {
            x: node.position.x - Math.cos(angle) * pushDistance,
            y: node.position.y - Math.sin(angle) * pushDistance
          };

          targetPositions.set(id, newPosition);

          // Recursively check for other affected nodes
          findAffectedNodes(newPosition, depth + 1);
        }
      }
    };

    findAffectedNodes(dropPosition);

    // Animate all affected nodes
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // Use an easing function for smoother motion
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      // Update positions of all affected nodes
      for (const [id, node] of affectedNodes.entries()) {
        const start = startPositions.get(id);
        const target = targetPositions.get(id);

        const currentPosition = {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased
        };

        node.updatePosition(currentPosition.x, currentPosition.y);
      }

      this.updateEdges();

      // Update minimap during animation
      this.minimap.update();

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final position check and adjustment
        this.optimizeNodePositions(Array.from(affectedNodes.values()));
        // Final minimap update after optimization
        this.minimap.update();
      }
    };

    requestAnimationFrame(animate);
  }

  optimizeNodePositions(nodes) {
    const NODE_SIZE = 150;
    const MIN_DISTANCE = NODE_SIZE + 20;
    const MAX_ITERATIONS = 10;

    // Fine-tune positions to ensure minimum distances
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      let maxAdjustment = 0;

      for (const nodeA of nodes) {
        for (const nodeB of this.nodes.values()) {
          if (nodeA.id === nodeB.id) continue;

          const dx = nodeA.position.x - nodeB.position.x;
          const dy = nodeA.position.y - nodeB.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < MIN_DISTANCE && distance > 0) {
            const adjustment = (MIN_DISTANCE - distance) / 2;
            const angle = Math.atan2(dy, dx);

            // Move both nodes apart
            const moveX = Math.cos(angle) * adjustment;
            const moveY = Math.sin(angle) * adjustment;

            nodeA.updatePosition(
              nodeA.position.x + moveX,
              nodeA.position.y + moveY
            );
            nodeB.updatePosition(
              nodeB.position.x - moveX,
              nodeB.position.y - moveY
            );

            maxAdjustment = Math.max(maxAdjustment, adjustment);
          }
        }
      }
      this.updateEdges();
      // Update minimap after each optimization iteration
      this.minimap.update();

      // If adjustments are small enough, stop optimizing
      if (maxAdjustment < 0.5) break;
    }
  }

  deleteSelectedNode() {
    if (this.selectedNode) {
      this.deleteNode(this.selectedNode.id);
    }
  }

  updateTransform() {
    if (!this.canvas) return;

    this.canvas.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.scale})`;

    // Update edges without triggering minimap update
    this.updateEdges(true);

    // Update minimap separately
    if (this.minimap) {
      this.minimap.update();
    }
  }

  loadFromJSON(jsonString) {
    try {
      // Clear existing state
      this.nodes.clear();
      this.edges.clear();
      this.canvas.innerHTML = "";
      this.selectedNode = null;

      // Parse the JSON data
      const projectData = JSON.parse(jsonString);

      // Restore project title
      this.projectTitle = projectData.projectTitle || "Untitled Project";
      document.getElementById("projectTitle").value = this.projectTitle;

      // Restore view state if it exists
      if (projectData.scale) this.scale = projectData.scale;
      if (projectData.offset) {
        this.offset = {
          x: projectData.offset.x || 150,
          y: projectData.offset.y || 150
        };
      }

      // First pass: Create all nodes
      projectData.nodes.forEach(nodeData => {
        // Create new node with basic data
        const node = new GraphNode(
          nodeData.id,
          nodeData.title,
          nodeData.subtitle,
          nodeData.notes,
          nodeData.position,
          nodeData.parentId
        );

        // Update result separately since it's not in constructor
        node.result = nodeData.result;

        // Update node to ensure visual state matches
        node.update({
          title: nodeData.title,
          subtitle: nodeData.subtitle,
          notes: nodeData.notes,
          result: nodeData.result
        });

        // Add node to collection and canvas
        this.nodes.set(nodeData.id, node);
        this.canvas.appendChild(node.element);
      });

      // Second pass: Create all edges
      const processedEdges = new Set();
      this.nodes.forEach(node => {
        if (node.parentId) {
          const parentNode = this.nodes.get(node.parentId);
          if (parentNode) {
            const edgeId = `${parentNode.id}-${node.id}`;
            if (!processedEdges.has(edgeId)) {
              this.addEdge(parentNode, node);
              processedEdges.add(edgeId);
            }
          }
        }
      });

      // Update transform and view
      this.updateTransform();

      // Center view on loaded content
      requestAnimationFrame(() => {
        this.centerView();
        if (this.minimap) {
          this.minimap.update();
        }
      });

    } catch (error) {
      console.error("Error loading project:", error);
      throw new Error(`Failed to load project: ${error.message}`);
    }
  }

  centerView() {
    if (this.nodes.size === 0) return;

    const bounds = this.getBounds();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();

    // Calculate the center of the content
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const contentCenterX = bounds.minX + contentWidth / 2;
    const contentCenterY = bounds.minY + contentHeight / 2;

    // Calculate required offset to center content
    this.offset.x = containerRect.width / 2 - contentCenterX * this.scale;
    this.offset.y = containerRect.height / 2 - contentCenterY * this.scale;

    this.updateTransform();
  }

  getBounds() {
    if (this.nodes.size === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const positions = Array.from(this.nodes.values()).map(node => node.position);
    const nodeSize = 150; // Account for node size
    const padding = 50; // Add padding

    return {
      minX: Math.min(...positions.map(p => p.x)) - nodeSize / 2 - padding,
      maxX: Math.max(...positions.map(p => p.x)) + nodeSize / 2 + padding,
      minY: Math.min(...positions.map(p => p.y)) - nodeSize / 2 - padding,
      maxY: Math.max(...positions.map(p => p.y)) + nodeSize / 2 + padding
    };
  }

  loadFromJSON(jsonString) {
    try {
      // Clear existing state
      this.nodes.clear();
      this.edges.clear();
      this.canvas.innerHTML = "";
      this.selectedNode = null;

      // Parse the JSON data
      const projectData = JSON.parse(jsonString);

      // Restore project title
      this.projectTitle = projectData.projectTitle || "Untitled Project";
      document.getElementById("projectTitle").value = this.projectTitle;

      // Restore view state if it exists
      if (projectData.scale) this.scale = projectData.scale;
      if (projectData.offset) {
        this.offset = {
          x: projectData.offset.x || 150,
          y: projectData.offset.y || 150
        };
      }

      // First pass: Create all nodes
      projectData.nodes.forEach(nodeData => {
        // Create new node with basic data
        const node = new GraphNode(
          nodeData.id,
          nodeData.title,
          nodeData.subtitle,
          nodeData.notes,
          nodeData.position,
          nodeData.parentId
        );

        // Update result separately since it's not in constructor
        node.result = nodeData.result;

        // Update node to ensure visual state matches
        node.update({
          title: nodeData.title,
          subtitle: nodeData.subtitle,
          notes: nodeData.notes,
          result: nodeData.result
        });

        // Add node to collection and canvas
        this.nodes.set(nodeData.id, node);
        this.canvas.appendChild(node.element);
      });

      // Second pass: Create all edges
      const processedEdges = new Set();
      this.nodes.forEach(node => {
        if (node.parentId) {
          const parentNode = this.nodes.get(node.parentId);
          if (parentNode) {
            const edgeId = `${parentNode.id}-${node.id}`;
            if (!processedEdges.has(edgeId)) {
              this.addEdge(parentNode, node);
              processedEdges.add(edgeId);
            }
          }
        }
      });

      // Update transform and view
      this.updateTransform();

      // Center view on loaded content
      requestAnimationFrame(() => {
        this.centerView();
        if (this.minimap) {
          this.minimap.update();
        }
      });

    } catch (error) {
      console.error("Error loading project:", error);
      throw new Error(`Failed to load project: ${error.message}`);
    }
  }

  saveToJSON() {
    const projectData = {
      projectTitle: this.projectTitle,
      nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
      scale: this.scale,
      offset: this.offset
    };
    return JSON.stringify(projectData, null, 2);
  }

  // Helper method to sort nodes by hierarchy
  sortNodesByHierarchy(nodesData) {
    const nodeMap = new Map(nodesData.map(node => [node.id, node]));
    const sorted = [];
    const visited = new Set();

    const visit = (nodeData) => {
      if (visited.has(nodeData.id)) return;
      visited.add(nodeData.id);

      // First process parent if it exists
      if (nodeData.parentId && nodeMap.has(nodeData.parentId)) {
        visit(nodeMap.get(nodeData.parentId));
      }

      sorted.push(nodeData);
    };

    // Process all nodes
    nodesData.forEach(nodeData => {
      if (!visited.has(nodeData.id)) {
        visit(nodeData);
      }
    });

    return sorted;
  }
}
