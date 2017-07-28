const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/add', storeController.addStore);

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.post('/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);

router.post('/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);

router.get('/stores/:id/edit', catchErrors(storeController.editStore));

module.exports = router;

/*
router.get('/', (req, res) => {
  const wes = { name: 'Wes', cool: true };
  //res.json(wes);
  //res.send('Hey! It works!');
  //res.json(req.query);
  res.render('hello', {
    name: 'Wes',
    title: 'Hello'
  });
});

router.get('/reverse/:name', (req, res) => {
  const reverse = [...req.params.name].reverse().join('');
  res.send(reverse);
});
*/
