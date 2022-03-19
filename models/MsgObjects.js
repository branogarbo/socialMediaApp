const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Msg = new Schema({
    ownerId:
    {
        type: String,
        min: 1,
        max: 2000,
    },
    message:
    {
        type: String,
        min: 1,
        max: 2000
    },
    upvotes: {
        type: Number,
        default: 0,
        min: 0,
    },
    upvote_list: [{
        type: String,
        default: ""
    }],
    downvotes: {
        type: Number,
        default: 0,
        min: 0,
    },
    downvote_list: [{
        type: String,
        default: ""
    }],
    date: {
        type: Date,
        default: Date.now
    }
}, { collection: "messages" })

module.exports = mongoose.model("Messages", Msg);