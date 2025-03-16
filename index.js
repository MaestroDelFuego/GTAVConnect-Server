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

// Start HTTP server to listen on port 3000
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

    // Send initial game state to the new player (including other players' data)
    ws.send(JSON.stringify({
        type: 'welcome',
        players,
        isFirstPlayer: playerID === firstPlayerID,
    }));

    // Handle incoming messages from the connected client
    ws.on('message', (message) => {
        let msg = JSON.parse(message);

        try {
            ConsoleManager.log('New message from player ID: ' + playerID, ConsoleManager.LogLevel.INFO);

            if (msg.type === 'username') {
                players[playerID].username = msg.username;
                ConsoleManager.log(`${msg.username} has joined the server`);
                broadcastJoinLeave(playerID, 'joined');
                broadcastPlayerData();
            } else if (msg.type === 'update') {
                players[msg.playerID] = msg.data;
                // Update player position and rotation
                if (players[msg.playerID]) {
                    players[msg.playerID].position = msg.data.position;
                    players[msg.playerID].rotation = msg.data.rotation;
                    ConsoleManager.log(`Player ${msg.playerID} updated: Position - ${msg.data.position}, Rotation - ${msg.data.rotation}`);
                    broadcastPlayerData();
                }
            }
        } catch (error) {
            ConsoleManager.log(`Error processing message: ${error.message}`, ConsoleManager.LogLevel.ERROR);
        }
    });

    // When the connection closes
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

    // Send the initial player data to this new player
    ws.send(JSON.stringify({ 
        type: 'welcome', 
        players, 
        isFirstPlayer: playerID === firstPlayerID 
    }));
});

// Broadcast updated player data to all connected players
function broadcastPlayerData() {
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            let playerData = {
                type: 'sync', // This message type indicates player synchronization
                players: players, // Send the full player data (positions, rotations, usernames)
            };
            client.send(JSON.stringify(playerData));
        }
    }
}

// Broadcast join/leave messages
function broadcastJoinLeave(playerID, action) {
    // Ensure the player has a username before broadcasting
    if (!players[playerID] || !players[playerID].username) {
        ConsoleManager.log(`Player ${playerID} attempted to join without a username. Closing connection.`);
        // Close the WebSocket connection if no username is set
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'error',
                    message: 'You must provide a username to join.'
                }));
                client.close();  // Close the connection
            }
        }
        return; // Do not continue broadcasting the join/leave message
    }

    let joinLeaveMessage = {
        type: 'join_leave',
        playerID: playerID,
        action: action,
        username: players[playerID].username,
    };

    // Broadcast the join/leave message to all clients
    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(joinLeaveMessage));
        }
    }
}

// Initialize and start the server
const server = app.listen(PORT, () => {
    ConsoleManager.log(`Server running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
