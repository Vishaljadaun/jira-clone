import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import ProjectDashboard from "./pages/ProjectDashboard";
import Board from "./pages/Board";
import ProtectedRoute from "./components/ProtectedRoute"; // <--- Import this
import Register from "./pages/Register";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route: Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Require Login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/project" element={<ProjectDashboard />} />
            <Route path="/project/:id" element={<Board />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/project" />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
