/************************************
 * 🔒 STORE PAGE PROTECTION
 ************************************/
if (localStorage.getItem("role") !== "store") {
  window.location.href = "index.html";
}

/************************************
 * INVENTORY UPLOAD
 ************************************/
function uploadInventory() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) {
    alert("Please select a CSV file");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split("\n");
    const inventory = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 4) continue;

      inventory.push({
        store: localStorage.getItem("name") || "Unknown Store",
        medicine: cols[0].trim(),
        quantity: parseInt(cols[1]),
        expiryDays: parseInt(cols[2]),
        temperatureRisk: cols[3].trim(),
        visibleToUsers: true
      });
    }

    // Save inventory globally
    const existing =
      JSON.parse(localStorage.getItem("storeInventories")) || [];

    localStorage.setItem(
      "storeInventories",
      JSON.stringify(existing.concat(inventory))
    );

    renderPreview(inventory);
    alert("✅ Inventory uploaded successfully");
  };

  reader.readAsText(file);
}

/************************************
 * PREVIEW TABLE
 ************************************/
function renderPreview(data) {
  const table = document.getElementById("inventoryPreview");
  table.innerHTML = "";

  data.forEach(item => {
    table.innerHTML += `
      <tr>
        <td>${item.medicine}</td>
        <td>${item.quantity}</td>
        <td>${item.expiryDays}</td>
        <td>${item.temperatureRisk}</td>
      </tr>
    `;
  });
}

/************************************
 * EXIT TO HOME
 ************************************/
function exitToHome() {
  window.location.href = "index.html";
}
/************************************
 * GO TO MAIN DASHBOARD
 ************************************/
function goToDashboard() {
  // Keep role and login info intact
  window.location.href = "index.html?from=store";
}

