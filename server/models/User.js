const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password encryption

// 1. DEFINE THE SCHEMA (THE BLUEPRINT)
// This works like a class property definition in C#
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // This field is mandatory
    },
    email: {
      type: String,
      required: true,
      unique: true, // No two users can have the same email
    },
    password: {
      type: String,
      required: true,
    },
    // We will use this later to display a profile picture
    avatar: {
        type: String,
        default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    },

    // <--- ADD THIS FIELD
    isAdmin: {
      type: Boolean,
      required: true,
      default: false, // By default, a new user is NOT an admin
    },
    
    // This is useful later: A user might belong to multiple projects
    projects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project' // This connects (joins) this field to the 'Project' model
        }
    ]
  },
  {
    // 2. TIMESTAMPS
    // Mongoose will automatically add 'createdAt' and 'updatedAt' fields
    timestamps: true, 
  }
);

// 3. MIDDLEWARE: ENCRYPT PASSWORD BEFORE SAVING
// This function runs automatically BEFORE (.pre) we 'save' a user to the DB.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// 4. METHOD: CHECK PASSWORD
// We add a custom method to the user object to compare passwords during login
// It returns true if the entered password matches the stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 5. EXPORT THE MODEL
// We create the model named 'User' using the schema defined above
const User = mongoose.model('User', userSchema);

module.exports = User;