const mongoose = require("mongoose")

const EnquirySchema = mongoose.Schema({
    name :{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    reply_message:{
        type: String,
        default: null
    },
    userId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    enquire_status :{
        type: String,
        default: "pending"
    },
    creted_at :{
        type: Date,
        default: Date.now
    }
})


const Enquiry = mongoose.model("Enquiry", EnquirySchema);

module.exports = Enquiry;