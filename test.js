const TcNetClient = require('./server/tc-net-client');
const client = new TcNetClient();
client.fetchAll('5TC-OP4-AWA,5TC-OP1-VSR', null,
  function(courses) {
    console.log(courses.map(function(e){return e.toJSON()}));
  }
);
