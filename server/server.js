// 1. IMPORT DEPENDENCIES
const express = require('express'); 
const dotenv = require('dotenv');   
const cors = require('cors');       
const http = require('http'); 
const { Server } = require('socket.io'); 
const path = require('path'); // Import path here with others
const connectDB = require('./config/db'); 

const userRoutes = require('./routes/userRoutes'); 
const projectRoutes = require('./routes/projectRoutes'); 
const taskRoutes = require('./routes/taskRoutes'); 
const uploadRoutes = require('./routes/uploadRoutes'); 

// 2. CONFIGURATION
dotenv.config(); 
connectDB(); 

// 3. INITIALIZE APP
const app = express(); 

// 4. MIDDLEWARE 
app.use(cors()); 
app.use(express.json()); 

//---------------- SOCKET.IO SETUP ----------------//
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.on('connection', (socket) => {
  socket.on('joinProject', (projectId) => {
    socket.join(projectId);
  });

  socket.on('updateTask', (data) => {
    socket.to(data.projectId).emit('taskUpdated', data);
  });
});
//------------------------------------------------//

// 5. ROUTES
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/users', userRoutes); 
app.use('/api/projects', projectRoutes); 
app.use('/api/tasks', taskRoutes); 
app.use('/api/upload', uploadRoutes); 

// 6. STATIC FOLDER (Uploads)
// "uploads" folder must be inside the "server" folder for this to work
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 7. START SERVER
const PORT = process.env.PORT || 5000; 

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});