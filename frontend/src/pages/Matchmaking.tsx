import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import {
	createGameRendererAdapter,
	GameRendererType,
} from '../utils/GameRendererAdapter';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

const GameContainer = styled.div`
display: flex;
flex-direction: column;
align-items: center;
min-height: 100vh;
padding: 2rem;
color: white;
`;

const Status = styled.p`
margin-top: 2rem;
font-size: 1.2rem;
`;

const GameCanvas = styled.canvas`
border: 2px solid white;
margin-top: 1rem;
`;

const Matchmaking = () => {
	const { user } = useAuth();
	const [pendingId, setPendingId] = useState<number | null>(null);
	const [gameId,    setGameId]    = useState<number | null>(null);
	const [winnerName, setWinnerName] = useState<string|null>(null);
	const canvasRef   = useRef<HTMLCanvasElement>(null);
	const rendererRef = useRef<GameRendererType | null>(null);
	const pollRef     = useRef<number | null>(null);

	const navigate = useNavigate();
	useEffect(() => {
		if (!gameId || !user?.authToken) return;
		
		const canvas = canvasRef.current;
		if (!canvas) {
			console.error('Canvas is not ready');
			return;
		}
		
		const renderer = createGameRendererAdapter(gameId, user.authToken, canvas, 'multi');
		rendererRef.current = renderer
		
		canvas.focus();

		const keyDown = (e: KeyboardEvent) => {
			// only intercept arrow keys when canvas is focused
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();  // block page scroll
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 1;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 1;
		};

		const keyUp = (e: KeyboardEvent) => {
			const isArrow = e.key === 'ArrowUp' || e.key === 'ArrowDown';
			if (!isArrow || document.activeElement !== canvasRef.current)
				return;

			e.preventDefault();
			if (e.key === 'ArrowUp')   rendererRef.current!.controls.up   = 0;
			if (e.key === 'ArrowDown') rendererRef.current!.controls.down = 0;
		};

		document.addEventListener('keydown', keyDown);
		document.addEventListener('keyup', keyUp);
		renderer.start();

		renderer.onGameOver = async (winner: { id: number }) => {
			// setGameId(null);
			// setPendingId(null);
			setTimeout(() => navigate("/dashboard"), 3_000);
			try {
				// fetch the winner’s username
				const resp = await fetch(`/api/user/${winner.id}`, {
					headers: { Authorization: `Bearer ${user.authToken}` }
				});
				const body = await resp.json();
				setWinnerName(body.username);

			} catch (e) {
				toast.error('Could not fetch winner name');
			}
		};

		return () => {
			renderer?.socket?.close();
			setGameId(null);
			setPendingId(null);
			document.removeEventListener('keydown', keyDown);
			document.removeEventListener('keyup', keyUp);
			// setTimeout(() => {navigate('/'); }, 5_000);
		};
	}, [gameId, user?.authToken]);

	// On mount, start the single‐endpoint matchmaking + polling loop
	useEffect(() => {
		if (!user?.authToken) return;

		let intervalId: number;
		let isMatching = false;

		const doMatch = async () => {
			if (isMatching) return;
			isMatching = true;

			try {
				const res = await fetch(`/api/matchmaking`, {
					method: 'POST',
					headers: { Authorization: `Bearer ${user.authToken}` }
				});
				const body = await res.json();

				if (body.match_id) {
					window.clearInterval(intervalId);
					setGameId(body.match_id);
				} else if (body.pending_id) {
					setPendingId(prev => prev || body.pending_id);
				}
			} catch (err) {
				toast.error('Matchmaking failed');
				window.clearInterval(intervalId);
			} finally {
				isMatching = false;
			}
		};

		doMatch();
		intervalId = window.setInterval(doMatch, 2000);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [user?.authToken]);

	return (
		<GameContainer>
		<canvas
		id='game-canvas'
		style={{ display: 'none' }}
		width={1}
		height={1}
		/>
		{/* <h1>Pong Game</h1> */}

		{!gameId && pendingId && (
			<Status>Waiting for another player to join…</Status>
		)}

{/* 		{winnerName && (
			<Status>🎉 {winnerName} wins! Well done, gg… 🎉</Status>
		)} */}
	
		{/* once match is ready */}
		{gameId && (
			<>
			{/* <Status>Game ID: {gameId}</Status> */}
			<GameCanvas
			ref={canvasRef}
			width={DEFAULT_WIDTH}
			height={DEFAULT_HEIGHT}
			tabIndex={0}
			/>
			</>
		)}
		</GameContainer>
		);
}

export default Matchmaking;
