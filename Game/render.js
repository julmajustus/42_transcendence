const MessageType = {
	JOIN: "join",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state"
};

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const USER_ID = urlParams.get('player_id');
const GAME_ID = urlParams.get('game_id');
if (typeof(USER_ID) === undefined) USER_ID == 0;
// colors
const BLACK = "#000000";
const WHITE = "#ffffff";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

let controls = {up: 0, down: 0};
const origin = window.location.origin.split(':');
// Use origin to get server url. Is this safe?
const socket = new WebSocket(`ws://${origin[1]}:9000`);

let paddle_height;
let paddle_width;
let paddle_margin;
let paddle_start;
let ball_radius;
let board_width;
let board_height;

let settings_applied = false;

document.addEventListener('keydown', (e) => {
	if (e.key === 'ArrowUp') {
		controls.up = 1;
	}
	else if (e.key === 'ArrowDown') {
		controls.down = 1;
	}
});

document.addEventListener('keyup', (e) => {
	if (e.key === 'ArrowUp') {
		controls.up = 0;
	}
	else if (e.key === 'ArrowDown') {
		controls.down = 0;
	}
});

let state = null;

function updateSettings(settings) {
	canvas.setAttribute("height", settings.board_height);
	canvas.setAttribute("width", settings.board_width);
	board_width = settings.board_width;
	board_height = settings.board_height;
	paddle_height = settings.paddle_height;
	paddle_width = settings.paddle_width;
	paddle_margin = settings.paddle_to_wall_dist;
	paddle_start = (canvas.height / 2) - (paddle_height / 2);
	ball_radius = settings.ball_radius;
	settings_applied = true;
}

function draw_paddle_1(offset) {
	ctx.fillStyle = WHITE;
	ctx.fillRect(paddle_margin, paddle_start + offset, paddle_width, paddle_height);
}

function draw_paddle_2(offset) {
	ctx.fillStyle = WHITE;
	ctx.fillRect(canvas.width - paddle_margin - paddle_width, paddle_start + offset, paddle_width, paddle_height);
}

function draw_ball(ball_state) {
	ctx.fillStyle = WHITE;
	ctx.beginPath();
	ctx.arc(ball_state.x, ball_state.y, ball_radius, 0, Math.PI * 2, true);
	ctx.fill();
}

function draw_scores(players) {
	ctx.fillStyle = WHITE;
	ctx.font = "48px serif";
	ctx.fillText(players[0].score, board_width / 4, 50);
	ctx.fillText(players[1].score, board_width * (3/4), 50);
}

function draw_waiting_for_players(players) {
	ctx.fillStyle = WHITE;
	ctx.font = "40px serif";
	ctx.textAlign = "center"
	ctx.fillText("Waiting for players", board_width / 2, board_height / 2);

	ctx.font = "20px serif";
	ctx.fillText("Press UP and DOWN to confirm", board_width / 2, board_height / 2 + 30);

	ctx.font = "30px serif";
	if (players[0].ready) {
		ctx.fillText("Player 1 READY", board_width / 4, board_height * 0.75);
	}
	else {
		ctx.fillText("Waiting for Player 1", board_width / 4, board_height * 0.75);
	}
	if (players[1].ready) {
		ctx.fillText("Player 2 READY", board_width * 0.75, board_height * 0.75);
	}
	else {
		ctx.fillText("Waiting for Player 2", board_width * 0.75, board_height * 0.75);
	}
	
}

function draw_remaining_timeout(timeout) {

	ctx.font = "40px serif";
	ctx.textAlign = "center"
	ctx.fillText(`Resetting in ${timeout}...`, board_width / 2, board_height / 2);
}


function draw_result(winner) {
	ctx.font = "40px serif";
	ctx.textAlign = "center"
	let text;
	if (winner == null) {
		text = "The game is tie"
	}
	else {
		text = `Player ${winner.id} won the game`;
	}
	ctx.fillText(text, board_width / 2, board_height / 2);
}

function draw_center_line()
{
	ctx.setLineDash([10, 10]);
	ctx.strokeStyle = WHITE;
	ctx.lineWidth = paddle_width / 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
}


function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	draw_scores(state.players);

	//console.log(`Game state is: ${state.game_state}`);
	if (state.game_state === "not_started") {
		draw_waiting_for_players(state.players);
	}
	else if (state.game_state === "active") {
		draw_center_line();
		draw_paddle_1(state.objects.left_paddle.y_offset);
		draw_paddle_2(state.objects.right_paddle.y_offset);
		draw_ball(state.objects.ball);
	}
	else if (state.game_state === "resetting") {
		draw_remaining_timeout(state.remaining_timeout);
	}
	else if (state.game_state === "finished") {
		draw_result(state.winner);
	}
}

function updatePaddles() {
	if (controls.up == 1 && controls.down == 0) {
		socket.send(JSON.stringify({type: MessageType.CONTROL_INPUT, payload: {'player_id': USER_ID, 'input': 'up'}}));
	}
	else if (controls.up == 0 && controls.down == 1) {
		socket.send(JSON.stringify({type: MessageType.CONTROL_INPUT, payload: {'player_id': USER_ID, 'input': 'down'}}));
	}
}

socket.addEventListener('open', () => {
	socket.send(JSON.stringify({ type: MessageType.JOIN , payload: {
		'player_id': USER_ID,
		'game_id': GAME_ID,
		}
	}));
});

socket.addEventListener('message', (event) => {
	//console.log('Received:', event.data);
	const {type, payload} = JSON.parse(event.data);
	if (type === MessageType.SETTINGS) {
		updateSettings(payload);
	}
	else if (type === MessageType.STATE) {
		console.log("Got state:", payload);
		state = payload;
	}
});

socket.addEventListener('error', (e) => {
  console.error('WS Error:', e);
});

socket.addEventListener('close', () => {
  console.warn('WebSocket closed');
});

function wait_for_connection() {
	console.log(`Waiting: settings_applied: ${settings_applied} state: ${state}`);
	if (settings_applied != false && state != null) {
		setInterval(updatePaddles, 10);
		setInterval(render, 10);
		console.log("Starting");
	}
	else {
		setTimeout(wait_for_connection, 100);
	}
}

wait_for_connection();
