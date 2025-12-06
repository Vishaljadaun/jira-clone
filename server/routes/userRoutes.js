const express = require('express');
const router = express.Router(); // Create a router object
//const { registerUser } = require('../controllers/userController'); // Import the controller
const { registerUser, authUser, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Import protect // Import authUser
// Define the route
// This means: POST request to '/' triggers registerUser
router.post('/', registerUser);
router.post('/login', authUser); // <--- ADD THIS LINE

router.route('/profile').put(protect, updateUserProfile); // <--- Add this line for profile update
module.exports = router;