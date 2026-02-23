'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResultsPage() {
    const searchParams = useSearchParams()
    const resultId = searchParams.get('resultId')
    const router = useRouter()

    const [result, setResult] = useState<any>(null)
    const [recapLoading, setRecapLoading] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!resultId) {
            router.push('/')
            return
        }

        fetchResult()
    }, [resultId])

    async function fetchResult() {
        const { data } = await supabase
            .from('student_results')
            .select('*, quizzes(title)')
            .eq('id', resultId)
            .single()

        if (data) {
            setResult(data)
            if (!data.ai_recap) {
                generateRecap(data.id)
            }
        }
        setLoading(false)
    }

    async function generateRecap(id: string) {
        setRecapLoading(true)
        try {
            console.log('Generating recap for result:', id)
            const response = await fetch('/api/generate-recap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resultId: id })
            })
            const data = await response.json()

            if (data.success) {
                setResult((prev: any) => ({ ...prev, ai_recap: data.recap }))
            } else {
                console.error('Recap API error:', data.error)
            }
        } catch (error) {
            console.error('Failed to generate recap', error)
        } finally {
            setRecapLoading(false)
        }
    }

    if (loading) return <div className="main-container"><p>Caricamento risultati...</p></div>
    if (!result) return <div className="main-container"><p>Risultato non trovato.</p></div>

    const isPerfectScore = result.score === result.total_questions

    return (
        <div className="main-container">
            <header className="welcome-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2.5rem' }}>Risultati del Quiz</h1>
                <p>Quiz: {result.quizzes?.title}</p>
            </header>

            <div className="admin-card" style={{ textAlign: 'center', padding: '40px' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '8px', border: 'none' }}>
                    Ciao, {result.student_name}!
                </h2>
                <p style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>Hai ottenuto</p>
                <div className="score-display" style={{
                    color: isPerfectScore ? 'var(--success)' : 'var(--primary)',
                    margin: '16px 0'
                }}>
                    {result.score} / {result.total_questions}
                </div>
            </div>

            <div className="admin-card">
                <h2>Feedback Personalizzato</h2>
                {result.ai_recap ? (
                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: 500 }}>
                        {result.ai_recap}
                    </div>
                ) : recapLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--muted)' }}>
                        <div className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
                        <p>Gemini sta scrivendo il tuo feedback personalizzato in italiano...</p>
                    </div>
                ) : (
                    <p style={{ color: 'var(--muted)' }}>Feedback non disponibile al momento.</p>
                )}
            </div>

            {!isPerfectScore && result.wrong_answers && result.wrong_answers.length > 0 && (
                <div className="admin-card">
                    <h2 style={{ color: 'var(--foreground)', borderBottomColor: 'var(--border)', paddingBottom: '16px' }}>
                        Aree da ripassare <span style={{ color: 'var(--error)' }}>({result.wrong_answers.length} errori)</span>
                    </h2>
                    <ul className="item-list">
                        {result.wrong_answers.map((wa: any, idx: number) => (
                            <li key={idx} className="list-item" style={{ borderLeft: '6px solid var(--error)' }}>
                                <div className="item-content">
                                    <h3 style={{ marginBottom: '16px', border: 'none', lineHeight: '1.4' }}>{wa.question}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '1rem' }}>
                                            <span style={{ color: 'var(--error)', fontWeight: '800', minWidth: '140px' }}>La tua risposta:</span>
                                            <span style={{ color: 'var(--muted)', flex: 1, textDecoration: 'line-through' }}>{wa.studentAnswer}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '1rem' }}>
                                            <span style={{ color: 'var(--success)', fontWeight: '800', minWidth: '140px' }}>Risposta corretta:</span>
                                            <span style={{ color: 'var(--foreground)', fontWeight: '700', flex: 1 }}>{wa.correctAnswer}</span>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <Link href="/">
                    <button className="primary-button" style={{ width: 'auto' }}>
                        Torna alla Home
                    </button>
                </Link>
            </div>
        </div>
    )
}
