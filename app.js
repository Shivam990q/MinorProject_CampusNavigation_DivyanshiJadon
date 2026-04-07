const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import the route files
const locationRoutes = require("./routes/locationRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB (local + Railway both)
mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/campus_navigation")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.use("/api/locations", locationRoutes);
app.use("/api/search", locationRoutes); 
app.use("/api/users", userRoutes);

// Test route
app.get("/hello", (req, res) => {
  res.send("Backend running!");
});

const path = require("path");

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// PORT
const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});