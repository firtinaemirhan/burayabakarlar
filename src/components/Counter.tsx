import { motion } from "framer-motion";

interface CounterProps {
  count: number;
  scenario: 1 | 2 | 3;
}

const Counter = ({ count, scenario }: CounterProps) => {
  const label = count === 1
    ? "1 peer present. You are being perceived."
    : `${count} peers present. You are being perceived.`;

  return (
    <motion.div
      layout
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center border-b py-4"
      style={{
        borderColor: scenario === 1
          ? "rgba(255,255,255,0.06)"
          : scenario === 2
            ? "rgba(250,204,21,0.3)"
            : "rgba(255,255,255,0.2)",
      }}
      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
    >
      <motion.p
        layout
        className="font-mono-rival text-[12px] tabular-nums tracking-[0.2em] opacity-50"
        transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
      >
        Connection established · {count === 0 ? "Searching for eyes..." : label}
      </motion.p>
    </motion.div>
  );
};

export default Counter;
