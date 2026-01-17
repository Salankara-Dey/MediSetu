/***********************
 * DATA (FILE-BASED LOAD)
 ***********************/
let medicines = [];

/***********************
 * EMAILJS INITIALIZATION
 ***********************/
(function () {
  emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your EmailJS public key
})();

/***********************
 * LOAD DATA FROM JSON
 ***********************/
async function loadMedicinesFromFile() {
  try {
    const response = await fetch("medicines.json");
    medicines = await response.json();
    refreshTable();
    updateAIAlert();
    updateExpiryAlerts(); // initial load
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

    // Blink if high risk
    if (med.riskScore >= 8) row.classList.add("danger-row", "blinking-row");

    row.insertCell(0).innerText = med.name;

    const expiryLevel = getExpiryLevel(med.expiry);
    row.insertCell(1).innerHTML = `<span class="pill ${expiryLevel}">${med.expiry} days</span>`;

    row.insertCell(2).innerHTML =
      med.tempStatus === "Unsafe"
        ? `<span class="pill critical">Critical</span>`
        : `<span class="pill safe">Safe</span>`;

    med.riskScore = calculateRiskScore(med);
    row.insertCell(3).innerText = med.riskScore;

    row.insertCell(4).innerHTML =
      med.status === "Available"
        ? `<span class="pill safe">Available</span>`
        : `<span class="pill critical">Reserved</span>`;

    row.insertCell(5).innerHTML =
      med.status === "Available"
        ? `<a class="primary-btn" href="request.html?medicine=${encodeURIComponent(med.name)}">Request</a>`
        : `<button disabled>Reserved</button>`;

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
    rows[i].style.display =
      rows[i].innerText.toLowerCase().includes(input) ? "" : "none";
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
 * BLYNK REAL-TIME TEMPERATURE
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
 * AI MODEL: RISK SCORING
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
  return ["Insulin (Human)", "COVID-19 Vaccine", "MMR Vaccine"].some(med => name.includes(med));
}

/***********************
 * AI ALERT (TOP BANNER)
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
 * ALERT / DROPDOWN BUTTONS
 ***********************/
function openNotifications() {
  hideAllDropdowns();
  updateExpiryAlerts();
  sendExpiryEmailAlert(); // trigger email alert if critical
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

document.addEventListener("click", e => {
  if (!e.target.closest(".nav-right")) hideAllDropdowns();
});

/***********************
 * EXPIRY PILL COLORS
 ***********************/
function getExpiryLevel(days) {
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "notice";
  return "safe";
}

/***********************
 * LOGIN HANDLING
 ***********************/
function handleRoleChange() {
  const role = document.getElementById("role").value;
  document.getElementById("medicineField").style.display =
    role === "user" ? "block" : "none";
}

function login() {
  const name = document.getElementById("name").value;
  const location = document.getElementById("location").value;
  const role = document.getElementById("role").value;

  if (!name || !location || !role) {
    alert("Please fill all fields");
    return;
  }

  localStorage.setItem("role", role);
  localStorage.setItem("name", name);
  localStorage.setItem("location", location);

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
}

/***********************
 * EMAIL ALERT FOR CRITICAL EXPIRY
 ***********************/
function sendExpiryEmailAlert() {
  const criticalMeds = medicines.filter(m => m.expiry <= 7);

  if (criticalMeds.length === 0) return;

  const medicineList = criticalMeds
    .map(m => `${m.name} (expires in ${m.expiry} days)`)
    .join(", ");

  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    to_name: localStorage.getItem("name") || "Admin",
    location: localStorage.getItem("location") || "Unknown",
    medicines: medicineList,
    message: "Critical medicines nearing expiry detected"
  })
  .then(() => {
    console.log("✅ Expiry alert email sent");
  })
  .catch(err => {
    console.error("❌ Email failed:", err);
  });
}

/***********************
 * TEST EMAIL FUNCTION
 ***********************/
function sendTestEmail() {
  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    to_name: "Test User",
    location: "Test Location",
    medicines: "Test Medicine 1, Test Medicine 2",
    message: "This is a test alert from MediSetu."
  })
  .then(() => {
    alert("✅ Test email sent successfully!");
    console.log("Test email sent");
  })
  .catch(err => {
    alert("❌ Test email failed. Check console.");
    console.error("Test email error:", err);
  });
}

/***********************
 * INITIAL LOAD
 ***********************/
loadMedicinesFromFile();
