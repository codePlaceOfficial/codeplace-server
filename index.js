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
const VirtualFileServer = require("./submodules/virtualFileServer")
const virtualFileEvent = require("./submodules/virtualFileEvent")
const { EventEmitter } = virtualFileEvent
const cryptoRandomString = require("crypto-random-string");
const fs = require("fs")
const path = require("path");

// 删除文件夹及其下所有文件
const deleteFolderRecursive = function (path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

const sandboxManager = new SandboxManager(50);
io.on('connection', (socket) => {
    let dirName = cryptoRandomString({ length: 14 });
    let workPath = path.join(__dirname, "code", dirName)
    fs.mkdir(workPath, () => {
        sandboxManager.createSandbox(workPath).then(sandbox => {
            console.log("new", sandbox.id)
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
                sandboxManager.deleteSandbox(sandbox.id);
                deleteFolderRecursive(workPath);
            })
            const vfServerEventEmitter = new EventEmitter((event) => {
                socket.emit("serverFileEvent", event)
            })
            let virtualFileServer = new VirtualFileServer(sandbox.workPath, vfServerEventEmitter, sandbox);
            socket.on("virtualFileClientReady", () => {
                virtualFileServer.start()
            })
            socket.on("clientFileEvent", (event) => {
                virtualFileEvent.serverDefaultExecEvent(event, virtualFileServer);
            })
            socket.emit("virtualFileServerReady", { sandboxId: sandbox.id }); // 成功分配
        }).catch(err => {

        })
    })
});

server.listen(config.port, () => {
    console.log(`listening on ${config.port}`);
});