import styled from 'styled-components';
import { useEffect, useState, useRef, useCallback  } from "react";
import { customFetch } from '../utils';

import { useAuth } from '../context/AuthContext';
import {
	createGameRendererAdapter,
	GameRendererType,
  } from '../utils/GameRendererAdapter';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

const Container = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 5rem;
`;

const SearchWrapper = styled.div`
  width: 20rem;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  font-family: 'Press Start 2P', cursive;
  background-color: black;
  color: #00ffaa;
  border: 2px solid #00ffaa;
  border-radius: 6px;
  outline: none;
  box-shadow: 0 0 10px rgba(0, 255, 170, 0.3);
`;


const AddButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background-color: #00ffaa;
  color: black;
  border: 2px solid #00ffaa;
  border-radius: 6px;
  font-family: 'Press Start 2P', cursive;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 1rem;

  &:hover {
	background-color: black;
	color: #00ffaa;
  }

  &:disabled {
	background-color: #444;
	cursor: not-allowed;
  }
`;

const Suggestions = styled.ul`
  position: absolute;
  width: 100%;
  background-color: #111;
  border: 1px solid #00ffaa;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 10;
`;

const SuggestionItem = styled.li`
  padding: 0.5rem;
  cursor: pointer;
  color: #00ffaa;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.75rem;

  &:hover {
	background-color: #00ffaa;
	color: black;
  }
`;

const PlayerList = styled.ul`
  margin-top: 2rem;
  padding: 0;
  list-style: none;
  font-family: 'Press Start 2P', cursive;
  font-size: 1rem;
  color: #00ffaa;
`;

const PasswordPrompt = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;

  & > div {
	background-color: #222;
	padding: 2rem;
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	align-items: center;
	color: #00ffaa;
  }

  input {
	padding: 0.75rem;
	font-family: 'Press Start 2P', cursive;
	background-color: black;
	color: #00ffaa;
	border: 2px solid #00ffaa;
	border-radius: 6px;
  }

  button {
	padding: 0.75rem;
	background-color: #00ffaa;
	color: black;
	border: 2px solid #00ffaa;
	border-radius: 6px;
	font-family: 'Press Start 2P', cursive;
	cursor: pointer;
	transition: background-color 0.3s ease;

	&:hover {
	  background-color: black;
	  color: #00ffaa;
	}
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #00ffaa;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
	color: #ff0000;
  }
`;

const GameCanvas = styled.canvas`
  border: 2px solid white;
  margin-top: 1rem;
`;

interface User {
  id:       number
  username: string
}

const LocalGame = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<User[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [addedPlayers, setAddedPlayers] = useState<string[]>([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const { user } = useAuth();
  const [readyToRender, setReadyToRender] = useState(false)
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<number | null>(null);
	const [pendingId, setPendingId] = useState<number | null>(null);


	const joinGame = useCallback(async (playerId: number, playerIndex: number) => {
		try {
			const res  = await fetch(`/api/matchmaking`, {
				method:  'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user!.authToken}`
				},
				body: JSON.stringify({
					player_id: playerId,
					game_type: 'local',
					player_index: playerIndex
				}),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({}))
				throw new Error(err.error || res.statusText)
			}
			const body = await res.json()

			if (body.match_id) {
				setGameId(body.match_id);
			} else if (body.pending_id) {
				setPendingId(prev => prev || body.pending_id);
			}
		} catch (err) {
			toast.error('Matchmaking failed');
		}
	}, [user?.authToken])

  useEffect(() => {
	if (!user)
		return
	setAddedPlayers([user.username])
	// setCreatorId(user.id)
	joinGame(user.id, 1)
  }, [user, joinGame])

  useEffect(() => {
	const fetchUsers = async () => {
	  try {
		const res = await customFetch.get("/users");
		setUsers(res.data);
	  } catch (err) {
		console.error("Error fetching users:", err);
	  }
	};
	fetchUsers();
  }, []);

  useEffect(() => {
	if (query.length === 0) return setFiltered([]);
	setFiltered(users.filter(u => u.username.toLowerCase().includes(query.toLowerCase())));
  }, [query, users]);

  const handleSelect = (username: string) => {
	setSelected(username);
	setQuery(username);
	setFiltered([]);
  };

  const handleAddPlayer = () => {
	if (selected && addedPlayers.length === 1 && !addedPlayers.includes(selected)) {
	  setShowPasswordPrompt(true);
	}
  };

  const handlePasswordSubmit = async () => {
    if (!selected)
      return
	try{
		const response = await customFetch.post('/check_password', {
		selected,
		password,
		})
		if (response.data.ok) {
			setAddedPlayers([...addedPlayers, selected]);
			setLastAdded(selected);
			setShowPasswordPrompt(false);
			setQuery('');
			setSelected(null);
			setPassword('');
		} else {
			toast.error('Passwords do not match');
		}
	} catch (err: unknown) {
		// Axios throws on 401, 500, etc.
		if (axios.isAxiosError(err) && err.response?.status === 401) {
		  toast.error('Passwords do not match');
		} else {
		  toast.error('An unexpected error occurred');
		}
	  }
  };

/* 	useEffect(() => {
		if (addedPlayers.length !== 2 || creatorId === null || !lastAdded)
			return
		const createLocalMatch = async () => {
			try {
				const res = await customFetch.get(`/user/${lastAdded}`)
				const secondUserId = res.data.id
				const response = await customFetch.post('/game/new-singleplayer', {
					// player_id: parseInt(creatorId),
					player1_id: parseInt(creatorId),
					player2_id: parseInt(secondUserId),
				});
				const data = response.data
				if (data.id) {
					setGameId(data.id)
					setReadyToRender(true)
				}
			} catch (err) {
				console.error('Failed to create tournament:', err);
			}
		};
		createLocalMatch();
	}, [addedPlayers, creatorId, lastAdded]); */

	useEffect(() => {
		if (!lastAdded)
			return
		const fetchAndJoin = async () => {
			try {
				const res = await customFetch.get(`/user/${lastAdded}`)
				const nextUserId = res.data.id
				await joinGame(nextUserId, 2)
			} catch (err) {
			// TODO
			}
		}
		fetchAndJoin()
	}, [lastAdded])

/* ********************************************************************* */

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<GameRendererType | null>(null);

	useEffect(() => {
		if (!gameId || !user?.authToken) return;

		canvasRef.current.focus();

		// Store event handlers as named functions for cleanup
		const keyDownHandler = (e: KeyboardEvent) => {
			// only intercept arrow keys when canvas is focused
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();  // block page scroll
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 1;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 1;
		};

		const keyUpHandler = (e: KeyboardEvent) => {
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 0;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 0;
		};

		// Create the renderer using the adapter
		const renderer = createGameRendererAdapter(
			gameId,
			user.authToken,
			canvasRef.current,
			"single"
		);

		renderer.onGameOver = (winner) => {
			setTimeout(() => navigate("/dashboard"), 3_000);
		};

		// Add event listeners
		document.addEventListener('keydown', keyDownHandler);
		document.addEventListener('keyup', keyUpHandler);

		rendererRef.current = renderer;
		renderer.start();

		// Cleanup function
		return () => {
			if (renderer?.socket && renderer.socket.readyState === WebSocket.OPEN) {
			renderer.socket.close();
			}

			// Remove event listeners
			document.removeEventListener('keydown', keyDownHandler);
			document.removeEventListener('keyup', keyUpHandler);

			rendererRef.current = null;
			// setTimeout(() => { navigate('/dashboard'); }, 3_000);
		};
	}, [gameId, user?.authToken]);

  return (
	<Container>
	  <canvas
      id='game-canvas'
      style={{ display: 'none' }}
	  width={1}
      height={1}
      />
	{!gameId && (
		<SearchWrapper>
			<Input
			type="text"
			placeholder="Search player..."
			value={query}
			onChange={(e) => {
				setQuery(e.target.value);
				setSelected(null);
			}}
			/>
			{filtered.length > 0 && (
			<Suggestions>
				{filtered.map(user => (
				<SuggestionItem key={user.id} onClick={() => handleSelect(user.username)}>
					{user.username}
				</SuggestionItem>
				))}
			</Suggestions>
			)}

			<AddButton onClick={handleAddPlayer} disabled={!selected}>
			Add Player
			</AddButton>

			{addedPlayers.length > 0 && (
			<PlayerList>
			<h4>Added Players:</h4>
			{addedPlayers.map((player, id) => (
				<li key={id}>
					{id === 0
					? `${player} (you)`
					:player
					}
				</li>
			))}
			</PlayerList>
		)}
		</SearchWrapper>
	)}

	{showPasswordPrompt && (
	<PasswordPrompt>
		<div>
		<CloseButton onClick={() => setShowPasswordPrompt(false)}>×</CloseButton>
		<h4>Please enter the password to add {selected}</h4>
		<input
			type="password"
			value={password}
			onChange={(e) => setPassword(e.target.value)}
			placeholder="Enter password"
		/>
		<button onClick={handlePasswordSubmit}>Submit</button>
		</div>
	</PasswordPrompt>
	)}

	{gameId && (
		<GameCanvas
		ref={canvasRef}
		width={DEFAULT_WIDTH}
		height={DEFAULT_HEIGHT}
		tabIndex={0}
	  />
	)}
	</Container>
  );
};

export default LocalGame;