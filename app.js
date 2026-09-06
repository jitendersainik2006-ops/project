const state = {
  appointments: [],
  leads: [],
  stats: {}
};

const selectors = {
  nav: document.querySelector("#nav"),
  menuBtn: document.querySelector("#menuBtn"),
  themeToggle: document.querySelector("#themeToggle"),
  appointmentForm: document.querySelector("#appointmentForm"),
  appointmentMessage: document.querySelector("#appointmentMessage"),
  contactForm: document.querySelector("#contactForm"),
  contactMessage: document.querySelector("#contactMessage"),
  leadRows: document.querySelector("#leadRows"),
  leadSearch: document.querySelector("#leadSearch"),
  addDemoLead: document.querySelector("#addDemoLead"),
  totalAppointments: document.querySelector("#totalAppointments"),
  totalLeads: document.querySelector("#totalLeads"),
  convertedLeads: document.querySelector("#convertedLeads"),
  conversionRate: document.querySelector("#conversionRate")
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function renderStats() {
  selectors.totalAppointments.textContent = state.stats.totalAppointments || 0;
  selectors.totalLeads.textContent = state.stats.totalLeads || 0;
  selectors.convertedLeads.textContent = state.stats.convertedLeads || 0;
  selectors.conversionRate.textContent = `${state.stats.conversionRate || 0}%`;
}

function renderLeads() {
  const query = selectors.leadSearch.value.trim().toLowerCase();
  const filtered = state.leads.filter((lead) => {
    return [lead.name, lead.phone, lead.source, lead.interest, lead.stage]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  selectors.leadRows.innerHTML = filtered.map((lead) => `
    <tr>
      <td>${lead.name}</td>
      <td>${lead.phone}</td>
      <td>${lead.source}</td>
      <td>${lead.interest}</td>
      <td><span class="stage">${lead.stage}</span></td>
      <td>${formatCurrency(lead.value)}</td>
    </tr>
  `).join("");
}

async function loadDashboard() {
  const [stats, appointments, leads] = await Promise.all([
    requestJson("/api/stats"),
    requestJson("/api/appointments"),
    requestJson("/api/leads")
  ]);

  state.stats = stats;
  state.appointments = appointments;
  state.leads = leads;
  renderStats();
  renderLeads();
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#d92d20" : "var(--primary)";
}

selectors.menuBtn.addEventListener("click", () => {
  selectors.nav.classList.toggle("open");
});

selectors.themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "light" : "dark";
  selectors.themeToggle.textContent = isDark ? "Dark" : "Light";
});

selectors.nav.addEventListener("click", () => {
  selectors.nav.classList.remove("open");
});

selectors.leadSearch.addEventListener("input", renderLeads);

selectors.appointmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    showMessage(selectors.appointmentMessage, "Please fill all required fields correctly.", true);
    form.reportValidity();
    return;
  }

  try {
    await requestJson("/api/appointments", {
      method: "POST",
      body: JSON.stringify(getFormData(form))
    });
    form.reset();
    showMessage(selectors.appointmentMessage, "Appointment submitted successfully.");
    await loadDashboard();
  } catch (error) {
    showMessage(selectors.appointmentMessage, error.message, true);
  }
});

selectors.contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    await requestJson("/api/contact", {
      method: "POST",
      body: JSON.stringify(getFormData(form))
    });
    form.reset();
    showMessage(selectors.contactMessage, "Message saved successfully.");
  } catch (error) {
    showMessage(selectors.contactMessage, error.message, true);
  }
});

selectors.addDemoLead.addEventListener("click", async () => {
  const demoLead = {
    name: "New Website Lead",
    phone: "9000000000",
    source: "Landing Page",
    interest: "Smart CRM Demo",
    stage: "New",
    value: 25000
  };

  await requestJson("/api/leads", {
    method: "POST",
    body: JSON.stringify(demoLead)
  });
  await loadDashboard();
});

loadDashboard().catch((error) => {
  console.error(error);
});
