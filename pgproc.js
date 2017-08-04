var knex = require('knex');
module.exports = function (RED) {

function loop(dbc, i, prop, that, data) {
    console.log("prop: " + JSON.stringify(prop));
    console.log(`sesids: ${prop.sesids}`);
    if (i < prop.sesids.length) {
        var sql = `select pypex('${prop.function}', '${prop.source}', '*', ${prop.sesids[i]}, NULL, 0, '${prop.args}', '${prop.result}', ${prop.rows})`
        console.log('sql: ' + sql);
        j = i + 1;
        dbc.raw(sql)
            .then(loop.bind(null, dbc, j, prop, that))
            .catch(err => that.send({prev: prop, payload: { error: err }}))
    } else {
        that.send({prev: prop, payload: true})
    }
}

function Pgproc(conf) {
	RED.nodes.createNode(this,conf)
 	this.on('input', msg => { 
    var node = this
    let prop = {}
    console.log('Starting Pgproc msg: ' + JSON.stringify(msg));
    //Object.keys(msg.prev).map(k => prop[k] = rend(conf[k]))
    Object.keys(conf).map(k => prop[k] = rend(conf[k], Object.assign(msg.prev||{}, msg.payload||{})))
    if (msg.topic == 'sessions') {
      console.log('Reading payload into sesids');
      prop.sesids = msg.payload;
    } else {
      console.log('Reading sesids from prev');
      prop.sesids = msg.prev.sesids
      prop.source = msg.prev.result
    }
    var accid = `${prop.accid}`;
    var port = 9710 + accid%10;
    var dbc = knex({client: 'pg', debug: false, connection: { 
      host: '127.0.0.1', user: 'postgres', port: port, database: 'postgres'
    }})
    if (!dbc) dbc = RED.nodes.getNode(conf.server).connection
    console.log('node:', node, '\nmsg:', msg, '\nconf:', conf, '\nprop:', prop)
    if (prop.sesids == 'all') {
        var sql = `select pypex('${prop.function}', NULL, '*', 0, NULL, 0, '${prop.args}', NULL, 0)`
        console.log('sql: ' + sql);
        dbc.raw(sql)
            .then(res => {this.send({prev:prop, payload: 'success'})})
            .catch(err => {this.send({prev: prop, payload: { error: err }})})
    } else {
      var that = this;
      loop(dbc, 0, prop, that, null);
    }
  })
	this.on('close', msg => console.log('closing', msg))  
}

RED.nodes.registerType("pgproc",Pgproc)

var util = {
  rand: () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1),
  date: () => new Date().toISOString()
}

var rend = (str = '', opt = {}) => (str instanceof String) ? str.replace(/\$\{[A-Za-z0-9]/g, key => opt[key.substring(1)] || (util[key] ? util[key]() : key)) : str

}
