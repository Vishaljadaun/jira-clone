import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import io from 'socket.io-client';
import TaskContext from "../context/TaskContext";
import AuthContext from "../context/AuthContext";
import Navbar from "../components/Navbar"; // <--- Import

// Define socket outside component to prevent multiple connections
let socket;

const Board = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, getTasks, updateTaskStatus, createTask } = useContext(TaskContext);
  const { user } = useContext(AuthContext);

  // --- STATE VARIABLES ---
  const [showModal, setShowModal] = useState(false); // Create Task Modal
  const [showInviteModal, setShowInviteModal] = useState(false); // Invite User Modal
  const [selectedTask, setSelectedTask] = useState(null); // Task Details Modal
  const [commentText, setCommentText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium"
  });

  // --- USE EFFECT: SOCKET & DATA FETCHING ---
  useEffect(() => {
    // 1. SAFETY CHECK (Fix for Refresh Bug)
    if (!user || !id) return;

    // 2. SOCKET CONNECTION
    socket = io('http://localhost:5000');
    socket.emit('joinProject', id);

    // Listen for updates from other users
    socket.on('taskUpdated', () => {
      getTasks(id);
      // Optional: If you want the modal to update while open, you'd need more logic here.
      // For now, closing the modal on update is safer to avoid conflicts.
    });

    // 3. INITIAL FETCH
    getTasks(id);

    // 4. CLEANUP
    return () => {
      socket.disconnect();
    };
  }, [user, id]);

  // --- KANBAN COLUMNS SETUP ---
  const columns = {
    "To Do": tasks.filter((t) => t.status === "To Do"),
    "In Progress": tasks.filter((t) => t.status === "In Progress"),
    "Done": tasks.filter((t) => t.status === "Done"),
  };

  // --- HANDLERS ---
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    updateTaskStatus(draggableId, destination.droppableId);
    socket.emit('updateTask', { projectId: id });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    await createTask({
        ...newTask,
        projectId: id,
        status: "To Do"
    });
    setShowModal(false);
    setNewTask({ title: "", description: "", priority: "Medium" });
    socket.emit('updateTask', { projectId: id }); // Notify others
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.put(`/api/projects/${id}/add-member`, { email: inviteEmail }, config);
        alert("User added successfully!");
        setShowInviteModal(false);
        setInviteEmail("");
    } catch (error) {
        alert(error.response?.data?.message || "Failed to add user");
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        // Call the API endpoint we created earlier
        await axios.post(`/api/tasks/${selectedTask._id}/comments`, { text: commentText }, config);
        
        // Clear text
        setCommentText("");
        
        // Refresh tasks to see the new comment
        getTasks(id); 
        
        // Close modal (simple way to refresh state) 
        // Or you could manually update 'selectedTask' state if you want to keep it open
        setSelectedTask(null); 
        
        socket.emit('updateTask', { projectId: id }); // Notify others
    } catch (error) {
        console.error("Failed to post comment", error);
        alert("Failed to post comment");
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <Navbar />
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/project')} className="text-gray-500 hover:text-gray-700">
                &larr; Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Project Board</h2>
            <button 
                onClick={() => setShowInviteModal(true)}
                className="text-sm text-blue-600 underline hover:text-blue-800 ml-2"
            >
                + Invite Member
            </button>
        </div>
        
        <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-sm"
        >
            + Add Task
        </button>
      </div>
      
      {/* DRAG AND DROP BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-150px)]">
          {Object.entries(columns).map(([columnId, columnTasks]) => (
            <Droppable key={columnId} droppableId={columnId}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-100 p-4 rounded-lg w-80 min-w-[320px] shadow-md flex flex-col max-h-full"
                >
                  <h3 className="font-bold text-gray-700 mb-4 flex justify-between">
                    {columnId}
                    <span className="bg-gray-200 text-gray-600 px-2 rounded-full text-sm">
                        {columnTasks.length}
                    </span>
                  </h3>

                  <div className="space-y-3 overflow-y-auto min-h-[100px] pr-2">
                    {columnTasks.map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            
                            onClick={() => setSelectedTask(task)} // Open Details Modal

                            className={`p-4 bg-white rounded shadow-sm border-l-4 cursor-pointer hover:shadow-md transition
                              ${snapshot.isDragging ? "shadow-xl rotate-2" : ""}
                              ${task.priority === 'High' ? 'border-red-500' : 
                                task.priority === 'Medium' ? 'border-yellow-500' : 'border-green-500'}
                            `}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <div className="flex justify-between items-center mt-3">
                                <span className={`text-xs px-2 py-1 rounded 
                                  ${task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                  {task.priority}
                                </span>
                                {task.assignee && (
                                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                        {task.assignee.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* --- CREATE TASK MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleCreateTask}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-gray-300 rounded p-2"
                            value={newTask.title}
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded p-2"
                            rows="3"
                            value={newTask.description}
                            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select 
                            className="w-full border border-gray-300 rounded p-2"
                            value={newTask.priority}
                            onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- INVITE USER MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl">
                <h3 className="text-lg font-bold mb-4">Invite Team Member</h3>
                <form onSubmit={handleInvite}>
                    <input 
                        type="email" 
                        placeholder="Enter user email..."
                        className="w-full border p-2 rounded mb-4"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowInviteModal(false)} className="text-gray-500">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Invite</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- TASK DETAILS & COMMENTS MODAL --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedTask.title}</h2>
                    <button onClick={() => setSelectedTask(null)} className="text-gray-500 text-xl font-bold">&times;</button>
                </div>
                <div className="mb-6">
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedTask.description || "No description provided."}</p>
                </div>
                <div className="flex gap-4 mb-6 text-sm">
                    <div className="bg-gray-100 px-3 py-1 rounded"><span className="font-bold">Status:</span> {selectedTask.status}</div>
                    <div className="bg-gray-100 px-3 py-1 rounded"><span className="font-bold">Priority:</span> {selectedTask.priority}</div>
                </div>

                {/* COMMENTS */}
                <div className="border-t pt-4">
                    <h3 className="font-bold text-gray-700 mb-3">Comments</h3>
                    <div className="bg-gray-50 p-4 rounded mb-4 max-h-60 overflow-y-auto space-y-3">
                        {selectedTask.comments && selectedTask.comments.length > 0 ? (
                            selectedTask.comments.map((c, i) => (
                                <div key={i} className="border-b pb-2 last:border-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-xs text-blue-600">{c.user?.name || "User"}</span>
                                        <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{c.text}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm italic">No comments yet.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            className="flex-1 border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <button onClick={handlePostComment} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Post</button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Board;