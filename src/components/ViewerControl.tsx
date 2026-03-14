import { motion } from "framer-motion";

interface ViewerControlProps {
  count: number;
  onChange: (count: number) => void;
}

const ViewerControl = ({ count, onChange }: ViewerControlProps) => {
  return (
    <motion.div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 
                 bg-secondary/80 backdrop-blur-sm border border-foreground/10 rounded-full px-4 py-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.6 }}
    >
      <button
        onClick={() => onChange(Math.max(0, count - 1))}
        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground 
                   font-mono-rival text-lg transition-colors"
      >
        −
      </button>
      <span className="font-mono-rival text-xs tabular-nums tracking-wider text-muted-foreground min-w-[3ch] text-center">
        {count}
      </span>
      <button
        onClick={() => onChange(count + 1)}
        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground 
                   font-mono-rival text-lg transition-colors"
      >
        +
      </button>
    </motion.div>
  );
};

export default ViewerControl;
