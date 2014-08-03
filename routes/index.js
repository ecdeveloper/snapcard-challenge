var express = require('express');
var router = express.Router();
var bitcoin = require('bitcoinjs-lib');

// System wallet. All invoices are generated for this wallet. mainnet.
var systemWallet = new bitcoin.Wallet(bitcoin.crypto.sha256('SnapcardSystemWalletSuperMegaSeed!#%&(24680'));

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index', { title: 'Snapcard Invoice Demo' });
});

module.exports = router;
