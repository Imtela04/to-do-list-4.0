import React, { useState, useEffect } from 'react';
import styles from './loadingScreen.module.css';

const WITTY_MESSAGES: string[] = [
    "Locating your lost motivation",
    "Herding the cats",
    "Bribing the server with coffee",
    "Untangling the web",
    "Optimizing your procrastination",
    "Aligning the pixels",
    "Warming up the productivity engine",
    "Counting backwards from infinity",
    "Polishing the loading bar"
];

const LoadingScreen: React.FC = () => {
    try {
        const [messageIndex, setMessageIndex] = useState<number>(0);
        const [displayedText, setDisplayedText] = useState<string>("");
        const [isVisible, setIsVisible] = useState<boolean>(false);

        useEffect(() => {
            // Fade in the whole screen
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }, []);

        useEffect(() => {
            // Main loop to cycle through messages
            const messageDuration = 4000; // Time spent on each message
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % WITTY_MESSAGES.length);
            }, messageDuration);
            return () => clearInterval(interval);
        }, []);

        useEffect(() => {
            // Typewriter effect logic
            const fullText = WITTY_MESSAGES[messageIndex];
            setDisplayedText("");
            let currentChar = 0;

            const typingInterval = setInterval(() => {
                if (currentChar < fullText.length) {
                    setDisplayedText(fullText.substring(0, currentChar + 1));
                    currentChar++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 50); // Speed of typing

            return () => clearInterval(typingInterval);
        }, [messageIndex]);

        return (
            <div 
                className={styles.container}
                style={{ opacity: isVisible ? 1 : 0 }}
                data-name="loading-screen" 
                data-file="components/LoadingScreen.tsx"
            >
                {/* Background decorative elements */}
                <div className={styles.bgDecor1}></div>
                <div className={styles.bgDecor2}></div>

                {/* Typewriter Text Container */}
                <div className={styles.textContainer}>
                    <h2 className={styles.heading}>
                        <span className={styles.arrow}>&gt;</span>
                        {displayedText}
                        <span className={styles.cursor}></span>
                    </h2>
                </div>

                {/* Creative Progress Track */}
                <div className={styles.progressTrack}>
                    <div className={styles.progressBar}></div>
                </div>
                <div className={styles.processingText}>
                    <div className={`${styles.spinner} icon-loader`}></div>
                    Processing
                </div>
            </div>
        );
    } catch (error) {
        console.error('LoadingScreen component error:', error);
        return null;
    }
};

export default LoadingScreen;