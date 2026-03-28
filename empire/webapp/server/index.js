const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

const publicDir = path.join(__dirname, '..', 'public');
console.log('Serving from:', publicDir);

app.use(express.static(publicDir));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const claims = {};

app.post('/api/schedule', (req, res) => {
  const { site, interval } = req.body;
  claims[site] = { interval, lastClaim: null, nextClaim: Date.now() };
  res.json({ ok: true });
});

app.get('/api/status', (req, res) => {
  res.json(claims);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Empire Web App: http://0.0.0.0:' + PORT);
});
