import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import MovieDetail from "../pages/MovieDetail.tsx";
import GenrePage from "../pages/GenrePage.tsx";
import RegisterPage from "../pages/RegisterPage.tsx";
import UserPage from "../pages/UserPage.tsx";
import SocialPage from "../pages/SocialPage.tsx";
import ExploreGenresPage from "../pages/ExploreGenresPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "", element: <Home /> },

      { path: "register", element: <RegisterPage /> },
      { path: "user/profile", element: <UserPage /> },
      { path: "user/:email", element: <UserPage /> },

      { path: "movie/:id", element: <MovieDetail /> },

      { path: "genres", element: <ExploreGenresPage /> },
      { path: "genre/:genre", element: <GenrePage /> },

      { path: "social", element: <SocialPage /> }
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
