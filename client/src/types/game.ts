// Shared frontend types for the server messages.
export type PlayerRole = "left" | "right" | "spectator";

export type Paddle = {
  x: number;
  y: number;
  width: number;
  height: number;
  movingUp: boolean;
  movingDown: boolean;
};

export type Ball = {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
};

export type GameState = {
  paddles: {
    left: Paddle;
    right: Paddle;
  };
  ball: Ball;
  score: {
    left: number;
    right: number;
  };
};

export type PlayerInput = {
  action: "up" | "down";
  isPressed: boolean;
};
