import { FormInput, SubmitBtn } from '../components';
import {
  ActionFunctionArgs,
  Form,
  Link,
  useActionData,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { customFetch } from '../utils';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { PROTOCOL } from '../config';
import { BACKEND_PORT } from '../config';

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

const Title = styled.h4`
  text-align: center;
  font-size: 2.5rem;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
`;

const ButtonContainer = styled.div`
  margin-top: 1.5 rem;
`;

const LinkContainer = styled.p`
  text-align: center;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.75rem;
  color: #fff;
  margin-top: 1.5rem;
`;

const StyledLink = styled(Link)`
  margin-left: 0.5rem;
  color: #00ffaa;
  text-decoration: none;
  text-transform: capitalize;
  transition: color 0.3s;

  &:hover {
    color: #00dd99;
    text-decoration: underline;
  }
`;

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 1.5rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #444;
  }

  span {
    margin: 0 1rem;
    font-family: 'Press Start 2P', cursive;
    font-size: 0.7rem;
    color: #999;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: rgba(30, 30, 30, 0.8);
  border: 2px solid #444;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;
  transition: all 0.3s;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);

  &:hover {
    background-color: rgba(50, 50, 50, 0.8);
    border-color: #00ffaa;
    box-shadow: 0 0 15px rgba(0, 255, 170, 0.3);
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = (formData.get('username') || '').toString().trim()
  const password = (formData.get('password') || '').toString();

  const userRe = /^[A-Za-z0-9_]{3,20}$/
  const errors: string[] = []
  if (!userRe.test(username))
    errors.push('Username must be 3–20 characters and contain only letters, numbers, or underscore')
  if (password.length === 0)
    errors.push('Password cannot be empty')
  if (errors.length) {
    errors.forEach((msg) => toast.error(msg));
    return null;
  }

  try {
    const response = await customFetch.post('/user/login', {
      username,
      password,
    });

    // const skipTwoFactor = import.meta.env.VITE_SKIP_2FA === 'true';
    // console.log(skipTwoFactor);

    if (response.data.token) {
      // if (skipTwoFactor) {
        toast.success('Logged in without 2FA successfully');
        return { initialAuth: false, token: response.data.token, username };
      // }
    }

    if (response.data.message) {
      toast.info('2FA required – check your email');
      return { initialAuth: true, username };
    }

    return null;
  } catch (error) {
    let errorMessage = 'please double check your credentials';
    if (error instanceof AxiosError && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    toast.error(errorMessage);
    return null;
  }
};

const Login: React.FC = () => {
  const actionData = useActionData();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginProcessed = useRef(false);

  useEffect(() => {
    // console.log(actionData?.initialAuth);

    // Handle 2FA required response
    if (actionData?.initialAuth) {
      // Navigate to 2FA verification page
      const url = `/login/verify-2fa?username=${encodeURIComponent(
        actionData.username
      )}`;
      navigate(url, { state: { username: actionData.username } });
      return;
    }

    // Check URL parameters for access_token (Google login)
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    // Handle Google OAuth errors
    if (error) {
      toast.error(`Authentication failed: ${error}`);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Handle Google OAuth success
    if (accessToken && !loginProcessed.current) {
      loginProcessed.current = true;

      customFetch
        .get('/user/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .then((response) => {
          // Extract the username from the response
          const username = response.data.username;

          // Login with real username
          login({ username, authToken: accessToken });

          // Clear the URL parameters
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          toast.success('Logged in with Google successfully');
          navigate('/dashboard');
        })
        .catch((error) => {
          console.error('Failed to get user data:', error);
          toast.error('Unable to retrieve user information');
          loginProcessed.current = false;
        });
    } // Handle normal login without 2FA
    else if (actionData?.token && !loginProcessed.current) {
      login({ username: actionData.username, authToken: actionData.token });
      loginProcessed.current = true;
      navigate('/dashboard');
    }
  }, [actionData, login, navigate, location]);

  return (
    <Container>
      <FormContainer method='post'>
        <Title>Login</Title>
        <FormInput type='text' label='username' name='username' required />
        <FormInput type='password' label='password' name='password' required />
        <ButtonContainer>
          <SubmitBtn text='login' />
        </ButtonContainer>
        <LinkContainer>
          Don't have an account? <StyledLink to='/signup'>signup</StyledLink>
        </LinkContainer>
        <OrDivider>
          <span>OR</span>
        </OrDivider>

        <GoogleButton
          type='button'
          onClick={() => {
            const apiUrl = `${PROTOCOL}://localhost:${BACKEND_PORT}`;
            window.location.href = `${apiUrl}/oauth2/google/`;
          }}
        >
          <svg
            width='22'
            height='22'
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 48 48'
          >
            <path
              fill='#FFC107'
              d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
            ></path>
            <path
              fill='#FF3D00'
              d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
            ></path>
            <path
              fill='#4CAF50'
              d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'
            ></path>
            <path
              fill='#1976D2'
              d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'
            ></path>
          </svg>
          Login with Google
        </GoogleButton>
      </FormContainer>
    </Container>
  );
};

export default Login;