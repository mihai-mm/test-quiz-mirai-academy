'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params)
    const quizId = unwrappedParams.id

    const [studentName, setStudentName] = useState('')
    const [questions, setQuestions] = useState<any[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const name = localStorage.getItem('studentName')
        if (!name) {
            router.push('/')
            return
        }
        setStudentName(name)
        fetchQuestions()
    }, [])

    async function fetchQuestions() {
        const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizId)
            .order('created_at', { ascending: true })

        if (data) setQuestions(data)
        setLoading(false)
    }

    const handleSelectOption = (questionId: string, optionText: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionText }))
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)

        let score = 0
        const wrongAnswers: any[] = []

        questions.forEach((q) => {
            const studentAnswer = answers[q.id]
            const correctOption = q.options.find((opt: any) => opt.is_correct)

            if (studentAnswer === correctOption?.text) {
                score += 1
            } else {
                wrongAnswers.push({
                    question: q.question_text,
                    studentAnswer: studentAnswer || 'No answer',
                    correctAnswer: correctOption?.text || 'Unknown'
                })
            }
        })

        // Save result to Database
        const { data, error } = await supabase
            .from('student_results')
            .insert({
                quiz_id: quizId,
                student_name: studentName,
                score: score,
                total_questions: questions.length,
                wrong_answers: wrongAnswers
            })
            .select('id')
            .single()

        if (error || !data) {
            alert('Error saving results. Please try again.')
            setSubmitting(false)
            return
        }

        // Redirect to results page
        router.push(`/quiz/${quizId}/results?resultId=${data.id}`)
    }

    if (loading) return <div className="main-container"><p>Caricamento quiz...</p></div>
    if (questions.length === 0) return <div className="main-container"><p>Nessuna domanda trovata per questo quiz.</p></div>

    const currentQuestion = questions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === questions.length - 1

    return (
        <div className="main-container">
            <header className="admin-header">
                <h1>Domanda {currentQuestionIndex + 1} di {questions.length}</h1>
                <p>In bocca al lupo, {studentName}!</p>
            </header>

            <div className="admin-card" style={{ padding: '40px' }}>
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    marginBottom: '32px',
                    lineHeight: '1.4',
                    color: 'var(--foreground)'
                }}>
                    {currentQuestion.question_text}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {currentQuestion.options.map((option: any, idx: number) => {
                        const isSelected = answers[currentQuestion.id] === option.text
                        return (
                            <label
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: isSelected ? 'rgba(255, 0, 183, 0.05)' : 'var(--surface)',
                                    color: 'var(--foreground)',
                                    border: `var(--border-width) solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                    boxShadow: isSelected ? '4px 4px 0px var(--border)' : 'none',
                                    transform: isSelected ? 'translate(-2px, -2px)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s'
                                }}
                            >
                                <input
                                    type="radio"
                                    name={`question-${currentQuestion.id}`}
                                    value={option.text}
                                    checked={isSelected}
                                    onChange={() => handleSelectOption(currentQuestion.id, option.text)}
                                    className="quiz-option-input"
                                />
                                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{option.text}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '20px' }}>
                <button
                    className="secondary-button"
                    style={{ width: 'auto', flex: 1 }}
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                >
                    Precedente
                </button>

                {isLastQuestion ? (
                    <button
                        className="primary-button"
                        style={{ width: 'auto', flex: 1 }}
                        onClick={handleSubmit}
                        disabled={submitting || Object.keys(answers).length < questions.length}
                    >
                        {submitting ? 'Invio...' : 'Concludi Quiz'}
                    </button>
                ) : (
                    <button
                        className="primary-button"
                        style={{ width: 'auto', flex: 1 }}
                        onClick={handleNext}
                    >
                        Prossima
                    </button>
                )}
            </div>
        </div>
    )
}
