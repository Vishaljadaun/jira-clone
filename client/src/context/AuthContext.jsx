import { useState } from "react";
import { api as axios } from "../lib/api";

// 1. Create the Context (The "Box" that holds our data)
import AuthContext from "./auth";

// 2. Create the Provider (The component that wraps our whole app)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo")) || null;
    } catch {
      localStorage.removeItem("userInfo");
      return null;
    }
  });
  const loading = false;
  const updateUser = (data) => {
    localStorage.setItem("userInfo", JSON.stringify(data));
    setUser(data);
  };

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
        message: error.response?.data?.message || "Something went wrong",
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
        message: error.response?.data?.message || "Registration failed",
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
    <AuthContext.Provider
      value={{ user, login, logout, register, loading, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
