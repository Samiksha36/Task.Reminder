const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const schedule = require('node-schedule'); 
const User = require('./models/User'); // Ensure this path is correct
const Task = require('./models/Task'); // Ensure this path is correct

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
        res.redirect('/index');
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
            res.redirect('/index');
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

        if (!name || !presentDate || !futureDate || !priority) {
            return res.status(400).send('Missing required fields');
        }

        const task = new Task({ name, presentDate, futureDate, priority });
        await task.save();

        // Schedule the task
        schedule.scheduleJob(new Date(futureDate), function() {
            console.log(`Reminder for ${name}`);
            // Implement actual reminder logic here
        });

        res.status(200).send('Task added successfully');
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).send('Error adding task');
    }
});

// Delete a Task (Authenticated)
app.delete('/deleteTask/:id', isAuthenticated, async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).send('Error deleting task');
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
