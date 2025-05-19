import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styled from 'styled-components'
import { toast } from 'react-toastify'
import {
  createGameRendererAdapter,
  GameRendererType,
} from '../utils/GameRendererAdapter'
import { API_URL } from '../config';

const DEFAULT_WIDTH  = 800
const DEFAULT_HEIGHT = 600


const Container = styled.div`
  display:        flex;
  flex-direction: column;
  align-items:    center;
  min-height:     100vh;
  padding:        2rem;
  color:          white;
`

const PlayerList = styled.ul`
  list-style: none;
  padding:    0;
  margin:     1rem 0;
`

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

const GameCanvas = styled.canvas`
  border: 2px solid white;
  margin-top: 1rem;
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


export default function Tournament() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading,      setLoading]      = useState(true)
  const [tourneyId,    setTourneyId]    = useState<number | null>(null)
  const [myUserId,     setMyUserId]     = useState<number | null>(null)
  const [players,      setPlayers]      = useState<Player[]>([])
  const [bracket,      setBracket]      = useState<BrRow[]>([])
  const [started,      setStarted]      = useState(false)
  const [gameId,       setGameId]       = useState<number | null>(null)
  const [winnerName,   setWinnerName]   = useState<string | null>(null)
  const [championName, setChampionName] = useState<string | null>(null)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GameRendererType | null>(null)

  // poll tournament/auto until tournament starts
  const fetchTournamentAuto = async () => {
    const res  = await fetch(`${API_URL}/tournament/auto`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user!.authToken}`
      },
      body: JSON.stringify({
        player_id: -1,
        game_type: 'remote',
      }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Unknown error')

    setTourneyId(body.tournament_id)
    setPlayers(body.players)
    setStarted(body.started)
    setMyUserId(body.user_id)

    if (body.bracket) {
      const withRoundOne: BrRow[] = body.bracket.map((m: any) => ({
        ...m,
        round: 1,
      }))
      setBracket(withRoundOne)
    }
    setLoading(false)
    return body
  }

  useEffect(() => {
    if (!user?.authToken || started) return
    const iv = setInterval(async () => {
      try {
        const body = await fetchTournamentAuto()
        if (body.started) clearInterval(iv)
      } catch (err) {
        console.error(err)
        clearInterval(iv)
      }
    }, 2000)
    return () => clearInterval(iv)
  }, [user?.authToken, started])

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

  useEffect(() => {
    if (!started || gameId || championName) return
    const iv = setInterval(() => {
      fetchFullBracket().catch(err => console.error('pollBracket', err))
    }, 2500)
    return () => clearInterval(iv)
  }, [started, gameId, championName])

  // real‑time game adapter
  useEffect(() => {
    if (!gameId) return
    if (!canvasRef.current) {
      console.error('Canvas not mounted yet')
      return
    }

    const renderer = createGameRendererAdapter(
      gameId,
      user!.authToken,
      canvasRef.current,
      'multi'
    )
    rendererRef.current = renderer
    renderer.start()

		canvasRef.current.focus();

		const onDown = (e: KeyboardEvent) => {
			// only intercept arrow keys when canvas is focused
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();  // block page scroll
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 1;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 1;
		};

		const onUp = (e: KeyboardEvent) => {
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 0;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 0;
		};
    document.addEventListener('keydown', onDown)
    document.addEventListener('keyup', onUp)

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
              game_type: 'remote',
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
      document.removeEventListener('keydown', onDown)
      document.removeEventListener('keyup', onUp)
    }
  }, [gameId])

  if (loading) return <Container>Loading tournament…</Container>

  if (!started) {
    return (
      <Container>
        <h1>Tournament Lobby{/*  #{tourneyId} */}</h1>
        <PlayerList>
          {players.map(p => (
            <li key={p.id}>{p.username}</li>
          ))}
        </PlayerList>
      </Container>
    )
  }

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
/*     let currentGameId = bracket[0].tm_status === 'scheduled' ? 1 : 2 // TODO
    if (bracket.length === 3 && bracket[1].tm_status !== 'scheduled')
      currentGameId = 3 */
    return (
      <Container>
        <canvas id="game-canvas" style={{ display: 'none' }} width={1} height={1} />
        {/* <h1>Game #{gameId}</h1> */}
        <GameCanvas ref={canvasRef} width={DEFAULT_WIDTH} height={DEFAULT_HEIGHT} tabIndex={0} />
      </Container>
    )
  }

  const rounds = Math.max(1, ...bracket.map(b => b.round))

  return (
    <Container>
      <h1>Tournament {/* #{tourneyId}  */}Bracket</h1>
      {winnerName && <Status>🎉 {winnerName} wins! 🎉</Status>}
      <p>Select your match to ▶ Play:</p>

      <BracketGrid $rounds={rounds}>
        {bracket.map(m => {
          const isMyMatch =
            m.tm_status === 'scheduled' &&
            (m.player1_id === myUserId || m.player2_id === myUserId)

          return (
            <MatchCard
              key={`${m.round}-${m.tm_id}`}
              $clickable={!!(isMyMatch && m.game_id)}
              onClick={() => {
                if (isMyMatch && m.game_id) setGameId(m.game_id)
              }}
            >
              <strong>{m.player1_username ?? 'TBD'}</strong> vs{' '}
              <strong>{m.player2_username ?? 'TBD'}</strong>
              <br />
              Round {m.round} —{' '}
              {m.tm_status === 'scheduled'
                ? isMyMatch && m.game_id
                  ? '▶ Play'
                  : '⧗ Waiting'
                : m.tm_status === 'finished'
                ? '✓ Done'
                : m.tm_status}
            </MatchCard>
          )
        })}
      </BracketGrid>
    </Container>
  )
}
