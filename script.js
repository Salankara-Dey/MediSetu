/***********************
 * DATA (FILE-BASED LOAD)
 ***********************/
let medicines = [];
let selectedMedicine = null;

/***********************
 * LOAD DATA FROM JSON
 ***********************/
async function loadMedicinesFromFile() {
  try {
    const response = await fetch("medicines.json");
    medicines = await response.json();
    refreshTable();
    updateAIAlert();
    updateExpiryAlerts();
  } catch (error) {
    console.error("Failed to load medicines file:", error);
  }
}

/***********************
 * TABLE LOAD
 ***********************/
function loadTable() {
  const table = document.getElementById("medicineTable");

  medicines.forEach(med => {
    const row = table.insertRow();

    if (med.riskScore >= 8) row.classList.add("danger-row");

    // Medicine name
    row.insertCell(0).innerText = med.name;

    // Expiry with color
    const expiryLevel = getExpiryLevel(med.expiry);
    row.insertCell(1).innerHTML =
      `<span class="pill ${expiryLevel}">${med.expiry} days</span>`;

    // Temp Status
    row.insertCell(2).innerHTML =
      med.tempStatus === "Unsafe"
        ? `<span class="pill critical">Critical</span>`
        : `<span class="pill safe">Safe</span>`;

    // Risk Score
    med.riskScore = calculateRiskScore(med);
    row.insertCell(3).innerText = med.riskScore;

    // Availability
    row.insertCell(4).innerHTML =
      med.status === "Available"
        ? `<span class="pill safe">Available</span>`
        : `<span class="pill critical">Reserved</span>`;

    // ACTION BUTTON (Request / Reserved)
    let actionCell = row.insertCell(5);
    let btn = document.createElement("button");
    if (med.status === "Available") {
      btn.innerText = "Request";
      btn.classList.add("primary-btn");
      btn.onclick = () => openModal(med);
    } else {
      btn.innerText = "Reserved";
      btn.disabled = true;
    }
    actionCell.appendChild(btn);

    // AI Recommendation
    row.insertCell(6).innerText = generateAIMessage(med);
  });

  updateStats();
}

/***********************
 * REFRESH TABLE
 ***********************/
function refreshTable() {
  const table = document.getElementById("medicineTable");
  table.innerHTML = `
    <tr>
      <th>Medicine</th>
      <th>Expiry</th>
      <th>Temp Status</th>
      <th>Risk Score</th>
      <th>Status</th>
      <th>Action</th>
      <th>AI Recommendation</th>
    </tr>
  `;
  loadTable();
}

/***********************
 * SEARCH
 ***********************/
function searchMedicines() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.getElementById("medicineTable").rows;

  for (let i = 1; i < rows.length; i++) {
    rows[i].style.display = rows[i].innerText.toLowerCase().includes(input)
      ? ""
      : "none";
  }
}

/***********************
 * ANALYTICS
 ***********************/
function updateStats() {
  document.getElementById("stats").innerText =
    medicines.filter(m => m.status !== "Available").length;
}

/***********************
 * AI RISK SCORING
 ***********************/
function calculateRiskScore(med) {
  let score = 0;
  if (med.expiry <= 7) score += 5;
  else if (med.expiry <= 30) score += 3;
  else score += 1;

  if (med.tempStatus === "Unsafe") score += 4;

  if (isHighDemand(med.name)) score += 2;

  return Math.min(score, 10);
}

function isHighDemand(name) {
  const highDemand = ["Insulin (Human)", "COVID-19 Vaccine", "MMR Vaccine"];
  return highDemand.some(med => name.includes(med));
}

/***********************
 * AI RECOMMENDATION
 ***********************/
function generateAIMessage(med) {
  if (med.riskScore >= 8)
    return "⚠ High risk of wastage. Immediate redistribution recommended.";
  if (med.expiry <= 7)
    return "⏳ Expiring soon. Suggest nearby redistribution.";
  if (med.tempStatus === "Unsafe")
    return "🌡 Temperature breach detected. Cold-chain attention required.";
  return "✅ Stock is safe.";
}

function updateAIAlert() {
  const critical = medicines.find(m => m.riskScore >= 8);
  if (!critical) return;

  document.querySelector(".alert strong").innerText =
    "AI Alert: High Wastage Risk";
  document.querySelector(".alert p").innerText =
    generateAIMessage(critical);
}

/***********************
 * EXPIRY ALERT DROPDOWN (≤ 7 DAYS)
 ***********************/
function updateExpiryAlerts() {
  const alertBox = document.getElementById("notificationBox");
  const criticalMeds = medicines.filter(m => m.expiry <= 7);

  alertBox.innerHTML = "<strong>Critical Expiry Alerts</strong>";

  if (criticalMeds.length === 0) {
    alertBox.innerHTML += "<p>No medicines expiring in 7 days</p>";
    return;
  }

  criticalMeds.forEach(m => {
    alertBox.innerHTML += `<p>⚠ ${m.name} — expires in ${m.expiry} days</p>`;
  });
}

/***********************
 * ALERT BUTTON
 ***********************/
function openNotifications() {
  hideAllDropdowns();
  updateExpiryAlerts();
  document.getElementById("notificationBox").style.display = "block";
}

/***********************
 * SETTINGS BUTTON
 ***********************/
function openSettings() {
  hideAllDropdowns();
  document.getElementById("settingsBox").style.display = "block";
}

/***********************
 * PROFILE BUTTON
 ***********************/
function openProfile() {
  hideAllDropdowns();
  document.getElementById("profileBox").style.display = "block";
}

/***********************
 * HIDE ALL DROPDOWNS
 ***********************/
function hideAllDropdowns() {
  ["notificationBox", "settingsBox", "profileBox"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

document.addEventListener("click", e => {
  if (
    !e.target.closest("#notificationBox") &&
    !e.target.closest("#settingsBox") &&
    !e.target.closest(".nav-right")
  ) {
    hideAllDropdowns();
  }
});

/***********************
 * MODAL FOR REQUEST
 ***********************/
function openModal(med) {
  selectedMedicine = med;
  const modal = document.getElementById("modal");
  modal.style.display = "flex";

  document.getElementById("modalMedicineName").innerText = med.name;
  document.getElementById("modalExpiry").innerText = med.expiry;
  document.getElementById("modalRiskScore").innerText = med.riskScore;
  document.getElementById("modalRiskLabel").innerText =
    med.riskScore >= 8 ? "Critical" : "Warning";
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
}

function confirmRequest() {
  if (!selectedMedicine) return;
  selectedMedicine.status = "Reserved";
  closeModal();
  refreshTable();
}

/***********************
 * EXPIRY COLORS
 ***********************/
function getExpiryLevel(days) {
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "notice";
  return "safe";
}

/***********************
 * BLYNK REAL-TIME TEMP (OPTIONAL)
 ***********************/
const BLYNK_TOKEN = "O_99-ewWBAop_gdx5ADa4PekLYtCYnHq";
const TEMP_PIN = "V0";

function fetchTemperatureFromBlynk() {
  fetch(`https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&pin=${TEMP_PIN}`)
    .then(res => res.text())
    .then(temp => {
      document.getElementById("liveTemp").innerText = `${temp} °C`;
      document.getElementById("tempStatus").innerText =
        temp < 2 || temp > 8 ? "❌ Risk" : "✅ Safe";
    });
}
setInterval(fetchTemperatureFromBlynk, 5000);

/***********************
 * INITIAL LOAD
 ***********************/
loadMedicinesFromFile();
