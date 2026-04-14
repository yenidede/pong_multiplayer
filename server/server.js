require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URLS = (process.env.CLIENT_URLS || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (CLIENT_URLS.includes("*")) {
    return true;
  }

  // Allow same-origin or server-to-server requests without an Origin header.
  if (!origin) {
    return true;
  }

  return CLIENT_URLS.includes(origin);
}

// Allow the frontend to connect in development and production.
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
  })
);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Socket origin not allowed"));
    },
  },
});
const TICK_RATE = 1000 / 60;

// Game field settings. Keeping them in one place makes the project easier to explain.
const GAME_CONFIG = {
  width: 800,
  height: 500,
  paddleWidth: 14,
  paddleHeight: 100,
  paddleSpeed: 7,
  ballSize: 14,
  ballSpeedX: 5,
  ballSpeedY: 4,
};

// We only allow two active players: one on the left and one on the right.
const players = {
  left: null,
  right: null,
};

// The full game state lives on the server so both clients always see the same game.
const gameState = {
  paddles: {
    left: {
      x: 30,
      y: GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2,
      width: GAME_CONFIG.paddleWidth,
      height: GAME_CONFIG.paddleHeight,
      movingUp: false,
      movingDown: false,
    },
    right: {
      x: GAME_CONFIG.width - 30 - GAME_CONFIG.paddleWidth,
      y: GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2,
      width: GAME_CONFIG.paddleWidth,
      height: GAME_CONFIG.paddleHeight,
      movingUp: false,
      movingDown: false,
    },
  },
  ball: {
    x: GAME_CONFIG.width / 2 - GAME_CONFIG.ballSize / 2,
    y: GAME_CONFIG.height / 2 - GAME_CONFIG.ballSize / 2,
    width: GAME_CONFIG.ballSize,
    height: GAME_CONFIG.ballSize,
    velocityX: GAME_CONFIG.ballSpeedX,
    velocityY: GAME_CONFIG.ballSpeedY,
  },
  score: {
    left: 0,
    right: 0,
  },
};

function resetBall(direction) {
  gameState.ball.x = GAME_CONFIG.width / 2 - GAME_CONFIG.ballSize / 2;
  gameState.ball.y = GAME_CONFIG.height / 2 - GAME_CONFIG.ballSize / 2;
  gameState.ball.velocityX = direction === "left" ? -GAME_CONFIG.ballSpeedX : GAME_CONFIG.ballSpeedX;
  gameState.ball.velocityY = Math.random() > 0.5 ? GAME_CONFIG.ballSpeedY : -GAME_CONFIG.ballSpeedY;
}

function resetGame() {
  gameState.score.left = 0;
  gameState.score.right = 0;

  gameState.paddles.left.y = GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2;
  gameState.paddles.right.y = GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2;
  gameState.paddles.left.movingUp = false;
  gameState.paddles.left.movingDown = false;
  gameState.paddles.right.movingUp = false;
  gameState.paddles.right.movingDown = false;

  resetBall("right");
}

function clampPaddle(paddle) {
  if (paddle.y < 0) {
    paddle.y = 0;
  }

  if (paddle.y + paddle.height > GAME_CONFIG.height) {
    paddle.y = GAME_CONFIG.height - paddle.height;
  }
}

function updatePaddles() {
  const leftPaddle = gameState.paddles.left;
  const rightPaddle = gameState.paddles.right;

  if (leftPaddle.movingUp) {
    leftPaddle.y -= GAME_CONFIG.paddleSpeed;
  }
  if (leftPaddle.movingDown) {
    leftPaddle.y += GAME_CONFIG.paddleSpeed;
  }
  if (rightPaddle.movingUp) {
    rightPaddle.y -= GAME_CONFIG.paddleSpeed;
  }
  if (rightPaddle.movingDown) {
    rightPaddle.y += GAME_CONFIG.paddleSpeed;
  }

  clampPaddle(leftPaddle);
  clampPaddle(rightPaddle);
}

function isColliding(ball, paddle) {
  return (
    ball.x < paddle.x + paddle.width &&
    ball.x + ball.width > paddle.x &&
    ball.y < paddle.y + paddle.height &&
    ball.y + ball.height > paddle.y
  );
}

function updateBall() {
  const ball = gameState.ball;
  const leftPaddle = gameState.paddles.left;
  const rightPaddle = gameState.paddles.right;

  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  // Bounce on the top or bottom border.
  if (ball.y <= 0) {
    ball.y = 0;
    ball.velocityY *= -1;
  }

  if (ball.y + ball.height >= GAME_CONFIG.height) {
    ball.y = GAME_CONFIG.height - ball.height;
    ball.velocityY *= -1;
  }

  // Bounce on the left paddle.
  if (ball.velocityX < 0 && isColliding(ball, leftPaddle)) {
    ball.x = leftPaddle.x + leftPaddle.width;
    ball.velocityX *= -1;
  }

  // Bounce on the right paddle.
  if (ball.velocityX > 0 && isColliding(ball, rightPaddle)) {
    ball.x = rightPaddle.x - ball.width;
    ball.velocityX *= -1;
  }

  // If the ball leaves the field, the other player scores and the ball resets.
  if (ball.x + ball.width < 0) {
    gameState.score.right += 1;
    resetBall("left");
  }

  if (ball.x > GAME_CONFIG.width) {
    gameState.score.left += 1;
    resetBall("right");
  }
}

function getRoleForSocket(socketId) {
  if (players.left === socketId) {
    return "left";
  }

  if (players.right === socketId) {
    return "right";
  }

  return "spectator";
}

function broadcastGameState() {
  io.emit("gameState", gameState);
}

app.get("/", (req, res) => {
  res.send("Pong backend is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    allowedOrigins: CLIENT_URLS,
  });
});

io.on("connection", (socket) => {
  let assignedRole = "spectator";

  // First client becomes left player, second client becomes right player.
  if (!players.left) {
    players.left = socket.id;
    assignedRole = "left";
  } else if (!players.right) {
    players.right = socket.id;
    assignedRole = "right";
  }

  socket.emit("roleAssignment", {
    role: assignedRole,
    message: assignedRole === "spectator" ? "Room is full. Only two players can join." : null,
  });

  socket.emit("gameState", gameState);

  socket.on("playerInput", (input) => {
    const role = getRoleForSocket(socket.id);

    if (role === "spectator") {
      return;
    }

    const paddle = gameState.paddles[role];

    // Clients only send intent. The server decides how paddles actually move.
    if (input.action === "up") {
      paddle.movingUp = input.isPressed;
    }

    if (input.action === "down") {
      paddle.movingDown = input.isPressed;
    }
  });

  socket.on("resetGame", () => {
    // Keep reset logic on the server so all connected clients stay synchronized.
    resetGame();
    io.emit("gameReset");
    broadcastGameState();
  });

  socket.on("disconnect", () => {
    // Free the player slot when someone leaves so a new client can join.
    if (players.left === socket.id) {
      players.left = null;
      gameState.paddles.left.movingUp = false;
      gameState.paddles.left.movingDown = false;
    }

    if (players.right === socket.id) {
      players.right = null;
      gameState.paddles.right.movingUp = false;
      gameState.paddles.right.movingDown = false;
    }

    io.emit("playerLeft", {
      role: assignedRole,
    });
  });
});

// The game loop updates the state at a fixed interval and sends it to all clients.
setInterval(() => {
  updatePaddles();
  updateBall();
  broadcastGameState();
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
