import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './provider/AuthProvider';
import router from './router/router';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;

