import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    birthday: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;

