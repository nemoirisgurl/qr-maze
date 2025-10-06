import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8081 });

wss.on('connection', ws => {
    console.log('ESP32 connected');
    ws.on('message', msg => {
        console.log('Received:', msg.toString());
        // ส่งต่อข้อมูลให้ทุก client (เช่น browser)
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
                client.send(msg.toString());
            }
        });
    });
});

console.log('WebSocket server started on ws://0.0.0.0:8081');
