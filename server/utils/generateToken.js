const jwt = require('jsonwebtoken');

// This function takes a user's ID and generates a secure token for them
const generateToken = (id) => {
  // jwt.sign takes 3 arguments:
  // 1. The payload (data we want to hide in the token). Usually just the User ID.
  // 2. The SECRET KEY (a private password only the server knows).
  // 3. Options (e.g., when does it expire?)
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token is valid for 30 days
  });
};

module.exports = generateToken;