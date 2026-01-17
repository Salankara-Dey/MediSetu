function handleRoleChange() {
  const role = document.getElementById("role").value;
  const medicineField = document.getElementById("medicineField");

  // Show medicine ONLY for user
  medicineField.style.display = role === "user" ? "block" : "none";
}

function login() {
  const name = document.getElementById("name").value;
  const location = document.getElementById("location").value;
  const role = document.getElementById("role").value;
  const medicine = document.getElementById("medicine")?.value;

  if (!name || !location || !role) {
    alert("Please fill all required fields");
    return;
  }

  let message = `Logged in as ${role.toUpperCase()} from ${location}`;

  if (role === "user") {
    message += ` | Medicine needed: ${medicine || "Not specified"}`;
  }

  document.getElementById("result").innerText = message;
}
