let medicines = [];

/***********************
 * LOAD DATA
 ***********************/
async function loadMedicinesFromFile() {
  const res = await fetch("medicines.json");
  medicines = await res.json();
  refreshTable();
  updateExpiryAlerts();
}

/***********************
 * TABLE
 ***********************/
function loadTable() {
  const table = document.getElementById("medicineTable");

  medicines.forEach(med => {
    const row = table.insertRow();

    med.riskScore = calculateRiskScore(med);

    if (med.riskScore >= 8) row.classList.add("danger-row");
    if (med.expiry <= 3 || med.riskScore >= 9) row.classList.add("flash-row");

    row.insertCell(0).innerText = med.name;

    const expiryLevel = getExpiryLevel(med.expiry);
    row.insertCell(1).innerHTML =
      `<span class="pill ${expiryLevel}">${med.expiry} days</span>`;

    row.insertCell(2).innerHTML =
      med.tempStatus === "Unsafe"
        ? `<span class="pill critical">Critical</span>`
        : `<span class="pill safe">Safe</span>`;

    row.insertCell(3).innerText = med.riskScore;

    row.insertCell(4).innerHTML =
      `<span class="pill ${med.status === "Available" ? "safe" : "critical"}">${med.status}</span>`;

    row.insertCell(5).innerHTML =
      med.status === "Available"
        ? `<a class="primary-btn">Request</a>`
        : `<button disabled>Reserved</button>`;

    row.insertCell(6).innerText = generateAIMessage(med);
  });

  updateStats();
}

/***********************
 * REFRESH
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
    </tr>`;
  loadTable();
}

/***********************
 * NOTIFICATION + BADGE
 ***********************/
function updateExpiryAlerts() {
  const alerts = medicines.filter(m => m.expiry <= 7);
  const box = document.getElementById("notificationBox");
  const badge = document.getElementById("alertCount");

  box.innerHTML = "<strong>Critical Expiry Alerts</strong>";

  if (alerts.length === 0) {
    box.innerHTML += "<p>No critical alerts</p>";
    badge.style.display = "none";
    return;
  }

  alerts.forEach(m => {
    box.innerHTML += `<p>⚠ ${m.name} — ${m.expiry} days</p>`;
  });

  badge.innerText = alerts.length;
  badge.style.display = "inline-block";
}

/***********************
 * HELPERS
 ***********************/
function calculateRiskScore(med) {
  let score = 0;
  if (med.expiry <= 7) score += 5;
  if (med.tempStatus === "Unsafe") score += 4;
  return Math.min(score, 10);
}

function generateAIMessage(med) {
  if (med.riskScore >= 9) return "🚨 Immediate redistribution required";
  if (med.expiry <= 7) return "⏳ Expiring soon";
  return "✅ Stock stable";
}

function getExpiryLevel(days) {
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "safe";
}

function updateStats() {
  document.getElementById("stats").innerText =
    medicines.filter(m => m.status !== "Available").length;
}

/***********************
 * DROPDOWNS
 ***********************/
function openNotifications() {
  hideAllDropdowns();
  updateExpiryAlerts();
  document.getElementById("notificationBox").style.display = "block";
}
function openSettings() {
  hideAllDropdowns();
  document.getElementById("settingsBox").style.display = "block";
}
function openProfile() {
  hideAllDropdowns();
  document.getElementById("profileBox").style.display = "block";
}
function hideAllDropdowns() {
  ["notificationBox", "settingsBox", "profileBox"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

loadMedicinesFromFile();
