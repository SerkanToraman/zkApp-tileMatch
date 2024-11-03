import React, { useState, useEffect } from "react";

interface TimerProps {
  isGameCompleted: boolean;
  reset: boolean;
  onTimeUpdate: (formattedTime: string) => void;
}

const Timer: React.FC<TimerProps> = ({
  isGameCompleted,
  reset,
  onTimeUpdate,
}) => {
  const [seconds, setSeconds] = useState(0);

  // Start the timer when the component mounts or reset occurs
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (!isGameCompleted) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval); // Stop the timer when the game is completed
    }

    return () => {
      if (interval) clearInterval(interval); // Clear the interval when the component unmounts or the game stops
    };
  }, [isGameCompleted]);

  // Reset the timer when the game restarts
  useEffect(() => {
    if (reset) {
      setSeconds(0);
    }
  }, [reset]);

  // Format the time in minutes and seconds
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  // Call the onTimeUpdate callback to pass the formatted time to the parent
  useEffect(() => {
    onTimeUpdate(formatTime(seconds));
  }, [seconds, onTimeUpdate]);

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        fontSize: "24px",
        color: "white",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: "10px",
        borderRadius: "8px",
      }}
    >
      <strong>Time: {formatTime(seconds)}</strong>
    </div>
  );
};

export default Timer;
