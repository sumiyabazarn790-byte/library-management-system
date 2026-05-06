import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ReaderVoiceControlsProps = {
  sections: string[];
  language: string;
  className?: string;
};

type SpeechStatus = "idle" | "playing" | "paused";

const RATE_OPTIONS = [
  { label: "0.85x", value: 0.85 },
  { label: "1x", value: 1 },
  { label: "1.15x", value: 1.15 },
  { label: "1.3x", value: 1.3 },
] as const;

const getSpeechLocale = (language: string) => (language === "mn" ? "mn-MN" : "en-US");

const pickPreferredVoice = (voices: SpeechSynthesisVoice[], language: string) => {
  const languagePrefix = language === "mn" ? "mn" : "en";

  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(languagePrefix)) ??
    voices.find((voice) => voice.default) ??
    voices[0] ??
    null
  );
};

export const ReaderVoiceControls = ({
  sections,
  language,
  className = "",
}: ReaderVoiceControlsProps) => {
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isActiveRef = useRef(true);
  const text = useMemo(
    () => sections.map((section) => section.trim()).filter(Boolean).join("\n\n"),
    [sections],
  );
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

  useEffect(() => {
    if (!speechSupported) {
      return;
    }

    const synth = window.speechSynthesis;
    isActiveRef.current = true;
    const updateVoices = () => {
      if (isActiveRef.current) {
        setVoices(synth.getVoices());
      }
    };

    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);

    return () => {
      isActiveRef.current = false;
      synth.removeEventListener("voiceschanged", updateVoices);
      synth.cancel();
    };
  }, [speechSupported]);

  const startSpeaking = () => {
    if (!speechSupported || !text) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechLocale(language);
    utterance.rate = rate;

    const selectedVoice = pickPreferredVoice(voices, language);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      if (isActiveRef.current) {
        setSpeechStatus("playing");
      }
    };

    utterance.onend = () => {
      if (isActiveRef.current) {
        setSpeechStatus("idle");
      }
    };

    utterance.onerror = () => {
      if (isActiveRef.current) {
        setSpeechStatus("idle");
      }
    };

    synth.speak(utterance);
    setSpeechStatus("playing");
  };

  const handlePlayPause = () => {
    if (!speechSupported) {
      return;
    }

    const synth = window.speechSynthesis;

    if (speechStatus === "playing" && synth.speaking && !synth.paused) {
      synth.pause();
      setSpeechStatus("paused");
      return;
    }

    if (speechStatus === "paused") {
      synth.resume();
      setSpeechStatus("playing");
      return;
    }

    startSpeaking();
  };

  const handleStop = () => {
    if (!speechSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    setSpeechStatus("idle");
  };

  const primaryLabel =
    speechStatus === "playing" ? "Pause audio" : speechStatus === "paused" ? "Resume audio" : "Listen on site";

  return (
    <div className={`rounded-2xl border border-border/60 bg-background/55 p-3.5 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Volume2 className="size-4 text-primary" />
            Website voice reader
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {speechSupported
              ? "Uses your browser voice, so playback stays inside this page."
              : "This browser does not expose built-in voice playback."}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Speed
          <select
            value={String(rate)}
            onChange={(event) => setRate(Number(event.target.value))}
            className="h-9 rounded-md border border-border/70 bg-surface-elevated px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
            disabled={!speechSupported}
          >
            {RATE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!speechSupported || !text}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.45)] disabled:opacity-50 disabled:shadow-none"
        >
          {speechStatus === "playing" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {primaryLabel}
        </button>

        <button
          type="button"
          onClick={handleStop}
          disabled={!speechSupported || speechStatus === "idle"}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/70 px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground disabled:opacity-50"
        >
          <Square className="size-3.5" />
          Stop
        </button>
      </div>
    </div>
  );
};
