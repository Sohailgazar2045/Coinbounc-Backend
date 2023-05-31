const express = require("express");
const authController = require("../controllers/authController");
const blogController = require("../controllers/blogController");
const commentController = require("../controllers/commentController");
const router = express.Router();
const auth = require("../middleware/auth");
// User

// register
router.post("/register", authController.register);

// login
router.post("/login", authController.login);

// logout
router.post("/logout", auth, authController.logout);

// Refresh token
router.get("/refresh", auth, authController.refresh);

// blog

// create
router.post("/blog", auth, blogController.create);

// get all
router.get("/blog/all", auth, blogController.getAll);

// get blog by id
router.get("/blog/:id", auth, blogController.getById);

// update
router.put("/blog", auth, blogController.update);

// delete
router.delete("/blog/:id", auth, blogController.delete);

// Comment

// create
router.post("/comment", auth, commentController.create);

// get
router.get("/comment/:id", auth, commentController.getById);

module.exports = router;
