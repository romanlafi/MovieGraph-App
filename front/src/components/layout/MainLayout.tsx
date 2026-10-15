import {Outlet, ScrollRestoration} from "react-router-dom";
import Header from "./Header.tsx";

export default function MainLayout() {
  return (
      <>
          <Header />
          <ScrollRestoration />
          <main>
                  <Outlet />
          </main>
      </>
  );
}
