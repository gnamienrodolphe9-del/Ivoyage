const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on('connect', () => console.log('✅ Redis connecté'));
client.on('error', (err) => console.error('❌ Erreur Redis :', err.message));

client.connect();

module.exports = client;