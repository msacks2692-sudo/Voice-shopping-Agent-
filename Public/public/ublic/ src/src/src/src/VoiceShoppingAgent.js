import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, ShoppingCart, Volume2, VolumeX, Smile, Frown, Heart, DollarSign, Wifi, WifiOff } from 'lucide-react';

/**
 * Voice-Activated Shopping Agent
 * Features: Emotion detection, accessible UI, offline PWA, payment processing
 * Optimized for low-bandwidth and assistive technologies
 */

// Product catalog (lightweight for performance)
const PRODUCTS = [
  { id: 1, name: 'Wireless Earbuds', price: 49.99, category: 'electronics' },
  { id: 2, name: 'Coffee Maker', price: 79.99, category: 'home' },
  { id: 3, name: 'Running Shoes', price: 89.99, category: 'sports' },
  { id: 4, name: 'Desk Lamp', price: 34.99, category: 'home' },
  { id: 5, name: 'Water Bottle', price: 19.99, category: 'sports' }
];

const VoiceShoppingAgent = () => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [cart, setCart] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [voiceConsentGiven, setVoiceConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Refs for persistent objects
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);

  // Haptic feedback for accessibility
  const vibrate = useCallback((pattern = [100]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Handle voice consent
  const requestVoiceConsent = useCallback(() => {
    setShowConsentModal(true);
    speak('Cool if I analyze your voice to personalize responses? This helps me understand your emotions and provide better service.', 'neutral');
  }, []);

  const handleConsentResponse = useCallback((consent) => {
    setVoiceConsentGiven(consent);
    setShowConsentModal(false);
    vibrate([100]);
    
    if (consent) {
      speak('Thanks! I\'ll now analyze your voice tone to better understand how you feel. You can revoke this anytime.', 'happy');
      // Store consent in localStorage for persistence
      try {
        const consentData = {
          granted: true,
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
        localStorage.setItem('voiceConsentData', JSON.stringify(consentData));
      } catch (err) {
        console.error('Error storing consent:', err);
      }
    } else {
      speak('No problem! I\'ll just use your words to help you shop. Emotion analysis is off.', 'neutral');
    }
  }, [vibrate]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      speak('Connection restored', 'neutral');
    };
    const handleOffline = () => {
      setIsOnline(false);
      vibrate([200, 100, 200]);
      speak('Offline mode activated', 'neutral');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for stored consent on mount
    try {
      const storedConsent = localStorage.getItem('voiceConsentData');
      if (storedConsent) {
        const consentData = JSON.parse(storedConsent);
        setVoiceConsentGiven(consentData.granted);
      }
    } catch (err) {
      console.error('Error loading consent:', err);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [vibrate]);

  // Initialize Web Speech API with MediaRecorder for audio capture
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Setup MediaRecorder for audio capture (for Hume AI emotion detection)
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          recognitionRef.current.recorder = recorder;
          recognitionRef.current.audioChunks = [];
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recognitionRef.current.audioChunks.push(e.data);
            }
          };
          
          recorder.onstop = () => {
            const audioBlob = new Blob(recognitionRef.current.audioChunks, { 
              type: 'audio/webm' 
            });
            recognitionRef.current.audioBlob = audioBlob;
            recognitionRef.current.audioChunks = [];
            
            // Create audio URL for Hume AI processing
            recognitionRef.current.audioUrl = URL.createObjectURL(audioBlob);
          };
        })
        .catch(err => {
          console.error('Microphone access error:', err);
          setError('Microphone access denied. Please enable microphone permissions.');
        });

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);

        if (event.results[current].isFinal) {
          processVoiceCommand(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}`);
        setIsListening(false);
        vibrate([100, 50, 100]);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.recorder?.stop();
        // Cleanup audio URLs
        if (recognitionRef.current.audioUrl) {
          URL.revokeObjectURL(recognitionRef.current.audioUrl);
        }
      }
    };
  }, [vibrate]);

  // Emotion detection simulation (in production, use Hume AI EVI-2)
  const detectEmotion = useCallback(async (text) => {
    try {
      // Simulate emotion detection based on keywords
      // In production: Replace with Hume AI API call using recorded audio
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('expensive') || lowerText.includes('too much') || 
          lowerText.includes('cant afford') || lowerText.includes('frustrat')) {
        return 'frustrated';
      } else if (lowerText.includes('love') || lowerText.includes('perfect') || 
                 lowerText.includes('great') || lowerText.includes('thank')) {
        return 'happy';
      } else if (lowerText.includes('help') || lowerText.includes('confus')) {
        return 'confused';
      }
      return 'neutral';

      /* Production Hume AI Integration:
      // Use the recorded audio blob for emotion detection
      if (!recognitionRef.current?.audioBlob) {
        console.warn('No audio recording available for emotion detection');
        return 'neutral';
      }

      // Upload audio to your backend first (required for Hume AI)
      const formData = new FormData();
      formData.append('audio', recognitionRef.current.audioBlob, 'recording.webm');
      
      const uploadResponse = await fetch('YOUR_BACKEND_URL/upload-audio', {
        method: 'POST',
        body: formData
      });
      const { audioUrl } = await uploadResponse.json();

      // Call Hume AI with the hosted audio URL
      const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': process.env.REACT_APP_HUME_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          models: { 
            prosody: {} // Analyzes emotional tone from voice
          },
          transcription: { 
            language: 'en' 
          },
          urls: [audioUrl]
        })
      });
      
      const data = await resp
