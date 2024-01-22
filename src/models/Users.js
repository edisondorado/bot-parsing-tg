const mongoose = require("mongoose");

const requiredString = {
    type: String,
    required: true,
};

const requiredNumber = {
    type: Number,
    required: true,
}

const requiredBoolean = {
    type: Boolean,
    required: true,
};

const UserSchema = mongoose.model("TechUsers", new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true,
    },
    nick: requiredString,
    server: requiredString,
    active: requiredBoolean,
    admin: requiredBoolean,
    isMajor: requiredBoolean,
    acceptedOffers: Number,
    declinedOffers: Number,
    notification: requiredBoolean,
    accessAdmins: requiredBoolean,
    isTech: requiredBoolean
}));

const TopicSchema = mongoose.model("TopicsTech", new mongoose.Schema({
    id: {
        type: String,
        unique: true,
        required: true,
    },
    answers: Array
}))

module.exports = { UserSchema, TopicSchema };