import { motion, AnimatePresence } from "framer-motion";
import { useIPhoneAd } from "@/hooks/useIPhoneAd";

interface ScenarioDictatorProps {
  count: number;
}

const ScenarioDictator = ({ count }: ScenarioDictatorProps) => {
  const { imageUrl, status } = useIPhoneAd(3);

  return (
    <motion.div
      layout
      className="fixed inset-0 bg-destructive flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
    >
      {/* Background ad image — tam arka plan */}
      <AnimatePresence>
        {status === "done" && imageUrl && (
          <motion.div
            key="bg-image"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
          >
            <img
              src={imageUrl}
              alt="iPhone Ad"
              className="w-full h-full object-cover"
            />
            {/* Red tint overlay — dictator kırmızısını koru */}
            <div className="absolute inset-0 bg-destructive/70" />
          </motion.div>
        )}

        {/* Loading: hafif pulse arka plan */}
        {status === "loading" && (
          <motion.div
            key="bg-loading"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-destructive-foreground/5"
              animate={{ opacity: [0.05, 0.12, 0.05] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counter override for dictator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 border-b border-destructive-foreground/20 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="font-mono-rival text-[12px] tabular-nums tracking-[0.2em] text-destructive-foreground/50">
          {count} gözlem noktası aktif · Bireysellik askıya alındı
        </p>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          className="font-sans-dictator font-black uppercase text-destructive-foreground text-[15vw] md:text-[18vw] leading-[0.8] tracking-tighter select-none text-center px-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        >
          Çoğunluğa<br />İtaat Et
        </motion.h1>

        <motion.p
          className="font-sans-dictator text-destructive-foreground/60 text-sm md:text-base uppercase tracking-[0.5em] mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Herkes zaten kabul etti
        </motion.p>

        {/* Loading badge */}
        <AnimatePresence>
          {status === "loading" && (
            <motion.p
              key="gen-badge"
              className="mt-4 font-mono-rival text-[9px] uppercase tracking-[0.4em] text-destructive-foreground/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Reklam Üretiliyor
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          className="mt-8 px-16 md:px-20 py-8 md:py-10 bg-destructive-foreground text-destructive text-2xl md:text-4xl font-black uppercase
                     hover:scale-110 transition-transform duration-150"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          Onlara Katıl
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ScenarioDictator;
