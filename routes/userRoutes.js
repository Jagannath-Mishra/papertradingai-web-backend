const express = require("express");
const { registerUser, loginUser } = require("../controllers/userController");

const router = express.Router();
/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with the provided details.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       500:
 *         description: Internal server error.
 */
// Register User
router.post("/register", registerUser);


/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Log in a user
 *     description: Authenticates a user and generates a JWT token.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "admin2@gmail.com"
 *               password:
 *                 type: string
 *                 example: "12345678"
 *     responses:
 *       200:
 *         description: User logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "jwt-token-example"
 *       401:
 *         description: Invalid credentials.
 *       500:
 *         description: Internal server error.
 */
router
// Login User - Generate JWT Token
router.post("/login", loginUser);

module.exports = router;
