import { FlowChart } from "./FlowChart.js";

document.addEventListener("DOMContentLoaded", () => {
  const flowChart = new FlowChart();
  // Store flowChart instance globally for Node class to access
  window.flowChart = flowChart;

  // Menu handling
  const menuButton = document.querySelector(".menu-button");
  const menu = document.querySelector(".menu");
  menuButton.addEventListener("click", () => {
    menu.classList.toggle("visible");
  });

  // Add Node Button
  document.getElementById("addNode").addEventListener("click", () => {
    flowChart.addNode();
    const titleInput = document.getElementById("nodeTitle");
    titleInput.focus();
    titleInput.select();
  });

  // Organize and Settings radial menus
  document.getElementById('organize').addEventListener('click', function () {
    this.classList.toggle('active');
    document.getElementById('organizeMenu').classList.toggle('active');
    document.getElementById('settings').classList.remove('active');
    document.getElementById('settingsMenu').classList.remove('active');
  });

  document.getElementById('settings').addEventListener('click', function () {
    this.classList.toggle('active');
    document.getElementById('settingsMenu').classList.toggle('active');
    document.getElementById('organize').classList.remove('active');
    document.getElementById('organizeMenu').classList.remove('active');
  });

  document.addEventListener("click", (e) => {
    const menu = document.querySelector(".menu");
    const menuButton = document.querySelector(".menu-button");
    const sidebar = document.getElementById("sidebar");
    const organizeButton = document.getElementById("organize");
    const settingsButton = document.getElementById("settings");
    const organizeMenu = document.getElementById("organizeMenu");
    const settingsMenu = document.getElementById("settingsMenu");

    // Close radial menus if click is outside
    const isRadialMenuClick = e.target.closest('.radial-menu') ||
      e.target.id === 'organize' ||
      e.target.id === 'settings';

    if (!isRadialMenuClick) {
      organizeButton.classList.remove('active');
      settingsButton.classList.remove('active');
      organizeMenu.classList.remove('active');
      settingsMenu.classList.remove('active');
    }

    // Original menu and node handling code...
    if (!menu.contains(e.target) && !menuButton.contains(e.target)) {
      menu.classList.remove("visible");
    }

    if (!flowChart.isPanning) {
      const clickedOnNode = e.target.closest('.node');
      const clickedOnSidebar = sidebar.contains(e.target);
      const clickedOnMenu = menu.contains(e.target) || menuButton.contains(e.target);
      const clickedOnAddButton = e.target.id === "addNode";

      if (!clickedOnNode && !clickedOnSidebar && !clickedOnMenu && !clickedOnAddButton) {
        sidebar.classList.add("hidden");
        if (flowChart.selectedNode) {
          flowChart.selectedNode.close();
          flowChart.selectedNode = null;
          document.dispatchEvent(
            new CustomEvent("nodeClosed", {
              detail: { nodeId: null }
            })
          );
        }
      }
    }
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

  document.getElementById("nodeSubtitle").addEventListener("input", (e) => {
    if (flowChart.selectedNode) {
      flowChart.selectedNode.update({ subtitle: e.target.value });
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
  document.getElementById("saveProject").addEventListener("click", async () => {
    try {
      const data = flowChart.saveToJSON();

      // Generate filename based on project title and date
      const date = new Date().toISOString().split('T')[0];
      const sanitizedTitle = flowChart.projectTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `${sanitizedTitle}-${date}.json`;

      // Create and trigger download
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // Show success message (you'll need to add this element to your HTML)
      showNotification("Project saved successfully!", "success");
    } catch (error) {
      console.error("Error saving project:", error);
      showNotification("Failed to save project. Please try again.", "error");
    }
  });

  // Load Project
  document.getElementById("loadProject").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      showNotification("Please select a valid JSON file.", "error");
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // Validate JSON before loading
        JSON.parse(e.target.result); // This will throw if invalid JSON

        // Actually load the project
        await flowChart.loadFromJSON(e.target.result);

        // Center view on loaded content
        flowChart.centerView();

        showNotification("Project loaded successfully!", "success");
      } catch (error) {
        console.error("Error loading project:", error);
        showNotification("Failed to load project. The file might be corrupted.", "error");
      }
    };

    reader.onerror = () => {
      showNotification("Error reading file. Please try again.", "error");
    };

    reader.readAsText(file);
  });

  document.getElementById("loadButton").addEventListener("click", () => {
    document.getElementById("loadProject").click();
  });

  // Helper function to show notifications
  function showNotification(message, type = "info") {
    // First, remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        background-color: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
      `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById("saveProject").click();
    }

    // Ctrl/Cmd + O to load
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      document.getElementById("loadButton").click();
    }
  });
});
