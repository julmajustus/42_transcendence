import styled from 'styled-components';

interface UserCardProps {
  id: number;
  username: string;
  avatar: string;
  online_status: string;
};

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

const Avatar = styled.img<{ online: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid
    ${({ online }: { online: boolean }) => (online ? '#4caf50' : '#ccc')};
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  color: #333;
`;

/* const Status = styled.span<{ online: boolean }>`
  font-size: 0.9rem;
  color: ${({ online }) => (online ? '#4caf50' : '#999')};
`;
 */

const Status = styled.span<{ $status: 'online' | 'away' | 'offline' }>`
  font-size: 0.9rem;
  color: ${({ $status }) =>
    $status === 'online'  ? '#4caf50'   // green
  : $status === 'away'    ? '#FFA000'   // dark yellow
                          : '#999'      // grey
  };
`;


const UserCard: React.FC<UserCardProps> = ({
  id,
  username,
  avatar,
  online_status,
}) => {
  const isOnline = online_status === 'online';

  return (
    <Card>
      <Avatar src={avatar} alt={`${username}'s avatar`} online={isOnline} />
      <UserInfo>
        <Username>{username}</Username>
        {/* <Status online={isOnline}>{isOnline ? 'Online' : 'Offline'}</Status> */}
        <Status $status={online_status as 'online' | 'away' | 'offline'}>
          {online_status === 'online'
            ? 'Online'
            : online_status === 'away'
            ? 'Away'
            : 'Offline'}
        </Status>
      </UserInfo>
    </Card>
  );
};

export default UserCard;
