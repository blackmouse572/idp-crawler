import mongoose, { Schema } from 'mongoose';

const CRAWDATA_COLLECTION = 'crawdatas';

const CrawData = new Schema(
    {
        title: { type: String, unique: true },
        href: { type: String, unique: true },
        label: String,
        location: { type: String, required: false },
        level: { type: String, required: false },
        logo: { type: String, required: false },
        description: String,
    },
    {
        timestamps: true,
    }
);

const CrawDataDocument = mongoose.model(CRAWDATA_COLLECTION, CrawData);

export { CrawData, CRAWDATA_COLLECTION, CrawDataDocument };
