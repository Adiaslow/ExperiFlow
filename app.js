document.addEventListener("DOMContentLoaded", () => {
    const flowChart = new FlowChart();
    // Menu handling
    const menuButton = document.querySelector(".menu-button");
    const menu = document.querySelector(".menu");
    menuButton.addEventListener("click", () => {
        menu.classList.toggle("visible");
    });

    document.addEventListener("click", (e) => {
        const sidebar = document.getElementById("sidebar");
        const nodes = document.querySelectorAll(".node");
        let clickedOnNode = false;

        nodes.forEach((node) => {
            if (node.contains(e.target)) {
                clickedOnNode = true;
            }
        });

        if (!clickedOnNode && !sidebar.contains(e.target)) {
            // Close any open nodes
            nodes.forEach((node) => {
                if (node.classList.contains("selected")) {
                    const nodeInstance = flowChart.getNodeById(
                        node.id.replace("node-", ""),
                    );
                    if (nodeInstance) {
                        nodeInstance.close();
                    }
                }
            });
            // Hide sidebar
            sidebar.classList.remove("visible");
        }
    });

    // Add Node Button
    document.getElementById("addNode").addEventListener("click", () => {
        console.log("Adding a node");
        flowChart.addNode();
    });

    // Recenter button
    document.getElementById("recenterView").addEventListener("click", () => {
        flowChart.centerView();
    });

    // Node Title Input
    document.getElementById("nodeTitle").addEventListener("input", (e) => {
        if (flowChart.selectedNode) {
            flowChart.selectedNode.update({ title: e.target.value });
        }
    });

    // Node Notes Input
    document.getElementById("nodeNotes").addEventListener("input", (e) => {
        if (flowChart.selectedNode) {
            flowChart.selectedNode.update({ notes: e.target.value });
        }
    });

    document.getElementById("resultTrue").addEventListener("click", () => {
        if (flowChart.selectedNode) {
            flowChart.selectedNode.update({ result: true });
        }
    });

    document.getElementById("resultNull").addEventListener("click", () => {
        if (flowChart.selectedNode) {
            flowChart.selectedNode.update({ result: null });
        }
    });

    document.getElementById("resultFalse").addEventListener("click", () => {
        if (flowChart.selectedNode) {
            flowChart.selectedNode.update({ result: false });
        }
    });

    // Delete Button
    document.getElementById("deleteNode").addEventListener("click", () => {
        if (flowChart.selectedNode) {
            flowChart.deleteSelectedNode();
        }
    });

    // Save Project
    document.getElementById("saveProject").addEventListener("click", () => {
        const data = flowChart.saveToJSON();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "experiflow-project.json";
        a.click();
    });

    // Load Project
    document.getElementById("loadProject").addEventListener("change", (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            flowChart.loadFromJSON(e.target.result);
        };
        reader.readAsText(file);
    });

    document.getElementById("loadButton").addEventListener("click", () => {
        document.getElementById("loadProject").click();
    });
});
