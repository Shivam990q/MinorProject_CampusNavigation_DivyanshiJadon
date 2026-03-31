const express = require("express");
const router = express.Router();
const Location = require("../models/Location");

// Get all locations
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;