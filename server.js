const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { format } = require('date-fns');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = '';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  regNo: { type: String, required: true },
  authorized: { type: Boolean, default: true }
});

// Define Log Schema
const logSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  name: { type: String },
  regNo: { type: String },
  readerType: { type: String, enum: ['entry', 'exit'], required: true },
  authorized: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Log = mongoose.model('Log', logSchema);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Scan endpoint - receives data from ESP32
app.post('/api/scan', async (req, res) => {
  try {
    const { uid, readerType, authorized } = req.body;
    
    // Find user information if UID is registered
    const user = await User.findOne({ uid });
    
    // Create log entry
    const log = new Log({
      uid,
      name: user ? user.name : 'Unknown',
      regNo: user ? user.regNo : 'N/A',
      readerType,
      authorized: user ? true : authorized
    });
    
    await log.save();
    
    // Prepare data for the frontend
    const logData = {
      uid,
      name: user ? user.name : 'Unknown',
      regNo: user ? user.regNo : 'N/A',
      readerType,
      authorized: user ? true : authorized,
      timestamp: format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')
    };
    
    // Emit event to all connected clients
    io.emit('newScan', logData);
    
    res.status(201).json({ message: 'Scan logged successfully', data: logData });
  } catch (error) {
    console.error('Error logging scan:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get logs with optional date filtering
app.get('/api/logs', async (req, res) => {
  try {
    const { date, readerType } = req.query;
    let query = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.timestamp = { $gte: startDate, $lt: endDate };
    }
    
    if (readerType) {
      query.readerType = readerType;
    }
    
    const logs = await Log.find(query).sort({ timestamp: -1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download logs as CSV
app.get('/api/logs/download', async (req, res) => {
  try {
    const { date, readerType } = req.query;
    let query = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.timestamp = { $gte: startDate, $lt: endDate };
    }
    
    if (readerType) {
      query.readerType = readerType;
    }
    
    const logs = await Log.find(query).sort({ timestamp: -1 });
    
    // Create CSV content
    let csv = 'UID,Name,Registration Number,Type,Authorized,Timestamp\n';
    logs.forEach(log => {
      const timestamp = format(log.timestamp, 'yyyy-MM-dd HH:mm:ss');
      csv += `${log.uid},${log.name},${log.regNo},${log.readerType},${log.authorized},${timestamp}\n`;
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=logs-${readerType || 'all'}-${date || 'all'}.csv`);
    
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});