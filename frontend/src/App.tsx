import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {
  Matchmaking,
  Home,
  Login,
  Signup,
  Tournament,
  UserProfile,
  Error,
  Verify2FA,
  GameLobby,
  LocalGame,
  LocalTournament,
  UserSettings
} from './pages';
import Layout from './components/Layout';
import { action as signupAction } from './pages/Signup';
import { action as loginAction } from './pages/Login';
import { action as verify2FAAction } from './pages/Verify2FA';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/DashBoard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '/dashboard',
        element: <Dashboard />, 
      },
      {
        path: '/game/remote',
        element: <Matchmaking />,
      },
      {
        path: 'login',
        children: [
          {
            index: true,
            element: <Login />,
            action: loginAction,
          },
          {
            path: 'verify-2fa',
            element: <Verify2FA />,
            action: verify2FAAction,
          },
        ],
      },
      {
        path: 'signup',
        element: <Signup />,
        action: signupAction,
      },
      {
        path: 'tournament/local',
        element: <LocalTournament />,
      },
      {
        path: 'profile',
        element: <UserProfile />,
      },
      {
        path: '/game/local',
        element: <LocalGame />,
      },
      {
        path: 'tournament/remote',
        element: <Tournament />,
      },
      {
        path: 'profile/:username',
        element: <UserProfile />,
      },
      {
        path: 'settings',
        element: <UserSettings />,
      },
    ],
  },
]);

const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
