import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  HelpCircle, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw,
  UserCheck,
  Volume2,
  VolumeX,
  Music,
  Music2,
  RefreshCw
} from 'lucide-react';
import { QUESTIONS } from './data/questions';
import { Question, Team, GameState } from './types';

const CATEGORIES_COUNT = 12;

const getPrizeMoney = (round: number) => {
  if (round <= 2) return 500;
  if (round <= 4) return 1000;
  if (round <= 6) return 1500;
  if (round <= 8) return 2000;
  return 2500;
};

const getCurrentLevel = (round: number, isHardMode: boolean) => {
  if (isHardMode) {
    if (round <= 2) return 2;
    if (round <= 5) return 3;
    return 4;
  }
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 7) return 3;
  return 4;
};

const SOUNDS = {
  background: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  incorrect: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3',
  joker: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [usedCategories, setUsedCategories] = useState<Set<string>>(new Set());
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [jokerActive, setJokerActive] = useState(false);
  const [jokerResult, setJokerResult] = useState<number[] | null>(null);
  const [finalBets, setFinalBets] = useState<number[]>([]);
  const [finalAnswers, setFinalAnswers] = useState<number[]>([]);
  const [finalQuestion, setFinalQuestion] = useState<Question | null>(null);
  const [isHardMode, setIsHardMode] = useState(false);
  
  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    bgMusicRef.current = new Audio(SOUNDS.background);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2;

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // Handle music play/pause
  useEffect(() => {
    if (!bgMusicRef.current) return;

    if (gameState !== 'setup' && gameState !== 'gameOver' && isMusicEnabled && !isMuted) {
      bgMusicRef.current.play().catch(e => console.log("Autoplay blocked:", e));
    } else {
      bgMusicRef.current.pause();
    }
  }, [gameState, isMusicEnabled, isMuted]);

  const playSound = (soundUrl: string) => {
    if (isMuted) return;
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Sound play blocked:", e));
  };

  // Initialize game with random categories
  const startNewGame = (teamConfigs: { name: string, difficulty: 'adult' | 'child' }[], hardMode: boolean) => {
    playSound(SOUNDS.click);
    setIsHardMode(hardMode);
    
    // Get all unique categories that have questions for all difficulties present in the game
    const currentDifficulties = Array.from(new Set(teamConfigs.map(c => c.difficulty)));
    const allCategories = Array.from(new Set(QUESTIONS.map(q => q.category))).filter(cat => 
      currentDifficulties.every(diff => 
        QUESTIONS.some(q => q.category === cat && q.difficulty === diff)
      )
    );
    const shuffledCats = allCategories.sort(() => 0.5 - Math.random());
    const selected = shuffledCats.slice(0, CATEGORIES_COUNT);
    
    setSelectedCategories(selected);
    setTeams(teamConfigs.map(config => ({ 
      name: config.name, 
      score: 0, 
      hasJoker: true, 
      difficulty: config.difficulty 
    })));
    setCurrentTeamIndex(0);
    setUsedCategories(new Set());
    setUsedQuestionIds(new Set());
    setGameState('playing');
  };

  const handleSelectCategory = (category: string) => {
    if (usedCategories.has(category)) return;
    playSound(SOUNDS.click);

    const currentTeam = teams[currentTeamIndex];
    const round = usedCategories.size + 1;
    const level = getCurrentLevel(round, isHardMode);
    
    // Find a question for this category, difficulty and level that hasn't been used
    let question = QUESTIONS.find(q => 
      q.category === category && 
      q.difficulty === currentTeam.difficulty && 
      q.level === level &&
      !usedQuestionIds.has(q.id)
    );

    // Fallback 1: any level for this category but same difficulty
    if (!question) {
      question = QUESTIONS.find(q => 
        q.category === category && 
        q.difficulty === currentTeam.difficulty && 
        !usedQuestionIds.has(q.id)
      );
    }

    // Fallback 2: any level/difficulty for this category (last resort)
    if (!question) {
      question = QUESTIONS.find(q => 
        q.category === category && 
        !usedQuestionIds.has(q.id)
      );
    }

    // Extreme fallback: any unused question
    if (!question) {
      question = QUESTIONS.find(q => !usedQuestionIds.has(q.id));
    }

    if (question) {
      setCurrentQuestion(question);
      setUsedCategories(prev => new Set(prev).add(category));
      setUsedQuestionIds(prev => new Set(prev).add(question!.id));
    }
    
    setSelectedOption(null);
    setShowExplanation(false);
    setJokerActive(false);
    setJokerResult(null);
  };

  const shuffleCategories = () => {
    playSound(SOUNDS.click);
    const currentDifficulties = Array.from(new Set(teams.map(t => t.difficulty)));
    const allCategories = Array.from(new Set(QUESTIONS.map(q => q.category))).filter(cat => 
      currentDifficulties.every(diff => 
        QUESTIONS.some(q => q.category === cat && q.difficulty === diff)
      )
    );
    // Categories not currently on the board and not used
    const pool = allCategories.filter(cat => !selectedCategories.includes(cat) && !usedCategories.has(cat));
    
    if (pool.length === 0) return;

    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    
    setSelectedCategories(prev => {
      let poolIndex = 0;
      return prev.map(cat => {
        if (!usedCategories.has(cat) && poolIndex < shuffledPool.length) {
          return shuffledPool[poolIndex++];
        }
        return cat;
      });
    });
  };

  const swapQuestion = () => {
    if (!currentQuestion) return;
    playSound(SOUNDS.click);
    
    const possibleQuestions = QUESTIONS.filter(q => 
      q.category === currentQuestion.category && 
      q.difficulty === currentQuestion.difficulty && 
      q.level === currentQuestion.level &&
      q.id !== currentQuestion.id
    );

    if (possibleQuestions.length > 0) {
      const nextQ = possibleQuestions[Math.floor(Math.random() * possibleQuestions.length)];
      setCurrentQuestion(nextQ);
    } else {
      // Fallback: any question of same difficulty in this category
      const fallbackQuestions = QUESTIONS.filter(q => 
        q.category === currentQuestion.category && 
        q.difficulty === currentQuestion.difficulty &&
        q.id !== currentQuestion.id
      );
      if (fallbackQuestions.length > 0) {
        const nextQ = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        setCurrentQuestion(nextQ);
      }
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    setShowExplanation(true);

    const isCorrect = optionIndex === currentQuestion?.correctIndex;
    if (isCorrect) {
      playSound(SOUNDS.correct);
      const newTeams = [...teams];
      const round = usedCategories.size; // usedCategories already includes current
      newTeams[currentTeamIndex].score += getPrizeMoney(round);
      setTeams(newTeams);
    } else {
      playSound(SOUNDS.incorrect);
    }
  };

  const nextTurn = () => {
    playSound(SOUNDS.click);
    setCurrentQuestion(null);
    setCurrentTeamIndex((currentTeamIndex + 1) % teams.length);
    
    // Check if all categories are used
    if (usedCategories.size === CATEGORIES_COUNT) {
      prepareFinal();
    }
  };

  const useJoker = () => {
    if (!teams[currentTeamIndex].hasJoker || !currentQuestion) return;
    
    playSound(SOUNDS.joker);
    const newTeams = [...teams];
    newTeams[currentTeamIndex].hasJoker = false;
    setTeams(newTeams);
    
    setJokerActive(true);
    // Simulate audience results: higher probability for correct answer
    const correct = currentQuestion.correctIndex;
    const numOptions = currentQuestion.options.length;
    const results = new Array(numOptions).fill(0);
    
    // Correct answer gets 40-70%
    results[correct] = Math.floor(Math.random() * 30) + 40;
    
    let remaining = 100 - results[correct];
    const otherIndices = Array.from({ length: numOptions }, (_, i) => i).filter(i => i !== correct);
    
    // Distribute remaining percentage among other options
    for (let i = 0; i < otherIndices.length; i++) {
      if (i === otherIndices.length - 1) {
        results[otherIndices[i]] = remaining;
      } else {
        const val = Math.floor(Math.random() * (remaining / 1.5));
        results[otherIndices[i]] = val;
        remaining -= val;
      }
    }
    
    setJokerResult(results);
  };

  const prepareFinal = () => {
    // Pick a final question based on the leading team's difficulty or just random
    const finalQ = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    setFinalQuestion(finalQ);
    setFinalBets(teams.map(() => 0));
    setFinalAnswers(teams.map(() => -1));
    setGameState('final');
  };

  const handleFinalBet = (teamIdx: number, amount: number) => {
    const newBets = [...finalBets];
    newBets[teamIdx] = Math.min(amount, teams[teamIdx].score);
    setFinalBets(newBets);
  };

  const handleFinalAnswer = (teamIdx: number, optionIdx: number) => {
    playSound(SOUNDS.click);
    const newAnswers = [...finalAnswers];
    newAnswers[teamIdx] = optionIdx;
    setFinalAnswers(newAnswers);
  };

  const finishGame = () => {
    const newTeams = [...teams];
    let anyCorrect = false;
    finalAnswers.forEach((answer, idx) => {
      if (answer === finalQuestion?.correctIndex) {
        newTeams[idx].score += finalBets[idx];
        anyCorrect = true;
      } else {
        newTeams[idx].score -= finalBets[idx];
      }
    });
    
    if (anyCorrect) playSound(SOUNDS.correct);
    else playSound(SOUNDS.incorrect);
    
    setTeams(newTeams);
    setGameState('gameOver');
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-white font-sans selection:bg-yellow-400 selection:text-black">
      <header className="bg-[#112240] border-b border-blue-900/50 p-3 md:p-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-500 p-1.5 md:p-2 rounded-lg shadow-lg shadow-yellow-500/20">
                <HelpCircle className="w-5 h-5 md:w-8 md:h-8 text-black" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-yellow-500 leading-none">WER WEISS DENN SOWAS?</h1>
                <p className="text-[10px] md:text-xs text-blue-300 font-mono uppercase tracking-widest">Das interaktive Quiz</p>
              </div>
            </div>
            
            <div className="flex md:hidden items-center gap-2 bg-blue-900/30 p-1 rounded-lg border border-blue-800/50">
              <button 
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                className={`p-1.5 rounded-md transition-all ${isMusicEnabled ? 'text-yellow-500 bg-blue-900/50' : 'text-gray-500'}`}
              >
                {isMusicEnabled ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-1.5 rounded-md transition-all ${!isMuted ? 'text-yellow-500 bg-blue-900/50' : 'text-gray-500'}`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <div className="hidden md:flex items-center gap-2 bg-blue-900/30 p-1 rounded-lg border border-blue-800/50">
              <button 
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                className={`p-2 rounded-md transition-all ${isMusicEnabled ? 'text-yellow-500 bg-blue-900/50' : 'text-gray-500'}`}
                title="Musik an/aus"
              >
                {isMusicEnabled ? <Music className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-md transition-all ${!isMuted ? 'text-yellow-500 bg-blue-900/50' : 'text-gray-500'}`}
                title="Ton an/aus"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {gameState !== 'setup' && (
              <div className="flex gap-4 md:gap-6 md:border-l border-blue-900/50 md:pl-6 w-full justify-around md:justify-end">
                {teams.map((team, idx) => (
                  <div key={idx} className={`flex flex-col items-center md:items-end transition-all duration-300 ${idx === currentTeamIndex && gameState === 'playing' ? 'scale-105 md:scale-110' : 'opacity-60 md:opacity-70'}`}>
                    <div className="flex items-center gap-1 md:gap-2">
                      {team.difficulty === 'child' && <span className="text-[8px] md:text-[10px] bg-green-500/20 text-green-400 px-1 rounded border border-green-500/30">KIND</span>}
                      <span className="text-[10px] md:text-xs font-mono text-blue-300 uppercase whitespace-nowrap">{team.name}</span>
                    </div>
                    <span className="text-sm md:text-xl font-bold text-yellow-400">{team.score.toLocaleString()} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {gameState === 'setup' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto bg-[#112240] p-8 rounded-2xl border border-blue-900/50 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                <Users className="text-yellow-500" /> Spiel-Setup
              </h2>
              <div className="space-y-4">
                <p className="text-blue-300 text-sm mb-4">Wählt eure Teamnamen und Schwierigkeit.</p>
                <TeamSetup onStart={startNewGame} />
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && !currentQuestion && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 md:space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black text-blue-400">KATEGORIE WÄHLEN</h2>
                <button 
                  onClick={shuffleCategories}
                  className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-blue-900/30 border border-blue-800 text-blue-300 hover:bg-blue-800 transition-all text-xs md:text-sm font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> Kategorien neu mischen
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {selectedCategories.map((cat, idx) => (
                  <CategoryCard 
                    key={idx} 
                    category={cat} 
                    isUsed={usedCategories.has(cat)}
                    onClick={() => handleSelectCategory(cat)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {gameState === 'playing' && currentQuestion && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-[#112240] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-blue-900/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-yellow-500"
                  />
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/50 text-blue-300 px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-mono uppercase tracking-wider w-fit">
                        {currentQuestion.category}
                      </span>
                      <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full text-[10px] font-bold border border-yellow-500/30">
                        {getPrizeMoney(usedCategories.size)} €
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border w-fit ${currentQuestion.difficulty === 'child' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                        {currentQuestion.difficulty === 'child' ? 'Kinderfrage' : 'Erwachsenenfrage'}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        currentQuestion.level === 4 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
                          : 'text-blue-400 border-blue-500/20'
                      }`}>
                        Stufe {currentQuestion.level}
                      </span>
                      <button 
                        onClick={swapQuestion}
                        disabled={selectedOption !== null}
                        className="flex items-center gap-1 bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Frage tauschen (Moderator)"
                      >
                        <RefreshCw className="w-3 h-3" /> Tauschen
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={useJoker}
                    disabled={!teams[currentTeamIndex].hasJoker || selectedOption !== null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all w-full md:w-auto justify-center ${
                      teams[currentTeamIndex].hasJoker && selectedOption === null
                        ? 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" /> Publikumsjoker
                  </button>
                </div>

                <h2 className="text-xl md:text-3xl font-bold mb-8 md:mb-12 leading-tight">
                  {currentQuestion.question}
                </h2>

                <div className="grid gap-3 md:gap-4">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={selectedOption !== null}
                      className={`group relative p-4 md:p-6 text-left rounded-xl md:rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                        selectedOption === null 
                          ? 'border-blue-900/50 bg-[#0a192f] hover:border-yellow-500 hover:bg-blue-900/30' 
                          : idx === currentQuestion.correctIndex
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : idx === selectedOption
                              ? 'border-red-500 bg-red-500/10 text-red-400'
                              : 'border-blue-900/20 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-900/50 flex items-center justify-center font-bold text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors text-sm md:text-base">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-base md:text-xl font-medium">{option}</span>
                      </div>
                      
                      {selectedOption !== null && idx === currentQuestion.correctIndex && <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />}
                      {selectedOption === idx && idx !== currentQuestion.correctIndex && <XCircle className="w-6 h-6 md:w-8 md:h-8" />}
                      
                      {jokerActive && jokerResult && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end">
                          <div className="h-1.5 w-16 md:w-24 bg-blue-900/50 rounded-full overflow-hidden mb-1">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${jokerResult[idx]}%` }}
                              className="h-full bg-blue-400"
                            />
                          </div>
                          <span className="text-[10px] md:text-xs font-mono text-blue-400">{jokerResult[idx]}%</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 md:mt-8 p-4 md:p-6 bg-blue-900/20 rounded-xl md:rounded-2xl border border-blue-800/50"
                    >
                      <h4 className="text-yellow-500 font-bold mb-2 flex items-center gap-2">
                        <Coins className="w-5 h-5" /> Die Auflösung
                      </h4>
                      <p className="text-sm md:text-base text-blue-100 leading-relaxed">{currentQuestion.explanation}</p>
                      <button 
                        onClick={nextTurn}
                        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                      >
                        Nächste Runde <ChevronRight />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {gameState === 'final' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto space-y-6 md:space-y-8"
            >
              <div className="text-center mb-8 md:mb-12">
                <h2 className="text-3xl md:text-5xl font-black text-yellow-500 mb-2 md:mb-4 italic tracking-tighter">DIE MASTERFRAGE</h2>
                <p className="text-blue-300 text-sm md:text-base">Setzt euer Geld weise!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {teams.map((team, idx) => (
                  <div key={idx} className="bg-[#112240] p-6 md:p-8 rounded-2xl md:rounded-3xl border border-blue-900/50 shadow-xl">
                    <h3 className="text-lg md:text-xl font-bold mb-4 text-blue-300 uppercase tracking-widest">{team.name}</h3>
                    <div className="space-y-4 md:space-y-6">
                      <div>
                        <label className="block text-xs md:text-sm text-gray-400 mb-2">Einsatz (Max. {team.score} €)</label>
                        <input 
                          type="range" 
                          min="0" 
                          max={team.score} 
                          step="100"
                          value={finalBets[idx]}
                          onChange={(e) => handleFinalBet(idx, parseInt(e.target.value))}
                          className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="text-xl md:text-2xl font-mono text-yellow-400 mt-2">{finalBets[idx].toLocaleString()} €</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {['A', 'B', 'C'].map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => handleFinalAnswer(idx, optIdx)}
                            className={`py-3 md:py-4 rounded-xl font-bold border-2 transition-all text-sm md:text-base ${
                              finalAnswers[idx] === optIdx 
                                ? 'bg-yellow-500 border-yellow-500 text-black' 
                                : 'border-blue-900/50 text-blue-300 hover:border-blue-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#112240] p-6 md:p-12 rounded-2xl md:rounded-3xl border-4 border-yellow-500/30 shadow-2xl text-center">
                <span className="bg-yellow-500 text-black px-4 md:px-6 py-1 rounded-full text-xs md:text-sm font-bold uppercase mb-4 md:mb-6 inline-block">
                  {finalQuestion?.category}
                </span>
                <h3 className="text-xl md:text-3xl font-bold mb-8 md:mb-12 leading-tight">{finalQuestion?.question}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-left max-w-4xl mx-auto mb-8 md:mb-12">
                  {finalQuestion?.options.map((opt, i) => (
                    <div key={i} className="bg-blue-900/30 p-3 md:p-4 rounded-xl border border-blue-800/50 text-sm md:text-base">
                      <span className="text-yellow-500 font-bold mr-2">{String.fromCharCode(65 + i)}:</span>
                      {opt}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={finishGame}
                  disabled={finalAnswers.some(a => a === -1)}
                  className="w-full md:w-auto bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-black text-xl md:text-2xl py-4 md:py-6 px-8 md:px-12 rounded-xl md:rounded-2xl shadow-2xl shadow-yellow-500/20 transition-all"
                >
                  SPIEL BEENDEN
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="bg-[#112240] p-6 md:p-12 rounded-2xl md:rounded-3xl border border-blue-900/50 shadow-2xl">
                <Trophy className="w-16 h-16 md:w-24 md:h-24 text-yellow-500 mx-auto mb-6 md:mb-8" />
                <h2 className="text-2xl md:text-4xl font-black mb-8 md:mb-12">DAS ERGEBNIS</h2>
                
                <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                  {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                    <div key={idx} className={`flex justify-between items-center p-4 md:p-6 rounded-xl md:rounded-2xl ${idx === 0 ? 'bg-yellow-500/10 border-2 border-yellow-500' : 'bg-blue-900/20 border border-blue-800'}`}>
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="text-xl md:text-2xl font-black text-blue-400">#{idx + 1}</span>
                        <span className="text-xl md:text-2xl font-bold">{team.name}</span>
                      </div>
                      <span className="text-2xl md:text-3xl font-black text-yellow-500">{team.score.toLocaleString()} €</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setGameState('setup')}
                  className="w-full md:w-auto flex items-center justify-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all"
                >
                  <RotateCcw /> Neues Spiel starten
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto p-8 text-center text-blue-400/50 text-sm font-mono uppercase tracking-widest">
        &copy; 2026 Wer weiß denn sowas? - Fan Quiz App
      </footer>
    </div>
  );
}

function TeamSetup({ onStart }: { onStart: (configs: { name: string, difficulty: 'adult' | 'child' }[], hardMode: boolean) => void }) {
  const [teamCount, setTeamCount] = useState(2);
  const [isHardMode, setIsHardMode] = useState(false);
  const [configs, setConfigs] = useState<{ name: string, difficulty: 'adult' | 'child' }[]>([
    { name: 'Team A', difficulty: 'adult' },
    { name: 'Team B', difficulty: 'adult' },
    { name: 'Team C', difficulty: 'adult' },
    { name: 'Team D', difficulty: 'adult' },
  ]);

  const handleNameChange = (idx: number, name: string) => {
    const newConfigs = [...configs];
    newConfigs[idx].name = name;
    setConfigs(newConfigs);
  };

  const toggleDifficulty = (idx: number) => {
    const newConfigs = [...configs];
    newConfigs[idx].difficulty = newConfigs[idx].difficulty === 'adult' ? 'child' : 'adult';
    setConfigs(newConfigs);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex gap-2 p-1 bg-[#0a192f] rounded-xl">
        {[2, 3, 4].map(count => (
          <button
            key={count}
            onClick={() => setTeamCount(count)}
            className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm md:text-base ${teamCount === count ? 'bg-yellow-500 text-black' : 'text-blue-300 hover:bg-blue-900/50'}`}
          >
            {count} Teams
          </button>
        ))}
      </div>

      <div className="space-y-2 md:space-y-3">
        {Array.from({ length: teamCount }).map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
              <input
                type="text"
                value={configs[i].name}
                onChange={(e) => handleNameChange(i, e.target.value)}
                className="w-full bg-[#0a192f] border border-blue-900/50 rounded-xl py-3 md:py-4 pl-12 pr-4 focus:outline-none focus:border-yellow-500 transition-colors font-bold text-sm md:text-base"
                placeholder={`Team ${i + 1} Name`}
              />
            </div>
            <button
              onClick={() => toggleDifficulty(i)}
              className={`px-4 py-2 sm:py-0 rounded-xl border-2 font-bold transition-all flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0 min-w-[120px] ${
                configs[i].difficulty === 'child' 
                  ? 'border-green-500 bg-green-500/10 text-green-400' 
                  : 'border-blue-500 bg-blue-500/10 text-blue-400'
              }`}
            >
              <span className="text-[10px] uppercase tracking-tighter opacity-70">Modus</span>
              <span className="text-xs md:text-sm">{configs[i].difficulty === 'child' ? 'Kind' : 'Erwachsen'}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isHardMode ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Profi-Modus (Schwer)</p>
            <p className="text-[10px] text-blue-400 uppercase tracking-wider">Startet direkt mit Level 2 Fragen</p>
          </div>
        </div>
        <button 
          onClick={() => setIsHardMode(!isHardMode)}
          className={`w-12 h-6 rounded-full transition-all relative ${isHardMode ? 'bg-red-500' : 'bg-gray-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isHardMode ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <button
        onClick={() => onStart(configs.slice(0, teamCount), isHardMode)}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 md:py-5 rounded-xl shadow-xl shadow-yellow-500/20 transition-all text-lg md:text-xl"
      >
        SPIEL STARTEN
      </button>
    </div>
  );
}

interface CategoryCardProps {
  category: string;
  isUsed: boolean;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, isUsed, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={isUsed}
      className={`group relative h-32 md:h-40 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
        isUsed 
          ? 'border-blue-900/20 bg-blue-900/10 grayscale opacity-40 cursor-not-allowed' 
          : 'border-blue-900/50 bg-[#112240] hover:border-yellow-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/10'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative h-full flex flex-col items-center justify-center p-4 md:p-6 text-center">
        <span className={`text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-1 md:mb-2 ${isUsed ? 'text-gray-500' : 'text-blue-400 group-hover:text-yellow-500'}`}>
          Kategorie
        </span>
        <h3 className={`text-sm md:text-xl font-black leading-tight ${isUsed ? 'text-gray-500' : 'text-white group-hover:text-yellow-400'}`}>
          {category}
        </h3>
        
        {isUsed && (
          <div className="mt-2 text-green-500/50">
            <CheckCircle2 className="w-6 h-6 mx-auto" />
          </div>
        )}
      </div>
      
      {!isUsed && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500/0 group-hover:bg-yellow-500 transition-all duration-300" />
      )}
    </button>
  );
}
