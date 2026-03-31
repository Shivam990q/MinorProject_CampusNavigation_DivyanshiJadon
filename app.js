const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import the route files
const locationRoutes = require("./routes/locationRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/campus_navigation")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Link the routes to the URLs 
app.use("/api/locations", locationRoutes);
app.use("/api/search", locationRoutes); // Connects search to the location router
app.use("/api/users", userRoutes);

// Test route
app.get("/hello", (req, res) => {
  res.send("Backend running with clean structure!");
});

app.listen(7000, () => {
  console.log("Server running on port 7000");
});