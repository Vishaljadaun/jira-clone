import { createContext, useState, useEffect } from "react";
import axios from "axios";

// 1. Create the Context (The "Box" that holds our data)
const AuthContext = createContext();

// 2. Create the Provider (The component that wraps our whole app)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Stores logged-in user data
  const [loading, setLoading] = useState(true); // Are we still checking if they are logged in?

  // 3. Check LocalStorage on Load
  // If the user refreshes the page, we check if they were already logged in
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      setUser(userInfo);
    }
    setLoading(false);
  }, []);

  // 4. Login Function
  // This will be called by our Login Form
  const login = async (email, password) => {
    try {
      // Make the POST request to our backend
      // Because of vite.config.js proxy, /api goes to localhost:5000
      const { data } = await axios.post("/api/users/login", {
        email,
        password,
      });

      // Save user data (including Token) to LocalStorage so they stay logged in
      localStorage.setItem("userInfo", JSON.stringify(data));
      
      // Update React State
      setUser(data);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      // Return the error message from the backend
      return { 
        success: false, 
        message: error.response?.data?.message || "Something went wrong" 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await axios.post("/api/users", {
        name,
        email,
        password,
      });

      // Save user data & token
      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Registration failed" 
      };
    }
  };

  // 5. Logout Function
  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
  };

  // 6. Expose these values to the rest of the app
 // Update the value prop to include 'register'
  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );

};

export default AuthContext;