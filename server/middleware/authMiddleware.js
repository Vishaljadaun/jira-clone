const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This function acts as a gatekeeper
const protect = async (req, res, next) => {
  let token;

  // 1. Check if the "Authorization" header exists and starts with "Bearer"
  // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR..."
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 2. Get the token from the header (remove the word "Bearer ")
      token = req.headers.authorization.split(' ')[1];

      // 3. Decode the token to get the User ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Find the user in the DB and attach it to the request object
      // .select('-password') means "Give me the user data BUT leave out the password"
      req.user = await User.findById(decoded.id).select('-password');

      // 5. Move to the next step (the actual Controller)
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
};

module.exports = { protect };