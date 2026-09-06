const state = {
  appointments: [],
  leads: [],
  stats: {},
  staticMode: false
};

const fallbackData = {
  appointments: [
    {
      id: "apt-demo-1",
      name: "Riya Sharma",
      phone: "9876543210",
      service: "Career Counselling",
      date: "2026-09-08",
      time: "10:30",
      status: "Confirmed",
      notes: "Interested in weekend batches"
    },
    {
      id: "apt-demo-2",
      name: "Aman Verma",
      phone: "9123456780",
      service: "Admission Discussion",
      date: "2026-09-09",
      time: "15:00",
      status: "Pending",
      notes: "Needs fee structure"
    }
  ],
  leads: [
    {
      id: "lead-demo-1",
      name: "Karan Singh",
      phone: "9988776655",
      source: "WhatsApp",
      interest: "Full Stack Course",
      stage: "New",
      value: 18000
    },
    {
      id: "lead-demo-2",
      name: "Meena Patel",
      phone: "9876501234",
      source: "Website",
      interest: "Data Analytics",
      stage: "Follow-up",
      value: 22000
    },
    {
      id: "lead-demo-3",
      name: "Harsh Saini",
      phone: "9012345678",
      source: "Referral",
      interest: "MERN Development",
      stage: "Converted",
      value: 30000
    }
  ]
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
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("Backend API is not available on this hosting.");
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

function readLocalData() {
  const stored = localStorage.getItem("smartCrmData");
  if (!stored) return structuredClone(fallbackData);

  try {
    return JSON.parse(stored);
  } catch {
    return structuredClone(fallbackData);
  }
}

function writeLocalData(data) {
  localStorage.setItem("smartCrmData", JSON.stringify(data));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function buildStats(data) {
  const revenue = data.leads.reduce((total, lead) => total + Number(lead.value || 0), 0);
  const converted = data.leads.filter((lead) => lead.stage === "Converted").length;
  const confirmed = data.appointments.filter((appointment) => appointment.status === "Confirmed").length;

  return {
    totalAppointments: data.appointments.length,
    confirmedAppointments: confirmed,
    totalLeads: data.leads.length,
    convertedLeads: converted,
    potentialRevenue: revenue,
    conversionRate: data.leads.length ? Math.round((converted / data.leads.length) * 100) : 0
  };
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
  try {
    const [stats, appointments, leads] = await Promise.all([
      requestJson("/api/stats"),
      requestJson("/api/appointments"),
      requestJson("/api/leads")
    ]);

    state.staticMode = false;
    state.stats = stats;
    state.appointments = appointments;
    state.leads = leads;
  } catch {
    const localData = readLocalData();
    state.staticMode = true;
    state.stats = buildStats(localData);
    state.appointments = localData.appointments;
    state.leads = localData.leads;
  }

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
    const appointment = getFormData(form);
    if (state.staticMode) {
      const localData = readLocalData();
      localData.appointments.unshift({
        id: createId("apt"),
        ...appointment,
        status: "Pending"
      });
      writeLocalData(localData);
    } else {
      await requestJson("/api/appointments", {
        method: "POST",
        body: JSON.stringify(appointment)
      });
    }
    form.reset();
    showMessage(selectors.appointmentMessage, state.staticMode ? "Appointment saved in browser demo mode." : "Appointment submitted successfully.");
    await loadDashboard();
  } catch (error) {
    showMessage(selectors.appointmentMessage, error.message, true);
  }
});

selectors.contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    if (state.staticMode) {
      const messages = JSON.parse(localStorage.getItem("smartCrmMessages") || "[]");
      messages.unshift({ id: createId("msg"), ...getFormData(form), createdAt: new Date().toISOString() });
      localStorage.setItem("smartCrmMessages", JSON.stringify(messages));
    } else {
      await requestJson("/api/contact", {
        method: "POST",
        body: JSON.stringify(getFormData(form))
      });
    }
    form.reset();
    showMessage(selectors.contactMessage, state.staticMode ? "Message saved in browser demo mode." : "Message saved successfully.");
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

  if (state.staticMode) {
    const localData = readLocalData();
    localData.leads.unshift({ id: createId("lead"), ...demoLead });
    writeLocalData(localData);
  } else {
    await requestJson("/api/leads", {
      method: "POST",
      body: JSON.stringify(demoLead)
    });
  }
  await loadDashboard();
});

loadDashboard().catch((error) => {
  console.error(error);
});
