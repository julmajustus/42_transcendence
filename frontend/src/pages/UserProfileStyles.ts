import styled from 'styled-components';

export const ProfileContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: white;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 250px;
    background: linear-gradient(
      to bottom,
      rgba(0, 255, 170, 0.15),
      transparent
    );
    z-index: -1;
    border-radius: 16px;
  }
`;

export const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2.5rem;
  padding: 2rem;
  background: rgba(30, 30, 40, 0.7);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffaa, transparent);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

export const AvatarContainer = styled.div`
  position: relative;
`;

export const ProfileAvatar = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #00ffaa;
  box-shadow: 0 0 20px rgba(0, 255, 170, 0.4);
`;

export const AvatarEditOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  font-size: 0.85rem;
  font-weight: bold;

  ${AvatarContainer}:hover & {
    opacity: 1;
  }
`;

/* export const StatusIndicator = styled.div<{ $online: boolean }>`
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${({ $online }) => ($online ? '#4caf50' : '#999')};
  border: 3px solid #1e1e28;
`; */

export const StatusIndicator = styled.div<{ $status: 'online' | 'away' | 'offline' }>`
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  /* green for online, dark yellow for away, grey for offline */
  background-color: ${({ $status }) =>
    $status === 'online'
      ? '#4caf50'
      : $status === 'away'
      ? '#FFA000'
      : '#999'};
  border: 3px solid #1e1e28;
`;


export const ProfileInfo = styled.div`
  flex: 1;
`;
export const Username = styled.h1`
  font-family: 'Press Start 2P', cursive;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: white;
  position: relative;
  display: inline-block;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 50px;
    height: 3px;
    background-color: #00ffaa;
  }
`;

export const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

export const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #333;
  color: white;
  border: 2px solid #555;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #444;
    border-color: #00ffaa;
  }
`;

export const Section = styled.div`
  background: rgba(20, 20, 30, 0.7);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-5px);
  }
`;

export const SectionTitle = styled.h2`
  font-family: 'Press Start 2P', cursive;
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 1rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
`;

export const FriendsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

export const MatchHistory = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

export const MatchCard = styled.div<{ result: 'win' | 'loss' }>`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: ${({ result }) =>
    result === 'win' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
  border: 1px solid
    ${({ result }) => (result === 'win' ? '#4caf50' : '#f44336')};
  border-radius: 8px;
`;

export const MatchAvatar = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1.5rem;
  border: 2px solid #333;
`;

export const MatchInfo = styled.div`
  flex: 1;
`;

export const MatchOpponent = styled.div`
  font-size: 1.1rem;
  margin-bottom: 0.3rem;

  strong {
    color: #fff;
  }
`;

export const MatchResult = styled.span<{ result: 'win' | 'loss' }>`
  color: ${({ result }) => (result === 'win' ? '#4caf50' : '#f44336')};
  font-weight: bold;
  text-transform: uppercase;
`;

export const MatchScore = styled.div`
  font-family: 'Press Start 2P', cursive;
  font-size: 1rem;
  margin-right: 1rem;
`;

export const MatchDate = styled.div`
  color: #999;
  font-size: 0.8rem;
`;

export const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #777;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
`;

export const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;  /* push label to top, value to bottom */
  padding: 1rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
`;

export const StatLabel = styled.div`
  font-size: 0.6rem;
  color: #666;
  margin-bottom: 0.25rem;
`;

export const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #222;
`;

export const UsernameContainer = styled.div`
  position: relative;
  display: inline-block;
`;

export const UsernameEditOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8); /* Darker background for stronger contrast */
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  font-size: 0.8rem;
  font-weight: bold;
  border-radius: 1.5rem;


  ${UsernameContainer}:hover & {
    opacity: 1;
  }
`;

export const Email = styled.h5`
  display: block;
  margin: 0.8;      /* reset any default margin if you like */
  font-size: 0.8rem;
  color: #ccc;
`;
