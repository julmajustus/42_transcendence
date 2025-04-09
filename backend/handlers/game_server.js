const { GameServer } = require('../game/game_server')

const game_server = new GameServer();
game_server.run();

const createNewGame = (request, reply) => {
	const { player1_id, player2_id } = request.body;
	try {
		const game_id = game_server.createGame(player1_id, player2_id);
		reply.status(200).send({
			game_id: game_id
		});
	}
	catch (e) {
		console.error(e.msg);
	}
};

const listGames = (request, reply) => {
	let games = [];
	for (const [key, value] of game_server.games) {
		games.push({
			game_id: key,
			player1_id: value.players[0].id,
			player2_id: value.players[1].id,
		});
	}
	return reply.send(games);
};


const getGame = (request, reply) => {
	const { id } = request.params;
	if (!game_server.games.has(Number(id))) {
		return reply.status(404).send({error: `Game with id ${id} does not exist`});
	}
	const game = game_server.games.get(Number(id));
	const gameObj = {
				game_id: id,
				finished_rounds: game.finished_rounds,
				total_rounds: game.total_rounds,
				winner: game.winner,
				player1_id: game.players[0].id,
				player2_id: game.players[1].id,
				game_state: game.gameState,
	};
	return reply.send(JSON.stringify(gameObj));
};

module.exports = { createNewGame, listGames, getGame }
