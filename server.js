const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  },

  maxHttpBufferSize: 1e8
});

// USERS STORE
const users = {};

io.on("connection", (socket) => {

  console.log("✅ Connected:", socket.id);

  // REGISTER USER
  socket.on("register-user", (username) => {

    users[username] = socket.id;

    console.log("👤 Registered:", username);
  });

  // RECEIVE VIDEO FROM SENDER
socket.on("send-video", (video) => {

  console.log("📤 Sending Video To:", video.to);

  const receiverSocket = users[video.to];

  if (receiverSocket) {

    io.to(receiverSocket).emit("receive-video", video);

    // sender ko success
    socket.emit("video-status", {
      success: true,
      message: "✅ Video sent"
    });

    console.log("✅ Video Delivered");

  } else {

    socket.emit("video-status", {
      success: false,
      message: "❌ User not found"
    });

    console.log("❌ Receiver Not Found");
  }

});

  socket.on("disconnect", () => {
    console.log("❌ Disconnected");
  });

});

server.listen(5000, () => {
  console.log("🔥 Server Running On 5000");
});