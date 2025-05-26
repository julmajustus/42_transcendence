import React, { useState, useEffect } from 'react';
import { Form, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { FormInput, SubmitBtn } from '../components';

const gridEffect = keyframes`
  0% { background-position: 0px 0px; }
  100% { background-position: 50px 50px; }
`;

const Container = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: 50px 50px;
  animation: ${gridEffect} 20s linear infinite;
`;

const FormContainer = styled(Form)`
  width: 26rem;
  padding: 2.5rem;
  background-color: rgba(10, 10, 10, 0.8);
  border: 2px solid #333;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 255, 170, 0.8),
      transparent
    );
    z-index: 1;
  }
`;

/* const Title = styled.h4`
  text-align: center;
  font-size: 2.5rem;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
`; */

const ButtonContainer = styled.div`
  margin-top: 1.5rem;
`;

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.75rem;
  color: #fff;
`;

const ToggleLabel = styled.label`
  position: relative;
  display: inline-block;
  width: 5rem;
  height: 2.4rem;
`;

const ToggleInput = styled.input.attrs({ type: 'checkbox' })`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: #00ffaa;
  }
  &:checked + span::before {
    transform: translateX(2.8rem);
  }
`;

const Slider = styled.span`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #444;
  border-radius: 2.4rem;
  transition: 0.3s;

  &::before {
    content: '';
    position: absolute;
    height: 2rem;
    width: 2rem;
    left: 0.1rem;
    bottom: 0.2rem;
    background-color: #fff;
    border-radius: 50%;
    transition: 0.3s;
  }
`;

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

const TwoFaMenuItem = styled.div`
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
`

const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  cursor: pointer;
  z-index: 100;

  &:hover {
    color: #00ffaa;
  }
`;


const UserSettings = () => {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [twoFAEnabled, setTwoFAEnabled] = useState(false);
	const [changingUsername, setChangingUsername] = useState(false)
	const [changingPassword, setChangingPassword] = useState(false)
	const [changingtwoFA, setChangingtwoFA] = useState(false)
	const [changingEmail, setChangingEmail] = useState(false)
	const [newEmail, setNewEmail] = useState("");
	const [confirmEmail, setConfirmEmail] = useState("");
	const [gmailAuth, setGmailAuth] = useState(false)

	useEffect(() => {
		(async () => {
		try {
			const resp = await fetch(`/api/user/me`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user.authToken}`,
				},
			});
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const data = await resp.json();
			// console.log(data)
			setTwoFAEnabled(Number(data.two_fa) === 1);
			if (data.google_id)
				setGmailAuth(true)
		} catch (err) {
			console.error('Failed to fetch 2FA status', err);
			toast.error('Could not load 2FA status');
		}
		})();
	}, [user.authToken]);
	// console.log('twoFAEnabled: ', twoFAEnabled)
	
	const handleToggle2FA = () => {
		if (gmailAuth === true) {
			toast.error('2FA is not available ig logged in with google')
			return
		}
		setTwoFAEnabled(prev => !prev)
		setTimeout(() => {
			setChangingtwoFA(true)
		}, 500);
	}

	const handleChangeUsername = () => {
		setChangingUsername(true)
	}
	
	const handleChangePassword = () => {
		setChangingPassword(true)
	}
	
	const handleChangeEmail = () => {
		if (gmailAuth === true) {
			toast.error('Change email is not possible if logged in with google')
			return
		}
		setChangingEmail(true)
	}

	const handleSubmit = async (e) => {
		e.preventDefault();

		const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		const userRe = /^[A-Za-z0-9_]{3,20}$/
		const passRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

		if (newPassword && newPassword !== confirmPassword) {
			toast.error('Passwords do not match');
			return null;
		}
		if (newEmail && newEmail !== confirmEmail) {
			toast.error('Emails do not match');
			return null;
		}
		if (newUsername) {
			if (!userRe.test(newUsername)) {
				toast.error('Username must be 3–20 characters and contain only letters, numbers, or underscore');
				return;
			}
		}
		if (newPassword) {
			if (!passRe.test(newPassword)) {
				toast.error('New password must be ≥8 chars, include at least one uppercase letter, one lowercase letter, and one digit');
				return;
			}
		}
		if (newEmail) {
			if (!emailRe.test(newEmail)) {
				toast.error('Please enter a valid email address');
				return;
			}
		}
		try {
			const response = await fetch(`/api/user/${user.username}/update`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${user.authToken}`,
				},
				body: JSON.stringify({
					currentPassword,
					newPassword: newPassword || undefined,
					newUsername: newUsername || undefined,
					twoFA: twoFAEnabled ? 1 : 0,
					newEmail: newEmail || undefined,
				}),
			});
			if (response.status === 200) {
				toast.success('Your credentials were updated. You will be logged out to re-authenticate.');
				setTimeout(() => {
					logout();
					navigate('/login');
				}, 2000);
			} else {
				const body = await response.json();
				toast.error(body.error || 'Update failed');
			}
		} catch (err: unknown) {
			let errorMessage = 'please double check your credentials';
			if (err instanceof AxiosError && err.message)
				errorMessage = err.message;
			toast.error(errorMessage);
		}
	}

	if (changingUsername === true) {
		return (
			<Container>
				<FormContainer onSubmit={handleSubmit}>
				<CloseButton type="button" onClick={() => {
					setChangingUsername(false),
					setNewUsername(''),
					setCurrentPassword('')
				}}
				>&times;</CloseButton>
				<Title>Change username</Title>
				<FormInput
					type="text"
					label="New Username"
					name="newUsername"
					value={newUsername}
					onChange={e => setNewUsername(e.target.value)}
				/>
				<FormInput
					type="password"
					label="Password"
					name="currentPassword"
					value={currentPassword}
					onChange={e => setCurrentPassword(e.target.value)}
					required
				/>
				<ButtonContainer>
					<SubmitBtn text="Update" />
				</ButtonContainer>
				</FormContainer>
			</Container>
		)
	}

	if (changingPassword === true) {
		return (
			<Container>
				<FormContainer onSubmit={handleSubmit}>
				<CloseButton type="button" onClick={() => {
					setChangingPassword(false),
					setCurrentPassword(''),
					setNewPassword(''),
					setConfirmPassword('')
				}}
				>&times;</CloseButton>
				<Title>Change password</Title>
					<FormInput
						type="password"
						label="Current Password"
						name="currentPassword"
						value={currentPassword}
						onChange={e => setCurrentPassword(e.target.value)}
						required
					/>
					<FormInput
						type="password"
						label="New Password"
						name="newPassword"
						value={newPassword}
						onChange={e => setNewPassword(e.target.value)}
					/>
					<FormInput
						type="password"
						label="Confirm New Password"
						name="confirmPassword"
						value={confirmPassword}
						onChange={e => setConfirmPassword(e.target.value)}
					/>
				<ButtonContainer>
					<SubmitBtn text="Update" />
				</ButtonContainer>
				</FormContainer>
			</Container>
		)
	}

	if (changingtwoFA === true) {
		return (
			<Container>
				<FormContainer onSubmit={handleSubmit}>
				<CloseButton type="button" onClick={() => {
					setChangingtwoFA(false);
					setTwoFAEnabled(prev => !prev);
					setCurrentPassword('')
				}}
				>
					&times;
				</CloseButton>
				<Title>Change 2FA</Title>
				<FormInput
					type="password"
					label="Password"
					name="currentPassword"
					value={currentPassword}
					onChange={e => setCurrentPassword(e.target.value)}
					required
				/>
				<ButtonContainer>
					<SubmitBtn text="Update" />
				</ButtonContainer>
				</FormContainer>
			</Container>
		)
	}

	if (changingEmail === true) {
		return (
			<Container>
				<FormContainer onSubmit={handleSubmit}>
				<CloseButton type="button" onClick={() => {
					setChangingEmail(false),
					setNewEmail(''),
					setConfirmEmail('')
					setCurrentPassword('')
				}}
				>&times;</CloseButton>
				<Title>Change email</Title>
					<FormInput
						type="email"
						label="New email"
						name="newEmail"
						value={newEmail}
						onChange={e => setNewEmail(e.target.value)}
					/>
					<FormInput
						type="email"
						label="Confirm New email"
						name="confirmemail"
						value={confirmEmail}
						onChange={e => setConfirmEmail(e.target.value)}
					/>
					<FormInput
						type="password"
						label="Current Password"
						name="currentPassword"
						value={currentPassword}
						onChange={e => setCurrentPassword(e.target.value)}
						required
					/>
				<ButtonContainer>
					<SubmitBtn text="Update" />
				</ButtonContainer>
				</FormContainer>
			</Container>
		)
	}

	return (
	<DashboardContainer>
		<WelcomeSection>
		<Title>SETTINGS</Title>
		{/* <Subtitle>Choose a game mode to start playing</Subtitle> */}
		</WelcomeSection>

		<MenuContainer>
		<MenuItem onClick={handleChangeUsername}>CHANGE USERNAME</MenuItem>
		<MenuItem onClick={handleChangePassword}>CHANGE PASSWORD</MenuItem>
		<MenuItem onClick={handleChangeEmail}>CHANGE EMAIL</MenuItem>
		<ToggleWrapper>
			<ToggleLabel>
				<ToggleInput
					checked={twoFAEnabled}
					onChange={handleToggle2FA}
				/>
				<Slider />
			</ToggleLabel>
			<TwoFaMenuItem>TWO-FACTOR AUTHENTICATION</TwoFaMenuItem>
		</ToggleWrapper>
		</MenuContainer>
	</DashboardContainer>
	);
};

export default UserSettings;