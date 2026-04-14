"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { GameState, PlayerInput, PlayerRole } from "../types/game";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

const initialGameState: GameState = {
  paddles: {
    left: {
      x: 30,
      y: 200,
      width: 14,
      height: 100,
      movingUp: false,
      movingDown: false,
    },
    right: {
      x: 756,
      y: 200,
      width: 14,
      height: 100,
      movingUp: false,
      movingDown: false,
    },
  },
  ball: {
    x: 393,
    y: 243,
    width: 14,
    height: 14,
    velocityX: 5,
    velocityY: 4,
  },
  score: {
    left: 0,
    right: 0,
  },
};

function sendInput(socket: Socket | null, action: PlayerInput["action"], isPressed: boolean) {
  if (!socket) {
    return;
  }

  socket.emit("playerInput", {
    action,
    isPressed,
  });
}

function formatScore(score: number) {
  return score.toString().padStart(2, "0");
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [role, setRole] = useState<PlayerRole>("spectator");
  const [statusMessage, setStatusMessage] = useState("Connecting to server...");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketConnection = io(SERVER_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socketConnection;

    socketConnection.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("Connected. Waiting for role assignment...");
    });

    socketConnection.on("disconnect", () => {
      setIsConnected(false);
      setStatusMessage("Connection lost. Please refresh the page.");
    });

    socketConnection.on("roleAssignment", (data: { role: PlayerRole; message: string | null }) => {
      setRole(data.role);

      if (data.role === "spectator" && data.message) {
        setStatusMessage(data.message);
      } else {
        setStatusMessage(`You are the ${data.role} player.`);
      }
    });

    socketConnection.on("gameState", (nextGameState: GameState) => {
      setGameState(nextGameState);
    });

    socketConnection.on("playerLeft", () => {
      setStatusMessage("A player disconnected. A new player can join now.");
    });

    socketConnection.on("gameReset", () => {
      setStatusMessage("Game was reset. Scores are back to 0 : 0.");
    });

    return () => {
      socketConnection.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat) {
        return;
      }

      if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        sendInput(socketRef.current, "up", true);
      }

      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        sendInput(socketRef.current, "down", true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        sendInput(socketRef.current, "up", false);
      }

      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        sendInput(socketRef.current, "down", false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const roleText = useMemo(() => {
    if (role === "left") {
      return "Left Paddle";
    }

    if (role === "right") {
      return "Right Paddle";
    }

    return "Spectator";
  }, [role]);

  const subtleState = !isConnected ? "Offline" : role === "spectator" ? statusMessage : "";
  const leftPaddleClass = role === "left" ? "paddle paddle-active" : "paddle";
  const rightPaddleClass = role === "right" ? "paddle paddle-active" : "paddle";

  function handleResetGame() {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit("resetGame");
  }

  return (
    <main className="page-shell">
      <div className="background-glow background-glow-top" />
      <div className="background-glow background-glow-bottom" />

      <section className="stage-shell">
        <header className="hero-block">
          <h1>Pong</h1>
          <span className="role-badge">{roleText}</span>
          <div className="score-line" aria-label="Current score">
            <span>{formatScore(gameState.score.left)}</span>
            <span className="score-divider">:</span>
            <span>{formatScore(gameState.score.right)}</span>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="reset-button"
              onClick={handleResetGame}
              disabled={!isConnected}
            >
              Reset Game
            </button>
          </div>
          {subtleState ? <p className="subtle-state">{subtleState}</p> : null}
        </header>

        <section className="board-panel">
          <div className="board-wrapper">
            <section
              ref={boardRef}
              className="board"
              tabIndex={0}
              aria-label="Pong game board"
              onPointerDown={() => boardRef.current?.focus()}
            >
              <div className="board-inner-frame" />
              <div className="center-line" />

              <div
                className={leftPaddleClass}
                style={{
                  left: `${gameState.paddles.left.x}px`,
                  top: `${gameState.paddles.left.y}px`,
                  width: `${gameState.paddles.left.width}px`,
                  height: `${gameState.paddles.left.height}px`,
                }}
              />

              <div
                className={rightPaddleClass}
                style={{
                  left: `${gameState.paddles.right.x}px`,
                  top: `${gameState.paddles.right.y}px`,
                  width: `${gameState.paddles.right.width}px`,
                  height: `${gameState.paddles.right.height}px`,
                }}
              />

              <div
                className="ball"
                style={{
                  left: `${gameState.ball.x}px`,
                  top: `${gameState.ball.y}px`,
                  width: `${gameState.ball.width}px`,
                  height: `${gameState.ball.height}px`,
                }}
              />
            </section>
          </div>
        </section>

      </section>
    </main>
  );
}
