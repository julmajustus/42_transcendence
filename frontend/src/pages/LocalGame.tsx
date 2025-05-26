import styled from 'styled-components';
import { useEffect, useState, useRef,  } from "react";
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


const LocalGame = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [lastAdded, setLastAdded] = useState(null);
  const [creatorId, setCreatorId] = useState(null)
  const { user } = useAuth();
  const [readyToRender, setReadyToRender] = useState(false)
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<number | null>(null);

  useEffect(() => {
	if (!user)
		return
	// console.log('logged in user:', user.username)
	setAddedPlayers([user.username])
	// console.log('logged in user id:', user.id)
	setCreatorId(user.id)
  }, [user])

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

  const handleSelect = (username) => {
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
	// Check if password is valid (You could have additional validation here)
	// console.log(selected)
	// console.log(password)
	try{
		const response = await customFetch.post('/check_password', {
		selected,
		password,
		})
		console.log('password check response:', response);
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

	useEffect(() => {
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
	}, [addedPlayers, creatorId, lastAdded]);

/* ********************************************************************* */

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<GameRendererType | null>(null);

	useEffect(() => {
		if (addedPlayers.length !== 2 || creatorId === null || !canvasRef.current || !user?.authToken || readyToRender === false)
			return;

		// Store event handlers as named functions for cleanup
		const keyDownHandler = (e: KeyboardEvent) => {
			if (!rendererRef.current) return;

			if (e.key === 'ArrowUp') {
			rendererRef.current.controls.up = 1;
			} else if (e.key === 'ArrowDown') {
			rendererRef.current.controls.down = 1;
			}
		};

		const keyUpHandler = (e: KeyboardEvent) => {
			if (!rendererRef.current) return;

			if (e.key === 'ArrowUp') {
			rendererRef.current.controls.up = 0;
			} else if (e.key === 'ArrowDown') {
			rendererRef.current.controls.down = 0;
			}
		};

		// Create the renderer using the adapter
		// console.log('creator id used for createGameRendererAdapter:', creatorId)
		const renderer = createGameRendererAdapter(
			// creatorId,
			gameId,
			user.authToken,
			canvasRef.current,
			"single"
		);

		renderer.onGameOver = (winner) => {
			// console.log("Game over, winner:", winner);
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
			setTimeout(() => { navigate('/dashboard'); }, 3_000);
		};
	}, [addedPlayers, user?.authToken, creatorId, readyToRender]);

  return (
	<Container>
	  <canvas
      id='game-canvas'
      style={{ display: 'none' }}
	  width={1}
      height={1}
      />
	{addedPlayers.length < 2 && (
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

	{addedPlayers.length === 2 && (
		<GameCanvas
		ref={canvasRef}
		width={DEFAULT_WIDTH}
		height={DEFAULT_HEIGHT}
	  />
	)}
	</Container>
  );
};

export default LocalGame;