const TcNetClient = require('./server/tc-net-client');
const client = new TcNetClient();
client.fetch('5TC-OP4-AWA', null,
  function(courses) {
    console.log(courses);
  }
);
