import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';
import { sendVerificationCode } from "../services/emailService";

//import { dateFormater } from "../helpers/utils";
import { existReferralCode, existUserCredentials, existUserVerifiedOrUnverified, existVerificationCode } from "../querys/verificationsQuerys";
import { insertUserToVerify, insertUserVerified } from "../querys/createUsersQuerys";

const EXPIRE_TOKEN = 60 * 60;

//TODO ARREGLAR ERRORS RESPONSE


function generateHashedPassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    return hashedPassword;
}

export const addUserToVerify = async (req: Request, res: Response) => {
    const { username, name, lastname, email, password, CI, birthdate, referredCode } = req.body;
    console.log(req.body)
    
    try {
        if (!username || !name || !lastname || !email || !password || !birthdate || !CI || !referredCode) {
            res.status(400).send({ error: true, message: 'Fields cannot be null' });
            return;
        } 

        const exist = await existReferralCode(referredCode);
        if (!exist) {
            res.status(400).send({ error: true, message: 'Referral code is invalid.', name: "InvalidReferralCode"});
            return;
        }
        
        const existCredentianls = await existUserVerifiedOrUnverified(email, username, CI);
        if (existCredentianls) {
            res.status(400).send({ error: true, message: `Already exists a user with the email: ${email}, username: ${username} or cedula: ${CI}`, name: 'CredentialsAlredyExistsError' });
            return;
        }

        const verificationCode = await sendVerificationCode(email);
        if(verificationCode == -1){
            res.status(500).send({error: true, message: 'Verification code can not be created.'});
            return;
        }

        const hashedPassword = generateHashedPassword(password);
        await insertUserToVerify(CI, username, name, lastname, birthdate, referredCode, email, hashedPassword, verificationCode);

        res.status(200).send({ error: false, message: "Verification code send." });

    } catch (e) {
        console.log(e);
        res.status(500).send({ error: true, message: "Internal server error", name: 'ServerError' });
    }
}

export const userVerification = async (req, res) => {
    const { verificationCode, email } = req.body;
    console.log("cadoifo", req.body);

    try {

        if (!verificationCode || !email) {
            res.status(400).send({ error: true, message: 'Fields cannot be null' });
            return;
        }

        if (verificationCode.toString().length < 5) {
            res.status(400).send({ error: true, message: 'Verification code have an incorrect format.', name: "InvalidVerificationCode" });
            return;
        }
        
        const verificationResult = await existVerificationCode(verificationCode, email);
        if (!verificationResult) {
            res.status(400).send({ error: true, message: 'Verification code is invalid.', name: "InvalidVerificationCode" });
            return
        } 

        await insertUserVerified(verificationCode, email);
        res.status(200).send({ error: false, message: 'User created!!' });

    } catch (e) {
        console.log(e)
        res.status(500).send({ error: true, message: "Internal server error", name: 'ServerError' });
    }
}

function generateJWT(userId: number, username: string) {

    const payload = { userId, username };
    const token = jwt.sign(payload, process.env.PRIVATE_KEY!, {
        expiresIn: EXPIRE_TOKEN
    });

    return token;
}

export const userLogin = async (req: Request, res: Response) => {
    const { password, cedula } = req.body;

    try {

        if (!password || !cedula) {
            res.status(400).send({ error: true, message: 'Fields cannot be null' });
            return;
        } 
        
        const user = await existUserCredentials(cedula);

        if (user) {

            const { username } = user;
            const hashedPassword = user.hashed_password;
            const userId = user.id;

            const validPassword = bcrypt.compareSync(password, hashedPassword);

            if (validPassword) {
                const token = generateJWT(userId, username);

                const userInfo = {
                    userID: userId,
                    token: token,
                    expiresIn: EXPIRE_TOKEN
                };

                res.status(200).send(userInfo);
                return;
            }
        } 

        res.status(400).send({ error: true, message: 'Wrong username or password.', name: 'InvalidUsernameOrPassword' });

    } catch (e) {
        console.log(e);
        res.status(500).send({ error: true, message: "Internal server error", name: 'ServerError' });
    }
}
