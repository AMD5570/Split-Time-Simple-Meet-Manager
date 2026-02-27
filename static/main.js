const API = "http://localhost:8000";

// ─── EVENTS ────────────────────────────────────────────

async function loadEvents() {
  const res = await fetch(`${API}/events`);
  const events = await res.json();

  const list = document.getElementById("eventList");
  list.innerHTML = "";

  for (const event of events) {
    // For each event, also fetch its swimmers
    const swRes = await fetch(`${API}/events/${event.id}/swimmers`);
    const swimmers = await swRes.json();
    renderEvent(event, swimmers);
  }
}

async function addEvent() {
  const name = document.getElementById("eventName").value.trim();
  const gender = document.getElementById("eventGender").value.trim();
  const heat = parseInt(document.getElementById("eventHeat").value);

  if (!name || !heat || !gender) {
    return alert("Please enter a name, gender, and heat number.");
  }

  await fetch(`${API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, gender, heat }),
  });

  // Clear the inputs and reload
  document.getElementById("eventName").value = "";
  document.getElementById("eventGender").value = "";
  document.getElementById("eventHeat").value = "";
  loadEvents();
}

async function deleteEvent(id) {
  if (!confirm("Delete this event and all its swimmers?")) return;
  await fetch(`${API}/events/${id}`, { method: "DELETE" });
  loadEvents();
}

// ─── RENDERING ─────────────────────────────────────────

function renderEvent(event, swimmers) {
  const isRelay = event.name.includes("Relay");
  const list = document.getElementById("eventList");

  // Create the card container
  const card = document.createElement("div");
  card.className = "event-card";
  card.id = `event-${event.id}`;

  card.innerHTML = `
    <h3>
    ${event.gender} ${event.name} - Heat ${event.heat}
    <button class="danger" onclick="deleteEvent(${event.id})">Delete Event</button>
    </h3>

    <!-- Swimmer table -->
    <table>
    <thead>
        <tr>
        <th>Lane</th>
        <th>Name</th>
        <th>Gender</th>
        <th>Team</th>
        <th>Seed Time</th>
        <th>Actual Time</th>
        <th></th>
        </tr>
    </thead>
    <tbody id="swimmers-${event.id}">
        ${swimmers.map((s) => swimmerRow(s, event.id)).join("")}
    </tbody>
    </table>

    <!-- Add swimmer form -->

  ${isRelay ? `
    <!-- Relay form: one lane, 4 swimmer name inputs -->

    <div class="form-row" style="margin-top: 0.75rem;">
      <input type="text"   id="sw-team-${event.id}"   placeholder="Team" style="width:100px" />
      <input type="number" id="sw-lane-${event.id}"   placeholder="Lane" style="width:60px" min="1" max="8" />
      <input type="text"   id="sw-seed-${event.id}"   placeholder="Seed time" style="width:90px" />
    </div>

    <div class="form-row">
      <input type="text" id="sw-name-${event.id}-1" placeholder="Swimmer 1 (back)" style="width:130px" />
      <input type="text" id="sw-name-${event.id}-2" placeholder="Swimmer 2 (breast)" style="width:130px" />
      <input type="text" id="sw-name-${event.id}-3" placeholder="Swimmer 3 (fly)" style="width:130px" />
      <input type="text" id="sw-name-${event.id}-4" placeholder="Swimmer 4 (free)" style="width:130px" />
      <button onclick="addSwimmer(${event.id}, true)">Add Lane</button>
    </div>

  ` : `
    <!-- Regular individual form -->

    <div class="form-row" style="margin-top: 0.75rem;">
      <input type="text"   id="sw-name-${event.id}"   placeholder="Name" style="width:130px" />
      <select id="sw-gender-${event.id}" style="width:150px">
        <option value="" disabled selected>- Male/Female -</option>
        <option>Male</option>
        <option>Female</option>
        <option>Other</option>
      </select>
      <input type="text"   id="sw-team-${event.id}"   placeholder="Team" style="width:100px" />
      <input type="number" id="sw-lane-${event.id}"   placeholder="Lane" style="width:60px" min="1" max="8" />
      <input type="text"   id="sw-seed-${event.id}"   placeholder="Seed time (e.g. 1:00.05)" style="width:170px" />
      <button onclick="addSwimmer(${event.id}, false)">Add Swimmer</button>
    </div>

  `}
`;

  list.appendChild(card);
}

// Returns the HTML string for a single swimmer row
function swimmerRow(s, eventId) {
  const nameCell = s.relay_order
    ? `<small style="opacity: 0.6">Swimmer ${s.relay_order}:</small> ${s.name}`  // show leg number for relays
    : s.name;

  return `
    <tr id="swimmer-${s.id}">
      <td>${s.lane}</td>
      <td>${nameCell}</td>
      <td>${s.gender}</td>
      <td>${s.team || "—"}</td>
      <td>${s.seed_time || "—"}</td>
      <td>
        <input
          type="text"
          value="${s.actual_time || ""}"
          placeholder="0:00.00"
          onchange="saveActualTime(${s.id}, this.value, '${s.name}', '${s.gender}', ${s.lane}, '${s.team || ""}', '${s.seed_time || ""}', ${eventId})"
        />
      </td>
      <td>
        <button class="danger" onclick="deleteSwimmer(${s.id})">Remove</button>
      </td>
    </tr>
  `;
}

// ─── SWIMMERS ──────────────────────────────────────────

async function addSwimmer(eventId, isRelay) {

  if (isRelay) {

    const gender = 'Mixed';
    const lane = parseInt(document.getElementById(`sw-lane-${eventId}`).value);

    if (!lane) {
      return alert("A lane is required.");
    }

    // go thru all relay swimmers
    for (let i = 1; i <= 4; i++) {

      const name = document.getElementById(`sw-name-${eventId}-${i}`).value.trim();

      if (!name) continue; // skip empty ones

      await fetch(`${API}/swimmers`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          name,
          gender,
          lane,
          team: document.getElementById(`sw-team-${eventId}`).value.trim() || null,
          seed_time: document.getElementById(`sw-seed-${eventId}`).value.trim() || null,
          actual_time: null,
          relay_order: i

        })
      });
    }
  } else {
    // if NOT relay
    const name = document.getElementById(`sw-name-${eventId}`).value.trim();
    const gender = document.getElementById(`sw-gender-${eventId}`).value.trim();
    const team = document.getElementById(`sw-team-${eventId}`).value.trim();
    const lane = parseInt(document.getElementById(`sw-lane-${eventId}`).value);
    const seed_time = document.getElementById(`sw-seed-${eventId}`).value.trim();

    if (!name || !lane) return alert("Name and lane are required.");

    await fetch(`${API}/swimmers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        name,
        gender,
        lane,
        team: team || null,
        seed_time: seed_time || null,
        actual_time: null,
      }),
    });
  }

  loadEvents();
}

async function saveActualTime(
  id,
  actual_time,
  name,
  gender,
  lane,
  team,
  seed_time,
  eventId,
) {
  await fetch(`${API}/swimmers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: eventId,
      name,
      gender,
      lane,
      team: team || null,
      seed_time: seed_time || null,
      actual_time: actual_time || null,
    }),
  });
}

async function deleteSwimmer(id) {
  await fetch(`${API}/swimmers/${id}`, { method: "DELETE" });
  // Just remove the row from the DOM instead of reloading everything
  document.getElementById(`swimmer-${id}`).remove();
}

// ─── START ─────────────────────────────────────────────
loadEvents();

// ─── EXPORT CSV ────────────────────────────────────────

async function exportCSV() {
  const res = await fetch(`${API}/events`);
  const events = await res.json();
  let date = new Date().toISOString().split("T")[0];

  // CSV header row
  let csv = "Event,Heat,Lane,Name,Gender,Team,Seed Time,Actual Time\n";

  for (const event of events) {
    const swRes = await fetch(`${API}/events/${event.id}/swimmers`);
    const swimmers = await swRes.json();

    if (swimmers.length === 0) {
      // Still include the event even if it has no swimmers
      csv += `"${event.name}",${event.heat},,,,\n`;
    } else {
      for (const s of swimmers) {
        // Wrap fields in quotes in case they contain commas
        csv += `"${event.name}",${event.heat},${s.lane},"${s.name}","${s.gender || ""}","${s.team || ""}","${s.seed_time || ""}","${s.actual_time || ""}"\n`;
      }
    }
  }

  // Trigger a download in the browser
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swim-meet-heatsheet-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── EXPORT PDF ────────────────────────────────────────

async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let date = new Date().toISOString().split("T")[0];

  const res = await fetch(`${API}/events`);
  const events = await res.json();

  let y = 15; // tracks vertical position on the page

  doc.setFontSize(16);
  doc.text("Swim Meet Heatsheet", 14, y);
  y += 8;
  doc.text(date, 14, y);
  y += 10;

  for (const event of events) {
    const swRes = await fetch(`${API}/events/${event.id}/swimmers`);
    const swimmers = await swRes.json();

    // Event heading
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${event.name} - Heat ${event.heat}`, 14, y);
    y += 6;

    // Swimmer table for this event
    doc.autoTable({
      startY: y,
      head: [["Lane", "Name", "Gender", "Team", "Seed Time", "Actual Time"]],
      body: swimmers.map((s) => [
        s.lane,
        s.name,
        s.gender,
        s.team || "-",
        s.seed_time || "-",
        s.actual_time || "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      // If no swimmers, show a placeholder row
      body:
        swimmers.length > 0
          ? swimmers.map((s) => [
              s.lane,
              s.name,
              s.gender,
              s.team || "-",
              s.seed_time || "-",
              s.actual_time || "-",
            ])
          : [["-", "No swimmers entered", "", "", ""]],
    });

    y = doc.lastAutoTable.finalY + 10;

    // If we're near the bottom of the page, add a new one
    if (y > 260) {
      doc.addPage();
      y = 15;
    }
  }

  doc.save(`swim-meet-heatsheet-${date}.pdf`);
}
