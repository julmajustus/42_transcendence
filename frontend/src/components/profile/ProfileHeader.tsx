import React, { useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ProfileHeader as Header,
  AvatarContainer,
  ProfileAvatar,
  StatusIndicator,
  ProfileInfo,
  Username,
  ButtonContainer,
  Button,
  AvatarEditOverlay,
  UsernameContainer,
  UsernameEditOverlay,
  Email,
} from '../../pages/UserProfileStyles';
import { customFetch } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

interface ProfileHeaderProps {
  userProfile: any;
  isCurrentUser: boolean;
  isFriend: boolean;
  onAddFriend: () => void;
  onRemoveFriend: (friendshipId: number) => void;
  getFriendshipId: () => Promise<number | null>;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userProfile,
  isCurrentUser,
  isFriend,
  onAddFriend,
  onRemoveFriend,
  getFriendshipId,
}) => {
  const { user: currentUser } = useAuth();
  const isOnline = userProfile.online_status === 'online';
  const apiUrl = API_URL;
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isCurrentUser && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await customFetch.put(
        `/user/${currentUser.username}/upload_avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${currentUser.authToken}`,
          },
        }
      );

      const avatarImg =
        document.querySelector<HTMLImageElement>('.profile-avatar');
      if (avatarImg) {
        avatarImg.src = `${apiUrl}/user/${
          userProfile.username
        }/avatar?t=${Date.now()}`;
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleRemoveFriendClick = async () => {
    if (!currentUser) return;
    const friendshipId = await getFriendshipId();
    if (friendshipId) onRemoveFriend(friendshipId);
  };

  return (
    <Header>
      <AvatarContainer>
        <ProfileAvatar
          src={`${apiUrl}/user/${userProfile.username}/avatar?t=${Date.now()}`}
          alt={`${userProfile.username}'s avatar`}
          onClick={handleAvatarClick}
          style={{ cursor: isCurrentUser ? 'pointer' : 'default' }}
        />
        {isCurrentUser && <AvatarEditOverlay>Edit</AvatarEditOverlay>}
        <StatusIndicator $online={isOnline} />


        <input
          type='file'
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept='image/*'
          onChange={handleFileChange}
        />
      </AvatarContainer>

      <ProfileInfo>
        {isCurrentUser ? (
          <UsernameContainer onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
            <Username>{userProfile.username}</Username>
            <UsernameEditOverlay>Edit</UsernameEditOverlay>
            <Email>{userProfile.email}</Email>
          </UsernameContainer>
        ) : (
          <Username>{userProfile.username}</Username>
        )}
        {userProfile.bio && <p>{userProfile.bio}</p>}
      </ProfileInfo>

      {!isCurrentUser && (
        <ButtonContainer>
          {isFriend ? (
            <Button onClick={handleRemoveFriendClick}>Remove Friend</Button>
          ) : (
            <Button onClick={onAddFriend}>Add Friend</Button>
          )}
        </ButtonContainer>
      )}
    </Header>
  );
};
