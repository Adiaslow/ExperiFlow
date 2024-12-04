export class GraphNode {
  constructor(
    id,
    title = "New Hypothesis",
    subtitle = "",
    notes = "",
    position = null,
    parentId = null,
  ) {
    this.id = id;
    this.title = title;
    this.subtitle = subtitle;
    this.notes = notes;
    this.position = position || { x: 200, y: 200 }; // Ensure position has a default value
    this.result = null;
    this.parentId = parentId;
    this.isOpen = false;
    this.element = this.createElement();
  }

  createElement() {
    const element = document.createElement("div");
    element.className = "node";
    element.id = `node-${this.id}`;

    element.innerHTML = `
            <div class="delete-node">×</div>
            <div class="title">${this.title}</div>
            <div class="subtitle">${this.subtitle}</div>
            <div class="add-child">+</div>
        `;

    // Store the element first
    this.element = element;

    // Now update position after element is stored
    this.updatePosition(this.position.x, this.position.y);
    this.setupDragHandlers(element);
    this.setupDeleteHandler(element);
    this.setupAddChildHandler(element);
    this.setupClickHandler(element);

    return element;
  }

  update(data) {
    Object.assign(this, data);
    this.element.querySelector(".title").textContent = this.title;
    this.element.querySelector(".subtitle").textContent = this.subtitle;

    // Preserve the selected class if it exists
    const wasSelected = this.element.classList.contains('selected');

    // Set the base classes
    this.element.className = `node ${this.result === true
      ? "true"
      : this.result === false
        ? "false"
        : this.result === null
          ? "null"
          : ""
      }`;

    // Re-add selected class if it was present
    if (wasSelected) {
      this.element.classList.add('selected');
    }
  }

  open() {
    this.isOpen = true;
    this.element.classList.add("selected");
    // Update sidebar inputs
    document.getElementById("nodeTitle").value = this.title || "";
    document.getElementById("nodeSubtitle").value = this.subtitle || "";
    document.getElementById("nodeNotes").value = this.notes || "";
  }

  close() {
    this.isOpen = false;
    this.element.classList.remove("selected");
    // Clear sidebar inputs
    document.getElementById("nodeTitle").value = "";
    document.getElementById("nodeSubtitle").value = "";
    document.getElementById("nodeNotes").value = "";
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      subtitle: this.subtitle,
      notes: this.notes,
      position: this.position,
      result: this.result,
      parentId: this.parentId,
    };
  }

  setupClickHandler(element) {
    element.addEventListener("click", (e) => {
      // Ignore clicks on buttons
      if (
        e.target.classList.contains("add-child") ||
        e.target.classList.contains("delete-node")
      ) {
        return;
      }

      // Get flowchart instance
      const flowChart = window.flowChart; // Assuming flowChart is stored globally

      if (!this.isOpen) {
        flowChart.selectNode(this);
      }
    });
  }

  setupDragHandlers(element) {
    let isDragging = false;
    let startX, startY;

    element.addEventListener("mousedown", (e) => {
      if (
        e.target.classList.contains("add-child") ||
        e.target.classList.contains("delete-node")
      ) {
        return;
      }
      isDragging = true;
      const canvas = document.getElementById("canvas");
      const scale = parseFloat(
        canvas.style.transform.match(/scale\((.*?)\)/)?.[1] || 1,
      );
      const translateX = parseFloat(
        canvas.style.transform.match(/translate\((.*?)px/)?.[1] || 0,
      );
      const translateY = parseFloat(
        canvas.style.transform.match(
          /translate\(.*?,\s*(.*?)px/,
        )?.[1] || 0,
      );

      startX = (e.clientX - translateX) / scale - this.position.x;
      startY = (e.clientY - translateY) / scale - this.position.y;
      element.style.zIndex = "1000";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const canvas = document.getElementById("canvas");
      const scale = parseFloat(
        canvas.style.transform.match(/scale\((.*?)\)/)?.[1] || 1,
      );
      const translateX = parseFloat(
        canvas.style.transform.match(/translate\((.*?)px/)?.[1] || 0,
      );
      const translateY = parseFloat(
        canvas.style.transform.match(
          /translate\(.*?,\s*(.*?)px/,
        )?.[1] || 0,
      );

      const newX = (e.clientX - translateX) / scale - startX;
      const newY = (e.clientY - translateY) / scale - startY;

      this.updatePosition(newX, newY);
      document.dispatchEvent(
        new CustomEvent("nodeMove", {
          detail: { nodeId: this.id },
        }),
      );
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.style.zIndex = "";
      }
    });
  }

  setupDeleteHandler(element) {
    const deleteButton = element.querySelector(".delete-node");
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      document.dispatchEvent(
        new CustomEvent("deleteNode", {
          detail: { nodeId: this.id },
        }),
      );
    });
  }

  setupAddChildHandler(element) {
    const addChildButton = element.querySelector(".add-child");
    addChildButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const offset = 200;
      const childX = this.position.x;
      const childY = this.position.y + offset;

      document.dispatchEvent(
        new CustomEvent("addChild", {
          detail: {
            parentId: this.id,
            position: { x: childX, y: childY },
          },
        }),
      );
    });
  }

  updatePosition(x, y) {
    this.position = { x, y };
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }


}
