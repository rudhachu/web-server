/**
 * Main server application file that sets up an Express server with WebSocket support.
 * @module server/index
 *
 * @requires express
 * @requires path
 * @requires body-parser
 * @requires ws
 * @requires http
 * @requires ./routes/base
 * @requires ./routes/ffmpeg
 * @requires ./routes/downloaders
 * @requires ./routes/converters
 * @requires ./routes/tools
 * @requires ./routes/ai
 * @requires ./routes/search
 * @requires ./routes/_upload
 *
 * @description
 * Sets up an Express server with:
 * - Body parser middleware for URL-encoded and JSON bodies
 * - WebSocket server for real-time client connections
 * - Multiple API routes mounted under /api
 * - Static file serving for web client
 * - Endpoint to track connected users
 *
 * @constant {express.Application} app - Express application instance
 * @constant {number} port - Server port (default: 3000)
 * @constant {WebSocketServer} wss - WebSocket server instance
 * @constant {Set} connectedClients - Set of connected WebSocket clients
 */
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');

// Import routes
const routers = [
    require('./routes/base'),
    require('./routes/ffmpeg'),
    require('./routes/downloaders'),
    require('./routes/converters'),
    require('./routes/tools'),
    require('./routes/ai'),
    require('./routes/search'),
    require('./routes/anime'),
];
const uploadRouter = require('./routes/_upload');
const qrCode = require('./qr');
const pair = require('./pair');
const webqr = require('./web-qr');
const webpair = require('./web-pair');

// Initialize the app and constants
const app = express();
const PORT = process.env.PORT || 8000;
const publicDir = path.join(process.cwd(), 'public');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// HTTP server and WebSocket setup
const server = createServer(app);
const wss = new WebSocketServer({ server });
const connectedClients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    connectedClients.add(ws);
    ws.on('close', () => connectedClients.delete(ws));
});

// API routes
routers.forEach((router) => app.use('/api', router));
app.use('/api/upload', uploadRouter);
app.use('/qr-code', qrCode);
app.use('/code', pair);
app.use('/web-qrcode', webqr);
app.use('/web-code', webpair);

// Static files and user tracking
app.use(express.static(publicDir));
app.get('/api/users', (_, res) => res.json({ users: connectedClients.size }));

// Serve static HTML pages
['/pair', '/qr', '/web-pair', '/web-qr'].forEach((route) => {
    app.get(route, (req, res) => res.sendFile(path.join(publicDir, `${route.substring(1)}.html`)));
});

// Root route
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;