'use strict';

const express = require('express');
const { createApp } = require('./backend/app');

const app = express();
app.disable('x-powered-by');
// Neon on Vercel exposes a pooled connection under either of these names.
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || '';
app.use(createApp({ hosted: true, databaseUrl }));

module.exports = app;
