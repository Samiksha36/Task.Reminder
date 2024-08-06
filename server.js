const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const schedule = require('node-schedule');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const twilio = require('twilio');


const app = express();
app.use(express.json());
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

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    //unique: true
  },
  password: {
    type: String,
    required: true
  }
});


const User = mongoose.model('User', userSchema);

module.exports = User;


const Task = mongoose.model('Task', taskSchema);

// Middleware to check if the user is authenticated
// function isAuthenticated(req, res, next) {
//     if (req.session.username) {
//         next();
//     } else {
//         res.status(401).send('Unauthorized');
//     }
// }
// app.post('/addTask', Authenticated,async (req, res) => {
//     try {
//         const { name, presentDate, futureDate, priority } = req.body;
//         const task = new Task({ name, presentDate, futureDate, priority });
//         await task.save();

//         // Schedule the task
//         schedule.scheduleJob(new Date(futureDate), function() {
//             console.log(`Reminder for ${name}`);
//             // Send alert to user (this can be an email, push notification, etc.)
//         });

//         res.status(200).send('Task added successfully');
//     } catch (error) {
//         console.error('Error adding task:', error);
//         res.status(500).send('Error adding task');
//     }
// });

app.post('/login',async(req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
        return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
        email,
        password
    });  

    // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }

    // Method to compare password
    userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  }
});

//Create a Task (Authenticated)
app.post('/addTask',async (req, res) => {
    try {
        const { name, presentDate, futureDate, priority } = req.body;
        const task = new Task({ name, presentDate, futureDate, priority });
        await task.save();

        // Schedule the task
        schedule.scheduleJob(new Date(futureDate), function() {
            console.log(`Reminder for ${name}`);
            // Send alert to user (this can be an email, push notification, etc.)
        });

        res.status(200).send('Task added successfully');
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).send('Error adding task');
    }
});

// Delete a Task (Authenticated)
/*app.delete('/deleteTask/:id', isAuthenticated, async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.status(200).send('Task deleted successfully');
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).send('Error deleting task');
    }
});*/
app.use(express.static(path.join(__dirname, 'view')));

app.get('/login', async(req, res) => {
  /*try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send('Server Error');
  }*/
    res.sendFile(path.join(__dirname, 'view', 'login.html'));
});
app.get('/index', async(req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'index.html'));
});
app.get("/", (req, res) => {
    res.json({ message: "Hello Users" });
  });
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
