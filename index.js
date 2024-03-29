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

const Msg = require("./models/MsgObjects")

const { registerValidation, loginValidation } = require("./validation")

//lets us use the mongoose library
const mongoose = require("mongoose")

const max = 10;

require("dotenv").config();
//this allows usage of .env files, DO NOT USE LINE IN PRODUCTION


app.use(cookieParser())
//using the cookieParser module as a middlewear function to parse cookies for us to use

app.use(express.json())
//using express's json middleware to parse req.body into a JSON object

//Connects us to the mongoose database using DOT ENV mongoose link
mongoose.connect(process.env.MONGO_CONNECT, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    //prints thatwe are connected
    console.log("connected to db!")
})

// let Accounts = {};
//allows account information to be stored and modified through a JSON object in Accounts 

app.get("/", (req, res) => { //listening for a requests and executes the function
    res.sendFile(path.join(__dirname, "public", "index.html"))
    //sends the index.html file to the user for their browser to render
})

const TokenCheck = (req, res, next) => //creates a middleware function named TokenCheck
{
    const token = req.cookies.authToken;
    //Reads the cookies from the user and stores that in the token variable
    if (!token) return res.send("Error! You aren't logged in!");
    //Checks if there is a cookie, if not cookie not logged in and tells the user they aren't logged in.
    try
    //Tries to check if the token present is actually a correct token
    {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET)
        //grabs the TOKEN_SECRET variable in .env file and checks if the token matches the password. If not, throw an error
        req.user = verified;
        //Stores the verified object into req.user so it can be accessed later.
        next();
        //Moves onto the next middleware/function
    }
    catch (err)
    //
    {
        res.status(400).send("Error you aren't logged in!");
    }
}

app.get("/homepage", TokenCheck, (req, res) => //Listening for a GET request on /homepage, then uses the TokenCheck middleware to make sure they are logged in. If they are send back the homepage html.
{
    res.sendFile(path.join(__dirname, "public", "authHomepage.html"))
    //sends the user the authHomepage.html.
})

/*app.get("/logout",(req, res)=> 
{
    req.clear
})*/

//defines as an async function
app.post("/api/user/register", async (req, res) => //Listens for a post request on the given route and handles the data
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
    const { error } = registerValidation(data)
    if (error) return res.status(400).send({ error: true, message: error.details[0].message })

    //checks the emailExists by looking in the database with an existing email, sends email already exists to the client
    const emailExists = await User.findOne({ email: email })
    if (emailExists) return res.status(400).send({ error: true, message: "email already exists!" })

    //if (Accounts[username]) return res.status(400).send({error:true, message:"this account name is taken"})
    //checks to see if there is a already made account with the same username in the Accounts JSON object, if so send an error

    const hashedPassword = await bcrypt.hash(password, 10)
    //10 is the complexity level of hashing. Higher level is more hashing.
    //uses bcrypt to hash the password and store that in the hashedPassword variable

    //Formatting the registration data for MongoDB
    const user = new User({
        username: username,
        email: email,
        password: hashedPassword,
        friendlist: JSON.stringify([])
    })
    try {
        //Saves the user into the data base and returns the newly saved information, and makes a secret token from the ID
        const savedUser = await user.save();
        const token = jwt.sign({
            _id: savedUser._id,
            username: savedUser.username,
            profilePicture: savedUser.profilePicture,
        }, process.env.TOKEN_SECRET) //the authToken step
        //hashes and creates a token with the json object username
        res.clearCookie("authToken");
        //clears the cookie
        res.cookie("authToken", token, { maxAge: 900000, httpOnly: true })
        //sets the cookie as the token with certain security parameters
        res.send({ error: false, message: token });
        //sends the error, and sends the token back
    }
    catch (error) {
        res.status(400).send({ error: true, message: error.message })
    }
})
app.get("/api/user/logout", (req, res) => { //listens for GET request
    //clears the cookie
    res.clearCookie("authToken");
    res.send({ error: false });
    //clears the cookie so if they try and go to a atuenticated route they wont have the "wirstband" to get in
})

app.post("/api/user/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    //reading the username and password the user put

    //Wraps the data into json and stores it into a variable named data
    const data =
    {
        email: email,
        password: password,

    }

    //Checks for an error in the data such as formatting and returns to the client the error
    const { error } = loginValidation(data);
    if (error) return res.status(400).send({ error: true, message: error.details[0].message })

    //Checks if the email exists in the database by looking in the data base for an account with that email. If there isn't an email return an error to the client.
    const emailExists = await User.findOne({ email: email });
    if (!emailExists) return res.status(400).send({ error: true, message: "Email or Password incorrect!" });

    //Checks to see if the hashed password matches the inputted password
    const validPass = await bcrypt.compare(password, emailExists.password)


    //if(!Accounts[username]) return res.status(400).send({error:true, message:"Username or password incorrect"})
    //Checks if the username exists, if not send an error

    //const validPass = await bcrypt.compate(password, Accounts[username].password)
    //Checks if the given password matches the hashed password

    if (!validPass) return res.status(400).send({ error: true, message: "Username or password incorrect" })
    //if validpass is false (undefined) then it returns an error

    const token = jwt.sign({
        _id: emailExists._id,
        username: emailExists.username,
        profilePicture: emailExists.profilePicture,
    }, process.env.TOKEN_SECRET) //The authToken step
    //creates a token that stores the hashed username

    res.clearCookie("authToken");
    res.cookie("authToken", token, { maxAge: 900000, httpOnly: true })
    //Clears the cookie and sets the new token as the cookie with parameters

    res.send({ error: false, message: token })
    //Sends that there were no errors
})

app.get("/api/user/getUserDetails", TokenCheck, async (req, res) => {
    //req.user = {__id: budgiwq}

    //Looks through the database for the user with their id, and saves it in the variable userInfo. If the user does not exist send an error to the client.
    const userInfo = await User.findById(req.user);
    if (!userInfo) return res.status(400).send({ error: true })

    console.log(userInfo)
    console.log(userInfo)
    //Sends the users's information to the client so they can 
    res.send({ error: false, username: userInfo.username, imageLink: userInfo.profilePicture })
})

app.post("/api/message/postMessage", TokenCheck, async (req, res) => {
    var msg = req.body.msg;
    if (msg.trim().length == 0) return res.status(400).send({ error: true, msg: "must send a message" })

    const Message = new Msg(
        {
            ownerId: req.user._id,
            message: msg
        }
    )
    try {
        let msg = await Message.save();
        res.json({ error: false, name: req.user.username, message: msg.message, id: msg._id, pfpLink: req.user.profilePicture, upvotes: msg.upvotes, downvotes: msg.downvotes, upvote_list: msg.upvote_list, downvote_list: msg.downvote_list, user_id: req.user._id });
    } catch (err) {
        res.json({ error: true, message: "could not save message to database" });
    }
})

app.get("/api/message/getMessages", TokenCheck, async (req, res) => {
    //finds the userAccount by the token's id and returns the account's information
    const userAccount = await User.findById(req.user);
    //if cannot find the account send an error as userAccount is undefined 
    if (!userAccount) return res.status(400).send({ error: true, message: "Your account does not exist?" })

    //makes the friends list variable and creates an array by parsing the string array into an actual array
    const friends = JSON.parse(userAccount.friendlist);
    //looks through the messages and finds which belongs to the userAccount
    const selfMessages = await Msg.find({ ownerId: req.user });

    // const selfMessages = [
    //     {msg:"BALLS", date:200},
    //     {msg:"MEOW", date:232},
    //     {msg:"BARK", date:120},
    //     {msg:"CAR", date:320},
    //     {msg:"DOG", date:2310},
    //     {msg:"RAT", date:21},
    //     {msg:"SAT", date:2230},
    //     {msg:"WQGGQW", date:210},
    //     {msg:"PMG", date:260},
    //     {msg:"OMG", date:210},
    //     {msg:"WOW!", date:211},
    //     {msg:"BOOM", date:223},
    //     {msg:"ZOOM", date:212},
    // ]

    //if you have no friends and no messages then display nothing and saves processing power since nothing would return 
    if (friends.length == 0 && selfMessages.length == 0) return res.send({ error: false, data: [] })

    //10 messages
    //if friends then creates three empty arrays
    //stores the literal messages to display
    let messages = [];
    //stores when the messages were sent for the algorithm
    let dateMessage = [];
    //who sent the messages 
    let userInfos = [];

    //adds the first element to the array so it is not empty, we do this because if the array is empty the for loop has nothing to loop through.
    messages.push(selfMessages[0])

    var firstDate = selfMessages[0].date.getTime();

    dateMessage.push(firstDate)

    userInfos.push({
        _id: userAccount._id,
        username: userAccount.username,
        pfp: userAccount.profilePicture
    })

    //loops through the selfMessages array except for the first one
    for (let i = 1; i < selfMessages.length; i++) {
        //stores the ms from the starting date (Jan 1 1970) into the variable messageDate.
        var messageDate = selfMessages[i].date.getTime()

        //a condition where if the message datez is the least out of the current dates and the length is 
        //less than the max, add the message to the end. 
        if (dateMessage[dateMessage.length - 1] >= messageDate && messages.length < max) {
            //pushes the information of the message, date, and user info into the messages array
            messages.push(selfMessages[i]);
            dateMessage.push(messageDate);
            userInfos.push({
                _id: userAccount._id,
                username: userAccount.username,
                pfp: userAccount.profilePicture
            })
        }
        //checks if the date being check is more recent than the last date in the array. 
        //if true: run our sorting algorithm
        else if (dateMessage[dateMessage.length - 1] < messageDate) {
            //It loops through all the elements in the messages array
            for (let y = 0; y < messages.length; y++) {
                //checks if the message is newer than the message at the y position in the messages array
                if (messageDate > dateMessage[y]) {
                    //uses the message data and puts the new message into the messages array at the y position
                    //splice: inserts an element and moves everthing after it to the right
                    messages.splice(y, 0, selfMessages[i]);
                    dateMessage.splice(y, 0, messageDate);
                    userInfos.splice(y, 0, {
                        _id: userAccount._id,
                        username: userAccount.username,
                        pfp: userAccount.profilePicture
                    })
                    //makes sure the messages is only added once to the array. It does this by stopping the for loop
                    break;
                }
            }
            //if the messages length is greater than the max, then remove the last element in the array. 
            if (messages.length > max) {
                //splice(a, b) a = position, b = how much to delete from that position
                messages.splice(max, 1)
                dateMessage.splice(max, 1)
                userInfos.splice(max, 1)
            }
        }
    }
    console.log(messages)
    console.log(dateMessage)
    console.log(userInfos);

    //sends to the client the messages to be show it on the webpage
    res.send({ error: false, message: messages, userInfos: userInfos })
})

app.post("/api/message/upvote", TokenCheck, async (req, res) => {
    let user_id = req.user._id;
    let message_id = req.body.msg_id;
    let message = await Msg.findById(message_id);
    let is_voted = message.upvote_list.includes(user_id);

    try {
        let newMessage = await Msg.findOneAndUpdate({ _id: message_id }, {
            upvotes: is_voted ? (message.upvotes - 1) : (message.upvotes + 1),
            upvote_list: is_voted ? message.upvote_list.filter(id => id !== user_id) : [...message.upvote_list, user_id],
        }, { returnOriginal: false });

        res.json({ error: false, data: newMessage });
    } catch (err) {
        res.status(501).json({ error: true, data: "error updating message document" });
    }
});

app.post("/api/message/downvote", TokenCheck, async (req, res) => {
    let user_id = req.user._id;
    let message_id = req.body.msg_id;
    let message = await Msg.findById(message_id);
    let is_voted = message.downvote_list.includes(user_id);

    try {
        let newMessage = await Msg.findOneAndUpdate({ _id: message_id }, {
            downvotes: is_voted ? (message.downvotes - 1) : (message.downvotes + 1),
            downvote_list: is_voted ? message.downvote_list.filter(id => id !== user_id) : [...message.downvote_list, user_id],
        }, { returnOriginal: false });

        res.json({ error: false, data: newMessage });
    } catch (err) {
        res.status(501).json({ error: true, data: "error updating message document" });
    }
});

//const friends = JSON.parse(userAccount.friendlist);


app.listen(3000, () => console.log("Server up"))
