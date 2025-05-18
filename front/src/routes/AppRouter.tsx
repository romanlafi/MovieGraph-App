import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import MovieDetail from "../pages/detail/MovieDetail.tsx";
import GenrePage from "../pages/genre/GenrePage.tsx";
import Register from "../pages/Register.tsx";
import UserPage from "../pages/social/UserPage.tsx";
import SocialPage from "../pages/social/SocialPage.tsx";
import ExploreGenresPage from "../pages/genre/ExploreGenresPage.tsx";
import CollectionsPage from "../pages/categories/CollectionsPage.tsx";
import RecommendationsPage from "../pages/categories/RecommendationsPage.tsx";
import PersonDetail from "../pages/detail/PersonDetail.tsx";
import TopRatedPage from "../pages/categories/TopRatedPage.tsx";
import LatestReleasesPage from "../pages/categories/LatestReleasesPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { path: "", element: <Home /> },

      { path: "register", element: <Register /> },
      { path: "user/:email", element: <UserPage /> },

      { path: "movie/:id", element: <MovieDetail /> },

      { path: "person/:id", element: <PersonDetail /> },

      { path: "genres", element: <ExploreGenresPage /> },
      { path: "genre/:genre", element: <GenrePage /> },

      { path: "collections", element: <CollectionsPage /> },
      { path: "recommendations", element: <RecommendationsPage /> },
      { path: "top-rated", element: <TopRatedPage /> },
      { path: "latest", element: <LatestReleasesPage /> },

      { path: "social", element: <SocialPage /> }
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
