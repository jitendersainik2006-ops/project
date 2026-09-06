const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4600;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function readDatabase() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDatabase(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function serveStatic(req, res) {
  const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
  const requestedPath = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
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

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/stats" && req.method === "GET") {
      sendJson(res, 200, buildStats(readDatabase()));
      return;
    }

    if (req.url === "/api/appointments" && req.method === "GET") {
      sendJson(res, 200, readDatabase().appointments);
      return;
    }

    if (req.url === "/api/appointments" && req.method === "POST") {
      const payload = await readBody(req);
      const required = ["name", "phone", "service", "date", "time"];
      const missing = required.filter((field) => !String(payload[field] || "").trim());
      if (missing.length) {
        sendJson(res, 400, { ok: false, message: `Missing fields: ${missing.join(", ")}` });
        return;
      }

      const data = readDatabase();
      const appointment = {
        id: createId("apt"),
        name: String(payload.name).trim(),
        phone: String(payload.phone).trim(),
        service: String(payload.service).trim(),
        date: String(payload.date).trim(),
        time: String(payload.time).trim(),
        status: "Pending",
        notes: String(payload.notes || "").trim()
      };
      data.appointments.unshift(appointment);
      writeDatabase(data);
      sendJson(res, 201, { ok: true, appointment });
      return;
    }

    if (req.url === "/api/leads" && req.method === "GET") {
      sendJson(res, 200, readDatabase().leads);
      return;
    }

    if (req.url === "/api/leads" && req.method === "POST") {
      const payload = await readBody(req);
      const data = readDatabase();
      const lead = {
        id: createId("lead"),
        name: String(payload.name || "New Lead").trim(),
        phone: String(payload.phone || "").trim(),
        source: String(payload.source || "Website").trim(),
        interest: String(payload.interest || "Consultation").trim(),
        stage: String(payload.stage || "New").trim(),
        value: Number(payload.value || 0)
      };
      data.leads.unshift(lead);
      writeDatabase(data);
      sendJson(res, 201, { ok: true, lead });
      return;
    }

    if (req.url === "/api/contact" && req.method === "POST") {
      const payload = await readBody(req);
      const data = readDatabase();
      data.contacts.unshift({
        id: createId("msg"),
        name: String(payload.name || "").trim(),
        email: String(payload.email || "").trim(),
        message: String(payload.message || "").trim(),
        createdAt: new Date().toISOString()
      });
      writeDatabase(data);
      sendJson(res, 201, { ok: true, message: "Message saved successfully." });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Smart Appointment & Lead Management running at http://localhost:${PORT}`);
});
