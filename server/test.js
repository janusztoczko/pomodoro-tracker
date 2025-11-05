// test.js
import http from 'http';

let counter = 0;

setInterval(() => {
    counter++;
    console.log(`Counter: ${counter}`);
}, 1000);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ counter }));
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});