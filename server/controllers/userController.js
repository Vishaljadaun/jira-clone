const User = require("../models/User"); // Import the User model we created earlier
const generateToken = require("../utils/generateToken"); // Import our token helper

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  // 1. EXTRACT DATA FROM REQUEST BODY
  // In .NET API: [FromBody] RegisterDto model
  const { name, email, password } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100 ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    return res
      .status(400)
      .json({
        message:
          "Enter a name, valid email and password of at least 8 characters (up to 72 UTF-8 bytes).",
      });

  try {
    // 2. CHECK IF USER ALREADY EXISTS
    // We query the DB to see if an email matches
    const userExists = await User.findOne({ email });

    if (userExists) {
      // Return 400 Bad Request
      res.status(400);
      throw new Error("User already exists");
    }

    // 3. CREATE THE USER
    // The .create() method triggers the 'save' middleware in User.js to hash the password
    const user = await User.create({
      name,
      email,
      password,
    });

    // 4. SEND RESPONSE
    // If user created successfully, send back their info and a token
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id), // Generate the "Key Card"
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  } catch (error) {
    // If any error occurs, send it to the client
    res.status(400).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string")
    return res
      .status(400)
      .json({ message: "Email and password are required." });

  try {
    // 1. Find the user by email
    const user = await User.findOne({ email });

    // 2. Check if user exists AND if the password matches
    // We use the .matchPassword() method we defined in User.js
    if (user && (await user.matchPassword(password))) {
      // 3. If correct, send back the user info + Token
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin, // Send the role to the frontend
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401); // 401 means "Unauthorized"
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
// @desc    Update user profile (Avatar)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // If the frontend sends a new avatar path, save it
    user.avatar = req.body.avatar || user.avatar;

    // We can also update name/email here if we wanted
    if (req.body.name) user.name = req.body.name;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      avatar: updatedUser.avatar, // Return the new avatar
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
};

module.exports = { registerUser, authUser, updateUserProfile };
