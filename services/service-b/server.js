const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service-b';

// Service B punya satu mode simulasi untuk skenario S5
let simulationMode = null;

console.log(`[${SERVICE_NAME}] Starting on port ${PORT}...`);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    role: 'fallback',
    simulationMode: simulationMode || 'none',
    timestamp: new Date().toISOString()
  });
});

// Endpoint utama — sebagai fallback, selalu berhasil kecuali S5
app.get('/api/process', (req, res) => {
  // S5: Cascade Failure — Service B juga error
  if (simulationMode === 'error500') {
    console.log(`[${SERVICE_NAME}] S5 Cascade: returning HTTP 500`);
    return res.status(500).json({
      error: 'Internal Server Error (Cascade Failure Simulation)',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    });
  }

  // Normal: fallback response yang valid
  const responseData = {
    id: Math.floor(Math.random() * 100000),
    status: 'success',
    data: {
      value: Math.floor(Math.random() * 1000),
      processed_by: SERVICE_NAME,
      note: 'Handled by fallback service',
      timestamp: new Date().toISOString()
    },
    service: SERVICE_NAME
  };

  console.log(`[${SERVICE_NAME}] Fallback response OK, id=${responseData.id}`);
  res.status(200).json(responseData);
});

// S5 support: simulasi error untuk cascade failure
app.get('/simulate/error500', (req, res) => {
  simulationMode = 'error500';
  console.log(`[${SERVICE_NAME}] SIMULATE: error500 ON (S5 cascade)`);
  res.json({ message: 'Cascade failure simulation activated', service: SERVICE_NAME });
});

// Reset
app.get('/simulate/reset', (req, res) => {
  const previous = simulationMode;
  simulationMode = null;
  console.log(`[${SERVICE_NAME}] SIMULATE: RESET`);
  res.json({ message: 'Service reset to normal', previous_mode: previous || 'none', service: SERVICE_NAME });
});

// Status
app.get('/simulate/status', (req, res) => {
  res.json({ simulationMode: simulationMode || 'none', service: SERVICE_NAME });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] ✅ Running on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] Role: FALLBACK service`);
});