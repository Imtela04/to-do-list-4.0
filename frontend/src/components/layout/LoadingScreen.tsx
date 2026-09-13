import React, { useState, useEffect } from 'react';
import styles from './loadingScreen.module.css';

const BOOT_LOG = ['[ok] auth token', '[ok] task cache', '[ok] xp ledger', '[..] rendering'];

const WITTY_MESSAGES: string[] = [
    "initializing task queue",
    "syncing XP ledger",
    "waking up the streak counter",
    "loading your level progress",
    "compiling today's priorities",
    "checking in with the pomodoro timer",
    "restoring sticky notes",
    "calculating overdue penalties",
    "optimizing task flow",
    "dusting off the category tabs",
    "reheating yesterday's momentum",
    "counting completed tasks",
    "aligning deadlines to reality",
    "polishing the progress bar",
    "negotiating with procrastination",
    "warming up the braille spinner",
    "reticulating subtasks",
];

const LoadingScreen: React.FC = () => {
	try {
		const [messageIndex, setMessageIndex] = useState<number>(0);
		const [displayedText, setDisplayedText] = useState<string>("");
		const [isVisible, setIsVisible] = useState<boolean>(false);
		const [logIndex, setLogIndex] = useState(0);
		useEffect(() => {
			const id = setInterval(() => setLogIndex(i => Math.min(i + 1, BOOT_LOG.length - 1)), 300);
			return () => clearInterval(id);
		}, []);

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
				<div className={styles.bootLog}>
					{BOOT_LOG.slice(0, logIndex + 1).map((line, i) => <div key={i}>{line}</div>)}
				</div>
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
						+{Math.min(messageIndex * 5 + 5, 100)}% synced
					</div>
			</div>
		);
	} catch (error) {
		console.error('LoadingScreen component error:', error);
		return null;
	}
};

export default LoadingScreen;