import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { Icon } from "./components/icons/Icon";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { MessagesProvider } from "./features/messages/MessagesProvider";
import { NotificationsProvider } from "./features/notifications/NotificationsProvider";
import { RealtimeProvider } from "./features/realtime/RealtimeProvider";
import { PresenceProvider } from "./features/presence/PresenceProvider";
import { UploadsProvider } from "./features/uploads/UploadsProvider";
import { UploadTray } from "./components/uploads/UploadTray";
import FriendsPage from "./pages/FriendsPage";
import GroupPage from "./pages/GroupPage";
import GroupsPage from "./pages/GroupsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MessagesPage from "./pages/MessagesPage";
import NotificationsPage from "./pages/NotificationsPage";
import PostPage from "./pages/PostPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReelsPage from "./pages/ReelsPage";


function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="grid size-16 animate-pulse place-items-center rounded-pill bg-brand text-white">
        <Icon name="facebook" size={34} />
      </div>
    </div>
  );
}


function AppLayout() {
  return (
    <RealtimeProvider>
      <PresenceProvider>
        <MessagesProvider>
          <NotificationsProvider>
            <UploadsProvider>
              <div className="min-h-dvh bg-canvas text-ink">
                <Header />
                <div className="pt-header pb-14 lg:pb-0">
                  <Outlet />
                </div>
                <BottomNav />
                <UploadTray />
              </div>
            </UploadsProvider>
          </NotificationsProvider>
        </MessagesProvider>
      </PresenceProvider>
    </RealtimeProvider>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Splash />;
  if (status === "guest")
    return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}

function RequireGuest() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <Splash />;
  if (status === "authenticated")
    return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;

  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<MessagesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/posts/:id" element={<PostPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
