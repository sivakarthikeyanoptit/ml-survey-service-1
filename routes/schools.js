var cassandra = require('cassandra-driver');

var client = new cassandra.Client({ contactPoints: ['35.200.172.221'] });
client.connect(function (err, result) {
	console.log('customers: cassandra connected');
});


/*
 * GET users listing.
 */
exports.list = function (req, res) {
	//school_registry
	client.execute('SELECT * FROM shikshalokam.school_registry', [], function (err, result) {
		if (err) {
			res.status(404).send({ msg: err });
		} else {
			// console.log('customers: list succ:', result.rows);
			res.send({ data: result.rows });
		}
	});

};


