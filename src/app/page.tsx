'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [name, setName] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState('')
  const [quizzes, setQuizzes] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchQuizzes() {
      const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false })
      if (data) setQuizzes(data)
    }
    fetchQuizzes()
  }, [])

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedQuiz) return

    // Save name to localStorage for simple session management
    localStorage.setItem('studentName', name)
    router.push(`/quiz/${selectedQuiz}`)
  }

  return (
    <main className="main-container">
      <header className="welcome-header">
        <h1>Benvenuti al Quiz AI</h1>
        <p>Metti alla prova le tue conoscenze sui materiali di studio.</p>
      </header>

      <form onSubmit={handleStartQuiz} className="auth-form">
        <div className="input-group">
          <label htmlFor="name">Il tuo nome</label>
          <input
            id="name"
            type="text"
            placeholder="Inserisci il tuo nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="quiz">Seleziona un Quiz</label>
          <select
            id="quiz"
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            required
            className="file-input"
            style={{ padding: '12px 16px', color: 'var(--foreground)' }}
          >
            <option value="" disabled>Seleziona un quiz...</option>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="primary-button" disabled={!name.trim() || !selectedQuiz}>
          Inizia il Quiz
        </button>
      </form>
    </main>
  )
}
