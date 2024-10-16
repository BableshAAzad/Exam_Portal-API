import express from 'express';
const router = express.Router();
import UserController from '../controllers/userController.js';
// const userController = require('./controllers/userController');

// Route Level Middleware - To Protect Route

// Public Routes
router.post('/register', UserController.userRegistration)
router.post('/login', UserController.userLogin)

// Protected Routes

export default router

