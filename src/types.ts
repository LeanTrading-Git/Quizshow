export interface Question {
  id: number;
  category: string;
  question: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
  difficulty: 'adult' | 'child';
}

export interface Team {
  name: string;
  score: number;
  hasJoker: boolean;
  difficulty: 'adult' | 'child';
}

export type GameState = 'setup' | 'playing' | 'final' | 'gameOver';
