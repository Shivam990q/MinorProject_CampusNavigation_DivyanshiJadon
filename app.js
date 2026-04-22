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
mongoose.connect("mongodb://127.0.0.1:27017/campus_navigation", {
  serverSelectionTimeoutMS: 2000
})
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Offline - Running in Mock Mode"));


app.use("/api/locations", locationRoutes);
app.use("/api/search", locationRoutes);
app.use("/api/users", userRoutes);

// Test route
app.get("/hello", (req, res) => {
  res.send("Backend running with clean structure!");
});

// Serve frontend static files
app.use(express.static('frontend'));

app.listen(7000, () => {
  console.log("Server running on port 7000");
});