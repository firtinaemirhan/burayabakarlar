import { motion } from "framer-motion";

const ScenarioWhisper = () => {
  return (
    <motion.div
      layout
      className="flex items-center justify-center min-h-svh p-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
    >
      <div className="max-w-[40ch] space-y-8">
        <motion.h1
          layout="position"
          className="font-serif-whisper text-3xl italic text-whisper text-balance leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
        >
          "Şu an bunu sadece sen görüyorsun. İzlenmiyorsun. Güvendesin. Ekranın arkasında hiç kimse yok — sadece sen ve bu satırlar."
        </motion.h1>

        <motion.p
          className="font-serif-whisper text-sm text-muted-foreground italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          Bu mahremiyet sana özel. Kimse bilmiyor.
        </motion.p>

        <motion.button
          layout
          className="px-6 py-2 rounded-full border border-foreground/10 text-whisper text-sm font-serif-whisper italic
                     hover:border-foreground/40 transition-all duration-[400ms]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Bu sırrı sakla
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ScenarioWhisper;
