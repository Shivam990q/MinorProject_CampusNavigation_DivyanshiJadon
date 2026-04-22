const express = require("express");
const router = express.Router();
const Location = require("../models/Location");
const fs = require("fs");
const path = require("path");

// Get all locations
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find();
    if (!locations || locations.length === 0) {
        throw new Error("No locations via DB");
    }
    res.json(locations);
  } catch (error) {
    // Fallback to local JSON if DB fails
    try {
      const dataPath = path.join(__dirname, "../data/locations.json");
      const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      res.json(data);
    } catch (fsError) {
      res.status(500).json({ message: error.message });
    }
  }
});

// Search locations
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const results = await Location.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { room: { $regex: query, $options: "i" } },
        { block: { $regex: query, $options: "i" } },
        { floor: { $regex: query, $options: "i" } }
      ]
    });
    res.json(results);
  } catch (err) {
    try {
      const query = (req.query.q || "").toLowerCase();
      const dataPath = path.join(__dirname, "../data/locations.json");
      const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      const results = data.filter(loc => 
        (loc.name && loc.name.toLowerCase().includes(query)) ||
        (loc.room && loc.room.toLowerCase().includes(query)) ||
        (loc.block && loc.block.toLowerCase().includes(query)) ||
        (loc.floor && loc.floor.toLowerCase().includes(query))
      );
      res.json(results);
    } catch (fsError) {
      res.status(500).json({ message: err.message });
    }
  }
});

module.exports = router;