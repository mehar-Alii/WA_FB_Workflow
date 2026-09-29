'use strict';

// Local development server: API + frontend on http://localhost:3000
// (on Vercel the frontend is served from /public by the CDN instead).
const path = require('path');
const express = require('express');
const app = require('../src/createApp');

const root = express();
root.use(express.static(path.join(__dirname, '..', 'public')));
root.use(app);

const port = process.env.PORT || 3000;
root.listen(port, () => console.log(`Server is running on http://localhost:${port}`));
