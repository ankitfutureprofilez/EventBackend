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
    creted_at :{
        type: Date,
        default: Date.now
    },
    userId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    enquire_status :{
        type: String,
        default: "pending"
    }
})


const Enquiry = mongoose.model("Enquiry", EnquirySchema);

module.exports = Enquiry;