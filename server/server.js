require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
const socketUtils = require('./utils/socket/socketUtils');
const clientSocket = require('./utils/socket/clientSocket');
const adminSocket = require('./utils/socket/adminSocket');

const authRoutes = require('./routes/authRoutes');
const screenRoutes = require('./routes/screenRoutes');
const apiRoutes = require('./routes/apiRoutes');
const defaultRoutes = require('./routes/defaultRoutes');
const config = require('./others/config');
const database = require('./others/database');
const initDatabase = require('./others/initDatabase');
const {getAllowedOrigins, getClientOrigins, getAdminOrigins} = require('./others/allowedOrigins');

async function start() {
    await database.connect();
    await initDatabase();

    const allowedOrigins = getAllowedOrigins();
    const clientOrigins = getClientOrigins();
    const adminOrigins = getAdminOrigins();

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        },
        pingInterval: 10000,
        pingTimeout: 5000
    });
    socketUtils.setIo(io);

    app.use(bodyParser.json());

    app.use(cors((req, callback) => {
        const origin = req.header('Origin');
        if (origin && allowedOrigins.includes(origin)) {
            callback(null, {origin: true, credentials: true});
        } else {
            callback(null, {origin: false});
        }
    }));

    app.use(cookieParser());

    app.use(authRoutes);
    app.use(screenRoutes);
    app.use(apiRoutes);
    app.use(defaultRoutes);
    app.use('/uploads', express.static('uploads', {
        setHeaders(res) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        }
    }));
    app.use('/public', express.static('public'));

    io.on('connection', (socket) => {
        const origin = socket.handshake.headers.origin;
        if (clientOrigins.includes(origin)) {
            clientSocket(io, socket);
        } else if (adminOrigins.includes(origin)) {
            adminSocket(io, socket);
        } else {
            console.log('Unknown origin:', origin);
            socket.disconnect();
        }
    });

    server.listen(config.port, () => {
        console.log('Server started on port ' + config.port);
    });
}

start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
