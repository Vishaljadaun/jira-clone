const mongoose = require('mongoose'); // Import Mongoose to manage the DB connection

/**
 * Function to connect to the MongoDB Database
 * usage: await connectDB();
 */
const connectDB = async () => {
    try {
        // Attempt to connect to the local MongoDB database
        // 'jira_clone_db' is the name of the database. If it doesn't exist, MongoDB creates it automatically.
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // If successful, log the host name to the console
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // If there is an error (e.g., MongoDB is not running), log it
        console.error(`Error: ${error.message}`);
        
        // Exit the process with failure code (1) so the app stops trying to run without a DB
        process.exit(1);
    }
};

module.exports = connectDB; // Export the function so we can use it in server.js