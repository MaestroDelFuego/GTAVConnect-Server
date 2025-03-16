import express from 'express';
import { WebSocketServer } from 'ws';  // Correct import for WebSocketServer
import ConsoleManager from './consolemanager.js';

// Create an express app
const app = express();

// Create a WebSocket server
const wss = new WebSocketServer({ noServer: true });

let players = {};
let entities = {};
let entityCounter = 0;
let firstPlayerID = null;

const PORT = 8080;

app.use(express.static('public'));

app.listen(3000, () => {
    ConsoleManager.log(`Server is running at http://localhost:3000`);
});

// Clear the log and print new logs
function clearLogAndPrint(message) {
    console.clear(); // Clear the console
    ConsoleManager.log(message); // Log the message
}

wss.on('connection', (ws) => {
    const playerID = Math.random().toString(36).substring(2, 15);
    players[playerID] = {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        username: '',
    };

    if (firstPlayerID === null) {
        firstPlayerID = playerID;
    }

    clearLogAndPrint(`New connection established. Player ID: ${playerID}`);
    ConsoleManager.log('Players:', players);

    ws.on('message', (message) => {
        let msg = JSON.parse(message);

        try {
            if (msg.type === 'username') {
                players[playerID].username = msg.username;
                ConsoleManager.log(`${msg.username} has joined the server`);
                broadcastJoinLeave(playerID, 'joined');
                broadcastPlayerData();
            } else if (msg.type === 'update') {
                players[msg.playerID] = msg.data;
                ConsoleManager.log(`Player ${msg.playerID} updated:`, msg.data);
                broadcastPlayerData();
            } else if (msg.type === 'create_entity' && playerID === firstPlayerID) {
                const entityID = createEntity(msg.data);
                ConsoleManager.log(`Entity created: ${entityID}`);
            } else if (msg.type === 'update_entity' && playerID === firstPlayerID) {
                updateEntity(msg.entityID, msg.data);
                ConsoleManager.log(`Entity updated: ${msg.entityID}`);
            } else if (msg.type === 'delete_entity' && playerID === firstPlayerID) {
                deleteEntity(msg.entityID);
                ConsoleManager.log(`Entity deleted: ${msg.entityID}`);
            }
        } catch (error) {
            ConsoleManager.log(`Error processing message: ${error.message}`, ConsoleManager.LogLevel.ERROR);
        }
    });

    ws.on('close', () => {
        delete players[playerID];
        broadcastJoinLeave(playerID, 'left');
        broadcastPlayerData();
        if (firstPlayerID === playerID) {
            firstPlayerID = null;
            for (const id in players) {
                firstPlayerID = id;
                break;
            }
        }
        ConsoleManager.log(`Player ${playerID} has disconnected.`);
    });

    ws.send(JSON.stringify({ type: 'welcome', players, entities, isFirstPlayer: playerID === firstPlayerID }));
});

function createEntity(data) {
    const entityID = `entity_${entityCounter++}`;
    entities[entityID] = {
        id: entityID,
        position: data.position,
        rotation: data.rotation,
        model: data.model,
    };
    broadcastEntityUpdate(entities[entityID]);
    return entityID;
}

function updateEntity(entityID, data) {
    if (entities[entityID]) {
        Object.assign(entities[entityID], data);
        broadcastEntityUpdate(entities[entityID]);
    }
}

function deleteEntity(entityID) {
    if (entities[entityID]) {
        broadcastEntityDelete(entityID);
        delete entities[entityID];
    }
}

function broadcastEntityUpdate(entity) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocketServer.OPEN) {
            client.send(JSON.stringify({ type: 'entity_update', entity }));
        }
    }
}

function broadcastEntityDelete(entityID) {
    for (const client of wss.clients) {
        if (client.readyState === WebSocketServer.OPEN) {
            client.send(JSON.stringify({ type: 'entity_delete', entityID }));
        }
    }
}

function broadcastPlayerData() {
    for (const client of wss.clients) {
        if (client.readyState === WebSocketServer.OPEN) {
            let playerData = {
                type: 'sync',
                players: players,
            };
            client.send(JSON.stringify(playerData));
        }
    }
}

function broadcastJoinLeave(playerID, action) {
    let joinLeaveMessage = {
        type: 'join_leave',
        playerID: playerID,
        action: action,
        username: players[playerID].username,
    };

    for (const client of wss.clients) {
        if (client.readyState === WebSocketServer.OPEN) {
            client.send(JSON.stringify(joinLeaveMessage));
        }
    }
}

const server = app.listen(PORT, () => {
    ConsoleManager.log(`Server running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
