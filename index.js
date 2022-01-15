const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const config = require("./config")
const io = new Server(server, {
    path: "/sandbox",
    cors: {
        origin: "http://localhost:3000",
    }
});

const { SandboxManager } = require("./submodules/sandbox")
const sandboxManager = new SandboxManager(10);
io.on('connection', (socket) => {
    sandboxManager.createSandbox().then(sandbox => {
        socket.emit("success", { sandboxId: sandbox.id }); // 成功分配
        sandbox.container.getCmdStream().then(stream => {
            stream.on('data', (chunk) => {
                socket.emit("data", chunk.toString());
            });
            socket.on("write", data => {
                stream.write(data);
            })
        })
        socket.on("disconnect", () => {
            sandboxManager.deleteSandbox(sandbox.id)
        })
    }).catch(err => {

    })
});

server.listen(config.port, () => {
    console.log(`listening on ${config.port}`);
});