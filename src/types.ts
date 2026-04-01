export interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'adult' | 'child';
  level: 1 | 2 | 3 | 4; // 1: Easy, 2: Medium, 3: Hard, 4: Expert
}

export interface Team {
  name: string;
  score: number;
  hasJoker: boolean;
  difficulty: 'adult' | 'child';
}

export type GameState = 'setup' | 'playing' | 'final' | 'gameOver';
