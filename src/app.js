'use strict';

const Hapi = require('hapi');
const Inert = require('inert');

const TcNetClient = require('./tc-net-client');
const client = new TcNetClient();

const server = new Hapi.Server();
server.connection({
  port: 3000
});

server.register([Inert], function (err) {

  if (err) {
    throw err;
  }

  server.route({
    method: 'GET',
    path: '/api/courses',
    handler: function (request, reply) {
      client.fetchCourses(reply);
    },
    config: {
      cors: true
    }
  });

  server.route({
    method: 'GET',
    path: '/api/courses/{name}',
    handler: function (request, reply) {
      client.fetchAll(request.params.name, null, reply);
    },
    config: {
      cors: true
    }
  });
});

server.start((err) => {

  if (err) {
    throw err;
  }
  console.log('Server running at:', server.info.uri);
});

module.exports = server;
