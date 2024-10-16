const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    phone_number: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        required: true,
        default: "user"
    },
    created_date: {
        type: Date,
        default: Date.now
    },
    user_status: {
        type: String,
        default: "active"
    }
})

const User = mongoose.model("User", userSchema);

module.exports = User;