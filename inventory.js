

/************************************
 * STORE PAGE PROTECTION
 ************************************/
if (localStorage.getItem("role") !== "store") {
  window.location.href = "index.html";
}

let inventory = [];
let extractedInventory = [];
/************************************
 * UPLOAD HANDLING
 ************************************/
function triggerUpload() {
  document.getElementById("fileInput").click();
}


window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fileInput").addEventListener("change", uploadInventory);
});

function uploadInventory(e) {

 const file = e.target.files[0];
 if (!file) return;

 const fileName = file.name.toLowerCase();

 console.log("File uploaded:", file.name);

 // IMAGE → OCR
 if (file.type.startsWith("image/")) {
   processImage(file);
   return;
 }

 // EXCEL
 if (fileName.endsWith(".xlsx")) {
   uploadExcel(file);
   return;
 }

 // CSV
 if (fileName.endsWith(".csv")) {
   uploadCSV(file);
   return;
 }

 alert("Unsupported file type");
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

async function processImage(file){

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async function(){

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img,0,0);

    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imageData.data;

    // Convert to grayscale + increase contrast
    for(let i=0;i<data.length;i+=4){
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;

      const enhanced = avg > 140 ? 255 : 0;

      data[i] = enhanced;
      data[i+1] = enhanced;
      data[i+2] = enhanced;
    }

    ctx.putImageData(imageData,0,0);

    const result = await Tesseract.recognize(canvas,'eng');

    const text = result.data.text;

    console.log("OCR TEXT:", text);

    convertToInventory(text);
    saveInventory();
  }
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


function convertToInventory(text){

  const lines = text.split("\n");
  extractedInventory = [];

  lines.forEach(line => {

    const cleaned = line.trim().replace(/\s+/g," ");
    const parts = cleaned.split(" ");

    if(parts.length >= 3){

      extractedInventory.push({
        medicine: parts[0],
        quantity: parseInt(parts[1]) || 1,
        expiry: parseInt(parts[2]) || 30
      });

    }

  });

  console.log("Extracted Inventory:", extractedInventory);
}


function saveInventory(){

 extractedInventory.forEach(med => {

  inventory.push({
    medicine: med.medicine,
    quantity: parseInt(med.quantity) || 0,
    expiry: parseInt(med.expiry) || 30,
    temp: "Normal"
  });

 });

 localStorage.setItem("storeInventory", JSON.stringify(inventory));

 renderInventory();
 syncToGlobalInventory();

 alert("Inventory saved successfully!");

}
function uploadCSV(file){

 const reader = new FileReader();

 reader.onload = function(evt){

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
