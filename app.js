'use strict';

const express = require('express');
const localApp = require('./backend/app');

const app = express();

app.disable('x-powered-by');
app.get('/api/auth/me', (_request, response) => {
  response.set('Cache-Control', 'no-store').json({ user: null, demo: true });
});
app.use(['/api/auth', '/api/history'], (_request, response) => {
  response.status(503).json({
    error: 'Inloggning och sparade beräkningar är avstängda i webbversionen.',
  });
});
app.use(localApp);

module.exports = app;
