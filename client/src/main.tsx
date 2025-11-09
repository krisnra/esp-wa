import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import Login from "./pages/Login";

import RootLayout from "./layouts/RootLayout";
import AdminRoute from "./components/AdminRoute";

const SubsPage = lazy(() => import("./pages/SubsPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-slate-200">Loading…</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <RootLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SubsPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route
              path="contacts"
              element={
                <AdminRoute>
                  <ContactsPage />
                </AdminRoute>
              }
            />
            <Route
              path="users"
              element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
