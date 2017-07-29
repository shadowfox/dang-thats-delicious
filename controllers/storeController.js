const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  // fileFilter: function(...),
  fileFilter (req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed'}, false);
    }
  }
}

exports.homePage = (req, res) => {
  res.render('index', {
    title: 'Home'
  });
}

exports.getStoreBySlug = async (req, res) => {
  const store = await Store.findOne({ slug: req.params.slug })
    // Fill in the user object based on the author id field on the store
    .populate('author');
  
  // Handle 404
  if (!store) {
    return next();
  }

  res.render('store', { title: store.name, store })
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file) {
    next(); // skipthe next middleware
    return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // Now resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);

  // Once we have written the photo to filtsystem, keep going
  next();
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {

  // Query DB for all stores
  const stores = await Store.find();

  res.render('stores', {
    title: 'Stores',
    stores
  });
}

const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editStore = async (req, res) => {
  // Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  
  // Confirm they are the owner of the store
  confirmOwner(store, req.user);

  // Render out the edit form
  res.render('editStore', {
    title: `${store.name}`,
    store
  });
}

exports.updateStore = async (req, res) => {
    // Set the location data to be a point
    req.body.location.type = 'Point';

    // Find and update the store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true, // Return the new store instead of the old one
      runValidators: true,
    }).exec();

    // Redirect them to the store
    req.flash('success', `Successfully updated <a href="/stores/${store.slug}">${store.name}</a>`);
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreByTag = async (req, res) => {
  const activeTag = req.params.tag;
  const tagQuery = activeTag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });

  // Wait for all promises
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', {
    title: 'Tags',
    tags,
    stores,
    activeTag
  });
};

exports.searchStores = async (req, res) => {
  const stores = await Store.find({
    $text: {
      $search: req.query.q,
    }
  }, {
    // Project the score
    score: { $meta: 'textScore' }
  })
  // Sort by score
  .sort({
    score: { $meta: 'textScore' }
  })
  // Limit to only top 5 results
  .limit(5);

  res.json(stores);
};