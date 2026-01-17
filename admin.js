/*********************************
 * ADMIN AUTH (DEMO ONLY)
 *********************************/
if (window.location.pathname.includes("admin-dashboard")) {
  if (sessionStorage.getItem("adminLoggedIn") !== "true") {
    window.location.href = "admin-login.html";
  }
}

/*********************************
 * ADMIN CENTRAL LOCATION
 *********************************/
const ADMIN_LOCATION = {
  lat: 28.6139, // Example: District HQ (New Delhi)
  lng: 77.2090
};

/*********************************
 * DATA FROM STORE DASHBOARDS
 *********************************/
let stores = [
  { name: "Pharmacy A", location: "Sector 21", lat: 28.5355, lng: 77.3910, status: "Pending" },
  { name: "City Hospital Pharmacy", location: "MG Road", lat: 28.4595, lng: 77.0266, status: "Verified" }
];

let inventories = [
  {
    store: "Pharmacy A",
    medicine: "Insulin",
    quantity: 20,
    expiryDays: 25,
    temperatureRisk: "High",
    visibleToUsers: true
  },
  {
    store: "City Hospital Pharmacy",
    medicine: "COVID-19 Vaccine",
    quantity: 50,
    expiryDays: 10,
    temperatureRisk: "Critical",
    visibleToUsers: true
  }
];

/*********************************
 * LOCALSTORAGE ORGANIZATIONS + REQUESTS
 *********************************/
let organizations = JSON.parse(localStorage.getItem("organizations")) || [];
let medicineRequests = JSON.parse(localStorage.getItem("medicineRequests")) || [];

/*********************************
 * HAVERSINE DISTANCE LOGIC
 *********************************/
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

/*********************************
 * SMART PRIORITY ENGINE (ML)
 *********************************/
function calculateRisk(inv) {
  let score = 0;
  let reasons = [];

  // Expiry factor
  if (inv.expiryDays <= 7) {
    score += 50;
    reasons.push("Near expiry");
  } else if (inv.expiryDays <= 30) {
    score += 30;
    reasons.push("Expiring soon");
  }

  // Temperature factor
  if (inv.temperatureRisk === "Critical") {
    score += 30;
    reasons.push("Temperature breach");
  } else if (inv.temperatureRisk === "High") {
    score += 20;
    reasons.push("Temperature risk");
  }

  // Quantity factor
  if (inv.quantity <= 10) {
    score += 20;
    reasons.push("Low stock");
  }

  let level = "Safe";
  if (score >= 70) level = "Critical";
  else if (score >= 40) level = "Warning";

  return { score, level, reasons };
}

/*********************************
 * RENDER INVENTORY DASHBOARD
 *********************************/
function renderInventory() {
  const table = document.getElementById("inventoryTable");
  table.innerHTML = "";

  let critical = 0;
  let warning = 0;

  // Enrich with ML + Distance
  const enriched = inventories.map(inv => {
    const store = stores.find(s => s.name === inv.store);
    const distance = calculateDistance(
      ADMIN_LOCATION.lat,
      ADMIN_LOCATION.lng,
      store.lat,
      store.lng
    );
    const ml = calculateRisk(inv);

    return { ...inv, distance, ml };
  });

  // Sort: Critical first, then nearest
  enriched.sort((a, b) => b.ml.score - a.ml.score || a.distance - b.distance);

  enriched.forEach(item => {
    if (item.ml.level === "Critical") critical++;
    if (item.ml.level === "Warning") warning++;

    table.innerHTML += `
      <tr>
        <td>${item.medicine}</td>
        <td>${item.store}</td>
        <td>${item.distance}</td>
        <td>${item.expiryDays} days</td>
        <td>${item.temperatureRisk}</td>
        <td class="badge ${item.ml.level.toLowerCase()}">${item.ml.level}</td>
        <td>${item.ml.reasons.join(", ")}</td>
        <td>${item.visibleToUsers ? "Visible" : "Hidden"}</td>
        <td>
          <button onclick="toggleVisibility('${item.medicine}')">Toggle</button>
          <button class="secondary">Flag</button>
        </td>
      </tr>
    `;
  });

  // Update KPIs
  document.getElementById("criticalCount").innerText = critical;
  document.getElementById("warningCount").innerText = warning;
  document.getElementById("verifiedStores").innerText =
    stores.filter(s => s.status === "Verified").length;
}

/*********************************
 * TOGGLE USER VISIBILITY
 *********************************/
function toggleVisibility(medicine) {
  const inv = inventories.find(i => i.medicine === medicine);
  if (inv) inv.visibleToUsers = !inv.visibleToUsers;
  renderInventory();
}

/*********************************
 * ORGANIZATION MANAGEMENT
 *********************************/
function addOrganization(name, location, type) {
  organizations.push({ name, location: location.toLowerCase(), type });
  localStorage.setItem("organizations", JSON.stringify(organizations));
}

/*********************************
 * LOCATION-SAFE MATCHING
 *********************************/
function getLocationSafeMatches() {
  let matches = [];

  medicineRequests.forEach(req => {
    inventories.forEach(inv => {
      const store = stores.find(s => s.name === inv.store);
      if (
        inv.visibleToUsers &&
        req.medicine === inv.medicine &&
        store.location.toLowerCase() === req.location.toLowerCase()
      ) {
        matches.push({
          medicine: inv.medicine,
          quantity: req.quantity,
          requester: req.requester,
          matchedStore: store.name,
          location: store.location
        });
      }
    });
  });

  return matches;
}

function showLocationMatches() {
  const matches = getLocationSafeMatches();

  if (matches.length === 0) {
    alert("No location-safe redistribution possible");
    return;
  }

  console.log("✅ Location-Safe Matches:");
  matches.forEach(m => {
    console.log(
      `Medicine: ${m.medicine} | Qty: ${m.quantity} | From: ${m.matchedStore} | To: ${m.requester} | Location: ${m.location}`
    );
  });

  alert("Location-safe matches generated. Check console.");
}
// AI MODEL 2: Demand Forecasting
function forecastDemand(medicineName) {
  let requests =
    JSON.parse(localStorage.getItem("medicineRequests")) || [];

  const demandCount = requests.filter(
    r => r.medicine === medicineName
  ).length;

  if (demandCount >= 5) return "High";
  if (demandCount >= 2) return "Medium";
  return "Low";
}
console.log(
  "Predicted demand:",
  forecastDemand("Insulin (Human)")
);

/*********************************
 * INITIALIZE DASHBOARD
 *********************************/
renderInventory();

