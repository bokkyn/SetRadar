import { RouterProvider, useRouter } from "./app/router";
import { AuthProvider } from "./app/auth";
import { ProjectsProvider } from "./app/projects";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AuthPrompt from "./components/layout/AuthPrompt";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import LocationDetailPage from "./pages/LocationDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectOverviewPage from "./pages/ProjectOverviewPage";
import ResearchPage from "./pages/ResearchPage";
import ComparisonPage from "./pages/ComparisonPage";
import ProfilePage from "./pages/ProfilePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import { useAuth } from "./app/auth";

function Screen() {
  const { route } = useRouter();
  const { user } = useAuth();
  const privateRoute =
    route.name === "projects" ||
    route.name === "project" ||
    route.name === "comparison" ||
    route.name === "profile";
  if (privateRoute && !user) return <SignInPage />;
  switch (route.name) {
    case "results":
      return <ResultsPage result={route.result} />;
    case "location":
      return <LocationDetailPage id={route.id} />;
    case "projects":
      return <ProjectsPage />;
    case "project":
      return <ProjectOverviewPage id={route.id} />;
    case "research":
      return <ResearchPage />;
    case "comparison":
      return <ComparisonPage />;
    case "profile":
      return <ProfilePage />;
    case "signin":
      return <SignInPage />;
    case "signup":
      return <SignUpPage />;
    case "how":
      return <HowItWorksPage />;
    default:
      return <HomePage />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <RouterProvider>
          <div className="flex min-h-screen flex-col bg-ink-950">
            <Navbar />
            <main className="flex-1">
              <Screen />
            </main>
            <Footer />
            <AuthPrompt />
          </div>
        </RouterProvider>
      </ProjectsProvider>
    </AuthProvider>
  );
}
