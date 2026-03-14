import { useMemo } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import Counter from "@/components/Counter";
import ScenarioWhisper from "@/components/ScenarioWhisper";
import ScenarioRival from "@/components/ScenarioRival";
import ScenarioDictator from "@/components/ScenarioDictator";
import { useRealSessionCount } from "@/hooks/useRealSessionCount";
import { useScenarioPregeneration } from "@/hooks/useScenarioPregeneration";

type Scenario = 1 | 2 | 3;

const getScenario = (count: number): Scenario => {
  if (count <= 1) return 1;
  if (count <= 6) return 2;
  return 3;
};

const Index = () => {
  const { count: viewerCount } = useRealSessionCount();
  const scenario = useMemo(() => getScenario(viewerCount), [viewerCount]);

  // Pre-generate next scenario's image
  useScenarioPregeneration(scenario);

  return (
    <div className="grain h-full w-full overflow-hidden bg-background text-foreground">
      <LayoutGroup>
        {/* The counter — L1, the observer */}
        {scenario !== 3 && (
          <Counter count={viewerCount} scenario={scenario} />
        )}

        {/* The manipulation — L2 + L3 */}
        <AnimatePresence mode="wait">
          {scenario === 1 && <ScenarioWhisper key="whisper" />}
          {scenario === 2 && <ScenarioRival key="rival" count={viewerCount} />}
          {scenario === 3 && <ScenarioDictator key="dictator" count={viewerCount} />}
        </AnimatePresence>

        {/* Real session count indicator */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-3 py-1 bg-secondary/80 backdrop-blur-sm border border-foreground/10 rounded-full font-mono-rival text-xs text-muted-foreground tracking-wider">
          {viewerCount} aktif sesyon
        </div>
      </LayoutGroup>
    </div>
  );
};

export default Index;
