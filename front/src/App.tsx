import AppRouter from "./routes/AppRouter";
import {AuthProvider} from "./contexts/AuthProvider.tsx";
import {LikeProvider} from "./contexts/LikeContext.tsx";

function App() {
  return (
      <AuthProvider>
          <LikeProvider>
              <AppRouter />
          </LikeProvider>
      </AuthProvider>
  );
}

export default App;