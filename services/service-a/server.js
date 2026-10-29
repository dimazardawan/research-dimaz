const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service-a';

// ─────────────────────────────────────────────
// STATE SIMULASI — diubah oleh endpoint simulate
// ─────────────────────────────────────────────
let simulationMode = null;  // null | 'latency' | 'inconsistency' | 'error500'
let latencyDelay   = 0;

console.log(`[${SERVICE_NAME}] Starting on port ${PORT}...`);

// ─────────────────────────────────────────────
// MIDDLEWARE — terapkan simulasi ke /api/process
// ─────────────────────────────────────────────
async function applySimulation(req, res, next) {
  if (simulationMode === 'latency') {
    console.log(`[${SERVICE_NAME}] Simulating latency: ${latencyDelay}ms`);
    await new Promise(r => setTimeout(r, latencyDelay));
  }
  next();
}

// ─────────────────────────────────────────────
// ENDPOINT UTAMA
// ─────────────────────────────────────────────

// Health check — selalu sehat
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    simulationMode: simulationMode || 'none',
    timestamp: new Date().toISOString()
  });
});

// Proses utama — terpengaruh simulasi
app.get('/api/process', applySimulation, (req, res) => {
  // Mode inconsistency: HTTP 200 tapi data rusak
  if (simulationMode === 'inconsistency') {
    console.log(`[${SERVICE_NAME}] Returning inconsistent data`);
    return res.status(200).json({
      broken: true,
      missing_required_fields: true,
      garbage: 'this schema is intentionally broken'
      // sengaja tidak ada field: id, status, data
    });
  }

  // Mode error500: kembalikan server error
  if (simulationMode === 'error500') {
    console.log(`[${SERVICE_NAME}] Returning HTTP 500`);
    return res.status(500).json({
      error: 'Internal Server Error',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    });
  }

  // Mode normal: kembalikan data valid
  const responseData = {
    id: Math.floor(Math.random() * 100000),
    status: 'success',
    data: {
      value: Math.floor(Math.random() * 1000),
      processed_by: SERVICE_NAME,
      timestamp: new Date().toISOString()
    },
    service: SERVICE_NAME
  };

  console.log(`[${SERVICE_NAME}] Returning valid response, id=${responseData.id}`);
  res.status(200).json(responseData);
});

// ─────────────────────────────────────────────
// ENDPOINT SIMULASI KEGAGALAN
// ─────────────────────────────────────────────

// S1: Service Down — proses berhenti total
// LAMA — bunuh container permanen
// BARU — blokir koneksi tapi server tetap hidup, bisa di-reset
let isDown = false;
let serverInstance = null;

app.get('/simulate/down', (req, res) => {
  console.log(`[${SERVICE_NAME}] SIMULATE: going DOWN (port blocked)`);
  res.json({ message: 'Service going down (port blocked)...', service: SERVICE_NAME });
  // Tutup server setelah response dikirim
  setTimeout(() => {
    if (serverInstance) {
      serverInstance.close(() => {
        console.log(`[${SERVICE_NAME}] Port closed — ECONNREFUSED active`);
      });
      serverInstance = null;
      isDown = true;
    }
  }, 300);
});

app.get('/simulate/recover', (req, res) => {
  // Endpoint khusus untuk recover dari simulate/down
  if (isDown) {
    serverInstance = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] ✅ Recovered — listening again on port ${PORT}`);
    });
    isDown = false;
    return res.json({ message: 'Service recovered!', service: SERVICE_NAME });
  }
  res.json({ message: 'Service was already running', service: SERVICE_NAME });
});

// S2: Network Latency — tambah delay ke setiap request
app.get('/simulate/latency', (req, res) => {
  const delay = parseInt(req.query.delay) || 8000;
  simulationMode = 'latency';
  latencyDelay   = delay;
  console.log(`[${SERVICE_NAME}] SIMULATE: latency mode ON, delay=${delay}ms`);
  res.json({
    message: `Latency simulation activated`,
    delay_ms: delay,
    service: SERVICE_NAME
  });
});

// S3: Data Inconsistency — HTTP 200 tapi skema rusak
app.get('/simulate/inconsistency', (req, res) => {
  simulationMode = 'inconsistency';
  console.log(`[${SERVICE_NAME}] SIMULATE: inconsistency mode ON`);
  res.json({
    message: 'Data inconsistency simulation activated',
    service: SERVICE_NAME
  });
});

// S4: Server Error — HTTP 500 terus-menerus
app.get('/simulate/error500', (req, res) => {
  simulationMode = 'error500';
  console.log(`[${SERVICE_NAME}] SIMULATE: error500 mode ON`);
  res.json({
    message: 'HTTP 500 simulation activated',
    service: SERVICE_NAME
  });
});

// Reset — kembalikan ke kondisi normal
app.get('/simulate/reset', (req, res) => {
  const previous = simulationMode;
  simulationMode = null;
  latencyDelay   = 0;
  console.log(`[${SERVICE_NAME}] SIMULATE: RESET (was: ${previous || 'none'})`);
  res.json({
    message: 'Service reset to normal',
    previous_mode: previous || 'none',
    service: SERVICE_NAME
  });
});

// Status — tampilkan mode aktif
app.get('/simulate/status', (req, res) => {
  res.json({
    simulationMode: simulationMode || 'none',
    latencyDelay: latencyDelay,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
serverInstance = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] ✅ Running on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] Endpoints: /health /api/process`);
  console.log(`[${SERVICE_NAME}] Simulate : /simulate/down|latency|inconsistency|error500|reset|recover|status`);
});