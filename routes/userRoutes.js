const express = require("express");
const { registerUser } = require("../controllers/userController");

const router = express.Router();

// Register User
router.post("/register", registerUser);

module.exports = router;
