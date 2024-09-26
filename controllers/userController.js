import UserModel from '../models/user.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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

}

export default UserController
