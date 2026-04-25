import React, { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'bn-BD', label: 'বাংলা', flag: '🇧🇩', hint: 'বাংলায় বলুন' },
  { code: 'en-US', label: 'English', flag: '🇺🇸', hint: 'Speak in English' },
  { code: 'bn-BD', label: 'Banglish', flag: '🔤', hint: 'Type/speak in Banglish', banglish: true },
];

// Text-to-speech in Bengali or English
function speak(text, lang = 'bn-BD') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.85;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

const PROMPTS = {
  'bn-BD': 'আপনার কাজের কথা বলুন',
  'en-US': 'Please describe what you need',
  banglish: 'Apnar kaj er kotha bolun',
};

const CONFIRMATION_MSGS = {
  'bn-BD': (token) => `আপনার টোকেন নম্বর ${token}। অনুগ্রহ করে অপেক্ষা করুন।`,
  'en-US': (token) => `Your token number is ${token}. Please wait.`,
  banglish: (token) => `Apnar token number holo ${token}. Please wait korun.`,
};

export default function VoiceInput({ onTranscript, disabled, tokenNumber }) {
  const [isListening, setIsListening] = useState(false);
  const [langIdx, setLangIdx] = useState(0);
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef(null);

  const lang = LANGUAGES[langIdx];

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
    if (window.speechSynthesis) setTtsSupported(true);
    return () => recognitionRef.current?.abort();
  }, []);

  // Auto-announce token when it appears (for illiterate users)
  useEffect(() => {
    if (tokenNumber && ttsSupported) {
      const msg = CONFIRMATION_MSGS[lang.banglish ? 'banglish' : lang.code](tokenNumber);
      setTimeout(() => speak(msg, lang.code), 800);
    }
  }, [tokenNumber]);

  const promptUser = () => {
    if (ttsSupported) {
      speak(PROMPTS[lang.banglish ? 'banglish' : lang.code], lang.code);
    }
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    promptUser();

    const recognition = new SR();
    recognitionRef.current = recognition;
    // Banglish → use Bengali recognition (closest to Banglish phonetics)
    recognition.lang = lang.banglish ? 'bn-BD' : lang.code;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => { setIsListening(false); setInterim(''); };
    recognition.onerror = () => { setIsListening(false); setInterim(''); };

    recognition.onresult = (event) => {
      let final = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interimText += t;
      }
      if (final) onTranscript(final);
      setInterim(interimText);
    };

    recognition.start();
  };

  const stopListening = () => recognitionRef.current?.stop();

  if (!supported) {
    return (
      <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
        Voice input not supported. Use Chrome or Edge browser for voice features.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Language tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Input language:</span>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {LANGUAGES.map((l, i) => (
            <button
              key={i}
              onClick={() => setLangIdx(i)}
              disabled={isListening || disabled}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                langIdx === i
                  ? 'bg-white shadow text-blue-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Mic button */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
            isListening
              ? 'bg-red-500 text-white shadow-red-200 shadow-lg'
              : 'bg-blue-800 text-white hover:bg-blue-900'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isListening ? (
            <>
              <span className="flex gap-1">
                <span className="typing-dot w-2 h-2 bg-white rounded-full" />
                <span className="typing-dot w-2 h-2 bg-white rounded-full" />
                <span className="typing-dot w-2 h-2 bg-white rounded-full" />
              </span>
              শুনছি... / Listening...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7V5a3 3 0 016 0v6a3 3 0 01-6 0z" />
              </svg>
              {lang.hint}
            </>
          )}
          {isListening && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
          )}
        </button>

        {/* TTS prompt button — for illiterate users */}
        {ttsSupported && (
          <button
            onClick={promptUser}
            disabled={disabled || isListening}
            title="Hear instructions aloud"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold transition-all disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M6.343 6.343a8 8 0 000 11.314M17.657 6.343a8 8 0 010 11.314" />
            </svg>
            শুনুন / Listen
          </button>
        )}
      </div>

      {/* Interim transcript preview */}
      {interim && (
        <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
          <p className="text-sm text-blue-700 italic">"{interim}"</p>
        </div>
      )}

      {/* Banglish hint */}
      {lang.banglish && (
        <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
          💡 Banglish examples: "fd khulte chai", "passport renew korbo", "account open lagbe", "taka joma dibo"
        </p>
      )}
    </div>
  );
}
