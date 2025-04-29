import AppRouter from "./routes/AppRouter";
import {AuthProvider} from "./contexts/AuthContext.tsx";

function App() {
  return (
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
  );
}

export default App;
