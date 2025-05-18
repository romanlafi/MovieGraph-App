import AppRouter from "./routes/AppRouter";
import {AuthProvider} from "./contexts/AuthProvider.tsx";
import {LikeProvider} from "./contexts/LikeContext.tsx";
import {FollowProvider} from "./contexts/FollowContext.tsx";


function App() {
  return (
      <AuthProvider>
          <LikeProvider>
              <FollowProvider>
                  <AppRouter />
              </FollowProvider>
          </LikeProvider>
      </AuthProvider>
  );
}

export default App;