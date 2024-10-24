const mongoose = require("mongoose")


const contactSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    reply_message: {
        type: String,
        
    }
    ,
    contact_status : {
        type: String,
        default: "unread"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Contact = mongoose.model("Contact", contactSchema)
module.exports = Contact;