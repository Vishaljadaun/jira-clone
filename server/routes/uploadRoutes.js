const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// 1. Config Storage (Where to save files)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Save to 'uploads' folder
  },
  filename(req, file, cb) {
    // Name file: fieldname-date.jpg
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// 2. Check File Type (Images only)
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// 3. The Route
router.post('/', upload.single('image'), (req, res) => {
  // Return the path like: /uploads/image-12345.jpg
  res.send(`/${req.file.path.replace(/\\/g, "/")}`); 
});

module.exports = router;