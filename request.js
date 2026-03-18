let selectedInventoryItem = null;

window.onload = function () {
  const params = new URLSearchParams(window.location.search);
  const medicineName = params.get("medicine");

  const inventories =
    JSON.parse(localStorage.getItem("storeInventories")) || [];

  // Only approved medicines visible to user
  selectedInventoryItem = inventories.find(
    item =>
      item.medicine === medicineName &&
      item.approved === true &&
      item.quantity > 0
  );

  if (!selectedInventoryItem) {
    alert("Medicine not available or not approved.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("medicineName").value =
    selectedInventoryItem.medicine;

  document.getElementById("availableQty").value =
    selectedInventoryItem.quantity;
};

function submitRequest() {
  const qty = parseInt(document.getElementById("quantity").value);
  const requester = document.getElementById("requester").value;

  if (!qty || !requester) {
    alert("Please fill all fields.");
    return;
  }

  if (qty > selectedInventoryItem.quantity) {
    alert("Requested quantity exceeds available stock.");
    return;
  }

  const requests =
    JSON.parse(localStorage.getItem("medicineRequests")) || [];

  const newRequest = {
    id: Date.now(),
    medicine: selectedInventoryItem.medicine,
    quantity: qty,
    requester: requester,
    store: selectedInventoryItem.store,
    status: "Pending",
    requestedAt: new Date().toISOString()
  };

  requests.push(newRequest);
  localStorage.setItem("medicineRequests", JSON.stringify(requests));

  document.getElementById("successMsg").style.display = "block";

  document.getElementById("quantity").value = "";
  document.getElementById("requester").value = "";
}
