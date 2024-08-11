const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const schedule = require('node-schedule'); 
const User = require('./models/User'); 
const Task = require('./models/Task'); 
const twilio = require('twilio');


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cors());
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // For development, set to true if using HTTPS in production
}));


// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/taskReminderDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define the Schema
const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    presentDate: { type: Date, required: true },
    futureDate: { type: Date, required: true },
    priority: { type: Number, required: true, min: 1000, max: 1000000 }
});

const task = mongoose.model('task', taskSchema);

//Twilio credintials
const accountSid = 'AC21763206c9f0cd90cc066200f6692d2f';
const authToken = 'd21cf4d87c94552c7aacaecee20f8948';
const client = new twilio(accountSid, authToken);


//fixed phone number for sms
const fixedPhoneNumber = '+91-9370468626'; //replaced with twilio phone number

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/taskReminderDB', {
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {

        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}


// Handle Sign Up
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        req.session.user = user;        
        res.redirect(`/login?message=${encodeURIComponent('Signup successful')}`);

        
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Error during registration');
    }
});

// Handle Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send('Invalid email or password');
        }
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
            req.session.user = user;        
            res.redirect(`/index?message=${encodeURIComponent('Login successful')}`);


        } else {
            res.status(401).send('Invalid email or password');
        }
       
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Error during login');
    }
});


// Create a Task (Authenticated)
app.post('/addTask', isAuthenticated, async (req, res) => {
    try {
        const { name, presentDate, futureDate, priority } = req.body;

        // Validate date strings if needed
        if (!name || !presentDate || !futureDate || !priority) {
            return res.status(400).send('Missing required fields');
        }

        // Ensure that the dates are valid Date objects
        const futureDateObj = new Date(futureDate);

        if (isNaN(presentDate) || isNaN(futureDateObj)) {
            return res.status(400).send('Invalid date format');
        }

        const task = new Task({
            name,
            presentDate,
            futureDate: futureDateObj,
            priority
        });
        
        await task.save();

        // Schedule the task for the future date
        schedule.scheduleJob(futureDateObj, function() {
            console.log(`Reminder for ${name}`);
            // Here you can send an alert to the user (e.g., email, push notification, etc.)
        });

        // Send SMS notification using Twilio or similar service
        client.messages.create({
            body: `Reminder: Call ${name} Today. It's their due date`,
            from: '+15865018127', // Replace with your Twilio phone number
            to: fixedPhoneNumber // Ensure this is set appropriately
        })
        .then(message => console.log(`SMS sent: ${message.sid}`))
        .catch(error => console.error('Error sending SMS:', error));

        res.status(200).send('Task added successfully');
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).send('Error adding task');
    }
});


app.use(express.static(path.join(__dirname, 'view')));

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'login.html'));
});

app.get('/index', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'view', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

app.get("/", (req, res) => {
    res.json({ message: "Hello" });
});

app.listen(3002, () => {
    console.log('Server running on port 3002');
});