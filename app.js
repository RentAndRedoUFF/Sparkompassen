'use strict';

const express = require('express');
const { createApp } = require('./backend/app');

const app = express();
app.disable('x-powered-by');
app.use(createApp({ hosted: true }));

module.exports = app;
