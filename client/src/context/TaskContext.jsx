import { createContext, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "./AuthContext";

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const { user } = useContext(AuthContext);

  // FIX 1: Safety check in config
  // If user is null, we can't generate headers, so return null
  const config = () => {
    if (!user || !user.token) return null;
    
    return {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
  };

  const getTasks = async (projectId) => {
    // FIX 2: Stop the function if config() returns null
    const headers = config();
    if (!headers) return; 

    try {
      const { data } = await axios.get(`/api/tasks/${projectId}`, headers);
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const createTask = async (taskData) => {
    const headers = config();
    if (!headers) return; // Safety check

    try {
      const { data } = await axios.post("/api/tasks", taskData, headers);
      setTasks([...tasks, data]);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const headers = config();
    if (!headers) return; // Safety check

    try {
      const updatedTasks = tasks.map((t) => 
        t._id === taskId ? { ...t, status: newStatus } : t
      );
      setTasks(updatedTasks);

      await axios.put(`/api/tasks/update/${taskId}`, { status: newStatus }, headers);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, getTasks, createTask, updateTaskStatus }}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;