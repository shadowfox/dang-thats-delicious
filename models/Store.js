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
  photo: String
});

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

module.exports = mongoose.model('Store', storeSchema);
