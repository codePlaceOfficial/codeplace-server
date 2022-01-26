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
const VirtualFileServer  = require("./submodules/virtualFileServer")
const virtualFileEvent = require("./submodules/virtualFileEvent")
const { EventEmitter } = virtualFileEvent

const sandboxManager = new SandboxManager(50);
io.on('connection', (socket) => {
    sandboxManager.createSandbox().then(sandbox => {
        console.log("new",sandbox.id)
        // terminal
        sandbox.container.getCmdStream().then(stream => {
            stream.on('data', (chunk) => {
                socket.emit("data", chunk.toString());
            });
            socket.on("write", data => {
                stream.write(data);
            })
        })

        // virtualFile
        socket.on("disconnect", () => {
            console.log("dis",sandbox.id)  
            sandboxManager.deleteSandbox(sandbox.id)
            sandboxManager.count;
        })

        const vfServerEventEmitter = new EventEmitter((event) => {
            socket.emit("serverFileEvent",event)
        })
        let virtualFileServer = new VirtualFileServer(sandbox.workPath,vfServerEventEmitter);
        socket.on("virtualFileClientReady",() => {
            virtualFileServer.start()
        })
        socket.on("clientFileEvent",(event) => {
            virtualFileEvent.serverDefaultExecEvent(event,virtualFileServer);
        })
        socket.emit("virtualFileServerReady", { sandboxId: sandbox.id }); // 成功分配
    }).catch(err => {

    })
});

server.listen(config.port, () => {
    console.log(`listening on ${config.port}`);
});