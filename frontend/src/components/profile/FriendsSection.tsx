import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserCard from './UserCard';
import {
  Section,
  SectionTitle,
  FriendsList,
  EmptyState,
} from '../../pages/UserProfileStyles';
import { SearchUserSection } from './SearchUserSection';
import { API_URL } from '../../config';

interface Friend {
  id: number;
  username: string;
  online_status: string;
  friendshipId: number;
}

interface FriendsSectionProps {
  friends: Friend[];
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({ friends }) => {
  const apiUrl = API_URL;
  console.log('apiUrl in friends section: ', apiUrl)
  const [isSearchBarOpen, setSearchBarOpen] = useState(false);

  return (
    <Section>
      <SectionTitle>Friends</SectionTitle>
      <button
          onClick={() => setSearchBarOpen(true)}
          style={{ padding: '6px 12px', fontSize: '0.875rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #007bff', backgroundColor: '#007bff', color: '#fff' }}
        >
          Add Friend
      </button>
      {friends.length > 0 ? (
        <FriendsList>
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/profile/${friend.username}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <UserCard
                id={friend.id}
                username={friend.username}
                avatar={`${apiUrl}/user/${friend.username}/avatar`}
                online_status={friend.online_status || 'offline'}
              />
            </Link>
          ))}
        </FriendsList>
      ) : (
        <EmptyState>No friends yet</EmptyState>
      )}
      {/* Triggered Modal */}
      {isSearchBarOpen && (
        <SearchUserSection
          isOpen={isSearchBarOpen}
          onClose={() => setSearchBarOpen(false)}
        />
      )}
    </Section>
  );
};
