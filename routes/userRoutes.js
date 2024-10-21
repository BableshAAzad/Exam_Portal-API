import express from 'express';
const router = express.Router();
import UserController from '../controllers/userController.js';
import checkUserAuth from "../middlewares/auth-middleware.js"

// const userController = require('./controllers/userController');
router.use('/change-password', checkUserAuth)
router.use('/logged-user', checkUserAuth)

// Route Level Middleware - To Protect Route

// Public Routes
router.post('/register', UserController.userRegistration)
router.post('/login', UserController.userLogin)
router.post('/send-reset-password-email', UserController.sendUserPasswordResetEmail)

// Protected Routes
router.post('/change-password', UserController.changeUserPassword)
router.get('/logged-user', UserController.loggedUser)


export default router

