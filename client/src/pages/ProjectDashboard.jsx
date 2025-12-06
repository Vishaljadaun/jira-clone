import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Needed for upload
import ProjectContext from "../context/ProjectContext";
import AuthContext from "../context/AuthContext"; // <--- Import

const ProjectDashboard = () => {
  const { projects, getProjects, createProject } = useContext(ProjectContext);
  const { user, logout } = useContext(AuthContext); // We might need to update 'user' context later
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false); // Project Modal
  const [showProfileModal, setShowProfileModal] = useState(false); // <--- NEW: Profile Modal
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // --- UPLOAD STATE ---
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || ""); // Default to current user avatar

  useEffect(() => {
    getProjects();
  }, []); 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createProject(name, description);
    setShowModal(false);
    setName("");
    setDescription("");
  };

  // --- NEW: UPLOAD HANDLER ---
  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      // 1. Upload image to server
      const { data } = await axios.post('/api/upload', formData, config);
      setAvatarUrl(data); // "data" is the path like /uploads/image-123.jpg
      setUploading(false);
    } catch (error) {
      console.error(error);
      setUploading(false);
      alert("Image upload failed!");
    }
  };

  // --- NEW: SAVE PROFILE HANDLER ---
  const handleSaveProfile = async () => {
    try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        
        // 2. Save the new avatar URL to the User Database
        const { data } = await axios.put('/api/users/profile', { avatar: avatarUrl }, config);
        
        // Update LocalStorage so the new image persists on refresh
        localStorage.setItem("userInfo", JSON.stringify(data));
        
        alert("Profile updated! (Refresh to see changes in Navbar)");
        setShowProfileModal(false);
    } catch (error) {
        alert("Failed to update profile");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-blue-600">Jira Clone</h1>
            <div className="flex items-center gap-4">
                {/* SHOW USER AVATAR */}
                <img 
                    src={user?.avatar?.startsWith("http") ? user.avatar : `http://localhost:5000${user.avatar}`} 
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-gray-300"
                />
                
                {/* CLICK NAME TO OPEN PROFILE */}
                <span 
                    onClick={() => setShowProfileModal(true)} 
                    className="text-gray-700 font-medium cursor-pointer hover:underline"
                >
                    Hello, {user?.name}
                </span>

                <button 
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800"
                >
                    Logout
                </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Project
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
                key={project._id} 
                onClick={() => navigate(`/project/${project._id}`)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition cursor-pointer border border-gray-100"
            >
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              <p className="text-gray-500 mt-2 text-sm">
                {project.description || "No description"}
              </p>
              <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {project.owner === user._id ? "Owner" : "Member"}
                  </span>
              </div>
            </div>
          ))}
        </div>
        
        {projects.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
                You don't have any projects yet. Create one!
            </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Project Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 p-2 rounded"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <textarea
                  className="w-full border border-gray-300 p-2 rounded"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW: PROFILE UPLOAD MODAL --- */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-4">Update Profile Picture</h3>
            
            {/* Preview Current or New Image */}
            <div className="flex justify-center mb-4">
                <img 
                    src={avatarUrl.startsWith("http") ? avatarUrl : `http://localhost:5000${avatarUrl}`} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                />
            </div>

            {/* File Input */}
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

    </div>
  );
};

export default ProjectDashboard;