document.addEventListener("DOMContentLoaded", function () {
  const socket = io();

  const entryLogs = document.getElementById("entryLogs");
  const exitLogs = document.getElementById("exitLogs");
  const entryAlert = document.getElementById("entryAlert");
  const exitAlert = document.getElementById("exitAlert");
  const dateFilter = document.getElementById("dateFilter");
  const filterBtn = document.getElementById("filterBtn");
  const resetBtn = document.getElementById("resetBtn");
  const downloadEntryBtn = document.getElementById("downloadEntryBtn");
  const downloadExitBtn = document.getElementById("downloadExitBtn");
  const usersList = document.getElementById("usersList");
  const addUserForm = document.getElementById("addUserForm");

  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateFilter.value = formattedDate;

  loadLogs();
  loadUsers();

  socket.on("newScan", function (data) {
    console.log("New scan received:", data);

    const scanDate = new Date(data.timestamp).toISOString().split("T")[0];
    const filterValue = dateFilter.value;

    if (!filterValue || scanDate === filterValue) {
      if (data.readerType === "entry") {
        showAlert(entryAlert, data, "entry-alert");
        addLogToTable(entryLogs, data);
      } else if (data.readerType === "exit") {
        showAlert(exitAlert, data, "exit-alert");
        addLogToTable(exitLogs, data);
      }
    }
  });

  filterBtn.addEventListener("click", function () {
    loadLogs();
  });

  resetBtn.addEventListener("click", function () {
    dateFilter.value = formattedDate;
    loadLogs();
  });

  downloadEntryBtn.addEventListener("click", function () {
    downloadLogs("entry");
  });

  downloadExitBtn.addEventListener("click", function () {
    downloadLogs("exit");
  });

  addUserForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const uidValue = document.getElementById("uid").value.trim();
    const nameValue = document.getElementById("name").value.trim();
    const regNoValue = document.getElementById("regNo").value.trim();

    addUser(uidValue, nameValue, regNoValue);
  });

  function loadLogs() {
    const date = dateFilter.value;

    entryLogs.innerHTML = "";
    exitLogs.innerHTML = "";

    entryAlert.innerHTML = "<p>Waiting for entry scans...</p>";
    exitAlert.innerHTML = "<p>Waiting for exit scans...</p>";
    document.querySelector(".entry-alert").classList.remove("active");
    document.querySelector(".exit-alert").classList.remove("active");

    fetch(`/api/logs?date=${date}&readerType=entry`)
      .then((response) => response.json())
      .then((data) => {
        data.forEach((log) => {
          addLogToTable(entryLogs, {
            name: log.name,
            regNo: log.regNo,
            timestamp: new Date(log.timestamp).toLocaleString(),
            authorized: log.authorized,
          });
        });
      })
      .catch((error) => console.error("Error fetching entry logs:", error));

    fetch(`/api/logs?date=${date}&readerType=exit`)
      .then((response) => response.json())
      .then((data) => {
        data.forEach((log) => {
          addLogToTable(exitLogs, {
            name: log.name,
            regNo: log.regNo,
            timestamp: new Date(log.timestamp).toLocaleString(),
            authorized: log.authorized,
          });
        });
      })
      .catch((error) => console.error("Error fetching exit logs:", error));
  }

  function loadUsers() {
    fetch("/api/users")
      .then((response) => response.json())
      .then((data) => {
        usersList.innerHTML = "";
        data.forEach((user) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>${user.uid}</td>
                        <td>${user.name}</td>
                        <td>${user.uid}</td>
                        <td>${user.name}</td>
                        <td>${user.regNo}</td>
                    `;
          usersList.appendChild(row);
        });
      })
      .catch((error) => console.error("Error fetching users:", error));
  }

  function addUser(uid, name, regNo) {
    fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        name,
        regNo,
      }),
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("Failed to add user");
      })
      .then((data) => {
        document.getElementById("uid").value = "";
        document.getElementById("name").value = "";
        document.getElementById("regNo").value = "";

        loadUsers();

        alert(`User ${name} added successfully!`);
      })
      .catch((error) => {
        console.error("Error adding user:", error);
        alert("Failed to add user. Please try again.");
      });
  }

  function addLogToTable(tableBody, data) {
    const row = document.createElement("tr");
    row.className = "highlight";

    row.innerHTML = `
            <td>${data.name}</td>
            <td>${data.regNo}</td>
            <td>${formatTimestamp(data.timestamp)}</td>
            <td class="${
              data.authorized ? "status-authorized" : "status-unauthorized"
            }">
                ${data.authorized ? "Authorized ✓" : "Unauthorized ✗"}
            </td>
        `;

    tableBody.insertBefore(row, tableBody.firstChild);
  }

  function showAlert(alertElement, data, alertClass) {
    const alertContainer = alertElement.closest(`.${alertClass}`);

    alertElement.innerHTML = `
            <p><strong>${data.name}</strong> (${data.regNo}) has been ${
      data.authorized ? "authorized" : "denied"
    }</p>
            <p>Time: ${formatTimestamp(data.timestamp)}</p>
        `;
    alertContainer.classList.add("active");

    setTimeout(() => {
      alertContainer.classList.remove("active");
    }, 5000);
  }

  // Function to download logs
  function downloadLogs(readerType) {
    const date = dateFilter.value;
    window.location.href = `/api/logs/download?date=${date}&readerType=${readerType}`;
  }

  // Function to format timestamp
  function formatTimestamp(timestamp) {
    if (typeof timestamp === "string") {
      // If already formatted as string, return as is
      return timestamp;
    }

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
});
