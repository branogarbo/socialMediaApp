//index.js
const express = require("express");
//Importing express module and saving it in express variable

const app = express();
//create an express object and store it into the variable app
//can use app to create API routes

const path = require("path");
//imports the path module and stores that into the path variable.

const bcrypt = require("bcrypt");
//imports the bcrypt module and stores that into the bcrypt variable.

const jwt = require("jsonwebtoken");
//imports the jsonwebtoken module and stores that in the jwt 

const cookieParser = require("cookie-parser")
//imports the cookie-parser module and stores this into cookieParser

const User = require("./models/UserObject")
//allows us to use mongoose schema and store data in mongodb

const {registerValidation, loginValidation} = require("./validation")

//lets us use the mongoose library
const mongoose = require("mongoose")



require("dotenv").config();
//this allows usage of .env files, DO NOT USE LINE IN PRODUCTION


app.use(cookieParser())
//using the cookieParser module as a middlewear function to parse cookies for us to use

app.use(express.json())
//using express's json middleware to parse req.body into a JSON object

//Connects us to the mongoose database using DOT ENV mongoose link
mongoose.connect(process.env.MONGO_CONNECT, {useNewUrlParser:true, useUnifiedTopology:true}, ()=> 
{
    //prints thatwe are connected
    console.log("connected to db!")
})

// let Accounts = {};
//allows account information to be stored and modified through a JSON object in Accounts 

app.get("/", (req,res) => { //listening for a requests and executes the function
    res.sendFile(path.join(__dirname,"public","index.html") )
    //sends the index.html file to the user for their browser to render
})

const TokenCheck = (req,res, next)=> //creates a middleware function named TokenCheck
{
    const token = req.cookies.authCookie;
    //Reads the cookies from the user and stores that in the token variable
    if(!token) return res.send("Error! You aren't logged in!");
    //Checks if there is a cookie, if not cookie not logged in and tells the user they aren't logged in.
    try
    //Tries to check if the token present is actually a correct token
    {
        const verified = jwt.verify(token,process.env.TOKEN_SECRET)
        //grabs the TOKEN_SECRET variable in .env file and checks if the token matches the password. If not, throw an error
        req.user = verified;
        //Stores the verified object into req.user so it can be accessed later.
        next();
        //Moves onto the next middleware/function
    }
    catch(err)
    //
    {
        res.status(400).send("Error you aren't logged in!");
    }
}

app.get("/homepage", TokenCheck,(req, res) => //Listening for a GET request on /homepage, then uses the TokenCheck middleware to make sure they are logged in. If they are send back the homepage html.
{
    res.sendFile(path.join(__dirname,"public", "authHomepage.html"))
    //sends the user the authHomepage.html.
})

/*app.get("/logout",(req, res)=> 
{
    req.clear
})*/

                        //defines as an async function
app.post("/api/user/register", async(req, res) => //Listens for a post request on the given route and handles the data
{

    // console.log("FUCKKIKKKKK");
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;


    //stores username and password from the body sent from the user

    //if (password.length < 4) return res.status(400).send({error:true, message:"make a better password"}) //code might be wrong here
    //checks if the password is less than 4. If so send an error
/////////////////////////

    //stores username, email, and password from the body sent from the user

    //Wraps the input data in json, so our registraction validation can read our data
    const data = 
    {
        username: username,
        email: email,
        password: password
    }


    //Checks to make sure the data is formatted correctly, sends an error other wise.
    const{error} = registerValidation(data)
    if (error) return res.status(400).send({error:true, message: error.details[0].message})

    //checks the emailExists by looking in the database with an existing email, sends email already exists to the client
    const emailExists = await User.findOne({email: email})
    if (emailExists) return res.status(400).send({error:true, message: "email already exists!" })

    //if (Accounts[username]) return res.status(400).send({error:true, message:"this account name is taken"})
    //checks to see if there is a already made account with the same username in the Accounts JSON object, if so send an error

    const hashedPassword = await bcrypt.hash(password, 10)
    //10 is the complexity level of hashing. Higher level is more hashing.
    //uses bcrypt to hash the password and store that in the hashedPassword variable

    //Formatting the registration data for MongoDB
    const user = new User({
        username:username,
        email: email,
        password: hashedPassword,
        friendlist: JSON.stringify([])
    })
    try 
    {
        //Saves the user into the data base and returns the newly saved information, and makes a secret token from the ID
        const savedUser = await user.save();
        const token = jwt.sign({_id:savedUser.id}, process.env.TOKEN_SECRET) //the authToken step
        //hashes and creates a token with the json object username
        res.clearCookie("authToken");
        //clears the cookie
        res.cookie("authToken", token, {maxAge:900000, httpOnly:true})
        //sets the cookie as the token with certain security parameters
        res.send({error:false, message: token});
        //sends the error, and sends the token back
    }
    catch (error) {
        res.status(400).send({error:true, message:error.message})
    }
})
app.get ("/api/user/logout", (req, res)=>{ //listens for GET request
    //clears the cookie
    res.clearCookie("authToken");
    res.send({error:false});
    //clears the cookie so if they try and go to a atuenticated route they wont have the "wirstband" to get in
})

app.post("/api/user/login", async(req, res) =>
{
    const email = req.body.email;
    const password = req.body.password;
    //reading the username and password the user put

    //Wraps the data into json and stores it into a variable named data
    const data = 
    {
        email:email,
        password:password,

    }

    //Checks for an error in the data such as formatting and returns to the client the error
    const {error} = loginValidation(data);
    if(error) return res.status(400).send({error:true, message: error.details[0].message})

    //Checks if the email exists in the database by looking in the data base for an account with that email. If there isn't an email return an error to the client.
    const emailExists = await User.findOne({email: email});
    if(!emailExists) return res.status(400).send({error:true, message:"Email or Password incorrect!"});

    //Checks to see if the hashed password matches the inputted password
    const validPass = await bcrypt.compate(password, emailExists.password)


    //if(!Accounts[username]) return res.status(400).send({error:true, message:"Username or password incorrect"})
    //Checks if the username exists, if not send an error

    //const validPass = await bcrypt.compate(password, Accounts[username].password)
    //Checks if the given password matches the hashed password

    if(!validPass) return res.status(400).send({error:true, message:"Username or password incorrect"})
    //if validpass is false (undefined) then it returns an error

    const token = jwt.sign({_id:emailExists._id}, process.env.TOKEN_SECRET) //The authToken step
    //creates a token that stores the hashed username

    res.clearCookie("authToken");
    res.cookie("authToken", token, {maxAge:900000, httpOnly})
    //Clears the cookie and sets the new token as the cookie with parameters

    res.send({error:false, message: token})
    //Sends that there were no errors
})

app.get("api/user/logout", (req, res) => {

})

app.get("/api/user/getUserDetails", TokenCheck, async (req, res)=>
{
    //req.user = {__id: budgiwq}

    //Looks through the database for the user with their id, and saves it in the variable userInfo. If the user does not exist send an error to the client.
    const userInfo = await User.findById(req.user);
    if(!userInfo) return res.status(400).send({error:true})

    console.log(userInfo)
    console.log(userInfo)
    //Sends the users's information to the client so they can 
    res.send({error:false, username:userInfo.username, imageLink:userInfo.profilePicture})
})

app.post("/api/message/postMessage", TokenCheck, async(req, res) =>
{
    var msg = req.msg;
    if(msg.trim().length ==0 ) return res.status(200).send({error:true, msg:"must send a message"})

    const Message = new msg(
        {
            ownerId: req.user.__id,
            message: msg
        }
    )
    try{
        Message.save();
        res.json({error: false});
    } catch (err) {
        res.json({error: true, message: "could not save message to database"});
    }
})

app.listen(3000, () => console.log("Server up"))
    