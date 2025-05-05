import {Outlet, ScrollRestoration} from "react-router-dom";
import Header from "../components/layout/Header.tsx";

export default function MainLayout() {
  return (
      <>
          <Header />
          <ScrollRestoration />
          <main className="pt-14">
                  <Outlet />
          </main>
      </>
  );
}
