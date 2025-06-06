import { FormInput, SubmitBtn } from '../components';
import { ActionFunctionArgs, Form, Link, redirect } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { customFetch } from '../utils';
import { toast } from 'react-toastify';
import axios from 'axios';

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = (formData.get('identifier') || '').toString().trim();
  const username = (formData.get('username') || '').toString().trim();
  const password = (formData.get('password') || '').toString();
  const confirmPassword = (formData.get('confirmPassword') || '').toString();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const userRe = /^(?!\d+$)[A-Za-z0-9_]{3,20}$/
  const passRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

  const errors: string[] = []

  if (!emailRe.test(email))
    errors.push('Please enter a valid email address')
  if (!userRe.test(username))
    errors.push('Username must be 3–20 characters and contain only letters, numbers, or underscore and cannot be only numbers')
  if (!passRe.test(password))
    errors.push('Password must be ≥8 chars, include at least one uppercase letter, one lowercase letter and one digit')
  if (password !== confirmPassword) {
    errors.push('Passwords do not match')
  }

  if (Object.keys(errors).length > 0) {
    Object.values(errors).forEach(msg => toast.error(msg));
    return null;
  }

  try {
    await customFetch.post('/user/register', {
      username,
      password,
      email,
    });
    toast.success('account created successfully');
    return redirect('/login');
  } catch (error: unknown) {
    let errorMessage = 'Please double check your credentials';
    if (axios.isAxiosError(error)) {
      // your backend sends `{ error: "User with this username already exists" }`
      errorMessage =
        (error.response?.data as { error?: string })?.error 
        ?? error.message;
    }
    toast.error(errorMessage);
    return null;
  }
};

const Signup: React.FC = () => {
  return (
    <Container>
      <FormContainer method='POST'>
        <Title>Signup</Title>
        <FormInput type='email' label='email' name='identifier' required />
        <FormInput type='text' label='username' name='username' required />
        <FormInput type='password' label='password' name='password' required />
        <FormInput
          type='password'
          label='confirm password'
          name='confirmPassword'
          required
        />
        <ButtonContainer>
          <SubmitBtn text='Signup' />
        </ButtonContainer>
        <LinkContainer>
          Already have an account?
          <StyledLink to='/login'>login</StyledLink>
        </LinkContainer>
      </FormContainer>
    </Container>
  );
};

export default Signup;
