import { GameRenderer } from '../../Game/render.js';

/* // Define MessageType enum if you can't import it
enum MessageType {
  JOIN = 'JOIN',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  PADDLE_UPDATE = 'PADDLE_UPDATE',
  GAME_STATE = 'GAME_STATE',
  // Add other message types as needed
} */

export interface GameRendererType {
  server_uri: string;
  game_id: number;
  user_token: string;
  socket: WebSocket;
  connected: boolean;
  state: any;
  controls: { up: number; down: number };
  document: Document;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paddle_height: number;
  paddle_width: number;
  paddle_margin: number;
  paddle_start: number;
  ball_radius: number;
  board_width: number;
  board_height: number;
  start: () => void;
  updateSettings: (settings: any) => void;
  drawPaddle1: (offset: number) => void;
  drawPaddle2: (offset: number) => void;
  drawBall: (ball_state: any) => void;
  drawScores: (players: any[]) => void;
  drawWaitingForPlayers: (players: any[]) => void;
  drawRemainingTimout: (timeout: number) => void;
  drawResult: (winner: any) => void;
  drawCenterLine: () => void;
  drawWaitingForConnection: () => void;
  renderGame: () => void;
  render: () => void;
  updatePaddles: () => void;
  waitForConnection: () => void;
}

export function createGameRendererAdapter(
  game_id: number,
  authToken: string,
  canvasElement: HTMLCanvasElement,
  game_type: string,
): GameRendererType & { onGameOver?: (winner: any) => void } {

  // Create an instance of the original GameRenderer with parsed hostname and port */
  const renderer = new GameRenderer(
    game_id,
    authToken,
    document,
    game_type,
  );

  // Set the canvas element
  renderer.canvas = canvasElement;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }
  renderer.ctx = ctx;

  //try out to detect match ending.
  let _overCalled = false;
  const _origRenderGame = renderer.renderGame.bind(renderer);
  renderer.renderGame = function() {
    _origRenderGame();
    if (this.state?.game_state === 'finished' && !_overCalled) {
      _overCalled = true;
      if ((renderer as any).onGameOver) {
        (renderer as any).onGameOver(this.state.winner);
      }
    }
  };

  return renderer as any; 
}
