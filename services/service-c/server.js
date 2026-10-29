const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || 'service-c';

let simulationMode = null;

console.log(`[${SERVICE_NAME}] Starting on port ${PORT}...`);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    role: 'secondary',
    simulationMode: simulationMode || 'none',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/process', (req, res) => {
  if (simulationMode === 'error500') {
    return res.status(500).json({
      error: 'Internal Server Error',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    });
  }

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

  res.status(200).json(responseData);
});

// Simulasi untuk skenario cascade
app.get('/simulate/down', (req, res) => {
  console.log(`[${SERVICE_NAME}] SIMULATE: going DOWN`);
  res.json({ message: 'Service C going down...', service: SERVICE_NAME });
  setTimeout(() => process.exit(0), 500);
});

app.get('/simulate/error500', (req, res) => {
  simulationMode = 'error500';
  res.json({ message: 'Error500 simulation activated', service: SERVICE_NAME });
});

app.get('/simulate/reset', (req, res) => {
  simulationMode = null;
  res.json({ message: 'Service reset to normal', service: SERVICE_NAME });
});

app.get('/simulate/status', (req, res) => {
  res.json({ simulationMode: simulationMode || 'none', service: SERVICE_NAME });
});

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] ✅ Running on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] Role: SECONDARY service`);
});