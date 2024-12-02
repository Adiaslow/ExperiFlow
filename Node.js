class Node {
    constructor(
        id,
        title = "New Hypothesis",
        notes = "",
        position = { x: 200, y: 200 },
        parentId = null,
    ) {
        this.id = id;
        this.title = title;
        this.notes = notes;
        this.position = position;
        this.result = null;
        this.parentId = parentId;
        this.isOpen = false; // Add this line to track open state
        this.element = this.createElement();
    }

    createElement() {
        const element = document.createElement("div");
        element.className = "node";
        element.id = `node-${this.id}`;

        element.innerHTML = `
            <div class="delete-node">×</div>
            <div class="title">${this.title}</div>
            <div class="notes">${this.notes}</div>
            <div class="add-child">+</div>
        `;

        // Store the element first
        this.element = element;

        // Now update position after element is stored
        this.updatePosition(this.position.x, this.position.y);
        this.setupDragHandlers(element);
        this.setupDeleteHandler(element);
        this.setupAddChildHandler(element);
        this.setupClickHandler(element); // Add this line

        return element;
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

            // Toggle open state
            if (this.isOpen) {
                this.close();
                // Dispatch event to clear sidebar
                document.dispatchEvent(
                    new CustomEvent("nodeClosed", {
                        detail: { nodeId: this.id },
                    }),
                );
            } else {
                this.open();
                // Dispatch event to update sidebar
                document.dispatchEvent(
                    new CustomEvent("nodeSelected", {
                        detail: { nodeId: this.id },
                    }),
                );
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

    update(data) {
        Object.assign(this, data);
        this.element.querySelector(".title").textContent = this.title;
        this.element.querySelector(".notes").textContent = this.notes;
        this.element.className = `node ${
            this.result === true
                ? "true"
                : this.result === false
                  ? "false"
                  : this.result === null
                    ? "null"
                    : ""
        }`;
    }

    updatePosition(x, y) {
        this.position = { x, y };
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }

    open() {
        this.isOpen = true;
        this.element.classList.add("selected");
        // Update sidebar inputs
        document.getElementById("nodeTitle").value = this.title || "";
        document.getElementById("nodeNotes").value = this.notes || "";
    }

    close() {
        this.isOpen = false;
        this.element.classList.remove("selected");
        // Clear sidebar inputs
        document.getElementById("nodeTitle").value = "";
        document.getElementById("nodeNotes").value = "";
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            notes: this.notes,
            position: this.position,
            result: this.result,
            parentId: this.parentId,
        };
    }
}
