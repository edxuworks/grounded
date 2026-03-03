'use strict';
// Thin wrapper so Vercel auto-detects this as a serverless function.
// Turbo builds apps/api/src → apps/api/dist before this is invoked.
const { default: app } = require('../apps/api/dist/index');
module.exports = app;
