const jwt = require("jsonwebtoken");
const User = require("../models/User");
async function authenticate(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
  });
  const user = await User.findById(decoded.id).select("-password");
  if (!user) throw new Error("Account not found");
  return user;
}
const protect = async (req, res, next) => {
  try {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
    if (!match) throw new Error("Missing token");
    req.user = await authenticate(match[1]);
  } catch {
    return res.status(401).json({ message: "Please sign in again." });
  }
  next();
};
module.exports = { protect, authenticate };
