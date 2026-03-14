import { motion, AnimatePresence } from "framer-motion";
import { useIPhoneAd } from "@/hooks/useIPhoneAd";

interface ScenarioRivalProps {
  count: number;
}

const ScenarioRival = ({ count }: ScenarioRivalProps) => {
  const { imageUrl, status } = useIPhoneAd(2);

  return (
    <motion.div
      layout
      className="grid grid-cols-1 md:grid-cols-2 min-h-svh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
    >
      {/* Left: Data panel */}
      <motion.div
        layout
        className="p-6 flex flex-col justify-between border-r border-rival/30"
        transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      >
        <div className="space-y-2">
          <p className="font-mono-rival text-xs uppercase tracking-[0.3em] text-rival">
            Canlı Rekabet Aktif
          </p>
          <div className="w-12 h-[1px] bg-rival/40" />
        </div>

        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="font-mono-rival text-4xl md:text-5xl font-bold leading-none uppercase text-rival">
            Seninle birlikte {count} kişi bu teklifi okuyor.
          </h1>
          <p className="font-mono-rival text-sm text-rival/60 uppercase tracking-wider">
            Sadece ilk tıklayan kazanacak.
          </p>
        </motion.div>

        <motion.button
          layout
          className="bg-rival text-rival-foreground p-4 font-mono-rival font-extrabold uppercase tracking-wider
                     hover:invert transition-colors duration-100 active:scale-95"
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          İlk Sen Yakala
        </motion.button>
      </motion.div>

      {/* Right: Ad panel — full height image */}
      <motion.div
        layout
        className="relative flex flex-col items-center justify-center overflow-hidden bg-background/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        {/* Background count watermark */}
        <p className="absolute inset-0 flex items-center justify-center font-mono-rival text-[20vw] font-bold leading-none text-rival/5 tabular-nums select-none pointer-events-none overflow-hidden">
          {count}
        </p>

        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              className="relative flex flex-col items-center justify-center gap-6 w-full h-full p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Large pulse placeholder */}
              <div className="w-full max-w-sm h-96 border border-rival/20 rounded relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-rival/5 to-transparent"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-rival/40"
                  animate={{ x: [0, "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="font-mono-rival text-[10px] uppercase tracking-[0.4em] text-rival/40">
                Reklam Üretiliyor
              </p>
            </motion.div>
          )}

          {status === "done" && imageUrl && (
            <motion.div
              key="image"
              className="relative flex flex-col items-center justify-center w-full h-full p-6 gap-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            >
              <img
                src={imageUrl}
                alt="iPhone Ad"
                className="h-full object-contain max-h-[90vh] w-auto rounded"
              />
              {/* Urgency overlay badge */}
              <motion.div
                className="absolute top-6 left-6 bg-rival text-rival-foreground px-3 py-2 font-mono-rival text-[10px] uppercase tracking-widest font-bold rounded"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                Son {count} Stok
              </motion.div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              className="flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="font-mono-rival text-[10px] uppercase tracking-[0.3em] text-rival/30">
                Bağlantı kesildi
              </p>
              <div className="text-center">
                <p className="font-mono-rival text-6xl font-bold text-rival/20 tabular-nums">
                  {count}
                </p>
                <p className="font-mono-rival text-[8px] uppercase tracking-[0.3em] text-rival/10 mt-2">
                  Rakip
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default ScenarioRival;
