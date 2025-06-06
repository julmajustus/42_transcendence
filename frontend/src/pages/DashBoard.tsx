import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';

// Add a container for full-page centering
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-image: radial-gradient(
      circle at 10% 20%,
      rgba(0, 255, 170, 0.03) 0%,
      transparent 20%
    ),
    radial-gradient(
      circle at 90% 80%,
      rgba(0, 255, 170, 0.03) 0%,
      transparent 20%
    );
  padding: 2rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100%;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 255, 170, 0.1) 30%,
      rgba(0, 255, 170, 0.1) 70%,
      transparent 100%
    );
    z-index: 0;
  }
`;

// Add a glow animation
const glow = keyframes`
  0% { text-shadow: 0 0 10px rgba(0, 255, 170, 0.7); }
  50% { text-shadow: 0 0 20px rgba(0, 255, 170, 0.9); }
  100% { text-shadow: 0 0 10px rgba(0, 255, 170, 0.7); }
`;

const WelcomeSection = styled.div`
  text-align: center;
  margin-bottom: 5rem;
`;

const Title = styled.h1`
  font-family: 'Press Start 2P', cursive;
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #fff;
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.7);
  animation: ${glow} 3s ease-in-out infinite;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #aaa;
  max-width: 800px;
  margin: 1.5rem auto 0;
  letter-spacing: 1px;
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  margin-top: 2rem;
  position: relative;
  z-index: 1;
`;

const arrowShow = keyframes`
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
`;

const MenuItem = styled.div`
  font-family: 'Press Start 2P', cursive;
  color: white;
  font-size: 2rem;
  padding: 1rem 1.5rem;
  display: block;
  text-align: center;
  transition: all 0.3s ease-out;
  position: relative;
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    color: #00ffaa;
    transform: scale(1.05);
    background-color: rgba(0, 255, 170, 0.05);
  }

  &::before {
    content: '▶';
    position: absolute;
    left: -2.5rem;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
    animation: ${arrowShow} 0.3s ease-out forwards;
  }
`;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <DashboardContainer>
      <WelcomeSection>
        <Title>WELCOME, {user.username/*.toUpperCase()*/}</Title>
        <Subtitle>Choose a game mode to start playing</Subtitle>
      </WelcomeSection>

      <MenuContainer>
        <MenuItem onClick={() => navigate('/game/local')}>LOCAL GAME</MenuItem>
        <MenuItem onClick={() => navigate('/game/remote')}>REMOTE GAME
        </MenuItem>
        <MenuItem onClick={() => navigate('/tournament/local')}>LOCAL TOURNAMENT
        </MenuItem>
        <MenuItem onClick={() => navigate('/tournament/remote')}>REMOTE TOURNAMENT
        </MenuItem>
      </MenuContainer>
    </DashboardContainer>
  );
};

export default Dashboard;