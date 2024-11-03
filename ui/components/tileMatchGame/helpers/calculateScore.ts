// helpers/scoreCalculator.ts

export function calculateScore(
  level: number,
  matchedTileCount: number
): number {
  let scorePerMatch = 10; // Default score for level 1

  // Adjust the score per match based on the level
  if (level === 2) {
    scorePerMatch = 15;
  } else if (level === 3) {
    scorePerMatch = 30;
  }

  // Calculate total score based on the number of matched tiles
  return matchedTileCount * scorePerMatch;
}

// Helper function to convert time to seconds and calculate final score
export const calculateFinalScore = (score: number, time: string): number => {
  const [minutesStr, secondsStr] = time.split(":"); // Split time into minutes and seconds
  const minutes = Number(minutesStr) || 0; // Convert to number, default to 0 if undefined or NaN
  const seconds = Number(secondsStr) || 0; // Convert to number, default to 0 if undefined or NaN
  const totalTimeInSeconds = minutes * 60 + seconds; // Convert time to total seconds

  // Calculate the final score (score - time) and ensure it's not below zero
  const finalScore = score - totalTimeInSeconds;
  return Math.max(finalScore, 0); // Return 0 if final score is negative
};
