const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();
const destination = path.join(__dirname, "../uploads");
fs.mkdirSync(destination, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination,
    filename: (req, file, cb) =>
      cb(
        null,
        `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok =
      /^\.(jpg|jpeg|png)$/.test(
        path.extname(file.originalname).toLowerCase(),
      ) && ["image/jpeg", "image/png"].includes(file.mimetype);
    cb(
      ok
        ? null
        : Object.assign(new Error("Use a PNG or JPEG image."), { status: 400 }),
      ok,
    );
  },
});
router.post("/", protect, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose an image." });
  res.send(`/uploads/${req.file.filename}`);
});
module.exports = router;
