🚀 Jira Clone - Collaborative Task Management App
          
      A full-stack MERN (MongoDB, Express, React, Node.js) application designed to replicate the core functionality of Jira. 
      Features real-time collaboration, drag-and-drop task management, and team-based project workflows.

✨ Key Features

    🔄 Real-Time Collaboration (Socket.io)
     Instant Updates: When one user moves a task, it moves instantly on everyone else's screen without refreshing.
     Live Notifications: See task creation and comments in real-time.
     
    📋 Interactive Kanban Board
     Drag & Drop: Smooth, intuitive drag-and-drop interface powered by @hello-pangea/dnd.
     Status Management: Move tasks effortlessly between "To Do", "In Progress", and "Done".
     Task Details: Click any card to view detailed descriptions, priority levels, and assignment info.
     
    👥 Team & Project Management
     Project Isolation: Users only see projects they created or were invited to.
     Member Invites: Project owners can invite other registered users by email to collaborate.
     Role-Based Access: Secure backend logic ensures data privacy between teams.
     
    💬 Engagement & Customization
    Comments System: Discuss tasks directly inside the card modal.
    Profile Customization: Users can upload and update their profile pictures (stored via Multer).
    Secure Auth: JWT-based authentication with secure password hashing (Bcrypt).
    
🛠️ Tech Stack

    Frontend
        React(Vite): Fast, modern UI development.
        Tailwind CSS: For a clean, responsive, and professional look.
        @hello-pangea/dnd: For accessible drag-and-drop mechanics.
        Socket.io Client: For real-time bi-directional communication.
        Context API: For global state management (Auth, Projects, Tasks).
        
    Backend
         Node.js & Express: Robust REST API architecture.
         MongoDB & Mongoose: Flexible NoSQL schema design with relationships (Users <-> Projects <-> Tasks).
         Socket.io: Handling WebSocket connections and event broadcasting.
         JWT & Bcrypt: Industry-standard security.
         Multer: Handling file uploads for profile pictures.
         
🚀 Getting Started
    Follow these steps to run the project locally.
    
    Prerequisites
    Node.js (v16 or higher)
    MongoDB (Local or Atlas URL)


    1. Clone the Repository
     git clone https://github.com/your-username/jira-clone.git
     cd jira-clone

    2. Backend Setup
     cd server
     npm install
        Create a .env file in the server folder:Code snippetPORT=5000
        MONGO_URI=mongodb://127.0.0.1:27017/jira_clone_db
        JWT_SECRET=your_super_secret_key_123
        NODE_ENV=development
      Start the Server: npm run dev
        # Server running on port 5000
        # MongoDB Connected...
    3. Frontend Setup
        Open a new terminal and navigate to the client folder:
        cd client
        npm install
      Start the React App:
      npm run dev
      # App running at http://localhost:5173
    
🔌 API Endpoints


    Authentication
      POST /api/users - Register a new user.
      POST /api/users/login - Login and receive JWT.
      PUT /api/users/profile - Update profile picture.
    Projects
      GET /api/projects - Get all projects for the logged-in user.
      POST /api/projects - Create a new project.
      PUT /api/projects/:id/add-member - Invite a user to a project.
    Tasks
      GET /api/tasks/:projectId - Get tasks for a specific board.
      POST /api/tasks - Create a new task.
      PUT /api/tasks/update/:id - Update task status (Drag & Drop).
      POST /api/tasks/:id/comments - Add a comment.
      
💡 Future Improvements

      Email Integration: Send real email invites using SendGrid/Nodemailer.
      Sprints: Implement Agile Sprint cycles.
      Notifications: In-app notification bell for task assignments.

👤 Author

      Vishal Kumar 
      Role: .NET Full Stack Developer | MERN Enthusiast
      Experience: 3 Years
      
  Focus: Building scalable, real-time web applications.
  
      Made with ❤️ and JavaScript.
