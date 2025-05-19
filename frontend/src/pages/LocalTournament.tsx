import styled from 'styled-components';
import { useEffect, useState, useRef, useCallback,  } from "react";
import { customFetch } from '../utils';

import { useAuth } from '../context/AuthContext';
import {
	createGameRendererAdapter,
	GameRendererType,
  } from '../utils/GameRendererAdapter';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'
import { API_URL } from '../config';
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

const TournamentContainer = styled.div`
  display:        flex;
  flex-direction: column;
  align-items:    center;
  min-height:     100vh;
  padding:        2rem;
  color:          white;
`

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

// each round = one column
const BracketGrid = styled.div<{ $rounds: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$rounds}, 1fr);
  gap: 1rem;
  margin-top: 2rem;
`

const MatchCard = styled.div<{ $clickable: boolean }>`
  background: rgba(20, 20, 20, 0.8);
  padding:    1rem;
  border:     1px solid #444;
  opacity:    ${p => (p.$clickable ? 1 : 0.5)};
  cursor:     ${p => (p.$clickable ? 'pointer' : 'default')};

  ${p =>
    p.$clickable &&
    `
    box-shadow: 0 0 8px #0f0, 0 0 16px #0f0;
    transition: transform .15s;
    &:hover { transform: scale(1.05); }
  `}
`

const Status = styled.p`
  margin-top: 1rem;
  font-size:  1.2rem;
`

const ChampionScreen = styled(Container)`
  justify-content: center;
  text-align:      center;
`

interface Player {
  id:       number
  username: string
}

interface BrRow {
  tm_id:              number
  game_id:            number | null
  tm_status:          string
  player1_id:         number | null
  player1_username:   string | null
  player2_id:         number | null
  player2_username:   string | null
  round:              number
}

const LocalTournament = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [addedPlayers, setAddedPlayers] = useState([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [lastAdded, setLastAdded] = useState(null);
  // const [creatorId, setCreatorId] = useState(null)
  const { user } = useAuth();
  const [readyToRender, setReadyToRender] = useState(false)
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<number | null>(null);
  const [tourneyId,    setTourneyId]    = useState<number | null>(null)
  const [players,      setPlayers]      = useState<Player[]>([])
  const [started,      setStarted]      = useState(false)
  const [bracket,      setBracket]      = useState<BrRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [championName, setChampionName] = useState<string | null>(null)
  const [winnerName,   setWinnerName]   = useState<string | null>(null)
  // const [myUserId,     setMyUserId]     = useState<number | null>(null)

  const joinTournament = useCallback(async (playerId: number) => {
    try {
      const res  = await fetch(`${API_URL}/tournament/auto`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user!.authToken}`
        },
        body: JSON.stringify({
          player_id: playerId,
          game_type: 'local',
        }),
      })
      const body = await res.json()
      // const res = await customFetch.post('/tournament/auto', { // for some reason customFetch not working
      //   player_id: playerId,
      //   game_type: 'local',
      // })
      // const body = res.data
      console.log(body)
      if (!res.ok) throw new Error(body.error || 'Unknown error')

      setTourneyId(body.tournament_id)
      setPlayers(body.players)
      setStarted(body.started)
      // setMyUserId(body.user_id)

      if (body.bracket) {
        const withRoundOne: BrRow[] = body.bracket.map((m: any) => ({
          ...m,
          round: 1,
        }))
        setBracket(withRoundOne)
      }
      setLoading(false)
      return body
    } catch (err) {
      // TODO
    }
  })

  useEffect(() => {
  if (!user)
    return
  // console.log('logged in user:', user.username)
    setAddedPlayers([user.username])
  // console.log('logged in user id:', user.id)
    // setCreatorId(user.id)
    joinTournament(user.id)
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
    if (query.length === 0)
      return setFiltered([]);
    setFiltered(users.filter(u => u.username.toLowerCase().includes(query.toLowerCase())));
  }, [query, users]);

  const handleSelect = (username) => {
  setSelected(username);
  setQuery(username);
  setFiltered([]);
  };

  const handleAddPlayer = () => {
  if (selected && (addedPlayers.length === 1 || addedPlayers.length === 2 || addedPlayers.length === 3) &&
    !addedPlayers.includes(selected)) {
    setShowPasswordPrompt(true);
  }
  };

  const handlePasswordSubmit = async () => {
    try{
      const response = await customFetch.post('/check_password', {
      selected,
      password,
      })
      // console.log('password check response:', response);
      if (response.data.ok) {
        setLastAdded(selected);
        setShowPasswordPrompt(false);
        setQuery('');
        setSelected(null);
        setPassword('');
        setAddedPlayers([...addedPlayers, selected]);
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
    if (!lastAdded)
      return
    // console.log("lastAdded player: ", lastAdded)
    const fetchAndJoin = async () => {
      try {
        const res = await customFetch.get(`/user/${lastAdded}`)
        const nextUserId = res.data.id
        await joinTournament(nextUserId)
      } catch (err) {
        // TODO
      }
    }
    fetchAndJoin()
  }, [lastAdded])

  // fetch full bracket
  const fetchFullBracket = async () => {
    if (!tourneyId) return
    try {
      const resp = await fetch(
        `${API_URL}/tournament/${tourneyId}/bracket`,
        { headers: { Authorization: `Bearer ${user!.authToken}` } }
      )
      if (!resp.ok) throw new Error(resp.statusText)

      const { tournament, matches } = await resp.json()
      setBracket(matches as BrRow[])

      if (tournament.status === 'completed' && !championName) {
        const info = await (
          await fetch(`${API_URL}/user/${tournament.winner_id}`, {
            headers: { Authorization: `Bearer ${user!.authToken}` },
          })
        ).json()
        setChampionName(info.username)
      }
    } catch (err) {
      console.error('Failed to fetch full bracket:', err)
    }
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<GameRendererType | null>(null);

	useEffect(() => {
		if (addedPlayers.length !== 4 ||
        !canvasRef.current ||
        !user?.authToken ||
        !gameId)
			return;

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
		// console.log('creator id used for createGameRendererAdapter:', creatorId)
		const renderer = createGameRendererAdapter(
			// creatorId,
			gameId,
			user.authToken,
			canvasRef.current,
			"single"
		);

/* 		renderer.onGameOver = (winner) => {
			// console.log("Game over, winner:", winner);
			setTimeout(() => navigate("/dashboard"), 3_000);
		}; */

		// Add event listeners
		document.addEventListener('keydown', keyDownHandler);
		document.addEventListener('keyup', keyUpHandler);

		rendererRef.current = renderer;
		renderer.start();

    renderer.onGameOver = async (winner: { id: number }) => {
      renderer.socket?.close()
      setGameId(null)

      const match      = bracket.find(b => b.game_id === gameId)!
      const winnerSlot = winner.id === match.player1_id ? 1 : 2

      try {
        await fetch(
          `${API_URL}/tournament/${tourneyId}/match/${match.tm_id}/result`,
          {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization:  `Bearer ${user!.authToken}`,
            },
            body: JSON.stringify({
              winner_slot: winnerSlot,
              game_type: 'local',
            }),
          }
        )

        const info = await (
          await fetch(`${API_URL}/user/${winner.id}`, {
            headers: { Authorization: `Bearer ${user!.authToken}` },
          })
        ).json()
        setWinnerName(info.username)
      } catch {
        toast.error('Could not report match result.')
      }

      await fetchFullBracket()
    }

    return () => {
      renderer.socket?.close()
      document.removeEventListener('keydown', keyDownHandler)
      document.removeEventListener('keyup', keyUpHandler)
    }
	}, [addedPlayers, user?.authToken, gameId]);

  const nextPlayableMatch = bracket.find(
    m => m.tm_status === 'scheduled' && m.game_id
  );

  if (championName) {
    return (
      <ChampionScreen>
        <h1 style={{ fontSize: '3rem' }}>
          🏆 {championName} wins the tournament! 🏆
        </h1>
        <button
          style={{
            marginTop: '3rem',
            fontSize:  '1.5rem',
            padding:   '1rem 2.5rem',
            cursor:    'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          Back Home
        </button>
      </ChampionScreen>
    )
  }

  if (gameId) {
    let currentGameId = bracket[0].tm_status === 'scheduled' ? 1 : 2
    if (bracket.length === 3 && bracket[1].tm_status !== 'scheduled')
      currentGameId = 3
    return (
      <TournamentContainer>
        <canvas
          id="game-canvas"
          style={{ display: 'none' }}
          width={1} height={1}
        />
        {/* <h1>Game #{currentGameId}</h1> */}
        <GameCanvas
          ref={canvasRef}
          width={DEFAULT_WIDTH}
          height={DEFAULT_HEIGHT}
          tabIndex={0}
        />
      </TournamentContainer>
    )
  }

  const rounds = Math.max(1, ...bracket.map(b => b.round))

  if (addedPlayers.length < 4) {
    return (
      <Container>
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
       </Container>
    )
  }


  if (addedPlayers.length === 4) {
    return (
      <TournamentContainer>
    <h1>Tournament {/* #{tourneyId} */} Bracket</h1>
      {winnerName && <Status>🎉 {winnerName} wins! 🎉</Status>}
      <p>Select your match to ▶ Play:</p>

      <BracketGrid $rounds={rounds}>
        {bracket.map(m => {
          const isNextMatch = m.tm_id === nextPlayableMatch?.tm_id;

          return (
            <MatchCard
              key={`${m.round}-${m.tm_id}`}
              $clickable={!!(isNextMatch && m.game_id)}
              onClick={() => {
                // if (isMyMatch && m.game_id) setGameId(m.game_id)
                if (isNextMatch) setGameId(m.game_id);
              }}
            >
              <strong>{m.player1_username ?? 'TBD'}</strong> vs{' '}
              <strong>{m.player2_username ?? 'TBD'}</strong>
              <br />
              Round {m.round} —{' '}
              {m.tm_status === 'scheduled'
                ? isNextMatch && m.game_id
                  ? '▶ Play'
                  : '⧗ Waiting'
                : m.tm_status === 'finished'
                ? '✓ Done'
                : m.tm_status}
            </MatchCard>
          )
        })}
      </BracketGrid>
      </TournamentContainer>
    )
  }
}
  
export default LocalTournament;