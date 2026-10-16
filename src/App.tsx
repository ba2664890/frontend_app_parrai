import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RealtimeSync } from "@/components/RealtimeSync";
import { StageHeader } from "@/components/layout/StageHeader";
import { StageFooter } from "@/components/layout/StageFooter";
import { AccueilScreen } from "@/components/screens/AccueilScreen";
import { TirageScreen } from "@/components/screens/TirageScreen";
import { ResultatsScreen } from "@/components/screens/ResultatsScreen";
import { PiloteScreen } from "@/components/screens/PiloteScreen";
import { useAppStore } from "@/store/useAppStore";

import { Toaster } from "@/components/ui/toaster";

function Screens() {
  const view = useAppStore((s) => s.view);
  switch (view) {
    case "tirage":
      return <TirageScreen />;
    case "resultats":
      return <ResultatsScreen />;
    case "pilote":
      return <PiloteScreen />;
    default:
      return <AccueilScreen />;
  }
}

function AppInner() {
  return (
    <>
      <RealtimeSync />
      <div className="min-h-screen flex flex-col bg-blanc-pure">
        <StageHeader />
        <main className="w-full flex-1 pt-20 bg-blanc-pure">
          <Screens />
        </main>
        <StageFooter />
      </div>
      <Toaster />
    </>
  );
}

export default function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 10_000 },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <AppInner />
    </QueryClientProvider>
  );
}

