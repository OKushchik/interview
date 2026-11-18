import { useState, useCallback, useRef, useEffect } from 'react'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/types'

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognitionAPI)

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'uk-UA'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript
        }
        setTranscript(finalTranscript)
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognitionRef.current = recognition
    }

    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setIsListening(true)
    recognitionRef.current.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => setTranscript(''), [])

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
