import mongoose from 'mongoose';

const scrapbookEntrySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const ScrapbookEntry = mongoose.model('ScrapbookEntry', scrapbookEntrySchema);

export default ScrapbookEntry;

