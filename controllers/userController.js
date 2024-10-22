import UserModel from '../models/user.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import transporter from '../config/emailConfig.js'

class UserController {
    // ^---------------------------------------------------------------------------------------------------------
    static userRegistration = async (req, res) => {
        const { name, email, password, password_confirmation, termAndCondition } = req.body
        const user = await UserModel.findOne({ email: email })

        //~ Check if user already exists
        if (user) {
            res.status(409).send({ "status": "failed", "message": "Email already exists" })
            //! 409 Conflict for the case where the email already exists.
        } else {
            // ~ // Check if all fields are provided
            if (name && email && password && password_confirmation && termAndCondition) {
                //~ Check if password and password confirmation match
                if (password === password_confirmation) {
                    try {
                        const salt = await bcrypt.genSalt(10) // 10 times hashing to password
                        const hashPassword = await bcrypt.hash(password, salt)

                        const doc = new UserModel({
                            name: name,
                            email: email,
                            password: hashPassword,
                            termAndCondition: termAndCondition
                        })
                        await doc.save()
                        const saved_user = await UserModel.findOne({ email: email })

                        //^ Generate JWT Token
                        const token = jwt.sign({ userID: saved_user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '5d' })

                        // //^ Send token as an HttpOnly cookie
                        res.cookie('token', token, {
                            httpOnly: true,   // This flag makes the cookie inaccessible to JavaScript
                            secure: process.env.NODE_ENV === 'production' || "dev", // Secure flag for HTTPS in production
                            sameSite: 'strict',  // Helps prevent CSRF attacks or `Lax`
                            maxAge: 5 * 24 * 60 * 60 * 1000 // Token expires in 5 days
                        })

                        res.status(201).send({ "status": "success", "message": "Registration Success" })
                        // * 201 for user is created.
                    } catch (error) {
                        // console.log(error)
                        res.status(500).send({ "status": "failed", "message": "Unable to Register" })
                        // ! 500 Internal Server Error for server errors during registration.
                    }
                } else {
                    res.status(400).send({ "status": "failed", "message": "Password and Confirm Password doesn't match" })
                    //! 400 Bad Request for missing fields or password mismatch.
                }
            } else {
                res.status(400).send({ "status": "failed", "message": "All fields are required" })
                //! 400 Bad Request for missing fields or password mismatch.
            }
        }
    }
    // ^---------------------------------------------------------------------------------------------------------

    static userLogin = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Check if email and password are provided
            if (email && password) {
                const user = await UserModel.findOne({ email: email });

                // Check if user exists
                if (user != null) {
                    const isMatch = await bcrypt.compare(password, user.password);

                    // Check if email and password match
                    if (isMatch) {
                        //^ Generate JWT Token
                        const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '5d' });

                        // //^ Send token as an HttpOnly cookie
                        res.cookie('token', token, {
                            httpOnly: true,   // This flag makes the cookie inaccessible to JavaScript
                            secure: process.env.NODE_ENV === 'production' || "dev", // Secure flag for HTTPS in production
                            sameSite: 'strict',  // Helps prevent CSRF attacks or `Lax`
                            maxAge: 5 * 24 * 60 * 60 * 1000 // Token expires in 5 days
                        })

                        res.status(200).send({ "status": "success", "message": "Login Success" });
                    } else {
                        // Incorrect email or password
                        res.status(401).send({ "status": "failed", "message": "Email or Password is not Valid" });
                    }
                } else {
                    // User not found
                    res.status(404).send({ "status": "failed", "message": "You are not a Registered User" });
                }
            } else {
                // Missing fields
                res.status(400).send({ "status": "failed", "message": "All Fields are Required" });
            }
        } catch (error) {
            console.log(error);
            // Server error
            res.status(500).send({ "status": "failed", "message": "Unable to Login" });
        }
    };

    // ^---------------------------------------------------------------------------------------------------------

    static changeUserPassword = async (req, res) => {
        const { password, password_confirmation } = req.body
        if (password && password_confirmation) {
            if (password !== password_confirmation) {
                res.send({ "status": "failed", "message": "New Password and Confirm New Password doesn't match" })
            } else {
                const salt = await bcrypt.genSalt(10)
                const newHashPassword = await bcrypt.hash(password, salt)
                await UserModel.findByIdAndUpdate(req.user._id, { $set: { password: newHashPassword } })
                res.send({ "status": "success", "message": "Password changed successfully" })
            }
        } else {
            res.send({ "status": "failed", "message": "All Fields are Required" })
        }
    }
    // ^---------------------------------------------------------------------------------------------------------

    static loggedUser = async (req, res) => {
        res.send({ "user": req.user })
    }
    // ^---------------------------------------------------------------------------------------------------------

    static sendUserPasswordResetEmail = async (req, res) => {
        const { email } = req.body
        if (email) {
            const user = await UserModel.findOne({ email: email })
            if (user) {
                const secret = user._id + process.env.JWT_SECRET_KEY
                const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '15m' })
                const link = `http://127.0.0.1:3000/api/user/reset/${user._id}/${token}`
                console.log(link)
                //& Send Email
                let info = await transporter.sendMail({
                  from: process.env.EMAIL_FROM,
                  to: user.email,
                  subject: "Exam Portal - Password Reset Link",
                  html: `<a href=${link}>Click Here</a> to Reset Your Password`
                })
                res.send({ "status": "success", "message": "Password Reset Email Sent... Please Check Your Email" })
            } else {
                res.send({ "status": "failed", "message": "Email doesn't exists" })
            }
        } else {
            res.send({ "status": "failed", "message": "Email Field is Required" })
        }
    }
    // ^---------------------------------------------------------------------------------------------------------
    static userPasswordReset = async (req, res) => {
        const { password, password_confirmation } = req.body
        const { id, token } = req.params
        const user = await UserModel.findById(id)
        const new_secret = user._id + process.env.JWT_SECRET_KEY
        try {
            jwt.verify(token, new_secret)
            if (password && password_confirmation) {
                if (password !== password_confirmation) {
                    res.send({ "status": "failed", "message": "New Password and Confirm New Password doesn't match" })
                } else {
                    const salt = await bcrypt.genSalt(10)
                    const newHashPassword = await bcrypt.hash(password, salt)
                    await UserModel.findByIdAndUpdate(user._id, { $set: { password: newHashPassword } })
                    res.send({ "status": "success", "message": "Password Reset Successfully" })
                }
            } else {
                res.send({ "status": "failed", "message": "All Fields are Required" })
            }
        } catch (error) {
            console.log(error)
            res.send({ "status": "failed", "message": "Invalid Token" })
        }
    }
    // ^---------------------------------------------------------------------------------------------------------

}

export default UserController
