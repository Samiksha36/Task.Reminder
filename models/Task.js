// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    presentDate: { type: Date, required: true },
    futureDate: { type: Date, required: true },
    priority: { type: String, required: true }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
