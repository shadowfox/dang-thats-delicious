const mongoose = require('mongoose');
// Tell mongoose to use the built-in ES6 promise
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'Please supply coordinates'
    }],
    address: {
      type: String,
      required: 'Please supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  // Eager load virtuals
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    // Skip and return
    next();
    return;
  }

  this.slug = slug(this.name);

  // Deal with slug collisions
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // Lookup stores and populate their reviews
    { $lookup: {
      from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
    // Filter for only stores that have 2 or more reviews
    // (reviews.0 is the first item)
    { $match: { 'reviews.1': { $exists: true } }},
    // Add the average reviews field
    // (MongoDB 3.4 supports $addField instead of $project.
    //  Can use this to not loose all our fields)
    { $project: {
      name: '$$ROOT.name',
      slug: '$$ROOT.slug',
      photo: '$$ROOT.photo',
      reviews: '$$ROOT.reviews',
      averageRating: { $avg: '$reviews.rating' }
    }},
    // Sort it by our new field - highest reviews first
    { $sort: { averageRating: -1 }},
    // Limit to 10
    { $limit: 10 }
  ]);
};

storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', // Field on the store
  foreignField: 'store' // Field on the review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
