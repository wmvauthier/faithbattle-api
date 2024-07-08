const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {

    const data = JSON.parse(message);

    if (data.type === "join") {
      const { gamerId, roomId } = data;

      if (!rooms[roomId]) {
        rooms[roomId] = { players: [], viewers: [], boardState: {} };
      }

      const room = rooms[roomId];

      if (room.players.length < 2) {
        room.players.push({ gamerId, ws });
        rooms[roomId]["boardState"][data.gamerId] = {};
      } else {
        room.viewers.push({ gamerId, ws });
        ws.send(
          JSON.stringify({
            type: "status",
            message: "Você é um visualizador na sala.",
          })
        );
      }

      broadcastRoomUpdate(roomId, data.type);

    } else if (data.type === "move") {
      const { roomId, gamerId, boardState } = data;
      const room = rooms[roomId];

      if (room) {
        room["boardState"][gamerId] = boardState;
        broadcastRoomUpdate(roomId, data.type);
      }
    }

  });

  ws.on("close", () => {});
});

function broadcastRoomUpdate(roomId, type) {
  const room = rooms[roomId];
  room.type = type;

  const payload = JSON.stringify(removeWebSocket(room));

  room.players.forEach((player) => player.ws.send(payload));
  room.viewers.forEach((viewer) => viewer.ws.send(payload));
}

console.log("Servidor WebSocket rodando em ws://localhost:8080");

function removeWebSocket(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeWebSocket(item));
  } else if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (obj[key] instanceof WebSocket) {
        continue; // Ignorar propriedades 'ws'
      } else if (typeof obj[key] === "object") {
        newObj[key] = removeWebSocket(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  }
  return obj; // Retorna valores que não são objetos ou arrays diretamente
}
