/************************************
 * STORE PAGE PROTECTION
 ************************************/
if (localStorage.getItem("role") !== "store") {
  window.location.href = "index.html";
}

let inventory = [];

/************************************
 * UPLOAD HANDLING
 ************************************/
function triggerUpload() {
  document.getElementById("fileInput").click();
}

document.getElementById("fileInput").addEventListener("change", uploadInventory);

function uploadInventory(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 🔹 ADDED (NON-DESTRUCTIVE): Excel file detection
  if (file.name.endsWith(".xlsx")) {
    uploadExcel(file);
    return; // stop CSV flow
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    const rows = evt.target.result.split("\n");
    inventory = [];

    for (let i = 1; i < rows.length; i++) {
      const c = rows[i].split(",");
      if (c.length < 4) continue;

      inventory.push({
        medicine: c[0].trim(),
        quantity: parseInt(c[1]),
        expiry: parseInt(c[2]),
        temp: c[3].trim()
      });
    }

    localStorage.setItem("storeInventory", JSON.stringify(inventory));

    renderInventory();
    syncToGlobalInventory();
  };

  reader.readAsText(file);
}

/************************************
 * RENDER INVENTORY
 ************************************/
function renderInventory() {
  const table = document.getElementById("inventoryTable");
  table.innerHTML = "";

  let critical = 0;
  let expiring = 0;

  inventory.forEach(item => {
    let status = "safe";

    if (item.expiry <= 7 || item.temp === "Critical") {
      status = "critical";
      critical++;
    } else if (item.expiry <= 30) {
      status = "warning";
      expiring++;
    }

    // 🔹 STEP 2: AUTO-REORDER CHECK (ADDED)
    const needsReorder = checkAutoReorder(item);

    // 🔹 EXISTING ALERT SYSTEM (UNCHANGED)
    checkAlerts(item);

    table.innerHTML += `
      <tr>
        <td>${item.medicine}</td>
        <td>${item.quantity}</td>
        <td>${item.expiry}</td>
        <td>${item.temp}</td>
        <td><span class="badge ${status}">${status.toUpperCase()}</span></td>
        <td>
          ${
            needsReorder
              ? `<button onclick="autoOrder('${item.medicine}')">Auto Order</button>`
              : "—"
          }
        </td>
      </tr>
    `;
  });

  document.getElementById("totalItems").innerText = inventory.length;
  document.getElementById("criticalCount").innerText = critical;
  document.getElementById("expiringSoon").innerText = expiring;
}

/************************************
 * NAVIGATION
 ************************************/
function exitToHome() {
  localStorage.removeItem("selectedMedicine");
  window.location.href = "index.html";
}

function goToDashboard() {
  window.location.href = "index.html?from=store";
}

/************************************
 * LOAD EXISTING INVENTORY
 ************************************/
const saved = JSON.parse(localStorage.getItem("storeInventory"));
if (saved) {
  inventory = saved;
  renderInventory();
}

/************************************
 * 🔹 ADD: SAVE TO GLOBAL INVENTORY
 ************************************/
function syncToGlobalInventory() {
  const global =
    JSON.parse(localStorage.getItem("storeInventories")) || [];

  inventory.forEach(item => {
    global.push({
      id: Date.now() + Math.random(),
      store: localStorage.getItem("name") || "Medical Store",
      medicine: item.medicine,
      quantity: item.quantity,
      expiryDays: item.expiry,
      temperatureRisk: item.temp,
      approved: false   // 🔴 Admin must approve
    });
  });

  localStorage.setItem("storeInventories", JSON.stringify(global));
}

/************************************
 * 🔹 ADD: ADMIN APPROVAL TOGGLE
 * (kept intentionally, even if unused)
 ************************************/
function toggleApprovalById(id) {
  const all =
    JSON.parse(localStorage.getItem("storeInventories")) || [];

  const item = all.find(i => i.id === id);
  if (!item) return;

  item.approved = !item.approved;

  localStorage.setItem("storeInventories", JSON.stringify(all));
  alert(`Inventory ${item.approved ? "APPROVED" : "UNAPPROVED"}`);
}

/************************************
 * 🔹 ADD: EXCEL UPLOAD SUPPORT
 ************************************/
function uploadExcel(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const wb = XLSX.read(e.target.result, { type: "binary" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach(r => {
      inventory.push({
        medicine: r.Medicine,
        quantity: r.Quantity,
        expiry: r.ExpiryDays,
        temp: r.Temperature
      });
    });

    localStorage.setItem("storeInventory", JSON.stringify(inventory));

    renderInventory();
    syncToGlobalInventory();
  };
  reader.readAsBinaryString(file);
}

/************************************
 * 🔹 ADD: STORE ALERTS
 ************************************/
function checkAlerts(item) {
  if (item.expiry <= 7 || item.temp === "Critical") {
    alert(`⚠ ALERT: ${item.medicine} is high risk`);
  }
}

/************************************
 * 🔹 STEP 2: AUTO RE-ORDER CHECK
 ************************************/
function checkAutoReorder(item) {
  if (item.quantity <= 0 || item.expiry <= 0) {
    return true;
  }
  return false;
}

/************************************
 * 🔹 STEP 4: AUTO ORDER ACTION
 ************************************/
function autoOrder(medicineName) {
  alert(
    `📦 AUTO ORDER PLACED\n\nMedicine: ${medicineName}\nSupplier notified.\nEstimated restock: 3 days.`
  );

  // Future scope:
  // - Supplier email
  // - Quantity prediction
  // - Admin notification
}
