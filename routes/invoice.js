var express = require('express');
var router = express.Router();
var shortid = require('shortid');
var mongo = require('mongodb').MongoClient;
var config = require('../config');
var bitcoin = require('bitcoinjs-lib');
var request = require('request');
var WebSocket = require('ws');
var ws = new WebSocket('ws://ws.blockchain.info/inv');
var _ = require('lodash');

var satoshi = 0.00000001;
var snapcardWallet = new bitcoin.Wallet(bitcoin.crypto.sha256('SnapcardChallengeWalletSeed!@#$%^&*()'));
var bitcoindAddress = snapcardWallet.generateAddress();

var db = null;
mongo.connect('mongodb://' + config.db.host + ':' + config.db.port + '/' + config.db.name, { server: { auto_reconnect: true, socketOptions: { keepAlive: 1 } } }, function (err, dbObj) {
	if (err) {
		throw err;
	}

	db = dbObj;
	console.log('Connected to Mongo');
});


ws.on('open', function () {
    // ws.send('{"op":"unconfirmed_sub"}');
});

ws.on('message', function (data, flags) {
	var trx = null;

    try {
    	var obj = JSON.parse(data);
    	if (obj.op === 'utx' && obj.x) {
    		trx = obj.x;
    	}
    } catch (exc) {}

    if (!trx) {
    	return;
    }

    // The mesage is related to transaction. Check it out.
    var outputs = trx.out;
    // @TODO: Detect which is the snapcard address from the transaction output, and mark it as paid or partially paid.
});

ws.on('close', function () {
	// @TODO: Handle
});

/* GET users listing. */
router
.get('/new', function (req, res) {
	// Generate a random value (up to 0.001 BTCs)
	var randomValue = (Math.random() * 0.01 + 0.000001).toFixed(8);

	var invoiceObj = {
		invoiceId: shortid.generate(),
		created: Date.now(),
		value: randomValue,
		status: 'unpaid',
		snapcardAddress: snapcardWallet.generateAddress(),
		paid: 0
	};

	db.collection('invoices').insert(invoiceObj, function (err, objects) {
		if (err) {
			throw err;
		}

		// Subscribe to this new address transactions
		ws.send('{"op":"addr_sub", "addr":"'+ invoiceObj.snapcardAddress +'"}');
		res.json(invoiceObj);
	});
})
// .get('/checkpayment/:invoiceId', function (req, res) {
// 	var invoiceId = req.params.invoiceId;

// 	db.collection('invoices').findOne({ invoiceId: invoiceId }, function (err, invoice) {
// 		if (err || !invoice) {
// 			return res.send('No such invoice found');
// 		}

// 		if (invoice.status !== 'paid')
// 	});
// })
.get('/:invoiceId/:type?', function (req, res) {
	var invoiceId = req.params.invoiceId;
	var outputType = req.params.type;

	db.collection('invoices').findOne({ invoiceId: invoiceId }, function (err, invoice) {
		if (err || !invoice) {
			return res.send('No such invoice found');
		}

		var outputInvoice = function (invoice) {
			var invoiceObj = {
				invoiceId: invoice.invoiceId,
				invoiceValue: invoice.value,
				invoiceStatus: invoice.status,
				invoiceAddress: invoice.snapcardAddress,
				owedValue: owedValue,
				paidValue: invoice.paid
			};

			if (outputType && outputType == 'json') {
				return res.json(invoiceObj);
			}

			var output = '<b>Invoice found</b><hr>';
			output += 'Created: ' + (new Date(invoice.created)).toString() + '<br>';
			output += 'Total value: ' + invoice.value + ' BTC<br>';
			output += 'Status: ' + invoice.status + '<br>';
			output += 'Snapcard Addr: ' + invoice.snapcardAddress + '<br>';
			output += 'Paid amount: ' + invoice.paid + '<br>';
			output += 'Amount owed: ' + (invoice.value - invoice.paid) + '<br>';

			console.log(invoice);
			// res.send(output);
			var owedValue = invoice.value - invoice.paid;

			res.render('invoice', invoiceObj);
		};

		// Invoice was not paid completely. Check the payments to this address.
		if (invoice.status !== 'paid') {
			return request('https://blockchain.info/q/getreceivedbyaddress/' + invoice.snapcardAddress, function (err, response, body) {
				if (err) {
					throw err;
				}

				var paidSatoshi = parseInt(body);
				var paidBTC = paidSatoshi / 100000000;

				if (paidBTC == 0) {
					return outputInvoice(invoice);
				}

				invoice.paid += paidBTC;

				var updateInvoiceObj = {
					status: paidBTC < invoice.value ? 'partially-paid' : 'paid',
					paid: paidBTC
				};

				db.collection('invoices').update({ _id: invoice._id }, { $set: updateInvoiceObj }, function (err) {
					if (err) {
						throw err;
					}

					invoice.status = updateInvoiceObj.status;
					invoice.paid = updateInvoiceObj.paid;

					outputInvoice(invoice);
				});
			});
		}

		outputInvoice(invoice);
	});
});

module.exports = router;