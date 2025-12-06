import { createContext, useState, useContext } from "react";
import axios from "axios";
import AuthContext from "./AuthContext"; // We need the user's info (Token)

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const { user } = useContext(AuthContext); // Get the logged-in user to access the token

  // Helper to get the headers with the token
  const config = () => {
    return {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
  };

  // 1. Fetch all projects
  const getProjects = async () => {
    try {
      const { data } = await axios.get("/api/projects", config());
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // 2. Create a new project
  const createProject = async (name, description) => {
    try {
      const { data } = await axios.post("/api/projects", { name, description }, config());
      // Add the new project to our existing list immediately (so UI updates without refresh)
      setProjects([...projects, data]); 
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || "Failed to create project" 
      };
    }
  };

  return (
    <ProjectContext.Provider value={{ projects, getProjects, createProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export default ProjectContext;