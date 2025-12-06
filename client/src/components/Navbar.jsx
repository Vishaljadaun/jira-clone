import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import axios from "axios";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // We keep the profile modal state here since the button is in the navbar
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // --- UPLOAD HANDLER (Reused from Dashboard) ---
  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const { data } = await axios.post('/api/upload', formData, config);
      setAvatarUrl(data);
      setUploading(false);
    } catch (error) {
      console.error(error);
      setUploading(false);
      alert("Image upload failed!");
    }
  };

  const handleSaveProfile = async () => {
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.put('/api/users/profile', { avatar: avatarUrl }, config);
        localStorage.setItem("userInfo", JSON.stringify(data));
        alert("Profile updated!");
        setShowProfileModal(false);
        // Force reload to update context (simple way) or create a setUser function in context
        window.location.reload(); 
    } catch (error) {
        alert("Failed to update profile");
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo links back to Dashboard */}
            <Link to="/project" className="text-xl font-bold text-blue-600 no-underline">
                Jira Clone
            </Link>
            
            <div className="flex items-center gap-4">
                {/* User Avatar */}
                <img 
                    src={user?.avatar?.startsWith("http") ? user.avatar : `http://localhost:5000${user.avatar}`} 
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
                
                {/* User Name (Click to edit) */}
                <span 
                    onClick={() => setShowProfileModal(true)} 
                    className="text-gray-700 font-medium cursor-pointer hover:underline"
                >
                    Hello, {user?.name}
                </span>

                <button 
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
                >
                    Logout
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- PROFILE MODAL (Available on every page now!) --- */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center shadow-xl">
            <h3 className="text-xl font-bold mb-4">Update Profile Picture</h3>
            
            <div className="flex justify-center mb-4">
                <img 
                    src={avatarUrl.startsWith("http") ? avatarUrl : `http://localhost:5000${avatarUrl}`} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                />
            </div>

            <input type="file" onChange={uploadFileHandler} className="mb-4 text-sm" />
            {uploading && <p className="text-sm text-blue-500 mb-2">Uploading...</p>}

            <div className="flex justify-center gap-2 mt-4">
                <button 
                    onClick={() => setShowProfileModal(false)} 
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveProfile} 
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={uploading}
                >
                    Save Changes
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;